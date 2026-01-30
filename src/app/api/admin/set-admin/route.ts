import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin';

// List of permanently authorized admin emails
// These users will always have admin role regardless of DB state
const PERMANENT_ADMINS = ['optimize@avcpp.com'];

// Super admins who can call this endpoint
const SUPER_ADMIN_EMAILS = ['admin@avcpp.com', 'blazehaze4201980@gmail.com', 'optimize@avcpp.com'];

/**
 * Verify user is a super admin
 */
async function verifySuperAdmin(
    authHeader: string | null
): Promise<{ uid: string; email: string } | null> {
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

export async function POST(request: NextRequest) {
    // SECURITY: Require super admin authentication
    const admin = await verifySuperAdmin(request.headers.get('authorization'));
    if (!admin) {
        return NextResponse.json(
            { error: 'Unauthorized - Super admin access required' },
            { status: 403 }
        );
    }

    try {
        const adminDb = getAdminDb();
        const adminAuth = getAdminAuth();

        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Security: Only allow setting admin for emails in the PERMANENT_ADMINS list
        if (!PERMANENT_ADMINS.includes(email.toLowerCase())) {
            return NextResponse.json(
                { error: 'Unauthorized: Email not in admin allowlist' },
                { status: 403 }
            );
        }

        // Get user by email
        const userRecord = await adminAuth.getUserByEmail(email);

        // Update user's Firestore profile to admin
        const userRef = adminDb.collection('users').doc(userRecord.uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            // Create profile if it doesn't exist
            await userRef.set({
                email: email,
                role: 'admin',
                tier: 'free',
                onboarded: false,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        } else {
            // Update existing profile
            await userRef.update({
                role: 'admin',
                updatedAt: Date.now(),
            });
        }

        return NextResponse.json({
            success: true,
            message: `Successfully set ${email} as admin`,
            uid: userRecord.uid,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorCode = (error as { code?: string })?.code;

        if (errorCode === 'auth/user-not-found') {
            return NextResponse.json(
                { error: 'User not found. They need to sign up first.' },
                { status: 404 }
            );
        }

        console.error('Set admin error:', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

// GET endpoint removed - exposing admin emails is a security risk
// If needed for admin UI, require super admin auth like POST does
