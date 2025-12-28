import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
// import { ProfileService } from '@/lib/firebase/services';

export async function POST(req: Request) {
    try {
        const { userId, customerId } = await req.json();

        if (!userId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // 1. In prod: Get Stripe Customer ID from Firestore if it exists
        // If not, search Stripe by email or create one.
        // For now, let's assume we need to search or create to get a valid Portal link

        // Mocking behavior:
        // const customer = await stripe.customers.create({ metadata: { userId }});
        // const customerId = customer.id;

        if (!customerId) {
            // If no customer yet, send them to pricing
            return NextResponse.json({ url: '/pricing' });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${req.headers.get('origin')}/settings`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error: unknown) {
        console.error('Portal Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Portal failed' },
            { status: 500 }
        );
    }
}
