/**
 * Analytics Metrics Service
 *
 * Multi-tenant analytics service for sales performance tracking.
 * All queries are scoped by companyId for proper data isolation.
 *
 * Collections:
 * - companies/{companyId}/dailyMetrics/{date_repId} - Aggregated daily stats per rep
 * - companies/{companyId}/team/{userId} - Team members with roles
 * - leads (with companyId field) - Leads scoped by company
 * - users/{userId}/activities - User activity logs
 */

import { getFirebaseDb } from './config';
import {
    collection,
    doc,
    getDocs,
    query,
    where,
    orderBy,
    increment,
    runTransaction,
} from 'firebase/firestore';
import { Lead, DailyMetrics } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface AnalyticsSummary {
    // Current period metrics
    totalDials: number;
    totalConnects: number;
    totalMeetings: number;
    totalEmails: number;
    totalTalkTime: number; // seconds
    pipelineCreated: number; // dollar value
    leadsCreated: number;
    dealsWon: number;
    revenueWon: number;

    // Conversion rates
    connectRate: number; // connects / dials
    meetingRate: number; // meetings / connects
    closeRate: number; // deals won / meetings

    // Comparison to previous period
    dialsTrend: number; // percentage change
    connectsTrend: number;
    meetingsTrend: number;
    pipelineTrend: number;
}

export interface DailyActivityData {
    date: string; // YYYY-MM-DD
    dayName: string; // Mon, Tue, etc.
    dials: number;
    connects: number;
    meetings: number;
    emails: number;
    pipelineValue: number;
}

export interface RepPerformance {
    repId: string;
    repName: string;
    repAvatar?: string;
    dials: number;
    connects: number;
    meetings: number;
    connectRate: number;
    pipelineGenerated: number;
    revenueWon: number;
    rank: number;
    badges: string[];
}

export interface AnalyticsDashboardData {
    summary: AnalyticsSummary;
    dailyActivity: DailyActivityData[];
    leaderboard: RepPerformance[];
    periodStart: Date;
    periodEnd: Date;
    companyId: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get date string in YYYY-MM-DD format
 */
function formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
}

/**
 * Get day name abbreviation
 */
function getDayName(date: Date): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
}

/**
 * Calculate percentage change between two values
 */
function calculateTrend(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
}

/**
 * Assign badges based on performance
 */
function assignBadges(
    rep: Omit<RepPerformance, 'badges' | 'rank'>,
    allReps: RepPerformance[]
): string[] {
    const badges: string[] = [];

    // MVP - highest revenue
    const maxRevenue = Math.max(...allReps.map((r) => r.revenueWon));
    if (rep.revenueWon === maxRevenue && maxRevenue > 0) {
        badges.push('MVP');
    }

    // Top Gun - highest dials
    const maxDials = Math.max(...allReps.map((r) => r.dials));
    if (rep.dials === maxDials && maxDials > 50) {
        badges.push('Top Gun');
    }

    // Closer - highest close rate (with minimum meetings)
    if (rep.meetings >= 5 && rep.connectRate > 0.12) {
        badges.push('Closer');
    }

    // Hustler - high activity volume
    if (rep.dials >= 200) {
        badges.push('Hustler');
    }

    return badges;
}

// ============================================================================
// Main Analytics Service
// ============================================================================

