/**
 * Rate Limiting Tests
 *
 * Tests for the rate limiting utility functions.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { checkRateLimit, getClientIP, rateLimitResponse, RATE_LIMITS } from '../rate-limit';

// Create a mock Request with headers
function createMockRequest(headers: Record<string, string> = {}): Request {
    return {
        headers: {
            get: (name: string) => headers[name.toLowerCase()] || null,
        },
    } as unknown as Request;
}

describe('Rate Limiting', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('checkRateLimit', () => {
        it('allows requests within limit', () => {
            const identifier = `test-user-${Date.now()}-${Math.random()}`;
            const config = { limit: 5, windowSeconds: 60 };

            const result1 = checkRateLimit(identifier, config);
            expect(result1.success).toBe(true);
            expect(result1.remaining).toBe(4);
            expect(result1.limit).toBe(5);

            const result2 = checkRateLimit(identifier, config);
            expect(result2.success).toBe(true);
            expect(result2.remaining).toBe(3);
        });

        it('blocks requests after limit exceeded', () => {
            const identifier = `test-limit-${Date.now()}-${Math.random()}`;
            const config = { limit: 3, windowSeconds: 60 };

            // Exhaust the limit
            checkRateLimit(identifier, config);
            checkRateLimit(identifier, config);
            checkRateLimit(identifier, config);

            // Fourth request should be blocked
            const result = checkRateLimit(identifier, config);
            expect(result.success).toBe(false);
            expect(result.remaining).toBe(0);
        });

        it('resets after window expires', () => {
            const identifier = `test-reset-${Date.now()}-${Math.random()}`;
            const config = { limit: 2, windowSeconds: 60 };

            // Exhaust the limit
            checkRateLimit(identifier, config);
            checkRateLimit(identifier, config);
            expect(checkRateLimit(identifier, config).success).toBe(false);

            // Advance time past the window
            vi.advanceTimersByTime(61 * 1000);

            // Should be allowed again
            const result = checkRateLimit(identifier, config);
            expect(result.success).toBe(true);
            expect(result.remaining).toBe(1);
        });

        it('tracks different identifiers separately', () => {
            const config = { limit: 2, windowSeconds: 60 };
            const user1 = `user1-${Date.now()}-${Math.random()}`;
            const user2 = `user2-${Date.now()}-${Math.random()}`;

            // Exhaust user1's limit
            checkRateLimit(user1, config);
            checkRateLimit(user1, config);
            expect(checkRateLimit(user1, config).success).toBe(false);

            // User2 should still be allowed
            const result = checkRateLimit(user2, config);
            expect(result.success).toBe(true);
        });

        it('uses default config when not provided', () => {
            const identifier = `test-default-${Date.now()}-${Math.random()}`;
            const result = checkRateLimit(identifier);
            expect(result.success).toBe(true);
            expect(result.limit).toBe(100); // default limit
        });
    });

    describe('getClientIP', () => {
        it('extracts IP from x-forwarded-for header', () => {
            const request = createMockRequest({
                'x-forwarded-for': '192.168.1.100, 10.0.0.1',
            });
            expect(getClientIP(request)).toBe('192.168.1.100');
        });

        it('extracts IP from x-real-ip header', () => {
            const request = createMockRequest({
                'x-real-ip': '10.0.0.50',
            });
            expect(getClientIP(request)).toBe('10.0.0.50');
        });

        it('prefers x-forwarded-for over x-real-ip', () => {
            const request = createMockRequest({
                'x-forwarded-for': '192.168.1.100',
                'x-real-ip': '10.0.0.50',
            });
            expect(getClientIP(request)).toBe('192.168.1.100');
        });

        it('returns unknown when no headers present', () => {
            const request = createMockRequest({});
            expect(getClientIP(request)).toBe('unknown');
        });
    });

    describe('rateLimitResponse', () => {
        it('returns 429 status with proper headers', () => {
            const result = {
                success: false,
                limit: 10,
                remaining: 0,
                reset: Date.now() + 30000,
            };

            const response = rateLimitResponse(result);
            expect(response.status).toBe(429);
            expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
            expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
        });

        it('includes retry-after header', async () => {
            const resetTime = Date.now() + 30000;
            const result = {
                success: false,
                limit: 10,
                remaining: 0,
                reset: resetTime,
            };

            const response = rateLimitResponse(result);
            const retryAfter = response.headers.get('Retry-After');
            expect(parseInt(retryAfter || '0')).toBeGreaterThan(0);
        });

        it('returns JSON body with error message', async () => {
            const result = {
                success: false,
                limit: 10,
                remaining: 0,
                reset: Date.now() + 30000,
            };

            const response = rateLimitResponse(result);
            const body = await response.json();
            expect(body.error).toBe('Too many requests');
            expect(body.retryAfter).toBeDefined();
        });
    });

    describe('RATE_LIMITS presets', () => {
        it('has correct webhook limit', () => {
            expect(RATE_LIMITS.webhook.limit).toBe(1000);
            expect(RATE_LIMITS.webhook.windowSeconds).toBe(60);
        });

        it('has correct auth limit', () => {
            expect(RATE_LIMITS.auth.limit).toBe(10);
            expect(RATE_LIMITS.auth.windowSeconds).toBe(60);
        });

        it('has correct userAction limit', () => {
            expect(RATE_LIMITS.userAction.limit).toBe(30);
            expect(RATE_LIMITS.userAction.windowSeconds).toBe(60);
        });

        it('has correct heavy limit', () => {
            expect(RATE_LIMITS.heavy.limit).toBe(10);
            expect(RATE_LIMITS.heavy.windowSeconds).toBe(60);
        });

        it('has correct sensitiveAction limit', () => {
            expect(RATE_LIMITS.sensitiveAction.limit).toBe(5);
            expect(RATE_LIMITS.sensitiveAction.windowSeconds).toBe(60);
        });
    });
});
