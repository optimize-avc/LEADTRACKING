/**
 * Admin Impersonate API Route Tests
 *
 * Tests for the /api/admin/impersonate endpoint.
 * Verifies super admin access control and audit logging.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Firebase Admin SDK
const mockVerifyIdToken = vi.fn();
const mockCreateCustomToken = vi.fn();
const mockGetUser = vi.fn();
const mockGetDoc = vi.fn();
const mockAdd = vi.fn();
const mockGetDocs = vi.fn();
const mockOrderBy = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();

vi.mock('@/lib/firebase/admin', () => ({
    getAdminAuth: () => ({
        verifyIdToken: mockVerifyIdToken,
        createCustomToken: mockCreateCustomToken,
        getUser: mockGetUser,
    }),
    getAdminDb: () => ({
        collection: vi.fn((_name: string) => ({
            doc: vi.fn(() => ({
                get: mockGetDoc,
            })),
            add: mockAdd,
            where: mockWhere,
            orderBy: mockOrderBy,
        })),
    }),
}));

// Mock rate limiting
vi.mock('@/lib/api-middleware', () => ({
    rateLimit: vi.fn(() => null),
    errorResponse: vi.fn((msg: string, status: number) => {
        return new Response(JSON.stringify({ error: msg }), { status });
    }),
}));

// Mock server audit service
vi.mock('@/lib/firebase/server-audit', () => ({
    ServerAuditService: {
        logImpersonation: vi.fn(),
    },
}));

// Import the route handlers after mocking
import { POST, GET } from '@/app/api/admin/impersonate/route';

function createMockRequest(
    method: string,
    body?: Record<string, unknown>,
    authHeader = 'Bearer test-token'
): NextRequest {
    const headers = new Headers();
    if (authHeader) {
        headers.set('Authorization', authHeader);
    }
    headers.set('Content-Type', 'application/json');

    return {
        method,
        headers,
        json: vi.fn().mockResolvedValue(body),
        url: 'http://localhost:3000/api/admin/impersonate?limit=50',
        nextUrl: {
            searchParams: new URLSearchParams('limit=50'),
        },
    } as unknown as NextRequest;
}

describe('Admin Impersonate API Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Setup mock chain for GET query
        mockOrderBy.mockReturnValue({
            limit: mockLimit,
        });

        mockLimit.mockReturnValue({
            get: mockGetDocs,
        });

        mockWhere.mockReturnValue({
            orderBy: mockOrderBy,
        });
    });

    describe('POST /api/admin/impersonate', () => {
        it('returns 403 when user is not a super admin', async () => {
            mockVerifyIdToken.mockResolvedValueOnce({
                uid: 'regular-user',
                email: 'regular@example.com',
            });

            const request = createMockRequest('POST', {
                targetUserId: 'target-user',
                reason: 'Testing impersonation for support',
            });

            const response = await POST(request);

            expect(response.status).toBe(403);
        });

        it('returns 403 when authorization header is missing', async () => {
            const request = createMockRequest('POST', {
                targetUserId: 'target-user',
                reason: 'Testing impersonation for support',
            }, '');

            const response = await POST(request);

            expect(response.status).toBe(403);
        });

        it('returns 400 when targetUserId is missing', async () => {
            mockVerifyIdToken.mockResolvedValueOnce({
                uid: 'admin-user',
                email: 'admin@avcpp.com', // Super admin email
            });

            const request = createMockRequest('POST', {
                reason: 'Testing impersonation',
            });

            const response = await POST(request);

            expect(response.status).toBe(400);
        });

        it('returns 400 when reason is too short', async () => {
            mockVerifyIdToken.mockResolvedValueOnce({
                uid: 'admin-user',
                email: 'admin@avcpp.com',
            });

            const request = createMockRequest('POST', {
                targetUserId: 'target-user',
                reason: 'short', // Less than 10 chars
            });

            const response = await POST(request);

            expect(response.status).toBe(400);
        });

        it('returns 404 when target user does not exist', async () => {
            mockVerifyIdToken.mockResolvedValueOnce({
                uid: 'admin-user',
                email: 'admin@avcpp.com',
            });

            mockGetUser.mockRejectedValueOnce(new Error('User not found'));

            const request = createMockRequest('POST', {
                targetUserId: 'nonexistent-user',
                reason: 'Testing impersonation for support ticket',
            });

            const response = await POST(request);

            expect(response.status).toBe(404);
        });

        it('creates custom token for valid super admin request', async () => {
            mockVerifyIdToken.mockResolvedValueOnce({
                uid: 'admin-user',
                email: 'admin@avcpp.com',
            });

            mockGetUser.mockResolvedValueOnce({
                uid: 'target-user',
                email: 'target@example.com',
                displayName: 'Target User',
            });

            mockGetDoc.mockResolvedValueOnce({
                exists: true,
                data: () => ({ companyId: 'company-123' }),
            });

            mockCreateCustomToken.mockResolvedValueOnce('custom-token-123');
            mockAdd.mockResolvedValueOnce({ id: 'audit-log-id' });

            const request = createMockRequest('POST', {
                targetUserId: 'target-user',
                reason: 'Support ticket #12345 - User cannot access dashboard',
            });

            const response = await POST(request);
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.customToken).toBe('custom-token-123');
            expect(body.targetUser.uid).toBe('target-user');
            expect(body.warning).toContain('logged');
        });

        it('logs impersonation to admin audit log', async () => {
            mockVerifyIdToken.mockResolvedValueOnce({
                uid: 'admin-user',
                email: 'blazehaze4201980@gmail.com', // Another super admin
            });

            mockGetUser.mockResolvedValueOnce({
                uid: 'target-user',
                email: 'target@example.com',
            });

            mockGetDoc.mockResolvedValueOnce({
                exists: true,
                data: () => ({ companyId: 'company-123' }),
            });

            mockCreateCustomToken.mockResolvedValueOnce('custom-token');

            const request = createMockRequest('POST', {
                targetUserId: 'target-user',
                reason: 'Investigating reported bug in user account',
            });

            await POST(request);

            expect(mockAdd).toHaveBeenCalled();
        });
    });

    describe('GET /api/admin/impersonate', () => {
        it('returns 403 when not a super admin', async () => {
            mockVerifyIdToken.mockResolvedValueOnce({
                uid: 'regular-user',
                email: 'regular@example.com',
            });

            const request = createMockRequest('GET');
            const response = await GET(request);

            expect(response.status).toBe(403);
        });

        it('returns impersonation logs for super admin', async () => {
            mockVerifyIdToken.mockResolvedValueOnce({
                uid: 'admin-user',
                email: 'admin@avcpp.com',
            });

            const mockLogs = [
                {
                    id: 'log-1',
                    action: 'impersonation',
                    adminEmail: 'admin@avcpp.com',
                    targetUserId: 'user-1',
                    timestamp: { toDate: () => new Date('2024-01-01') },
                },
            ];

            mockGetDocs.mockResolvedValueOnce({
                docs: mockLogs.map((log) => ({
                    id: log.id,
                    data: () => log,
                })),
            });

            const request = createMockRequest('GET');
            const response = await GET(request);
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.logs).toBeInstanceOf(Array);
            expect(body.logs[0].id).toBe('log-1');
        });

        it('respects limit parameter', async () => {
            mockVerifyIdToken.mockResolvedValueOnce({
                uid: 'admin-user',
                email: 'admin@avcpp.com',
            });

            mockGetDocs.mockResolvedValueOnce({ docs: [] });

            const request = {
                ...createMockRequest('GET'),
                url: 'http://localhost:3000/api/admin/impersonate?limit=10',
            } as NextRequest;

            await GET(request);

            // The limit should be passed to the query
            expect(mockLimit).toHaveBeenCalled();
        });
    });
});
