import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe/server';
import Stripe from 'stripe';
import { getAdminDb } from '@/lib/firebase/admin';

/**
 * Stripe Webhook Handler
 * Handles subscription lifecycle events:
 * - checkout.session.completed: New subscription created
 * - customer.subscription.updated: Plan changed or renewed
 * - customer.subscription.deleted: Subscription cancelled
 * - invoice.payment_failed: Payment failed (optional downgrade)
 */
export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get('Stripe-Signature');

    if (!signature) {
        return new NextResponse('Missing signature', { status: 400 });
    }

    // SECURITY: Require webhook secret in production - never use a fallback
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured');
        return new NextResponse('Server configuration error', { status: 500 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Stripe Webhook] Signature verification failed:', message);
        return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
    }

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                await handleCheckoutCompleted(session);
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionUpdated(subscription);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionCancelled(subscription);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                await handlePaymentFailed(invoice);
                break;
            }

            default:
                console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }
    } catch (error) {
        console.error('[Stripe Webhook] Error processing event:', error);
        // Return 200 to acknowledge receipt - Stripe will retry on 4xx/5xx
        // We log the error but don't fail the webhook
    }

    return new NextResponse(null, { status: 200 });
}

/**
 * Handle checkout.session.completed
 * User has successfully subscribed
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const tier = session.metadata?.tier;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    if (!userId || !tier) {
        console.error('[Stripe Webhook] Missing userId or tier in session metadata');
        return;
    }

    console.log(`[Stripe Webhook] Checkout completed for user ${userId}: ${tier}`);

    // Update user's tier in Firestore
    const db = getAdminDb();
    await db.collection('users').doc(userId).set(
        {
            tier: tier.toLowerCase(),
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            subscriptionStatus: 'active',
            updatedAt: Date.now(),
        },
        { merge: true }
    );

    console.log(`[Stripe Webhook] Updated user ${userId} to tier: ${tier}`);
}

/**
 * Handle customer.subscription.updated
 * Plan changed, renewed, or status updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;

    // Find user by Stripe customer ID
    const db = getAdminDb();
    const usersSnapshot = await db
        .collection('users')
        .where('stripeCustomerId', '==', customerId)
        .limit(1)
        .get();

    if (usersSnapshot.empty) {
        console.error(`[Stripe Webhook] No user found for customer: ${customerId}`);
        return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;

    // Map subscription status
    const status = subscription.status;
    const isActive = ['active', 'trialing'].includes(status);

    // Determine tier from price
    const priceId = subscription.items.data[0]?.price?.id;
    let tier = 'free';

    if (priceId === process.env.STRIPE_PRICE_ID_PRO) {
        tier = 'pro';
    } else if (priceId === process.env.STRIPE_PRICE_ID_VENTURE) {
        tier = 'enterprise';
    }

    await db
        .collection('users')
        .doc(userId)
        .update({
            tier: isActive ? tier : 'free',
            subscriptionStatus: status,
            stripeSubscriptionId: subscription.id,
            updatedAt: Date.now(),
        });

    console.log(`[Stripe Webhook] Updated subscription for user ${userId}: ${tier} (${status})`);
}

/**
 * Handle customer.subscription.deleted
 * Subscription cancelled - downgrade to free
 */
async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;

    const db = getAdminDb();
    const usersSnapshot = await db
        .collection('users')
        .where('stripeCustomerId', '==', customerId)
        .limit(1)
        .get();

    if (usersSnapshot.empty) {
        console.error(`[Stripe Webhook] No user found for customer: ${customerId}`);
        return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;

    await db.collection('users').doc(userId).update({
        tier: 'free',
        subscriptionStatus: 'cancelled',
        stripeSubscriptionId: null,
        updatedAt: Date.now(),
    });

    console.log(`[Stripe Webhook] Subscription cancelled for user ${userId} - downgraded to free`);
}

/**
 * Handle invoice.payment_failed
 * Payment failed - optionally notify user or downgrade
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;

    const db = getAdminDb();
    const usersSnapshot = await db
        .collection('users')
        .where('stripeCustomerId', '==', customerId)
        .limit(1)
        .get();

    if (usersSnapshot.empty) {
        console.error(`[Stripe Webhook] No user found for customer: ${customerId}`);
        return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;

    // Mark as past_due but don't immediately downgrade
    // Stripe will retry payment and eventually cancel if all retries fail
    await db.collection('users').doc(userId).update({
        subscriptionStatus: 'past_due',
        updatedAt: Date.now(),
    });

    console.log(`[Stripe Webhook] Payment failed for user ${userId} - marked as past_due`);

    // TODO: Send email notification about failed payment
    // await sendPaymentFailedEmail(userDoc.data().email);
}
