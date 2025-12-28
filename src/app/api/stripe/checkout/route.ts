import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';

interface CheckoutRequest {
    userId: string;
    tier: string;
    email: string;
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as CheckoutRequest;
        const { userId, tier, email } = body;

        if (!userId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // 1. Map tier to Stripe Price ID
        const priceMap: Record<string, string> = {
            Pro: process.env.STRIPE_PRICE_ID_PRO || 'price_mock_pro',
            Venture: process.env.STRIPE_PRICE_ID_VENTURE || 'price_mock_venture',
        };

        const priceId = priceMap[tier];
        if (!priceId) {
            return new NextResponse('Invalid tier', { status: 400 });
        }

        // 2. Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            billing_address_collection: 'auto',
            customer_email: email,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${req.headers.get('origin')}/settings?success=true`,
            cancel_url: `${req.headers.get('origin')}/pricing?canceled=true`,
            metadata: {
                userId: userId,
                tier: tier,
            },
        });

        if (!session.url) {
            throw new Error('Failed to create stripe session url');
        }

        return NextResponse.json({ url: session.url });
    } catch (error: unknown) {
        console.error('[STRIPE_CHECKOUT_ERROR]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
