/**
 * API Middleware Tests
 *
 * Tests for the API middleware utilities including rate limiting,
 * validation, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
    rateLimit,
    validateBody,
    errorResponse,
    handleValidationError,
    withRateLimit,
    getUserIdFromToken,
} from '../api-middleware';
import { RATE_LIMITS } from '../rate-limit';

// Mock NextRequest
function createMockNextRequest(
    headers: Record<string, string> = {},
    ip?: string
): NextRequest {
    const headersInstance = new Headers();
    Object.entries(headers).forEach(([key, value]) => {
        headersInstance.set(key, value);
    });

    return {
        headers: headersInstance,
        ip: ip || '127.0.0.1',
        url: 'http://localhost:3000/api/test',
    } as unknown as NextRequest;
}

describe('API Middleware', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('rateLimit', () => {
        it('returns null when request is allowed', () => {
            const request = createMockNextRequest({
                'x-forwarded-for': `192.168.1.${Math.floor(Math.random() * 255)}`,
            });

            const result = rateLimit(request);
            expect(result).toBeNull();
        });

        it('uses custom identifier when provided', () => {
            const request = createMockNextRequest();
            const customId = `custom-user-${Date.now()}-${Math.random()}`;
            const config = { limit: 2, windowSeconds: 60 };

            // First two should pass
            expect(rateLimit(request, customId, config)).toBeNull();
            expect(rateLimit(request, customId, config)).toBeNull();

            // Third should fail
            const result = rateLimit(request, customId, config);
            expect(result).not.toBeNull();
            expect(result?.status).toBe(429);
        });

        it('returns 429 response when rate limit exceeded', () => {
            const uniqueIp = `10.0.0.${Math.floor(Math.random() * 255)}`;
            const request = createMockNextRequest({
                'x-forwarded-for': uniqueIp,
            });
            const config = { limit: 1, windowSeconds: 60 };

            rateLimit(request, undefined, config);
            const result = rateLimit(request, undefined, config);

            expect(result?.status).toBe(429);
        });
    });

    describe('validateBody', () => {
        const testSchema = z.object({
            name: z.string().min(1),
            age: z.number().positive(),
        });

        it('returns parsed data for valid input', () => {
            const input = { name: 'John', age: 30 };
            const result = validateBody(input, testSchema);

            expect(result).toEqual(input);
        });

        it('throws ZodError for invalid input', () => {
            const input = { name: '', age: -5 };

            expect(() => validateBody(input, testSchema)).toThrow();
        });

        it('throws ZodError for missing fields', () => {
            const input = { name: 'John' };

            expect(() => validateBody(input, testSchema)).toThrow();
        });
    });

    describe('errorResponse', () => {
        it('creates response with error message', () => {
            const response = errorResponse('Something went wrong');

            expect(response.status).toBe(400);
        });

        it('uses custom status code', () => {
            const response = errorResponse('Not found', 404);

            expect(response.status).toBe(404);
        });

        it('includes details when provided', async () => {
            const details = { field: 'email', issue: 'invalid format' };
            const response = errorResponse('Validation failed', 400, details);

            const body = await response.json();
            expect(body.error).toBe('Validation failed');
            expect(body.details).toEqual(details);
        });
    });

    describe('handleValidationError', () => {
        it('formats Zod validation errors', async () => {
            const schema = z.object({
                email: z.string().email(),
                name: z.string().min(2),
            });

            let zodError: ZodError;
            try {
                schema.parse({ email: 'invalid', name: 'a' });
            } catch (e) {
                zodError = e as ZodError;
            }

            const response = handleValidationError(zodError!);
            const body = await response.json();

            expect(response.status).toBe(400);
            expect(body.error).toBe('Validation failed');
            expect(body.details.issues).toBeInstanceOf(Array);
            expect(body.details.issues.length).toBeGreaterThan(0);
        });

        it('includes path and message for each issue', async () => {
            const schema = z.object({
                user: z.object({
                    email: z.string().email(),
                }),
            });

            let zodError: ZodError;
            try {
                schema.parse({ user: { email: 'invalid' } });
            } catch (e) {
                zodError = e as ZodError;
            }

            const response = handleValidationError(zodError!);
            const body = await response.json();

            const issue = body.details.issues[0];
            expect(issue.path).toBe('user.email');
            expect(issue.message).toBeDefined();
        });
    });

    describe('withRateLimit', () => {
        it('executes handler when within rate limit', async () => {
            const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
            const wrapped = withRateLimit(handler);

            const request = createMockNextRequest({
                'x-forwarded-for': `192.168.2.${Math.floor(Math.random() * 255)}`,
            });

            const response = await wrapped(request);

            expect(handler).toHaveBeenCalledWith(request);
            expect(response.status).toBe(200);
        });

        it('returns 429 when rate limit exceeded', async () => {
            const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
            const config = { limit: 1, windowSeconds: 60 };
            const wrapped = withRateLimit(handler, config);

            const uniqueIp = `192.168.3.${Math.floor(Math.random() * 255)}`;
            const request = createMockNextRequest({
                'x-forwarded-for': uniqueIp,
            });

            // First request
            await wrapped(request);
            // Second request should be rate limited
            const response = await wrapped(request);

            expect(response.status).toBe(429);
        });
    });

    describe('getUserIdFromToken', () => {
        it('returns null for null header', () => {
            expect(getUserIdFromToken(null)).toBeNull();
        });

        it('returns null for non-Bearer header', () => {
            expect(getUserIdFromToken('Basic abc123')).toBeNull();
        });

        it('returns null for invalid JWT format', () => {
            expect(getUserIdFromToken('Bearer invalid.token')).toBeNull();
            expect(getUserIdFromToken('Bearer not-a-jwt')).toBeNull();
        });

        it('extracts user_id from valid JWT payload', () => {
            // Create a mock JWT with user_id in payload
            const payload = { user_id: 'user-123' };
            const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
            const mockJwt = `header.${encodedPayload}.signature`;

            expect(getUserIdFromToken(`Bearer ${mockJwt}`)).toBe('user-123');
        });

        it('extracts sub from valid JWT payload as fallback', () => {
            const payload = { sub: 'user-456' };
            const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
            const mockJwt = `header.${encodedPayload}.signature`;

            expect(getUserIdFromToken(`Bearer ${mockJwt}`)).toBe('user-456');
        });

        it('returns null for JWT with no user identifier', () => {
            const payload = { email: 'test@example.com' };
            const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
            const mockJwt = `header.${encodedPayload}.signature`;

            expect(getUserIdFromToken(`Bearer ${mockJwt}`)).toBeNull();
        });
    });
});
