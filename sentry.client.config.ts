import * as Sentry from '@sentry/nextjs';

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session replay for debugging
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Environment configuration
    environment: process.env.NODE_ENV,

    // Only send errors in production
    enabled: process.env.NODE_ENV === 'production',

    // Ignore common non-critical errors
    ignoreErrors: [
        // Network errors
        'NetworkError',
        'Failed to fetch',
        'Load failed',
        // Browser extension errors
        /^chrome-extension:\/\//,
        /^moz-extension:\/\//,
        // Third-party script errors
        /^Script error\.?$/,
    ],

    beforeSend(event) {
        // Filter out development errors
        if (process.env.NODE_ENV !== 'production') {
            return null;
        }
        return event;
    },
});
