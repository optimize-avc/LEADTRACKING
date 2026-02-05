import Stripe from 'stripe';

/**
 * Stripe Server-Side Configuration
 *
 * Provides a singleton Stripe instance with lazy initialization.
 * This prevents build-time errors when STRIPE_SECRET_KEY isn't set.
 *
 * Best practices:
 * - Never import this in client-side code
 * - Always use getStripe() for type-safe access
 * - Configure STRIPE_SECRET_KEY in environment
 */

// Singleton instance
let stripeInstance: Stripe | null = null;

/**
 * Get the Stripe instance (lazy initialization)
 * @throws Error if STRIPE_SECRET_KEY is not configured
 */
export function getStripe(): Stripe {
    if (!stripeInstance) {
        const secretKey = process.env.STRIPE_SECRET_KEY;

        if (!secretKey) {
            throw new Error(
                'STRIPE_SECRET_KEY is not configured. Please add it to your environment variables.'
            );
        }

        // Validate key format
        if (!secretKey.startsWith('sk_')) {
            throw new Error(
                'Invalid STRIPE_SECRET_KEY format. Key should start with "sk_test_" or "sk_live_".'
            );
        }

        stripeInstance = new Stripe(secretKey, {
            apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
            appInfo: {
                name: 'SalesTracker AI',
                version: '0.1.0',
                url: 'https://salestracker-ai.com',
            },
            // Recommended settings for production
            maxNetworkRetries: 2,
            timeout: 30000, // 30 seconds
        });
    }

    return stripeInstance;
}

/**
 * Check if Stripe is properly configured
 * Use this for conditional feature rendering
 */
export function isStripeConfigured(): boolean {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    return !!secretKey && secretKey.startsWith('sk_');
}

/**
 * Proxy object for convenient access to Stripe resources
 * Each property getter calls getStripe() to ensure initialization
 */
export const stripe = {
    get customers() {
        return getStripe().customers;
    },
    get subscriptions() {
        return getStripe().subscriptions;
    },
    get invoices() {
        return getStripe().invoices;
    },
    get paymentIntents() {
        return getStripe().paymentIntents;
    },
    get checkout() {
        return getStripe().checkout;
    },
    get billingPortal() {
        return getStripe().billingPortal;
    },
    get webhooks() {
        return getStripe().webhooks;
    },
    get prices() {
        return getStripe().prices;
    },
    get products() {
        return getStripe().products;
    },
};
