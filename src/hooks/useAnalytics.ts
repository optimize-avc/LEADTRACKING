'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCompany } from './useCompany';
import { useAuth } from '@/components/providers/AuthProvider';
import {
    AnalyticsMetricsService,
    AnalyticsDashboardData,
    AnalyticsSummary,
    DailyActivityData,
    RepPerformance,
} from '@/lib/firebase/analyticsMetrics';

// Demo data for non-authenticated users or new companies
const DEMO_SUMMARY: AnalyticsSummary = {
    totalDials: 238,
    totalConnects: 26,
    totalMeetings: 9,
    totalEmails: 45,
    totalTalkTime: 14400, // 4 hours
    pipelineCreated: 45200,
    leadsCreated: 12,
    dealsWon: 3,
    revenueWon: 28500,
    connectRate: 0.109,
    meetingRate: 0.346,
    closeRate: 0.333,
    dialsTrend: 12,
    connectsTrend: 8,
    meetingsTrend: -18,
    pipelineTrend: 24,
};

const DEMO_DAILY_ACTIVITY: DailyActivityData[] = [
    {
        date: '2025-01-27',
        dayName: 'Mon',
        dials: 52,
        connects: 6,
        meetings: 2,
        emails: 8,
        pipelineValue: 4500,
    },
    {
        date: '2025-01-28',
        dayName: 'Tue',
        dials: 48,
        connects: 5,
        meetings: 1,
        emails: 6,
        pipelineValue: 3200,
    },
    {
        date: '2025-01-29',
        dayName: 'Wed',
        dials: 55,
        connects: 8,
        meetings: 3,
        emails: 10,
        pipelineValue: 6800,
    },
    {
        date: '2025-01-30',
        dayName: 'Thu',
        dials: 45,
        connects: 4,
        meetings: 1,
        emails: 7,
        pipelineValue: 2100,
    },
    {
        date: '2025-01-31',
        dayName: 'Fri',
        dials: 38,
        connects: 3,
        meetings: 2,
        emails: 9,
        pipelineValue: 5400,
    },
    {
        date: '2025-02-01',
        dayName: 'Sat',
        dials: 15,
        connects: 1,
        meetings: 0,
        emails: 3,
        pipelineValue: 1200,
    },
    {
        date: '2025-02-02',
        dayName: 'Sun',
        dials: 10,
        connects: 1,
        meetings: 0,
        emails: 2,
        pipelineValue: 800,
    },
];

const DEMO_LEADERBOARD: RepPerformance[] = [
    {
        repId: 'demo-1',
        repName: 'Sarah Chen',
        dials: 285,
        connects: 32,
        meetings: 12,
        connectRate: 0.112,
        pipelineGenerated: 125000,
        revenueWon: 125000,
        rank: 1,
        badges: ['MVP'],
    },
    {
        repId: 'demo-2',
        repName: 'Alex Rodriguez',
        dials: 238,
        connects: 26,
        meetings: 9,
        connectRate: 0.109,
        pipelineGenerated: 98400,
        revenueWon: 98400,
        rank: 2,
        badges: ['Top Gun'],
    },
    {
        repId: 'demo-3',
        repName: 'Mike Johnson',
        dials: 212,
        connects: 21,
        meetings: 7,
        connectRate: 0.099,
        pipelineGenerated: 82100,
        revenueWon: 82100,
        rank: 3,
        badges: [],
    },
    {
        repId: 'demo-4',
        repName: 'Emily Davis',
        dials: 198,
        connects: 19,
        meetings: 6,
        connectRate: 0.096,
        pipelineGenerated: 65000,
        revenueWon: 65000,
        rank: 4,
        badges: [],
    },
];

export type TimePeriod = '7d' | '14d' | '30d' | '90d';

interface UseAnalyticsOptions {
    period?: TimePeriod;
    autoRefresh?: boolean;
    refreshInterval?: number; // ms
}

