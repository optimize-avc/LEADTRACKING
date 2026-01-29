/**
 * Shared API Auth Helpers
 * 
 * Centralized authentication and company lookup for API routes.
 * Handles both company owners AND team members.
 */

import { NextRequest } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';

export interface AuthContext {
    userId: string;
    companyId: string;
    role: 'owner' | 'admin' | 'manager' | 'member';
    email?: string;
}

/**
 * Extract and validate auth token, then resolve user's company.
 * Works for both company owners and team members.
 * 
 * @param request - NextRequest with Authorization header
 * @returns AuthContext or null if unauthorized
 */
export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }

    try {
        const token = authHeader.split('Bearer ')[1];
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(token);
        const userId = decodedToken.uid;
        const email = decodedToken.email;

        const db = getAdminDb();

        // Strategy 1: Check if user owns a company
        const ownedCompaniesSnap = await db.collection('companies')
            .where('ownerId', '==', userId)
            .limit(1)
            .get();

        if (!ownedCompaniesSnap.empty) {
            return {
                userId,
                companyId: ownedCompaniesSnap.docs[0].id,
                role: 'owner',
                email,
            };
        }

        // Strategy 2: Check user document for companyId (team members)
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData?.companyId) {
                return {
                    userId,
                    companyId: userData.companyId,
                    role: userData.role || 'member',
                    email,
                };
            }
        }

        // No company association found
        return null;
    } catch (error) {
        console.error('Auth context error:', error);
        return null;
    }
}

/**
 * Require auth context - returns context or throws
 * Use in API routes where auth is mandatory
 */
export async function requireAuth(request: NextRequest): Promise<AuthContext> {
    const context = await getAuthContext(request);
    if (!context) {
        throw new AuthError('Unauthorized', 401);
    }
    return context;
}

/**
 * Check if user has admin-level access (owner or admin role)
 */
export function isAdmin(context: AuthContext): boolean {
    return context.role === 'owner' || context.role === 'admin';
}

/**
 * Check if user has at least manager access
 */
export function isManagerOrAbove(context: AuthContext): boolean {
    return ['owner', 'admin', 'manager'].includes(context.role);
}

/**
 * Custom error class for auth failures
 */
export class AuthError extends Error {
    status: number;
    
    constructor(message: string, status: number = 401) {
        super(message);
        this.name = 'AuthError';
        this.status = status;
    }
}
