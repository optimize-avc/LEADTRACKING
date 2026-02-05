/**
 * Company Usage API
 *
 * GET /api/company/usage - Get current usage stats
 * POST /api/company/usage/recalculate - Recalculate usage from actual data
 *
 * Security:
 * - Authentication required
 * - Company membership verified
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';

/**
 * Verify Firebase Auth token from Authorization header
 */
async function verifyAuth() {
    const headersList = await headers();
    const authHeader = headersList.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);

    try {
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(token);
        return decodedToken;
    } catch (error) {
        console.error('[Usage API] Token verification failed:', error);
        return null;
    }
}

/**
 * Get user's company ID
 */
async function getUserCompanyId(userId: string): Promise<string | null> {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return null;
    return userDoc.data()?.companyId || null;
}

/**
 * GET /api/company/usage - Get current usage
 */
export async function GET(request: NextRequest) {
    try {
        const decodedToken = await verifyAuth();
        if (!decodedToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const companyId = await getUserCompanyId(decodedToken.uid);
        if (!companyId) {
            return NextResponse.json({ error: 'No company found' }, { status: 404 });
        }

        const db = getAdminDb();
        const usageDoc = await db
            .collection('companies')
            .doc(companyId)
            .collection('meta')
            .doc('usage')
            .get();

        if (!usageDoc.exists) {
            // Return default usage
            return NextResponse.json({
                usage: {
                    leadCount: 0,
                    leadsThisMonth: 0,
                    teamMemberCount: 1,
                    emailsSentThisMonth: 0,
                    activitiesThisMonth: 0,
                    lastUpdated: Date.now(),
                    monthStartDate: new Date().toISOString().slice(0, 7),
                },
            });
        }

        return NextResponse.json({ usage: usageDoc.data() });
    } catch (error) {
        console.error('[Usage API] Error getting usage:', error);
        return NextResponse.json({ error: 'Failed to get usage' }, { status: 500 });
    }
}

/**
 * POST /api/company/usage - Recalculate usage from actual data
 */
export async function POST(request: NextRequest) {
    try {
        const decodedToken = await verifyAuth();
        if (!decodedToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const companyId = await getUserCompanyId(decodedToken.uid);
        if (!companyId) {
            return NextResponse.json({ error: 'No company found' }, { status: 404 });
        }

        const db = getAdminDb();

        // Count leads for this company
        const leadsQuery = await db
            .collection('leads')
            .where('companyId', '==', companyId)
            .count()
            .get();
        const leadCount = leadsQuery.data().count;

        // Also count leads with userId for backward compatibility
        const userLeadsQuery = await db
            .collection('leads')
            .where('userId', '==', decodedToken.uid)
            .count()
            .get();
        const userLeadCount = userLeadsQuery.data().count;

        // Use the higher count (in case some leads only have userId)
        const totalLeads = Math.max(leadCount, userLeadCount);

        // Count team members
        const teamQuery = await db
            .collection('companies')
            .doc(companyId)
            .collection('team')
            .count()
            .get();
        const teamCount = teamQuery.data().count || 1;

        // Count users with this companyId (alternative team count)
        const usersQuery = await db
            .collection('users')
            .where('companyId', '==', companyId)
            .count()
            .get();
        const usersCount = usersQuery.data().count || 1;

        const teamMemberCount = Math.max(teamCount, usersCount, 1);

        // Get current usage for monthly stats
        const usageRef = db.collection('companies').doc(companyId).collection('meta').doc('usage');
        const currentUsageDoc = await usageRef.get();
        const currentUsage = currentUsageDoc.exists ? currentUsageDoc.data() : {};

        const currentMonth = new Date().toISOString().slice(0, 7);
        const now = Date.now();

        const updatedUsage = {
            leadCount: totalLeads,
            leadsThisMonth:
                currentUsage?.monthStartDate === currentMonth
                    ? currentUsage?.leadsThisMonth || 0
                    : 0,
            teamMemberCount,
            emailsSentThisMonth:
                currentUsage?.monthStartDate === currentMonth
                    ? currentUsage?.emailsSentThisMonth || 0
                    : 0,
            activitiesThisMonth:
                currentUsage?.monthStartDate === currentMonth
                    ? currentUsage?.activitiesThisMonth || 0
                    : 0,
            lastUpdated: now,
            monthStartDate: currentMonth,
        };

        await usageRef.set(updatedUsage);

        console.log(`[Usage API] Recalculated usage for company ${companyId}:`, updatedUsage);

        return NextResponse.json({
            success: true,
            usage: updatedUsage,
            details: {
                leadsByCompanyId: leadCount,
                leadsByUserId: userLeadCount,
                teamFromSubcollection: teamCount,
                usersWithCompanyId: usersCount,
            },
        });
    } catch (error) {
        console.error('[Usage API] Error recalculating usage:', error);
        return NextResponse.json({ error: 'Failed to recalculate usage' }, { status: 500 });
    }
}
