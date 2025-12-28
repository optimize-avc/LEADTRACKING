'use client';

import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { DashboardService } from '@/lib/firebase/services';
import { formatCurrency } from '@/lib/utils/formatters';
import { TrendingUp, TrendingDown, Phone, Users, DollarSign, Calendar } from 'lucide-react';

// Fallback mock data when not logged in
const MOCK_ACTIVITY_DATA = [
    { day: 'Mon', dials: 52, connects: 6 },
    { day: 'Tue', dials: 48, connects: 5 },
    { day: 'Wed', dials: 55, connects: 8 },
    { day: 'Thu', dials: 45, connects: 4 },
    { day: 'Fri', dials: 38, connects: 3 },
    { day: 'Sat', dials: 12, connects: 1 },
    { day: 'Sun', dials: 0, connects: 0 },
];

const MOCK_PIPELINE_STAGES = [
    { stage: 'New Leads', count: 12, color: 'bg-blue-500' },
    { stage: 'Contacted', count: 8, color: 'bg-cyan-500' },
    { stage: 'Qualified', count: 6, color: 'bg-purple-500' },
    { stage: 'Proposal', count: 4, color: 'bg-amber-500' },
    { stage: 'Negotiation', count: 2, color: 'bg-green-500' },
];

interface DashboardMetrics {
    dials: number;
    pipelineValue: number;
    meetingsHeld: number;
    pipelineStatusCounts: Record<string, number>;
    totalLeads: number;
    emailsSent: number;
    activityChart: { day: string; dials: number; connects: number }[];
}

