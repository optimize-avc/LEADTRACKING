import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV === 'production') {
    throw new Error('STRIPE_SECRET_KEY is missing');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
    // @ts-expect-error - Stripe's latest version may be newer than types
    apiVersion: '2025-01-27.acacia',
    appInfo: {
        name: 'SalesTracker AI',
        version: '0.1.0',
    },
});
