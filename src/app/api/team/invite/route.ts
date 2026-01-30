import { NextRequest, NextResponse } from 'next/server';
import { sendTeamInviteEmail, generateInviteUrl } from '@/lib/sendgrid';
import { rateLimit, handleValidationError } from '@/lib/api-middleware';
import { inviteTeamMemberSchema } from '@/lib/validation';
import { RATE_LIMITS } from '@/lib/rate-limit';
import { ZodError } from 'zod';
import { ServerAuditService } from '@/lib/firebase/server-audit';

// Dynamically import Admin SDK to handle cases where it's not configured
async function tryAdminOperation<T>(operation: () => Promise<T>): Promise<T | null> {
    try {
        const { getAdminDb } = await import('@/lib/firebase/admin');
        // Test connection by getting db
        getAdminDb();
        return await operation();
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Check if it's a credential error (happens in local dev without proper setup)
        if (
            errorMessage.includes('invalid_grant') ||
            errorMessage.includes('invalid_rapt') ||
            errorMessage.includes('Could not load the default credentials') ||
            errorMessage.includes('GOOGLE_APPLICATION_CREDENTIALS')
        ) {
            console.warn(
                'Firebase Admin SDK not configured for local development. Skipping Firestore operation.'
            );
            return null;
        }
        throw error;
    }
}

/**
 * POST /api/team/invite
 * Create a team invite and send email notification
 * Uses Firebase Admin SDK when available, with fallback for local development
 *
 * Security: Rate limited to prevent invite spam
 */
export async function POST(request: NextRequest) {
    // Rate limiting - prevent invite spam (10 invites per minute per IP)
    const rateLimitResult = rateLimit(request, undefined, RATE_LIMITS.auth);
    if (rateLimitResult) {
        return rateLimitResult;
    }

    try {
        const body = await request.json();

        // Validate input with Zod
        let validatedData;
        try {
            validatedData = inviteTeamMemberSchema.parse(body);
        } catch (error) {
            if (error instanceof ZodError) {
                return handleValidationError(error);
            }
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const { companyId, companyName, email, role, invitedBy, invitedByName } = validatedData;

        let inviteId: string | null = null;
        let firestorePersisted = false;

        // Try to create invite in Firestore using Admin SDK
        const firestoreResult = await tryAdminOperation(async () => {
            const { getAdminDb } = await import('@/lib/firebase/admin');
            const { FieldValue } = await import('firebase-admin/firestore');

            const db = getAdminDb();
            const invitesRef = db.collection('companies').doc(companyId).collection('invites');

            // Check if user already has pending invite
            const existingInvites = await invitesRef
                .where('email', '==', email.toLowerCase())
                .where('status', '==', 'pending')
                .limit(1)
                .get();

            if (!existingInvites.empty) {
                return { error: 'duplicate' };
            }

            // Create the invite in Firestore
            const inviteData = {
                email: email.toLowerCase(),
                role,
                companyId,
                companyName: companyName || 'Your Team',
                invitedBy,
                invitedByName: invitedByName || 'A team admin',
                status: 'pending',
                createdAt: FieldValue.serverTimestamp(),
                expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
            };

            const inviteRef = await invitesRef.add(inviteData);
            return { inviteId: inviteRef.id };
        });

        if (firestoreResult?.error === 'duplicate') {
            return NextResponse.json(
                { error: 'This email already has a pending invitation' },
                { status: 409 }
            );
        }

        if (firestoreResult?.inviteId) {
            inviteId = firestoreResult.inviteId;
            firestorePersisted = true;

            // Audit log the invite
            try {
                await ServerAuditService.logTeamInvite(
                    companyId,
                    invitedBy,
                    invitedByName || 'Unknown',
                    email,
                    role
                );
            } catch (auditError) {
                console.warn('Audit logging failed:', auditError);
            }
        } else {
            // Fallback: generate a temporary invite ID for local dev
            inviteId = `local-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            console.log('Local dev mode: Using temporary invite ID:', inviteId);
        }

        // Generate invite URL
        const inviteUrl = generateInviteUrl(companyId, inviteId);

        // Fetch company's email config for tenant-specific sending
        let emailConfig:
            | { sendgridApiKey?: string; fromEmail?: string; fromName?: string }
            | undefined;
        const companyData = await tryAdminOperation(async () => {
            const { getAdminDb } = await import('@/lib/firebase/admin');
            const db = getAdminDb();
            const companyDoc = await db.collection('companies').doc(companyId).get();
            if (companyDoc.exists) {
                return companyDoc.data()?.settings?.emailConfig;
            }
            return undefined;
        });
        if (companyData) {
            emailConfig = companyData;
        }

        // Send email via SendGrid (uses tenant config if available)
        const emailResult = await sendTeamInviteEmail(
            {
                recipientEmail: email,
                inviterName: invitedByName || 'A team admin',
                companyName: companyName || 'Your Team',
                role,
                inviteUrl,
            },
            { emailConfig }
        );

        // Log audit event for team invite
        if (firestorePersisted) {
            try {
                await ServerAuditService.logTeamInvite(
                    companyId,
                    invitedBy,
                    invitedByName || 'Unknown',
                    email,
                    role
                );
            } catch (auditError) {
                console.warn('[Team Invite API] Audit logging failed:', auditError);
                // Don't fail the request if audit logging fails
            }
        }

        return NextResponse.json({
            success: true,
            inviteId,
            emailSent: emailResult.success,
            usingTenantEmailConfig: emailResult.usingTenantConfig,
            firestorePersisted,
            message: emailResult.success
                ? firestorePersisted
                    ? 'Invitation sent successfully'
                    : 'Email sent (local dev mode - invite not persisted to Firestore)'
                : `Invitation created but email failed: ${emailResult.error || 'Unknown error'}`,
        });
    } catch (error) {
        console.error('Failed to create team invite:', error);
        return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }
}

/**
 * GET /api/team/invite?company={companyId}&invite={inviteId}
 * Get invite details for accept flow
 * Uses Firebase Admin SDK for server-side access
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const companyId = searchParams.get('company');
        const inviteId = searchParams.get('invite');

        if (!companyId || !inviteId) {
            return NextResponse.json({ error: 'Missing company or invite ID' }, { status: 400 });
        }

        // Dynamic import for Admin SDK
        const { getAdminDb } = await import('@/lib/firebase/admin');
        const db = getAdminDb();
        const inviteDoc = await db
            .collection('companies')
            .doc(companyId)
            .collection('invites')
            .doc(inviteId)
            .get();

        if (!inviteDoc.exists) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
        }

        const invite = inviteDoc.data();

        // Check if expired
        if (invite?.expiresAt < Date.now()) {
            return NextResponse.json(
                { error: 'This invitation has expired', expired: true },
                { status: 410 }
            );
        }

        // Check if already accepted
        if (invite?.status !== 'pending') {
            return NextResponse.json(
                { error: 'This invitation has already been used', status: invite?.status },
                { status: 410 }
            );
        }

        return NextResponse.json({
            success: true,
            invite: {
                email: invite?.email,
                role: invite?.role,
                companyName: invite?.companyName,
                invitedByName: invite?.invitedByName,
                expiresAt: invite?.expiresAt,
            },
        });
    } catch (error) {
        console.error('Failed to get invite:', error);
        return NextResponse.json({ error: 'Failed to retrieve invitation' }, { status: 500 });
    }
}
