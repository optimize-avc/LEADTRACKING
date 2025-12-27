import * as Sentry from '@sentry/nextjs';

Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Environment configuration
    environment: process.env.NODE_ENV,

    // Only send errors in production
    enabled: process.env.NODE_ENV === 'production',

    beforeSend(event) {
        // Add server context
        event.tags = {
            ...event.tags,
            runtime: 'nodejs',
        };
        return event;
    },
});
