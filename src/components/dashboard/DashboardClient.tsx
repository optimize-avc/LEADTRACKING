'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLeads } from '@/lib/api/hooks/useLeads';
import { useActivities } from '@/lib/api/hooks/useActivities';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Activity, Lead } from '@/types';
import { ActivityPerformanceChart } from '@/components/dashboard/ActivityPerformanceChart';

export default function DashboardClient() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    // 1. Fetch Data via Hooks (Deduplicated & Cached)
    const { leads, isLoading: leadsLoading } = useLeads();
    const { activities, isLoading: activitiesLoading } = useActivities();

    const isLoading = authLoading || leadsLoading || activitiesLoading;

    // 2. Client-Side Aggregation (Memoized)
    // Since we now fetch raw lists once, we calculate stats on the fly.
    // This is fast for <5k items. For >5k, we would need server-side aggregation.
    const metrics = useMemo(() => {
        if (!user || isLoading) return null;

        const now = new Date();
        const startOfDay = new Date(now.setHours(0, 0, 0, 0)).getTime();
        const startOfWeek = new Date();
        startOfWeek.setDate(now.getDate() - 6);
        startOfWeek.setHours(0, 0, 0, 0);

        // Daily Activities
        const todayActivities = activities.filter((a: Activity) => a.timestamp >= startOfDay);
        const dials = todayActivities.filter((a: Activity) => a.type === 'call').length;
        const meetingsHeld = todayActivities.filter((a: Activity) => a.type === 'meeting').length;

        // Connect Rate (Simple version for now)
        const calls = todayActivities.filter((a: Activity) => a.type === 'call');
        const connects = calls.filter((a: Activity) =>
            ['connected', 'meeting_set', 'qualified'].includes(a.outcome)
        ).length;
        const connectRate = calls.length > 0 ? (connects / calls.length) * 100 : 0;

        // Pipeline Value
        const activeLeads = leads.filter((l: Lead) => !['Lost', 'Closed'].includes(l.status));
        const pipelineValue = activeLeads.reduce(
            (sum: number, lead: Lead) => sum + (lead.value || 0),
            0
        );

        // Pipeline Distribution
        const pipelineStatusCounts: Record<string, number> = {};
        activeLeads.forEach((lead: Lead) => {
            pipelineStatusCounts[lead.status] = (pipelineStatusCounts[lead.status] || 0) + 1;
        });

        return {
            dials,
            connectRate,
            pipelineValue,
            meetingsHeld,
            pipelineStatusCounts,
        };
    }, [user, isLoading, leads, activities]);

    const hasData = leads.length > 0 || activities.length > 0;

    // Loading State
    if (isLoading) {
        return <DashboardSkeleton />;
    }

    // Empty State (New User)
    if (!hasData) {
        return (
            <div className="py-12">
                <EmptyState
                    title="Welcome to SalesTracker"
                    description="Your dashboard is looking a bit empty. Start by adding your first lead to track your sales pipeline."
                    actionLabel="Add Lead"
                    actionLink="/leads"
                />
            </div>
        );
    }

    // Pipeline Status Display Data
    const pipelineRows = Object.entries(metrics?.pipelineStatusCounts || {})
        .map(([status, count]) => ({
            label: status,
            count: count,
            color: getColorForStatus(status),
        }))
        .sort((a, b) => b.count - a.count);

    return (
        <>
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <KpiCard
                    title="Daily Dials"
                    value={metrics?.dials || 0}
                    subvalue="/50"
                    glowColor="bg-blue-500"
                    percent={((metrics?.dials || 0) / 50) * 100}
                />
                <KpiCard
                    title="Connect Rate"
                    value={`${(metrics?.connectRate || 0).toFixed(1)}%`}
                    subtext="Target: 15%"
                    glowColor="bg-emerald-500"
                    textColor="text-emerald-400"
                />
                <KpiCard
                    title="Pipeline Value"
                    value={`$${((metrics?.pipelineValue || 0) / 1000).toFixed(1)}k`}
                    subtext={`${leads.length} Active Leads`}
                    glowColor="bg-violet-500"
                    textColor="text-violet-400"
                />
                <KpiCard
                    title="Meetings Held"
                    value={metrics?.meetingsHeld || 0}
                    subtext="Today"
                    glowColor="bg-amber-500"
                    textColor="text-amber-400"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Activity Feed / Chart */}
                <div className="glass-card lg:col-span-2 min-h-[500px] flex flex-col">
                    <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
                        Activity Performance
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-400 font-normal border border-white/5">
                            This Week
                        </span>
                    </h2>

                    {/* Placeholder for Recharts implementation - utilizing data prop later */}
                    <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-800/50 rounded-2xl bg-slate-900/20">
                        <ActivityPerformanceChart data={activities} />
                    </div>
                </div>

                {/* Lead Status */}
                <div className="glass-card flex flex-col">
                    <h2 className="text-xl font-bold text-slate-100 mb-6">Pipeline Status</h2>
                    <div className="space-y-3">
                        {pipelineRows.length === 0 ? (
                            <div className="text-slate-500 text-sm text-center py-4">
                                No active opportunities
                            </div>
                        ) : (
                            pipelineRows.map((stage) => (
                                <div
                                    key={stage.label}
                                    className="group flex items-center justify-between p-4 bg-slate-900/40 border border-white/5 rounded-xl hover:border-white/10 hover:bg-slate-800/60 transition-all cursor-pointer"
                                    onClick={() => router.push('/leads')}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-2 h-2 rounded-full ${stage.color} shadow-[0_0_8px_currentColor] opacity-80 group-hover:opacity-100`}
                                        />
                                        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                                            {stage.label}
                                        </span>
                                    </div>
                                    <span className="text-xs font-bold bg-slate-950 px-2.5 py-1 rounded-md text-slate-400 border border-white/5 group-hover:border-white/10 group-hover:text-white transition-all">
                                        {stage.count}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    <button
                        onClick={() => router.push('/leads')}
                        className="mt-6 w-full glass-button py-3 text-sm"
                    >
                        View Full Pipeline
                    </button>
                </div>
            </div>
        </>
    );
}

// --- Subcomponents for Cleanliness ---

interface KpiCardProps {
    title: string;
    value: string | number;
    subvalue?: string;
    subtext?: string;
    glowColor: string;
    percent?: number;
    textColor?: string;
}

function KpiCard({
    title,
    value,
    subvalue,
    subtext,
    glowColor,
    percent,
    textColor = 'text-slate-100',
}: KpiCardProps) {
    return (
        <div className="glass-card group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <div className={`w-24 h-24 ${glowColor} rounded-full blur-3xl`}></div>
            </div>
            <h3 className="text-sm text-slate-400 font-medium uppercase tracking-wider">{title}</h3>
            <div className={`text-4xl font-bold ${textColor} mt-4`}>
                {value}
                {subvalue && <span className="text-slate-500 text-xl font-normal">{subvalue}</span>}
            </div>

            {percent !== undefined ? (
                <div className="mt-4 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${glowColor.replace('bg-', 'bg-')} shadow-[0_0_12px_rgba(59,130,246,0.5)]`}
                            style={{ width: `${percent}%` }}
                        ></div>
                    </div>
                    <span className="text-xs text-blue-400 font-bold">{percent.toFixed(0)}%</span>
                </div>
            ) : (
                <p className="text-xs text-slate-500 mt-2 font-medium">{subtext}</p>
            )}
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-40 bg-slate-800/50 rounded-2xl" />
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 h-[500px] bg-slate-800/50 rounded-2xl" />
                <div className="h-[500px] bg-slate-800/50 rounded-2xl" />
            </div>
        </div>
    );
}

function getColorForStatus(status: string) {
    switch (status) {
        case 'New':
            return 'bg-blue-500';
        case 'Contacted':
            return 'bg-indigo-500';
        case 'Qualified':
            return 'bg-emerald-500';
        case 'Proposal':
            return 'bg-violet-500';
        case 'Negotiation':
            return 'bg-amber-500';
        case 'Closed':
            return 'bg-green-500';
        default:
            return 'bg-slate-500';
    }
}
