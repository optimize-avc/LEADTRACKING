import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getStripe, isStripeConfigured } from '@/lib/stripe/server';
import Stripe from 'stripe';
import { getAdminDb } from '@/lib/firebase/admin';

/**
 * Stripe Webhook Handler
 *
 * Handles subscription lifecycle events from Stripe:
 * - checkout.session.completed: New subscription created
 * - customer.subscription.updated: Plan changed or renewed
 * - customer.subscription.deleted: Subscription cancelled
 * - invoice.payment_failed: Payment failed
 *
 * IMPORTANT: Webhook signature verification is mandatory.
 * Configure STRIPE_WEBHOOK_SECRET from Stripe Dashboard.
 *
 * POST /api/stripe/webhook
 * Headers: Stripe-Signature (required)
 */

// Events we handle
const HANDLED_EVENTS = [
    'checkout.session.completed',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_failed',
    'invoice.payment_succeeded',
] as const;

export async function POST(req: Request) {
    // Check Stripe configuration
    if (!isStripeConfigured()) {
        console.error('[Stripe Webhook] Stripe is not configured');
        return new NextResponse('Server configuration error', { status: 500 });
    }

    // SECURITY: Require webhook secret - never use a fallback
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured');
        return new NextResponse('Server configuration error', { status: 500 });
    }

    // Get signature header
    const signature = (await headers()).get('Stripe-Signature');
    if (!signature) {
        console.error('[Stripe Webhook] Missing Stripe-Signature header');
        return new NextResponse('Missing signature', { status: 400 });
    }

    // Get raw body for signature verification
    const body = await req.text();

    // Verify webhook signature
    let event: Stripe.Event;
    try {
        const stripe = getStripe();
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Stripe Webhook] Signature verification failed:', message);
        return new NextResponse(`Webhook signature verification failed: ${message}`, {
            status: 400,
        });
    }

    console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

    // Skip unhandled events early
    if (!HANDLED_EVENTS.includes(event.type as (typeof HANDLED_EVENTS)[number])) {
        console.log(`[Stripe Webhook] Ignoring unhandled event type: ${event.type}`);
        return new NextResponse(null, { status: 200 });
    }

    // Process the event
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                await handleCheckoutCompleted(session, event.id);
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionUpdated(subscription, event.id);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionCancelled(subscription, event.id);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                await handlePaymentFailed(invoice, event.id);
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                await handlePaymentSucceeded(invoice, event.id);
                break;
            }
        }

        console.log(`[Stripe Webhook] Successfully processed event: ${event.id}`);
    } catch (error) {
        // Log error but return 200 to acknowledge receipt
        // Stripe will retry on 4xx/5xx, which could cause duplicate processing
        console.error(`[Stripe Webhook] Error processing event ${event.id}:`, error);

        // Store failed event for manual review
        try {
            await storeFailedEvent(event, error);
        } catch {
            // Ignore storage errors
        }
    }

    // Always return 200 to acknowledge receipt
    return new NextResponse(null, { status: 200 });
}

/**
 * Handle checkout.session.completed
 * User has successfully subscribed
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session, eventId: string) {
    const userId = session.metadata?.userId;
    const tier = session.metadata?.tier;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    if (!userId || !tier) {
        console.error(`[Stripe Webhook] Event ${eventId}: Missing userId or tier in metadata`);
        throw new Error('Missing required metadata');
    }

    console.log(`[Stripe Webhook] Checkout completed for user ${userId}: ${tier}`);

    const db = getAdminDb();
    await db.collection('users').doc(userId).set(
        {
            tier: tier.toLowerCase(),
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            subscriptionStatus: 'active',
            subscriptionStartedAt: Date.now(),
            updatedAt: Date.now(),
        },
        { merge: true }
    );

    console.log(`[Stripe Webhook] Updated user ${userId} to tier: ${tier.toLowerCase()}`);
}

/**
 * Handle customer.subscription.updated
 * Plan changed, renewed, or status updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription, eventId: string) {
    const customerId = subscription.customer as string;

    // Find user by Stripe customer ID
    const db = getAdminDb();
    const usersSnapshot = await db
        .collection('users')
        .where('stripeCustomerId', '==', customerId)
        .limit(1)
        .get();

    if (usersSnapshot.empty) {
        console.error(
            `[Stripe Webhook] Event ${eventId}: No user found for customer ${customerId}`
        );
        return; // Don't throw - customer might be from a different system
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

    // Access subscription data safely
    const subData = subscription as unknown as {
        current_period_end?: number;
        cancel_at_period_end?: boolean;
    };

    await db
        .collection('users')
        .doc(userId)
        .update({
            tier: isActive ? tier : 'free',
            subscriptionStatus: status,
            stripeSubscriptionId: subscription.id,
            currentPeriodEnd: subData.current_period_end ? subData.current_period_end * 1000 : null,
            cancelAtPeriodEnd: subData.cancel_at_period_end ?? false,
            updatedAt: Date.now(),
        });

    console.log(
        `[Stripe Webhook] Updated subscription for user ${userId}: ${tier} (status: ${status})`
    );
}

/**
 * Handle customer.subscription.deleted
 * Subscription cancelled - downgrade to free
 */
