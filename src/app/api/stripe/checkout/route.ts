import { NextRequest, NextResponse } from 'next/server';
import { getStripe, isStripeConfigured } from '@/lib/stripe/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { headers } from 'next/headers';
import { randomUUID } from 'crypto';

/**
 * Stripe Checkout Session API
 *
 * Creates a Stripe Checkout Session for subscription purchases.
 * Requires authenticated user via Firebase Auth token.
 *
 * POST /api/stripe/checkout
 * Body: { tier: 'Pro' | 'Venture' }
 * Headers: Authorization: Bearer <firebase-token>
 */

// Price ID mapping - configure these in Stripe Dashboard
const PRICE_IDS: Record<string, string | undefined> = {
    Pro: process.env.STRIPE_PRICE_ID_PRO,
    Venture: process.env.STRIPE_PRICE_ID_VENTURE,
};

interface CheckoutRequest {
    tier: string;
}

/**
 * Verify Firebase Auth token from Authorization header
 */
async function verifyAuth(req: NextRequest): Promise<{ uid: string; email: string } | null> {
    const headersList = await headers();
    const authHeader = headersList.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);

    try {
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(token);
        return {
            uid: decodedToken.uid,
            email: decodedToken.email || '',
        };
    } catch (error) {
        console.error('[Stripe Checkout] Token verification failed:', error);
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        // Check Stripe configuration
        if (!isStripeConfigured()) {
            console.error('[Stripe Checkout] Stripe is not configured');
            return NextResponse.json(
                { error: 'Payment system is not configured' },
                { status: 503 }
            );
        }

        // Authenticate user
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request body
        const body = (await req.json()) as CheckoutRequest;
        const { tier } = body;

        // Validate tier
        if (!tier || !['Pro', 'Venture'].includes(tier)) {
            return NextResponse.json(
                { error: 'Invalid tier. Must be "Pro" or "Venture".' },
                { status: 400 }
            );
        }

        // Get price ID for tier
        const priceId = PRICE_IDS[tier];
        if (!priceId) {
            console.error(`[Stripe Checkout] Price ID not configured for tier: ${tier}`);
            return NextResponse.json(
                { error: `Pricing not configured for ${tier} tier. Please contact support.` },
                { status: 500 }
            );
        }

        // Get origin for redirect URLs
        const origin = req.headers.get('origin') || 'http://localhost:3000';

        // Create Checkout Session with idempotency key
        const stripe = getStripe();
        const idempotencyKey = `checkout_${user.uid}_${tier}_${randomUUID()}`;

        const session = await stripe.checkout.sessions.create(
            {
                payment_method_types: ['card'],
                billing_address_collection: 'auto',
                customer_email: user.email,
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                mode: 'subscription',
                allow_promotion_codes: true,
                success_url: `${origin}/settings?checkout=success&tier=${tier.toLowerCase()}`,
                cancel_url: `${origin}/pricing?checkout=cancelled`,
                metadata: {
                    userId: user.uid,
                    tier: tier,
                },
                // Collect tax if configured
                automatic_tax: {
                    enabled: !!process.env.STRIPE_TAX_ENABLED,
                },
                // Add tax ID collection for B2B
                tax_id_collection: {
                    enabled: true,
                },
            },
            {
                idempotencyKey,
            }
        );

        if (!session.url) {
            throw new Error('Stripe returned a session without a URL');
        }

        console.log(`[Stripe Checkout] Session created for user ${user.uid}, tier: ${tier}`);

        return NextResponse.json({ url: session.url });
    } catch (error: unknown) {
        console.error('[Stripe Checkout] Error:', error);

        // Handle specific Stripe errors
        if (error instanceof Error) {
            if (error.message.includes('No such price')) {
                return NextResponse.json(
                    { error: 'Invalid pricing configuration. Please contact support.' },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }
}
