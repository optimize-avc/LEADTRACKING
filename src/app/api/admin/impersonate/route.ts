/**
 * Admin Impersonation API
 * 
 * Allows super admins to impersonate users for support purposes.
 * Creates a custom token that allows signing in as another user.
 * 
 * SECURITY: All impersonation events are logged in audit trail.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { rateLimit, errorResponse } from '@/lib/api-middleware';
import { RATE_LIMITS } from '@/lib/rate-limit';
import { ServerAuditService } from '@/lib/firebase/server-audit';

// Super admin emails
const SUPER_ADMIN_EMAILS = [
    'admin@avcpp.com',
    'blazehaze4201980@gmail.com',
    'optimize@avcpp.com',
];

/**
 * Verify user is a super admin
 */
async function verifySuperAdmin(authHeader: string | null): Promise<{ uid: string; email: string } | null> {
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }

    try {
        const token = authHeader.substring(7);
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(token);

        if (!decodedToken.email || !SUPER_ADMIN_EMAILS.includes(decodedToken.email)) {
            return null;
        }

        return {
            uid: decodedToken.uid,
            email: decodedToken.email,
        };
    } catch {
        return null;
    }
}

/**
 * POST /api/admin/impersonate
 * Generate a custom token for impersonating a user
 * 
 * Body: { targetUserId: string, reason: string }
 */
export async function POST(request: NextRequest) {
    const rateLimitResult = rateLimit(request, undefined, RATE_LIMITS.sensitiveAction);
    if (rateLimitResult) return rateLimitResult;

    const admin = await verifySuperAdmin(request.headers.get('authorization'));
    if (!admin) {
        return errorResponse('Unauthorized - Super admin access required', 403);
    }

    try {
        const body = await request.json();
        const { targetUserId, reason } = body;

        if (!targetUserId) {
            return errorResponse('Target user ID is required', 400);
        }

        if (!reason || reason.length < 10) {
            return errorResponse('A reason (min 10 chars) is required for audit purposes', 400);
        }

        const auth = getAdminAuth();
        const db = getAdminDb();

        // Verify target user exists
        let targetUser;
        try {
            targetUser = await auth.getUser(targetUserId);
        } catch {
            return errorResponse('Target user not found', 404);
        }

        // Get target user's company for audit logging
        const userDoc = await db.collection('users').doc(targetUserId).get();
        const userData = userDoc.data();
        const targetCompanyId = userData?.companyId || 'unknown';

        // Create custom token with impersonation claim
        const customToken = await auth.createCustomToken(targetUserId, {
            impersonatedBy: admin.uid,
            impersonatorEmail: admin.email,
            impersonationTime: Date.now(),
        });

        // Log impersonation event to target company's audit log
        if (targetCompanyId !== 'unknown') {
            await ServerAuditService.logImpersonation(
                targetCompanyId,
                admin.uid,
                targetUserId,
                reason
            );
        }

        // Also log to a global admin audit collection
        await db.collection('adminAuditLog').add({
            action: 'impersonation',
            adminId: admin.uid,
            adminEmail: admin.email,
            targetUserId,
            targetEmail: targetUser.email,
            targetCompanyId,
            reason,
            timestamp: new Date(),
            ipAddress: request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown',
        });

        return NextResponse.json({
            success: true,
            customToken,
            targetUser: {
                uid: targetUser.uid,
                email: targetUser.email,
                displayName: targetUser.displayName,
            },
            expiresIn: '1 hour',
            warning: 'This session is being logged. Exit impersonation when support is complete.',
        });
    } catch (error) {
        console.error('Error creating impersonation token:', error);
        return errorResponse('Failed to create impersonation token', 500);
    }
}

/**
 * GET /api/admin/impersonate
 * Get impersonation audit log
 */
export async function GET(request: NextRequest) {
    const rateLimitResult = rateLimit(request, undefined, RATE_LIMITS.api);
    if (rateLimitResult) return rateLimitResult;

    const admin = await verifySuperAdmin(request.headers.get('authorization'));
    if (!admin) {
        return errorResponse('Unauthorized - Super admin access required', 403);
    }

    try {
        const db = getAdminDb();
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

        const snapshot = await db
            .collection('adminAuditLog')
            .where('action', '==', 'impersonation')
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();

        const logs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate?.()?.toISOString(),
        }));

        return NextResponse.json({ logs });
    } catch (error) {
        console.error('Error fetching impersonation logs:', error);
        return errorResponse('Failed to fetch logs', 500);
    }
}
