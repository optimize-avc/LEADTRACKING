/**
 * Rate Limiting Utility
 *
 * Simple in-memory rate limiting for API routes.
 * For production at scale, use Redis-based solution like @upstash/ratelimit
 *
 * Best practice 2026: Protect public APIs from abuse
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// In-memory store (works for single-instance deployment)
// For multi-instance, use Redis or Upstash
const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
    /** Maximum requests allowed in the window */
    limit: number;
    /** Time window in seconds */
    windowSeconds: number;
}

interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
}

/**
 * Check rate limit for a given identifier (IP, userId, etc.)
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig = { limit: 100, windowSeconds: 60 }
): RateLimitResult {
    const now = Date.now();
    const key = identifier;
    const entry = rateLimitStore.get(key);

    // Clean up expired entries periodically
    if (rateLimitStore.size > 10000) {
        cleanupExpiredEntries();
    }

    if (!entry || now > entry.resetTime) {
        // New window
        const resetTime = now + config.windowSeconds * 1000;
        rateLimitStore.set(key, { count: 1, resetTime });
        return {
            success: true,
            limit: config.limit,
            remaining: config.limit - 1,
            reset: resetTime,
        };
    }

    if (entry.count >= config.limit) {
        // Rate limit exceeded
        return {
            success: false,
            limit: config.limit,
            remaining: 0,
            reset: entry.resetTime,
        };
    }

    // Increment counter
    entry.count += 1;
    return {
        success: true,
        limit: config.limit,
        remaining: config.limit - entry.count,
        reset: entry.resetTime,
    };
}

/**
 * Clean up expired entries to prevent memory leaks
 */
function cleanupExpiredEntries() {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
    // Check common proxy headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
        return realIP;
    }

    // Fallback
    return 'unknown';
}

/**
 * Rate limit response helper
 */
export function rateLimitResponse(result: RateLimitResult): Response {
    return new Response(
        JSON.stringify({
            error: 'Too many requests',
            retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
        }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': result.limit.toString(),
                'X-RateLimit-Remaining': result.remaining.toString(),
                'X-RateLimit-Reset': result.reset.toString(),
                'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
            },
        }
    );
}

// Preset configurations for different endpoint types
export const RATE_LIMITS = {
    // Webhooks - high limit (they come from trusted services)
    webhook: { limit: 1000, windowSeconds: 60 },

    // Authentication - moderate limit
    auth: { limit: 10, windowSeconds: 60 },

    // User actions - standard limit
    userAction: { limit: 30, windowSeconds: 60 },

    // Heavy operations (AI, export, upload)
    heavy: { limit: 10, windowSeconds: 60 },

    // Public endpoints
    public: { limit: 60, windowSeconds: 60 },
} as const;
