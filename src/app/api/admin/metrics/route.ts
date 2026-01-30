/**
 * Admin Metrics API
 *
 * Returns platform-wide metrics for super admins.
 * Protected: Only accessible by users with superAdmin role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { rateLimit, errorResponse } from '@/lib/api-middleware';
import { RATE_LIMITS } from '@/lib/rate-limit';
import { Timestamp } from 'firebase-admin/firestore';

// Super admin emails - in production, this would come from environment or database
const SUPER_ADMIN_EMAILS = ['admin@avcpp.com', 'blazehaze4201980@gmail.com', 'optimize@avcpp.com'];

interface AdminMetrics {
    totalCompanies: number;
    activeCompanies: number;
    totalUsers: number;
    activeUsersDaily: number;
    activeUsersWeekly: number;
    activeUsersMonthly: number;
    totalLeads: number;
    leadsCreatedToday: number;
    mrr: number;
    mrrChange: number;
    churnRate: number;
    churnRateChange: number;
    planBreakdown: {
        free: number;
        pro: number;
        enterprise: number;
    };
}

// Firestore document types
interface FirestoreUser {
    id: string;
    lastActiveAt?: Timestamp | Date;
    [key: string]: unknown;
}

interface FirestoreCompany {
    id: string;
    tier?: string;
    plan?: string;
    usage?: {
        lastActivityAt?: Timestamp | Date;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

interface FirestoreLead {
    createdAt?: Timestamp | Date;
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
async function verifySuperAdmin(
    authHeader: string | null
): Promise<{ uid: string; email: string } | null> {
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

export async function GET(request: NextRequest) {
    // Rate limit
    const rateLimitResult = rateLimit(request, undefined, RATE_LIMITS.api);
    if (rateLimitResult) return rateLimitResult;

    // Verify super admin
    const admin = await verifySuperAdmin(request.headers.get('authorization'));
    if (!admin) {
        return errorResponse('Unauthorized - Super admin access required', 403);
    }

    try {
        const db = getAdminDb();
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Get all companies
        const companiesSnapshot = await db.collection('companies').get();
        const companies: FirestoreCompany[] = companiesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        // Calculate metrics
        let totalLeads = 0;
        let leadsCreatedToday = 0;
        let activeCompanies = 0;
        const planBreakdown = { free: 0, pro: 0, enterprise: 0 };

        // Get users collection for activity tracking
        const usersSnapshot = await db.collection('users').get();
        const users: FirestoreUser[] = usersSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        let activeUsersDaily = 0;
        let activeUsersWeekly = 0;
        let activeUsersMonthly = 0;

        // Count user activity
        for (const user of users) {
            const lastActive = toDate(user.lastActiveAt);
            if (lastActive) {
                if (lastActive >= startOfToday) activeUsersDaily++;
                if (lastActive >= oneWeekAgo) activeUsersWeekly++;
                if (lastActive >= oneMonthAgo) activeUsersMonthly++;
            }
        }

        // Process each company
        for (const company of companies) {
            // Count by plan
            const plan = company.tier || company.plan || 'free';
            if (plan === 'pro') planBreakdown.pro++;
            else if (plan === 'enterprise' || plan === 'venture') planBreakdown.enterprise++;
            else planBreakdown.free++;

            // Check if company is active (has usage in last 30 days)
            const lastActivity = toDate(company.usage?.lastActivityAt);
            if (lastActivity && lastActivity >= oneMonthAgo) {
                activeCompanies++;
            }

            // Count leads
            const leadsSnapshot = await db
                .collection('companies')
                .doc(company.id)
                .collection('leads')
                .get();

            totalLeads += leadsSnapshot.size;

            // Count today's leads
            for (const leadDoc of leadsSnapshot.docs) {
                const leadData = leadDoc.data() as FirestoreLead;
                const createdAt = toDate(leadData.createdAt);
                if (createdAt && createdAt >= startOfToday) {
                    leadsCreatedToday++;
                }
            }
        }

        // Calculate MRR (Monthly Recurring Revenue)
        // Pro = $49/month, Enterprise = $199/month (estimate)
        const mrr = planBreakdown.pro * 49 + planBreakdown.enterprise * 199;

        // For demo purposes, estimate MRR change and churn rate
        // In production, you'd track these over time
        const mrrChange = 8.5; // Would calculate from historical data
        const churnRate =
            companies.length > 0
                ? ((companies.length - activeCompanies) / companies.length) * 100
                : 0;
        const churnRateChange = -0.4; // Would calculate from historical data

        const metrics: AdminMetrics = {
            totalCompanies: companies.length,
            activeCompanies,
            totalUsers: users.length,
            activeUsersDaily,
            activeUsersWeekly,
            activeUsersMonthly,
            totalLeads,
            leadsCreatedToday,
            mrr,
            mrrChange,
            churnRate: parseFloat(churnRate.toFixed(1)),
            churnRateChange,
            planBreakdown,
        };

        return NextResponse.json(metrics);
    } catch (error) {
        console.error('Error fetching admin metrics:', error);
        return errorResponse('Failed to fetch metrics', 500);
    }
}