export default function Dashboard() {
    const { user, loading: authLoading } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            setIsLoading(false);
            return;
        }

        loadMetrics();
    }, [user, authLoading]);

    const loadMetrics = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const data = await DashboardService.getMetrics(user.uid);
            setMetrics(data);
        } catch (error) {
            console.error('Error loading metrics:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <main className="min-h-screen p-8 flex items-center justify-center">
                <div className="text-slate-500">Loading dashboard...</div>
            </main>
        );
    }

    // Use real data if available, otherwise use mock data
    const activityData = metrics?.activityChart || MOCK_ACTIVITY_DATA;
    const pipelineStages = metrics
        ? [
              {
                  stage: 'New Leads',
                  count: metrics.pipelineStatusCounts['New'] || 0,
                  color: 'bg-blue-500',
              },
              {
                  stage: 'Contacted',
                  count: metrics.pipelineStatusCounts['Contacted'] || 0,
                  color: 'bg-cyan-500',
              },
              {
                  stage: 'Qualified',
                  count: metrics.pipelineStatusCounts['Qualified'] || 0,
                  color: 'bg-purple-500',
              },
              {
                  stage: 'Proposal',
                  count: metrics.pipelineStatusCounts['Proposal'] || 0,
                  color: 'bg-amber-500',
              },
              {
                  stage: 'Negotiation',
                  count: metrics.pipelineStatusCounts['Negotiation'] || 0,
                  color: 'bg-green-500',
              },
          ]
        : MOCK_PIPELINE_STAGES;

    const maxDials = Math.max(...activityData.map((d) => d.dials));
    const totalDials = metrics?.dials ?? activityData.reduce((sum, d) => sum + d.dials, 0);
    const totalConnects = activityData.reduce((sum, d) => sum + d.connects, 0);
    const connectRate = totalDials > 0 ? ((totalConnects / totalDials) * 100).toFixed(1) : '0';
    const pipelineValue = metrics?.pipelineValue ?? 124000;
    const meetingsHeld = metrics?.meetingsHeld ?? 12;
    const totalLeads = metrics?.totalLeads ?? pipelineStages.reduce((sum, s) => sum + s.count, 0);

    return (
        <main className="min-h-screen p-8">
            <header className="mb-8">
                <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">
                    Sales &amp; Lead Tracking
                </h1>
                <p className="text-slate-400">
                    {user ? 'Real-time performance metrics' : 'Demo Mode - Log in to see your data'}
                </p>
            </header>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm text-slate-400 font-medium">
                                Today&apos;s Dials
                            </h3>
                            <div className="text-3xl font-bold text-blue-400 mt-2">
                                {totalDials}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                                <TrendingUp className="w-3 h-3 text-green-400" />
                                <span className="text-xs text-green-400">Keep it up!</span>
                            </div>
                        </div>
                        <div className="p-3 bg-blue-500/20 rounded-lg">
                            <Phone className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>
                </GlassCard>

                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm text-slate-400 font-medium">Connect Rate</h3>
                            <div className="text-3xl font-bold text-green-400 mt-2">
                                {connectRate}%
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                                <TrendingUp className="w-3 h-3 text-green-400" />
                                <span className="text-xs text-green-400">Above target (3-10%)</span>
                            </div>
                        </div>
                        <div className="p-3 bg-green-500/20 rounded-lg">
                            <Users className="w-6 h-6 text-green-400" />
                        </div>
                    </div>
                </GlassCard>

                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm text-slate-400 font-medium">Pipeline Value</h3>
                            <div className="text-3xl font-bold text-violet-400 mt-2">
                                {formatCurrency(pipelineValue, { compact: true })}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                                <TrendingDown className="w-3 h-3 text-amber-400" />
                                <span className="text-xs text-slate-500">
                                    Forecast:{' '}
                                    {formatCurrency(pipelineValue * 0.7, { compact: true })}
                                </span>
                            </div>
                        </div>
                        <div className="p-3 bg-violet-500/20 rounded-lg">
                            <DollarSign className="w-6 h-6 text-violet-400" />
                        </div>
                    </div>
                </GlassCard>

                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm text-slate-400 font-medium">
                                Meetings This Week
                            </h3>
                            <div className="text-3xl font-bold text-amber-400 mt-2">
                                {meetingsHeld}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                                <TrendingUp className="w-3 h-3 text-green-400" />
                                <span className="text-xs text-green-400">Great progress!</span>
                            </div>
                        </div>
                        <div className="p-3 bg-amber-500/20 rounded-lg">
                            <Calendar className="w-6 h-6 text-amber-400" />
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Activity Chart */}
                <GlassCard className="lg:col-span-2 min-h-[400px]">
                    <h2 className="text-xl font-semibold mb-6">Activity Performance</h2>
                    <div className="flex items-end justify-between h-64 gap-2 px-4">
                        {activityData.map((data) => (
                            <div key={data.day} className="flex-1 flex flex-col items-center gap-2">
                                <div
                                    className="w-full flex flex-col items-center gap-1"
                                    style={{ height: '200px' }}
                                >
                                    {/* Connects bar (smaller, on top) */}
                                    <div
                                        className="w-3 bg-green-500 rounded-t transition-all"
                                        style={{
                                            height:
                                                maxDials > 0
                                                    ? `${(data.connects / maxDials) * 200}px`
                                                    : '0px',
                                            marginTop: 'auto',
                                        }}
                                        title={`${data.connects} connects`}
                                    />
                                    {/* Dials bar */}
                                    <div
                                        className="w-full max-w-[40px] bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all"
                                        style={{
                                            height:
                                                maxDials > 0
                                                    ? `${(data.dials / maxDials) * 200}px`
                                                    : '0px',
                                        }}
                                        title={`${data.dials} dials`}
                                    />
                                </div>
                                <span className="text-xs text-slate-500">{data.day}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-slate-800">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded" />
                            <span className="text-xs text-slate-400">Dials</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded" />
                            <span className="text-xs text-slate-400">Connects</span>
                        </div>
                    </div>
                </GlassCard>

                {/* Lead Status */}
                <GlassCard className="min-h-[400px]">
                    <h2 className="text-xl font-semibold mb-4">Pipeline Status</h2>
                    <div className="space-y-4">
                        {pipelineStages.map((item) => (
                            <div key={item.stage} className="group">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-slate-300">
                                        {item.stage}
                                    </span>
                                    <span className="text-sm font-bold text-white">
                                        {item.count}
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${item.color} transition-all group-hover:opacity-80`}
                                        style={{
                                            width: `${totalLeads > 0 ? (item.count / totalLeads) * 100 : 0}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-800">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Total in Pipeline</span>
                            <span className="text-white font-bold">{totalLeads} leads</span>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </main>
    );
}
