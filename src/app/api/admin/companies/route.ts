/**
 * Admin Companies API
 * 
 * CRUD operations for managing companies (tenants).
 * Protected: Only accessible by super admins.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { rateLimit, errorResponse } from '@/lib/api-middleware';
import { RATE_LIMITS } from '@/lib/rate-limit';
import { ServerAuditService } from '@/lib/firebase/server-audit';
import { Timestamp } from 'firebase-admin/firestore';

// Super admin emails
const SUPER_ADMIN_EMAILS = [
    'admin@avcpp.com',
    'blazehaze4201980@gmail.com',
    'optimize@avcpp.com',
];

interface CompanyListItem {
    id: string;
    name: string;
    tier: string;
    createdAt: string;
    memberCount: number;
    leadCount: number;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    disabled?: boolean;
}

// Firestore document type
interface FirestoreCompany {
    name?: string;
    tier?: string;
    createdAt?: Timestamp | Date;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    disabled?: boolean;
    [key: string]: unknown;
}

/**
 * Safely convert Firestore timestamp to Date
 */
function toDate(value: Timestamp | Date | undefined): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (typeof (value as Timestamp).toDate === 'function') {
        return (value as Timestamp).toDate();
    }
    return undefined;
}

/**
 * Verify user is a super admin
 */
async function verifySuperAdmin(authHeader: string | null): Promise<{ uid: string; email: string } | null> {
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }

    try {
        const token = authHeader.substring(7);
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(token);

        if (!decodedToken.email || !SUPER_ADMIN_EMAILS.includes(decodedToken.email)) {
            return null;
        }

        return {
            uid: decodedToken.uid,
            email: decodedToken.email,
        };
    } catch {
        return null;
    }
}

/**
 * GET /api/admin/companies
 * List all companies with pagination and search
 */
export async function GET(request: NextRequest) {
    const rateLimitResult = rateLimit(request, undefined, RATE_LIMITS.api);
    if (rateLimitResult) return rateLimitResult;

    const admin = await verifySuperAdmin(request.headers.get('authorization'));
    if (!admin) {
        return errorResponse('Unauthorized - Super admin access required', 403);
    }

    try {
        const db = getAdminDb();
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search')?.toLowerCase();
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const offset = parseInt(searchParams.get('offset') || '0');

        const query = db.collection('companies').orderBy('createdAt', 'desc');
        
        const snapshot = await query.get();
        let companies: CompanyListItem[] = [];

        for (const doc of snapshot.docs) {
            const data = doc.data() as FirestoreCompany;
            
            // Apply search filter
            if (search && !data.name?.toLowerCase().includes(search)) {
                continue;
            }

            // Get member count
            const membersSnapshot = await db
                .collection('companies')
                .doc(doc.id)
                .collection('members')
                .count()
                .get();

            // Get lead count
            const leadsSnapshot = await db
                .collection('companies')
                .doc(doc.id)
                .collection('leads')
                .count()
                .get();

            const createdAt = toDate(data.createdAt);
            
            companies.push({
                id: doc.id,
                name: data.name || 'Unknown',
                tier: data.tier || 'free',
                createdAt: createdAt?.toISOString() || new Date().toISOString(),
                memberCount: membersSnapshot.data().count,
                leadCount: leadsSnapshot.data().count,
                stripeCustomerId: data.stripeCustomerId,
                stripeSubscriptionId: data.stripeSubscriptionId,
                disabled: data.disabled || false,
            });
        }

        // Apply pagination
        const total = companies.length;
        companies = companies.slice(offset, offset + limit);

        return NextResponse.json({
            companies,
            total,
            limit,
            offset,
        });
    } catch (error) {
        console.error('Error listing companies:', error);
        return errorResponse('Failed to list companies', 500);
    }
}

/**
 * PATCH /api/admin/companies
 * Update company properties (tier, disabled status, etc.)
 */
export async function PATCH(request: NextRequest) {
    const rateLimitResult = rateLimit(request, undefined, RATE_LIMITS.api);
    if (rateLimitResult) return rateLimitResult;

    const admin = await verifySuperAdmin(request.headers.get('authorization'));
    if (!admin) {
        return errorResponse('Unauthorized - Super admin access required', 403);
    }

    try {
        const body = await request.json();
        const { companyId, tier, disabled, trialEndsAt } = body;

        if (!companyId) {
            return errorResponse('Company ID is required', 400);
        }

        const db = getAdminDb();
        const companyRef = db.collection('companies').doc(companyId);
        const companyDoc = await companyRef.get();

        if (!companyDoc.exists) {
            return errorResponse('Company not found', 404);
        }

        const updates: Record<string, unknown> = {
            updatedAt: new Date(),
        };

        if (tier !== undefined) {
            updates.tier = tier;
        }

        if (disabled !== undefined) {
            updates.disabled = disabled;
        }

        if (trialEndsAt !== undefined) {
            updates.trialEndsAt = trialEndsAt ? new Date(trialEndsAt) : null;
        }

        await companyRef.update(updates);

        // Log the admin action
        await ServerAuditService.logAdminAction(
            companyId,
            admin.uid,
            'company_updated',
            { updates, adminEmail: admin.email }
        );

        return NextResponse.json({
            success: true,
            companyId,
            updates,
        });
    } catch (error) {
        console.error('Error updating company:', error);
        return errorResponse('Failed to update company', 500);
    }
}