interface UseAnalyticsResult {
    data: AnalyticsDashboardData | null;
    loading: boolean;
    error: Error | null;
    isDemo: boolean;
    refetch: () => Promise<void>;
    setPeriod: (period: TimePeriod) => void;
    currentPeriod: TimePeriod;
}

const PERIOD_DAYS: Record<TimePeriod, number> = {
    '7d': 7,
    '14d': 14,
    '30d': 30,
    '90d': 90,
};

/**
 * Hook for fetching and managing analytics dashboard data
 *
 * Multi-tenant aware - scopes all queries by company ID
 * Falls back to demo data for unauthenticated users or new companies
 */
export function useAnalytics(options: UseAnalyticsOptions = {}): UseAnalyticsResult {
    const {
        period: initialPeriod = '7d',
        autoRefresh = false,
        refreshInterval = 60000, // 1 minute
    } = options;

    const { user } = useAuth();
    const { company, loading: companyLoading } = useCompany();

    const [data, setData] = useState<AnalyticsDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [isDemo, setIsDemo] = useState(false);
    const [currentPeriod, setCurrentPeriod] = useState<TimePeriod>(initialPeriod);

    const fetchAnalytics = useCallback(async () => {
        // If no user or no company, use demo data
        if (!user || !company?.id) {
            const now = new Date();
            const periodStart = new Date(now);
            periodStart.setDate(periodStart.getDate() - PERIOD_DAYS[currentPeriod] + 1);

            setData({
                summary: DEMO_SUMMARY,
                dailyActivity: DEMO_DAILY_ACTIVITY,
                leaderboard: DEMO_LEADERBOARD,
                periodStart,
                periodEnd: now,
                companyId: 'demo',
            });
            setIsDemo(true);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setIsDemo(false);

            const analyticsData = await AnalyticsMetricsService.getDashboardData(
                company.id,
                PERIOD_DAYS[currentPeriod]
            );

            // If no data exists yet, still show demo data but indicate it
            if (analyticsData.summary.totalDials === 0 && analyticsData.leaderboard.length === 0) {
                const now = new Date();
                const periodStart = new Date(now);
                periodStart.setDate(periodStart.getDate() - PERIOD_DAYS[currentPeriod] + 1);

                setData({
                    summary: DEMO_SUMMARY,
                    dailyActivity: DEMO_DAILY_ACTIVITY,
                    leaderboard: DEMO_LEADERBOARD,
                    periodStart,
                    periodEnd: now,
                    companyId: company.id,
                });
                setIsDemo(true);
            } else {
                setData(analyticsData);
            }
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch analytics'));

            // On error, fall back to demo data
            const now = new Date();
            const periodStart = new Date(now);
            periodStart.setDate(periodStart.getDate() - PERIOD_DAYS[currentPeriod] + 1);

            setData({
                summary: DEMO_SUMMARY,
                dailyActivity: DEMO_DAILY_ACTIVITY,
                leaderboard: DEMO_LEADERBOARD,
                periodStart,
                periodEnd: now,
                companyId: 'demo',
            });
            setIsDemo(true);
        } finally {
            setLoading(false);
        }
    }, [user, company?.id, currentPeriod]);

    // Initial fetch and period changes
    useEffect(() => {
        if (companyLoading) return;
        fetchAnalytics();
    }, [companyLoading, fetchAnalytics]);

    // Auto-refresh
    useEffect(() => {
        if (!autoRefresh || companyLoading) return;

        const interval = setInterval(fetchAnalytics, refreshInterval);
        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval, fetchAnalytics, companyLoading]);

    const refetch = useCallback(async () => {
        await fetchAnalytics();
    }, [fetchAnalytics]);

    const setPeriod = useCallback((period: TimePeriod) => {
        setCurrentPeriod(period);
    }, []);

    return {
        data,
        loading: companyLoading || loading,
        error,
        isDemo,
        refetch,
        setPeriod,
        currentPeriod,
    };
}

export default useAnalytics;
