import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getStripe, isStripeConfigured } from '@/lib/stripe/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';

/**
 * Stripe Customer Portal API
 *
 * Creates a Stripe Customer Portal session for subscription management.
 * Allows users to:
 * - Update payment method
 * - View billing history
 * - Cancel subscription
 * - Download invoices
 *
 * POST /api/stripe/portal
 * Headers: Authorization: Bearer <firebase-token>
 */

/**
 * Verify Firebase Auth token from Authorization header
 */
async function verifyAuth(): Promise<{ uid: string } | null> {
    const headersList = await headers();
    const authHeader = headersList.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);

    try {
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(token);
        return { uid: decodedToken.uid };
    } catch (error) {
        console.error('[Stripe Portal] Token verification failed:', error);
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        // Check Stripe configuration
        if (!isStripeConfigured()) {
            console.error('[Stripe Portal] Stripe is not configured');
            return NextResponse.json(
                { error: 'Payment system is not configured' },
                { status: 503 }
            );
        }

        // Authenticate user
        const user = await verifyAuth();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's Stripe Customer ID from Firestore
        const db = getAdminDb();
        const userDoc = await db.collection('users').doc(user.uid).get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userData = userDoc.data();
        const customerId = userData?.stripeCustomerId;

        if (!customerId) {
            // No Stripe customer yet - redirect to pricing to create subscription
            console.log(`[Stripe Portal] User ${user.uid} has no Stripe customer ID`);
            return NextResponse.json({
                redirect: '/pricing',
                message: 'No active subscription found. Please subscribe first.',
            });
        }

        // Get origin for return URL
        const origin = req.headers.get('origin') || 'http://localhost:3000';

        // Create Stripe Customer Portal session
        const stripe = getStripe();
        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${origin}/settings`,
        });

        console.log(`[Stripe Portal] Session created for user ${user.uid}`);

        return NextResponse.json({ url: session.url });
    } catch (error: unknown) {
        console.error('[Stripe Portal] Error:', error);

        // Handle specific Stripe errors
        if (error instanceof Error) {
            if (error.message.includes('No such customer')) {
                return NextResponse.json(
                    {
                        redirect: '/pricing',
                        message: 'Customer record not found. Please contact support.',
                    },
                    { status: 404 }
                );
            }
        }

        return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
    }
}
