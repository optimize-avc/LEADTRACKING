import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore';

// Admin emails allowed to access metrics
const ADMIN_EMAILS = ['optimize@avcpp.com'];

interface UserData {
    id: string;
    email?: string;
    createdAt?: number;
    updatedAt?: number;
    tier?: string;
}

interface AnalyticsEvent {
    id: string;
    eventType?: string;
}

export async function GET(request: NextRequest) {
    try {
        // Get the authorization header (we'll pass the user email)
        const userEmail = request.headers.get('x-user-email');

        if (!userEmail || !ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const db = getAdminDb();

        // Get all users
        const usersSnapshot = await db.collection('users').get();
        const users: UserData[] = usersSnapshot.docs.map(
            (doc: QueryDocumentSnapshot<DocumentData>) => ({
                id: doc.id,
                ...(doc.data() as Omit<UserData, 'id'>),
            })
        );

        const now = Date.now();
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
        const oneDayAgo = now - 24 * 60 * 60 * 1000;

        // Calculate metrics
        const totalUsers = users.length;

        // Recent signups (last 7 days)
        const recentSignups = users
            .filter((u) => u.createdAt && u.createdAt > sevenDaysAgo)
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
            .slice(0, 10)
            .map((u) => ({
                email: u.email || 'Unknown',
                createdAt: u.createdAt,
                tier: u.tier || 'free',
            }));

        // Active users (updated in last 7 days)
        const activeUsersWeekly = users.filter(
            (u) => u.updatedAt && u.updatedAt > sevenDaysAgo
        ).length;

        // Active users (updated in last 24 hours)
        const activeUsersDaily = users.filter((u) => u.updatedAt && u.updatedAt > oneDayAgo).length;

        // Active users (updated in last 30 days)
        const activeUsersMonthly = users.filter(
            (u) => u.updatedAt && u.updatedAt > thirtyDaysAgo
        ).length;

        // Tier breakdown
        const tierBreakdown = {
            free: users.filter((u) => !u.tier || u.tier === 'free').length,
            pro: users.filter((u) => u.tier === 'pro').length,
            enterprise: users.filter((u) => u.tier === 'enterprise').length,
        };

        // Get total leads count
        const leadsSnapshot = await db.collection('leads').count().get();
        const totalLeads = leadsSnapshot.data().count;

        // Get leads created today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const leadsCreatedTodaySnapshot = await db
            .collection('leads')
            .where('createdAt', '>=', todayStart.getTime())
            .count()
            .get();
        const leadsCreatedToday = leadsCreatedTodaySnapshot.data().count;

        // Get analytics events for last 7 days
        let analyticsEvents: AnalyticsEvent[] = [];
        try {
            const analyticsSnapshot = await db
                .collection('analytics')
                .where('timestamp', '>=', sevenDaysAgo)
                .orderBy('timestamp', 'desc')
                .limit(100)
                .get();
            analyticsEvents = analyticsSnapshot.docs.map(
                (doc: QueryDocumentSnapshot<DocumentData>) => ({
                    id: doc.id,
                    ...(doc.data() as Omit<AnalyticsEvent, 'id'>),
                })
            );
        } catch (e) {
            // Analytics collection might not exist yet
            console.log('Analytics collection not available:', e);
        }

        // Count events by type
        const eventCounts = analyticsEvents.reduce((acc: Record<string, number>, event) => {
            if (event.eventType) {
                acc[event.eventType] = (acc[event.eventType] || 0) + 1;
            }
            return acc;
        }, {});

        return NextResponse.json({
            totalUsers,
            activeUsersDaily,
            activeUsersWeekly,
            activeUsersMonthly,
            recentSignups,
            tierBreakdown,
            totalLeads,
            leadsCreatedToday,
            analyticsEvents: eventCounts,
            fetchedAt: now,
        });
    } catch (error) {
        console.error('Error fetching admin metrics:', error);
        return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
    }
}