export const AnalyticsMetricsService = {
    /**
     * Get comprehensive analytics dashboard data for a company
     * @param companyId - The company/tenant ID
     * @param periodDays - Number of days to analyze (default 7)
     */
    async getDashboardData(
        companyId: string,
        periodDays: number = 7
    ): Promise<AnalyticsDashboardData> {
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setHours(23, 59, 59, 999);

        const periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - periodDays + 1);
        periodStart.setHours(0, 0, 0, 0);

        // Previous period for trend comparison
        const prevPeriodEnd = new Date(periodStart);
        prevPeriodEnd.setMilliseconds(-1);

        const prevPeriodStart = new Date(prevPeriodEnd);
        prevPeriodStart.setDate(prevPeriodStart.getDate() - periodDays + 1);
        prevPeriodStart.setHours(0, 0, 0, 0);

        // Fetch all required data in parallel
        const [currentMetrics, previousMetrics, teamMembers, leads] = await Promise.all([
            this.getDailyMetrics(companyId, periodStart, periodEnd),
            this.getDailyMetrics(companyId, prevPeriodStart, prevPeriodEnd),
            this.getTeamMembers(companyId),
            this.getCompanyLeads(companyId, periodStart, periodEnd),
        ]);

        // Aggregate current period metrics
        const currentAgg = this.aggregateMetrics(currentMetrics);
        const previousAgg = this.aggregateMetrics(previousMetrics);

        // Calculate deals won from leads
        const closedLeads = leads.filter((l) => l.status === 'Closed');
        const revenueWon = closedLeads.reduce((sum, l) => sum + (l.value || 0), 0);

        // Build summary with trends
        const summary: AnalyticsSummary = {
            totalDials: currentAgg.dials,
            totalConnects: currentAgg.connects,
            totalMeetings: currentAgg.meetings,
            totalEmails: currentAgg.emails,
            totalTalkTime: currentAgg.talkTime,
            pipelineCreated: currentAgg.pipeline,
            leadsCreated: currentAgg.leadsCreated,
            dealsWon: closedLeads.length,
            revenueWon,

            connectRate: currentAgg.dials > 0 ? currentAgg.connects / currentAgg.dials : 0,
            meetingRate: currentAgg.connects > 0 ? currentAgg.meetings / currentAgg.connects : 0,
            closeRate: currentAgg.meetings > 0 ? closedLeads.length / currentAgg.meetings : 0,

            dialsTrend: calculateTrend(currentAgg.dials, previousAgg.dials),
            connectsTrend: calculateTrend(currentAgg.connects, previousAgg.connects),
            meetingsTrend: calculateTrend(currentAgg.meetings, previousAgg.meetings),
            pipelineTrend: calculateTrend(currentAgg.pipeline, previousAgg.pipeline),
        };

        // Build daily activity chart data
        const dailyActivity = this.buildDailyActivityData(currentMetrics, periodStart, periodDays);

        // Build leaderboard
        const leaderboard = this.buildLeaderboard(currentMetrics, teamMembers, leads);

        return {
            summary,
            dailyActivity,
            leaderboard,
            periodStart,
            periodEnd,
            companyId,
        };
    },

    /**
     * Fetch daily metrics for a company within a date range
     */
    async getDailyMetrics(
        companyId: string,
        startDate: Date,
        endDate: Date
    ): Promise<DailyMetrics[]> {
        const db = getFirebaseDb();
        const metricsRef = collection(db, 'companies', companyId, 'dailyMetrics');

        const startKey = formatDateKey(startDate);
        const endKey = formatDateKey(endDate);

        const q = query(
            metricsRef,
            where('date', '>=', startKey),
            where('date', '<=', endKey),
            orderBy('date', 'asc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as DailyMetrics[];
    },

    /**
     * Get team members for a company
     */
    async getTeamMembers(
        companyId: string
    ): Promise<Map<string, { name: string; avatar?: string }>> {
        const db = getFirebaseDb();
        const teamRef = collection(db, 'companies', companyId, 'team');
        const snapshot = await getDocs(teamRef);

        const members = new Map<string, { name: string; avatar?: string }>();
        snapshot.docs.forEach((doc) => {
            const data = doc.data();
            members.set(doc.id, {
                name: data.name || data.email || 'Unknown',
                avatar: data.avatar,
            });
        });

        return members;
    },

    /**
     * Get leads for a company within a date range
     */
    async getCompanyLeads(companyId: string, startDate: Date, endDate: Date): Promise<Lead[]> {
        const db = getFirebaseDb();
        const leadsRef = collection(db, 'leads');

        const q = query(
            leadsRef,
            where('companyId', '==', companyId),
            where('updatedAt', '>=', startDate.getTime()),
            where('updatedAt', '<=', endDate.getTime())
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Lead[];
    },

    /**
     * Aggregate metrics from daily records
     */
    aggregateMetrics(metrics: DailyMetrics[]): {
        dials: number;
        connects: number;
        meetings: number;
        emails: number;
        talkTime: number;
        pipeline: number;
        leadsCreated: number;
    } {
        return metrics.reduce(
            (acc, m) => ({
                dials: acc.dials + (m.dials || 0),
                connects: acc.connects + (m.connects || 0),
                meetings: acc.meetings + (m.meetingsHeld || 0),
                emails: acc.emails + 0, // TODO: Add emails to DailyMetrics type
                talkTime: acc.talkTime + (m.talkTime || 0),
                pipeline: acc.pipeline + (m.revenueGenerated || 0),
                leadsCreated: acc.leadsCreated + (m.leadsCreated || 0),
            }),
            {
                dials: 0,
                connects: 0,
                meetings: 0,
                emails: 0,
                talkTime: 0,
                pipeline: 0,
                leadsCreated: 0,
            }
        );
    },

    /**
     * Build daily activity chart data
     */
    buildDailyActivityData(
        metrics: DailyMetrics[],
        periodStart: Date,
        periodDays: number
    ): DailyActivityData[] {
        // Create a map of date -> metrics for quick lookup
        const metricsMap = new Map<string, DailyMetrics[]>();
        metrics.forEach((m) => {
            const existing = metricsMap.get(m.date) || [];
            existing.push(m);
            metricsMap.set(m.date, existing);
        });

        // Build array for each day in the period
        const dailyData: DailyActivityData[] = [];
        for (let i = 0; i < periodDays; i++) {
            const date = new Date(periodStart);
            date.setDate(date.getDate() + i);
            const dateKey = formatDateKey(date);
            const dayMetrics = metricsMap.get(dateKey) || [];

            // Aggregate all reps' metrics for this day
            const dayAgg = dayMetrics.reduce(
                (acc, m) => ({
                    dials: acc.dials + (m.dials || 0),
                    connects: acc.connects + (m.connects || 0),
                    meetings: acc.meetings + (m.meetingsHeld || 0),
                    emails: acc.emails + 0,
                    pipelineValue: acc.pipelineValue + (m.revenueGenerated || 0),
                }),
                { dials: 0, connects: 0, meetings: 0, emails: 0, pipelineValue: 0 }
            );

            dailyData.push({
                date: dateKey,
                dayName: getDayName(date),
                ...dayAgg,
            });
        }

        return dailyData;
    },

    /**
     * Build performance leaderboard
     */
    buildLeaderboard(
        metrics: DailyMetrics[],
        teamMembers: Map<string, { name: string; avatar?: string }>,
        leads: Lead[]
    ): RepPerformance[] {
        // Aggregate metrics per rep
        const repMetrics = new Map<
            string,
            {
                dials: number;
                connects: number;
                meetings: number;
                pipeline: number;
            }
        >();

        metrics.forEach((m) => {
            const existing = repMetrics.get(m.repId) || {
                dials: 0,
                connects: 0,
                meetings: 0,
                pipeline: 0,
            };
            repMetrics.set(m.repId, {
                dials: existing.dials + (m.dials || 0),
                connects: existing.connects + (m.connects || 0),
                meetings: existing.meetings + (m.meetingsHeld || 0),
                pipeline: existing.pipeline + (m.revenueGenerated || 0),
            });
        });

        // Calculate revenue won per rep from closed leads
        const revenuePerRep = new Map<string, number>();
        leads
            .filter((l) => l.status === 'Closed')
            .forEach((l) => {
                const current = revenuePerRep.get(l.assignedTo) || 0;
                revenuePerRep.set(l.assignedTo, current + (l.value || 0));
            });

        // Build leaderboard array
        const leaderboard: RepPerformance[] = [];
        repMetrics.forEach((stats, repId) => {
            const member = teamMembers.get(repId);
            leaderboard.push({
                repId,
                repName: member?.name || 'Unknown Rep',
                repAvatar: member?.avatar,
                dials: stats.dials,
                connects: stats.connects,
                meetings: stats.meetings,
                connectRate: stats.dials > 0 ? stats.connects / stats.dials : 0,
                pipelineGenerated: stats.pipeline,
                revenueWon: revenuePerRep.get(repId) || 0,
                rank: 0, // Will be set after sorting
                badges: [], // Will be set after ranking
            });
        });

        // Sort by revenue won (primary) then pipeline (secondary)
        leaderboard.sort((a, b) => {
            if (b.revenueWon !== a.revenueWon) return b.revenueWon - a.revenueWon;
            return b.pipelineGenerated - a.pipelineGenerated;
        });

        // Assign ranks and badges
        leaderboard.forEach((rep, index) => {
            rep.rank = index + 1;
            rep.badges = assignBadges(rep, leaderboard);
        });

        return leaderboard;
    },

    // ========================================================================
    // Metrics Recording (called when activities are logged)
    // ========================================================================

    /**
     * Record an activity and update daily metrics
     * Call this when logging calls, meetings, etc.
     */
    async recordActivity(
        companyId: string,
        repId: string,
        activity: {
            type: 'dial' | 'connect' | 'meeting' | 'email';
            talkTime?: number; // seconds for calls
            pipelineValue?: number; // for deals created
        }
    ): Promise<void> {
        const db = getFirebaseDb();
        const today = formatDateKey(new Date());
        const metricsId = `${today}_${repId}`;

        const metricsRef = doc(db, 'companies', companyId, 'dailyMetrics', metricsId);

        // Use transaction to ensure atomic increment
        await runTransaction(db, async (transaction) => {
            const metricsDoc = await transaction.get(metricsRef);

            if (!metricsDoc.exists()) {
                // Create new daily metrics record
                const newMetrics: DailyMetrics = {
                    id: metricsId,
                    date: today,
                    repId,
                    dials: activity.type === 'dial' ? 1 : 0,
                    connects: activity.type === 'connect' ? 1 : 0,
                    talkTime: activity.talkTime || 0,
                    meetingsHeld: activity.type === 'meeting' ? 1 : 0,
                    revenueGenerated: activity.pipelineValue || 0,
                    leadsCreated: 0,
                };
                transaction.set(metricsRef, newMetrics);
            } else {
                // Increment existing metrics
                const updates: Record<string, unknown> = {};

                if (activity.type === 'dial') {
                    updates.dials = increment(1);
                }
                if (activity.type === 'connect') {
                    updates.connects = increment(1);
                }
                if (activity.type === 'meeting') {
                    updates.meetingsHeld = increment(1);
                }
                if (activity.talkTime) {
                    updates.talkTime = increment(activity.talkTime);
                }
                if (activity.pipelineValue) {
                    updates.revenueGenerated = increment(activity.pipelineValue);
                }

                transaction.update(metricsRef, updates);
            }
        });
    },

    /**
     * Record a new lead creation
     */
    async recordLeadCreated(
        companyId: string,
        repId: string,
        leadValue: number = 0
    ): Promise<void> {
        const db = getFirebaseDb();
        const today = formatDateKey(new Date());
        const metricsId = `${today}_${repId}`;

        const metricsRef = doc(db, 'companies', companyId, 'dailyMetrics', metricsId);

        await runTransaction(db, async (transaction) => {
            const metricsDoc = await transaction.get(metricsRef);

            if (!metricsDoc.exists()) {
                const newMetrics: DailyMetrics = {
                    id: metricsId,
                    date: today,
                    repId,
                    dials: 0,
                    connects: 0,
                    talkTime: 0,
                    meetingsHeld: 0,
                    revenueGenerated: leadValue,
                    leadsCreated: 1,
                };
                transaction.set(metricsRef, newMetrics);
            } else {
                transaction.update(metricsRef, {
                    leadsCreated: increment(1),
                    revenueGenerated: increment(leadValue),
                });
            }
        });
    },

    // ========================================================================
    // Individual Rep Analytics
    // ========================================================================

    /**
     * Get analytics for a specific rep
     */
    async getRepAnalytics(
        companyId: string,
        repId: string,
        periodDays: number = 7
    ): Promise<{
        summary: Omit<
            AnalyticsSummary,
            'dialsTrend' | 'connectsTrend' | 'meetingsTrend' | 'pipelineTrend'
        >;
        dailyActivity: DailyActivityData[];
    }> {
        const db = getFirebaseDb();
        const now = new Date();
        const periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - periodDays + 1);
        periodStart.setHours(0, 0, 0, 0);

        const metricsRef = collection(db, 'companies', companyId, 'dailyMetrics');
        const startKey = formatDateKey(periodStart);
        const endKey = formatDateKey(now);

        const q = query(
            metricsRef,
            where('repId', '==', repId),
            where('date', '>=', startKey),
            where('date', '<=', endKey),
            orderBy('date', 'asc')
        );

        const snapshot = await getDocs(q);
        const metrics = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as DailyMetrics[];

        const agg = this.aggregateMetrics(metrics);

        return {
            summary: {
                totalDials: agg.dials,
                totalConnects: agg.connects,
                totalMeetings: agg.meetings,
                totalEmails: agg.emails,
                totalTalkTime: agg.talkTime,
                pipelineCreated: agg.pipeline,
                leadsCreated: agg.leadsCreated,
                dealsWon: 0, // Would need to query leads for this
                revenueWon: 0,
                connectRate: agg.dials > 0 ? agg.connects / agg.dials : 0,
                meetingRate: agg.connects > 0 ? agg.meetings / agg.connects : 0,
                closeRate: 0,
            },
            dailyActivity: this.buildDailyActivityData(metrics, periodStart, periodDays),
        };
    },
};

export default AnalyticsMetricsService;
