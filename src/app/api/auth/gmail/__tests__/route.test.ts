/**
 * Gmail Auth API Route Tests
 *
 * Tests for the /api/auth/gmail endpoint.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Use vi.hoisted for mock functions that need to be referenced in vi.mock
const { mockGetGmailAuthUrl } = vi.hoisted(() => ({
    mockGetGmailAuthUrl: vi.fn(),
}));

vi.mock('@/lib/gmail/gmail-auth', () => ({
    getGmailAuthUrl: mockGetGmailAuthUrl,
}));

// Import the route handler after mocking
import { GET } from '@/app/api/auth/gmail/route';

function createMockRequest(searchParams: Record<string, string> = {}): NextRequest {
    const url = new URL('http://localhost:3000/api/auth/gmail');
    Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });

    return {
        url: url.toString(),
        nextUrl: url,
        method: 'GET',
        headers: new Headers(),
    } as unknown as NextRequest;
}

describe('Gmail Auth API Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/auth/gmail', () => {
        it('returns 400 when userId is missing', async () => {
            const request = createMockRequest({});
            const response = await GET(request);
            const body = await response.json();

            expect(response.status).toBe(400);
            expect(body.error).toBe('userId required');
        });

        it('redirects to Google OAuth URL when userId is provided', async () => {
            const mockAuthUrl = 'https://accounts.google.com/oauth/authorize?...';
            mockGetGmailAuthUrl.mockReturnValueOnce(mockAuthUrl);

            const request = createMockRequest({ userId: 'user-123' });
            const response = await GET(request);

            expect(response.status).toBe(307); // Redirect status
            expect(response.headers.get('Location')).toBe(mockAuthUrl);
        });

        it('calls getGmailAuthUrl with correct userId', async () => {
            mockGetGmailAuthUrl.mockReturnValueOnce('https://example.com/oauth');

            const request = createMockRequest({ userId: 'test-user-456' });
            await GET(request);

            expect(mockGetGmailAuthUrl).toHaveBeenCalledWith('test-user-456');
        });
    });
});
