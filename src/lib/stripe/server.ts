import Stripe from 'stripe';

// Lazy initialization to avoid build-time errors
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
    if (!stripeInstance) {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY is missing. Please configure it in your environment.');
        }
        stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
            // @ts-expect-error - Stripe's latest version may be newer than types
            apiVersion: '2025-01-27.acacia',
            appInfo: {
                name: 'SalesTracker AI',
                version: '0.1.0',
            },
        });
    }
    return stripeInstance;
}

// Export for backward compatibility - will throw if accessed without STRIPE_SECRET_KEY
export const stripe = {
    get customers() { return getStripe().customers; },
    get subscriptions() { return getStripe().subscriptions; },
    get invoices() { return getStripe().invoices; },
    get paymentIntents() { return getStripe().paymentIntents; },
    get checkout() { return getStripe().checkout; },
    get billingPortal() { return getStripe().billingPortal; },
    get webhooks() { return getStripe().webhooks; },
    get prices() { return getStripe().prices; },
    get products() { return getStripe().products; },
};
