/**
 * Sentry Error Tracking Configuration
 *
 * Centralized error tracking and performance monitoring.
 * Set NEXT_PUBLIC_SENTRY_DSN in environment variables.
 *
 * Best practice 2026: Structured error reporting with context
 */

interface ErrorContext {
    userId?: string;
    companyId?: string;
    action?: string;
    metadata?: Record<string, unknown>;
}

/**
 * Capture an error with context
 */
export function captureError(error: Error, context?: ErrorContext): void {
    // Log to console in development
    console.error('[Sentry]', error.message, context);

    // In production with Sentry DSN configured, report to Sentry
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (dsn && typeof window !== 'undefined') {
        // Client-side: Use Sentry SDK if available
        const Sentry = (
            window as { Sentry?: { captureException: (e: Error, ctx?: object) => void } }
        ).Sentry;
        if (Sentry) {
            Sentry.captureException(error, {
                extra: context?.metadata,
                user: context?.userId ? { id: context.userId } : undefined,
                tags: {
                    companyId: context?.companyId,
                    action: context?.action,
                },
            });
        }
    }
}

/**
 * Capture a message/event
 */
export function captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    context?: ErrorContext
): void {
    console.log(`[Sentry:${level}]`, message, context);

    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (dsn && typeof window !== 'undefined') {
        const Sentry = (
            window as { Sentry?: { captureMessage: (msg: string, ctx?: object) => void } }
        ).Sentry;
        if (Sentry) {
            Sentry.captureMessage(message, {
                level,
                extra: context?.metadata,
                tags: {
                    companyId: context?.companyId,
                    action: context?.action,
                },
            });
        }
    }
}

/**
 * Set user context for Sentry
 */
export function setUserContext(userId: string, email?: string, companyId?: string): void {
    if (typeof window !== 'undefined') {
        const Sentry = (window as { Sentry?: { setUser: (user: object) => void } }).Sentry;
        if (Sentry) {
            Sentry.setUser({
                id: userId,
                email,
                companyId,
            });
        }
    }
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext(): void {
    if (typeof window !== 'undefined') {
        const Sentry = (window as { Sentry?: { setUser: (user: null) => void } }).Sentry;
        if (Sentry) {
            Sentry.setUser(null);
        }
    }
}

/**
 * Start a performance transaction
 */
export function startTransaction(name: string, op: string): { finish: () => void } {
    // Stub implementation - replace with actual Sentry transaction when SDK is configured
    const start = performance.now();
    console.log(`[Sentry:perf] Starting ${op}:${name}`);

    return {
        finish: () => {
            const duration = performance.now() - start;
            console.log(`[Sentry:perf] Finished ${op}:${name} in ${duration.toFixed(2)}ms`);
        },
    };
}

/**
 * Wrapper for async operations with error tracking
 */
export async function withErrorTracking<T>(
    operation: () => Promise<T>,
    context: ErrorContext
): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        captureError(error instanceof Error ? error : new Error(String(error)), context);
        throw error;
    }
}
