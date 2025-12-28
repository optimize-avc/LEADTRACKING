/**
 * API Authentication Middleware
 *
 * Provides secure Firebase token verification for API routes.
 * Uses firebase-admin for server-side token validation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';

export interface AuthResult {
    success: true;
    userId: string;
    email?: string;
}

export interface AuthError {
    success: false;
    error: string;
    status: number;
}

export type AuthVerificationResult = AuthResult | AuthError;

/**
 * Verify Firebase ID token from Authorization header
 *
 * @param request - NextRequest object
 * @returns AuthVerificationResult with userId on success, error details on failure
 */
export async function verifyAuthToken(request: NextRequest): Promise<AuthVerificationResult> {
    try {
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                success: false,
                error: 'Missing or invalid Authorization header',
                status: 401,
            };
        }

        const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix

        if (!idToken || idToken.trim() === '') {
            return {
                success: false,
                error: 'Empty token provided',
                status: 401,
            };
        }

        const decodedToken = await verifyIdToken(idToken);

        if (!decodedToken) {
            return {
                success: false,
                error: 'Invalid or expired token',
                status: 401,
            };
        }

        return {
            success: true,
            userId: decodedToken.uid,
            email: decodedToken.email,
        };
    } catch (error) {
        console.error('Auth verification error:', error);
        return {
            success: false,
            error: 'Authentication failed',
            status: 401,
        };
    }
}

/**
 * Create an error response for authentication failures
 */
export function createAuthErrorResponse(authResult: AuthError): NextResponse {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
}

/**
 * Validate that a userId from request body matches the authenticated user
 */
export function validateUserIdMatch(authenticatedUserId: string, requestedUserId: string): boolean {
    return authenticatedUserId === requestedUserId;
}

/**
 * Higher-order function to wrap API handlers with authentication
 *
 * @example
 * ```typescript
 * export const POST = withAuth(async (request, userId) => {
 *     // Handler code with verified userId
 *     return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withAuth(
    handler: (request: NextRequest, userId: string, email?: string) => Promise<NextResponse>
) {
    return async (request: NextRequest): Promise<NextResponse> => {
        const auth = await verifyAuthToken(request);

        if (!auth.success) {
            return createAuthErrorResponse(auth);
        }

        return handler(request, auth.userId, auth.email);
    };
}