async function handleSubscriptionCancelled(subscription: Stripe.Subscription, eventId: string) {
    const customerId = subscription.customer as string;

    const db = getAdminDb();
    const usersSnapshot = await db
        .collection('users')
        .where('stripeCustomerId', '==', customerId)
        .limit(1)
        .get();

    if (usersSnapshot.empty) {
        console.error(
            `[Stripe Webhook] Event ${eventId}: No user found for customer ${customerId}`
        );
        return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;

    await db.collection('users').doc(userId).update({
        tier: 'free',
        subscriptionStatus: 'cancelled',
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        subscriptionEndedAt: Date.now(),
        updatedAt: Date.now(),
    });

    console.log(`[Stripe Webhook] Subscription cancelled for user ${userId} - downgraded to free`);
}

/**
 * Handle invoice.payment_failed
 * Payment failed - mark as past_due
 */
async function handlePaymentFailed(invoice: Stripe.Invoice, eventId: string) {
    const customerId = invoice.customer as string;

    const db = getAdminDb();
    const usersSnapshot = await db
        .collection('users')
        .where('stripeCustomerId', '==', customerId)
        .limit(1)
        .get();

    if (usersSnapshot.empty) {
        console.error(
            `[Stripe Webhook] Event ${eventId}: No user found for customer ${customerId}`
        );
        return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;

    // Mark as past_due but don't immediately downgrade
    // Stripe will retry and eventually cancel if all retries fail
    await db.collection('users').doc(userId).update({
        subscriptionStatus: 'past_due',
        lastPaymentFailedAt: Date.now(),
        updatedAt: Date.now(),
    });

    console.log(`[Stripe Webhook] Payment failed for user ${userId} - marked as past_due`);

    // TODO: Send email notification about failed payment
    // await notifyPaymentFailed(userDoc.data().email, invoice);
}

/**
 * Handle invoice.payment_succeeded
 * Payment succeeded - clear any past_due status
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice, eventId: string) {
    const customerId = invoice.customer as string;

    const db = getAdminDb();
    const usersSnapshot = await db
        .collection('users')
        .where('stripeCustomerId', '==', customerId)
        .limit(1)
        .get();

    if (usersSnapshot.empty) {
        console.error(
            `[Stripe Webhook] Event ${eventId}: No user found for customer ${customerId}`
        );
        return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    // Only update if currently past_due
    if (userData?.subscriptionStatus === 'past_due') {
        await db.collection('users').doc(userId).update({
            subscriptionStatus: 'active',
            lastPaymentSucceededAt: Date.now(),
            updatedAt: Date.now(),
        });

        console.log(`[Stripe Webhook] Payment succeeded for user ${userId} - status restored`);
    }
}

/**
 * Store failed webhook events for manual review
 */
async function storeFailedEvent(event: Stripe.Event, error: unknown) {
    const db = getAdminDb();
    await db
        .collection('_stripe_failed_webhooks')
        .doc(event.id)
        .set({
            eventId: event.id,
            eventType: event.type,
            payload: JSON.stringify(event.data.object),
            error: error instanceof Error ? error.message : String(error),
            failedAt: Date.now(),
            processed: false,
        });
}
