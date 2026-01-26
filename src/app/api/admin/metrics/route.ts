import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

/**
 * GET: Fetch platform-wide admin metrics
 * Returns real data from Firestore collections
 */
export async function GET() {
    try {
        const db = getAdminDb();

        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

        // Fetch all data in parallel
        const [companiesSnap, usersSnap, leadsSnap] = await Promise.all([
            db.collection('companies').get(),
            db.collection('users').get(),
            db.collectionGroup('leads').get(),
        ]);

        // Process companies
        const totalCompanies = companiesSnap.size;
        let activeCompanies = 0;
        const planBreakdown = { free: 0, pro: 0, enterprise: 0 };

        companiesSnap.forEach((doc) => {
            const data = doc.data();
            // Active if updated in last 7 days
            if (data.updatedAt && data.updatedAt > oneWeekAgo) {
                activeCompanies++;
            }
            // Count by tier
            const tier = data.tier || 'free';
            if (tier === 'enterprise' || tier === 'venture') {
                planBreakdown.enterprise++;
            } else if (tier === 'pro') {
                planBreakdown.pro++;
            } else {
                planBreakdown.free++;
            }
        });

        // Process users
        const totalUsers = usersSnap.size;
        let activeUsersDaily = 0;
        let activeUsersWeekly = 0;
        let activeUsersMonthly = 0;
        const recentSignups: Array<{
            id: string;
            email: string;
            createdAt: number;
            tier: string;
        }> = [];

        usersSnap.forEach((doc) => {
            const data = doc.data();
            const lastActive = data.updatedAt || data.createdAt || 0;

            if (lastActive > oneDayAgo) activeUsersDaily++;
            if (lastActive > oneWeekAgo) activeUsersWeekly++;
            if (lastActive > oneMonthAgo) activeUsersMonthly++;

            // Collect recent signups (last 7 days)
            if (data.createdAt && data.createdAt > oneWeekAgo) {
                recentSignups.push({
                    id: doc.id,
                    email: data.email || 'Unknown',
                    createdAt: data.createdAt,
                    tier: data.tier || 'free',
                });
            }
        });

        // Sort recent signups by date (newest first)
        recentSignups.sort((a, b) => b.createdAt - a.createdAt);

        // Process leads
        const totalLeads = leadsSnap.size;
        let leadsCreatedToday = 0;

        leadsSnap.forEach((doc) => {
            const data = doc.data();
            if (data.createdAt && data.createdAt > oneDayAgo) {
                leadsCreatedToday++;
            }
        });

        // MRR calculation (simplified - based on plan counts)
        // Free: $0, Pro: $49, Enterprise: $199
        const mrr = planBreakdown.pro * 49 + planBreakdown.enterprise * 199;

        const metrics = {
            totalCompanies,
            activeCompanies,
            totalUsers,
            activeUsersDaily,
            activeUsersWeekly,
            activeUsersMonthly,
            totalLeads,
            leadsCreatedToday,
            mrr,
            mrrChange: 0, // Would need historical data to calculate
            churnRate: 0, // Would need subscription tracking
            churnRateChange: 0,
            planBreakdown,
            recentSignups: recentSignups.slice(0, 10), // Top 10 recent
        };

        return NextResponse.json(metrics);
    } catch (error) {
        console.error('Admin metrics error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch metrics' },
            { status: 500 }
        );
    }
}
