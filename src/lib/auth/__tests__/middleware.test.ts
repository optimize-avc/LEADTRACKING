/**
 * Auth Middleware Tests
 *
 * Tests for the API authentication middleware.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
    verifyAuthToken,
    createAuthErrorResponse,
    validateUserIdMatch,
    withAuth,
    AuthResult,
    AuthError,
} from '../middleware';

// Mock the firebase admin module
vi.mock('@/lib/firebase/admin', () => ({
    verifyIdToken: vi.fn(),
}));

import { verifyIdToken } from '@/lib/firebase/admin';
const mockVerifyIdToken = vi.mocked(verifyIdToken);

function createMockRequest(authHeader: string | null): NextRequest {
    const headers = new Headers();
    if (authHeader) {
        headers.set('Authorization', authHeader);
    }

    return {
        headers,
        url: 'http://localhost:3000/api/test',
    } as unknown as NextRequest;
}

describe('Auth Middleware', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('verifyAuthToken', () => {
        it('returns error when Authorization header is missing', async () => {
            const request = createMockRequest(null);
            const result = await verifyAuthToken(request);

            expect(result.success).toBe(false);
            expect((result as AuthError).error).toBe('Missing or invalid Authorization header');
            expect((result as AuthError).status).toBe(401);
        });

        it('returns error when Authorization header does not start with Bearer', async () => {
            const request = createMockRequest('Basic abc123');
            const result = await verifyAuthToken(request);

            expect(result.success).toBe(false);
            expect((result as AuthError).error).toBe('Missing or invalid Authorization header');
        });

        it('returns error when token is empty', async () => {
            const request = createMockRequest('Bearer ');
            const result = await verifyAuthToken(request);

            expect(result.success).toBe(false);
            expect((result as AuthError).error).toBe('Empty token provided');
        });

        it('returns error when token is just whitespace', async () => {
            const request = createMockRequest('Bearer    ');
            const result = await verifyAuthToken(request);

            expect(result.success).toBe(false);
            expect((result as AuthError).error).toBe('Empty token provided');
        });

        it('returns success with userId when token is valid', async () => {
            mockVerifyIdToken.mockResolvedValueOnce({
                uid: 'user-123',
                email: 'test@example.com',
            } as any);

            const request = createMockRequest('Bearer valid-token');
            const result = await verifyAuthToken(request);

            expect(result.success).toBe(true);
            expect((result as AuthResult).userId).toBe('user-123');
            expect((result as AuthResult).email).toBe('test@example.com');
        });

        it('returns error when token verification fails', async () => {
            mockVerifyIdToken.mockResolvedValueOnce(null);

            const request = createMockRequest('Bearer invalid-token');
            const result = await verifyAuthToken(request);

            expect(result.success).toBe(false);
            expect((result as AuthError).error).toBe('Invalid or expired token');
        });

        it('returns error when verifyIdToken throws', async () => {
            mockVerifyIdToken.mockRejectedValueOnce(new Error('Token expired'));

            const request = createMockRequest('Bearer expired-token');
            const result = await verifyAuthToken(request);

            expect(result.success).toBe(false);
            expect((result as AuthError).error).toBe('Authentication failed');
        });
    });

    describe('createAuthErrorResponse', () => {
        it('creates response with correct status and error message', () => {
            const authError: AuthError = {
                success: false,
                error: 'Unauthorized',
                status: 401,
            };

            const response = createAuthErrorResponse(authError);

            expect(response.status).toBe(401);
        });

        it('creates response with 403 status for forbidden', () => {
            const authError: AuthError = {
                success: false,
                error: 'Forbidden',
                status: 403,
            };

            const response = createAuthErrorResponse(authError);

            expect(response.status).toBe(403);
        });
    });

    describe('validateUserIdMatch', () => {
        it('returns true when userIds match', () => {
            expect(validateUserIdMatch('user-123', 'user-123')).toBe(true);
        });

        it('returns false when userIds do not match', () => {
            expect(validateUserIdMatch('user-123', 'user-456')).toBe(false);
        });

        it('is case sensitive', () => {
            expect(validateUserIdMatch('User-123', 'user-123')).toBe(false);
        });

        it('handles empty strings', () => {
            expect(validateUserIdMatch('', '')).toBe(true);
            expect(validateUserIdMatch('user-123', '')).toBe(false);
        });
    });

    describe('withAuth', () => {
        it('returns 401 when authentication fails', async () => {
            mockVerifyIdToken.mockResolvedValueOnce(null);

            const handler = vi.fn().mockResolvedValue(new Response('OK'));
            const wrappedHandler = withAuth(handler);

            const request = createMockRequest('Bearer invalid-token');
            const response = await wrappedHandler(request);

            expect(response.status).toBe(401);
            expect(handler).not.toHaveBeenCalled();
        });

        it('calls handler with userId when authentication succeeds', async () => {
            mockVerifyIdToken.mockResolvedValueOnce({
                uid: 'user-123',
                email: 'test@example.com',
            } as any);

            const handler = vi.fn().mockResolvedValue(new Response('OK'));
            const wrappedHandler = withAuth(handler);

            const request = createMockRequest('Bearer valid-token');
            await wrappedHandler(request);

            expect(handler).toHaveBeenCalledWith(request, 'user-123', 'test@example.com');
        });

        it('returns handler response on success', async () => {
            mockVerifyIdToken.mockResolvedValueOnce({
                uid: 'user-123',
                email: 'test@example.com',
            } as any);

            const mockResponse = new Response(JSON.stringify({ data: 'test' }));
            const handler = vi.fn().mockResolvedValue(mockResponse);
            const wrappedHandler = withAuth(handler);

            const request = createMockRequest('Bearer valid-token');
            const response = await wrappedHandler(request);

            expect(response).toBe(mockResponse);
        });
    });
});
