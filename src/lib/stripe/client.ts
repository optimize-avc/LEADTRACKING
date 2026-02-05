import { loadStripe, Stripe } from '@stripe/stripe-js';

/**
 * Stripe Client-Side Configuration
 *
 * Provides a singleton Stripe.js instance for client-side operations.
 * Used for redirecting to Checkout, handling Elements, etc.
 *
 * Best practices:
 * - Only import this in client components ('use client')
 * - Never expose secret key in client code
 * - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with 'pk_'
 */

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Get the Stripe.js instance (lazy initialization)
 * Returns null if publishable key is not configured
 */
export function getStripe(): Promise<Stripe | null> {
    if (!stripePromise) {
        const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

        if (!publishableKey) {
            console.warn(
                '[Stripe Client] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not configured. ' +
                    'Stripe features will be disabled.'
            );
            return Promise.resolve(null);
        }

        // Validate key format
        if (!publishableKey.startsWith('pk_')) {
            console.error(
                '[Stripe Client] Invalid publishable key format. ' +
                    'Key should start with "pk_test_" or "pk_live_".'
            );
            return Promise.resolve(null);
        }

        stripePromise = loadStripe(publishableKey);
    }

    return stripePromise;
}

/**
 * Check if Stripe client is properly configured
 * Use this for conditional feature rendering
 */
export function isStripeClientConfigured(): boolean {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    return !!publishableKey && publishableKey.startsWith('pk_');
}
