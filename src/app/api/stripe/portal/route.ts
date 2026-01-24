import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { getAdminDb } from '@/lib/firebase/admin';

/**
 * Stripe Customer Portal API
 *
 * Creates a Stripe Customer Portal session for subscription management.
 * Allows users to:
 * - Update payment method
 * - View billing history
 * - Cancel subscription
 * - Download invoices
 */
export async function POST(req: Request) {
    try {
        const { userId } = await req.json();

        if (!userId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Get user's Stripe Customer ID from Firestore
        const db = getAdminDb();
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            return new NextResponse('User not found', { status: 404 });
        }

        const userData = userDoc.data();
        const customerId = userData?.stripeCustomerId;

        if (!customerId) {
            // No Stripe customer yet - redirect to pricing to create subscription
            return NextResponse.json({
                url: '/pricing',
                message: 'No active subscription found. Please subscribe first.',
            });
        }

        // Create Stripe Customer Portal session
        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${req.headers.get('origin')}/settings`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error: unknown) {
        console.error('[Stripe Portal Error]:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create portal session' },
            { status: 500 }
        );
    }
}
