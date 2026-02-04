'use client';

import React, { useMemo } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import {
    TrendingUp,
    TrendingDown,
    Target,
    Phone,
    Calendar,
    Users,
    DollarSign,
    BarChart3,
    Clock,
    Loader2,
    AlertTriangle,
    RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnalytics, TimePeriod } from '@/hooks/useAnalytics';
import { formatCurrency } from '@/lib/utils/formatters';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
} from 'recharts';

// ============================================================================
// Helper Components
// ============================================================================

interface StatCardProps {
    title: string;
    value: string;
    change: string;
    trend: 'up' | 'down' | 'neutral';
    icon: React.ElementType;
    color: string;
}

function StatCard({ title, value, change, trend, icon: Icon, color }: StatCardProps) {
    const colorClasses: Record<string, { bg: string; text: string }> = {
        blue: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
        green: { bg: 'bg-green-500/10', text: 'text-green-400' },
        purple: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
        amber: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
        cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
    };

    const colors = colorClasses[color] || colorClasses.blue;

    return (
        <GlassCard className="group hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-400">{title}</p>
                    <p className="text-3xl font-bold text-white mt-1">{value}</p>
                    <div className="flex items-center gap-1 mt-2">
                        {trend === 'up' ? (
                            <TrendingUp className="w-4 h-4 text-green-400" />
                        ) : trend === 'down' ? (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                        ) : (
                            <div className="w-4 h-4" />
                        )}
                        <span
                            className={`text-xs font-medium ${
                                trend === 'up'
                                    ? 'text-green-400'
                                    : trend === 'down'
                                      ? 'text-red-400'
                                      : 'text-slate-500'
                            }`}
                        >
                            {change} vs last period
                        </span>
                    </div>
                </div>
                <div
                    className={`p-4 ${colors.bg} rounded-2xl group-hover:scale-110 transition-transform`}
                >
                    <Icon className={`w-6 h-6 ${colors.text}`} />
                </div>
            </div>
        </GlassCard>
    );
}

interface PeriodSelectorProps {
    value: TimePeriod;
    onChange: (period: TimePeriod) => void;
}

function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
    const periods: { value: TimePeriod; label: string }[] = [
        { value: '7d', label: '7D' },
        { value: '14d', label: '14D' },
        { value: '30d', label: '30D' },
        { value: '90d', label: '90D' },
    ];

    return (
        <div className="flex bg-slate-800/50 rounded-lg p-1">
            {periods.map(({ value: periodValue, label }) => (
                <button
                    key={periodValue}
                    onClick={() => onChange(periodValue)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        value === periodValue
                            ? 'bg-cyan-500 text-white'
                            : 'text-slate-400 hover:text-white'
                    }`}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}

// ============================================================================
// Loading State
// ============================================================================

function AnalyticsLoading() {
    return (
        <div className="p-8 min-h-screen flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
                <p className="text-slate-400">Loading analytics...</p>
            </div>
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export default function AnalyticsClient() {
    const { data, loading, error, isDemo, refetch, setPeriod, currentPeriod } = useAnalytics({
        period: '7d',
        autoRefresh: true,
        refreshInterval: 60000, // Refresh every minute
    });

    // Format summary stats for display
    const stats = useMemo(() => {
        if (!data) return [];

        const { summary } = data;
        return [
            {
                title: 'Total Dials',
                value: summary.totalDials.toLocaleString(),
                change:
                    summary.dialsTrend >= 0 ? `+${summary.dialsTrend}%` : `${summary.dialsTrend}%`,
                icon: Phone,
                color: 'blue',
                trend: summary.dialsTrend > 0 ? 'up' : summary.dialsTrend < 0 ? 'down' : 'neutral',
            },
            {
                title: 'Connect Rate',
                value: `${(summary.connectRate * 100).toFixed(1)}%`,
                change:
                    summary.connectsTrend >= 0
                        ? `+${summary.connectsTrend}%`
                        : `${summary.connectsTrend}%`,
                icon: Users,
                color: 'green',
                trend:
                    summary.connectsTrend > 0
                        ? 'up'
                        : summary.connectsTrend < 0
                          ? 'down'
                          : 'neutral',
            },
            {
                title: 'Meetings Booked',
                value: summary.totalMeetings.toLocaleString(),
                change:
                    summary.meetingsTrend >= 0
                        ? `+${summary.meetingsTrend}%`
                        : `${summary.meetingsTrend}%`,
                icon: Calendar,
                color: 'purple',
                trend:
                    summary.meetingsTrend > 0
                        ? 'up'
                        : summary.meetingsTrend < 0
                          ? 'down'
                          : 'neutral',
            },
            {
                title: 'Pipeline Created',
                value: formatCurrency(summary.pipelineCreated),
                change:
                    summary.pipelineTrend >= 0
                        ? `+${summary.pipelineTrend}%`
                        : `${summary.pipelineTrend}%`,
                icon: DollarSign,
                color: 'amber',
                trend:
                    summary.pipelineTrend > 0
                        ? 'up'
                        : summary.pipelineTrend < 0
                          ? 'down'
                          : 'neutral',
            },
        ] as const;
    }, [data]);

    // Chart data transformation
    const chartData = useMemo(() => {
        if (!data) return [];
        return data.dailyActivity.map((d) => ({
            name: d.dayName,
            dials: d.dials,
            connects: d.connects,
            meetings: d.meetings,
            pipeline: d.pipelineValue,
        }));
    }, [data]);

    if (loading && !data) {
        return <AnalyticsLoading />;
    }

    return (
        <div className="p-8 min-h-screen">
            {/* Header */}
            <header className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="text-cyan-400 w-5 h-5" />
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
                            Performance Intelligence
                        </span>
                        {isDemo && (
                            <Badge variant="warning" className="ml-2">
                                Demo Data
                            </Badge>
                        )}
                    </div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-400 to-blue-400">
                        Analytics Dashboard
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Real-time performance metrics and predictive trends
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <PeriodSelector value={currentPeriod} onChange={setPeriod} />
                    <button
                        onClick={() => refetch()}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Refresh data"
                    >
                        <RefreshCw
                            className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`}
                        />
                    </button>
                </div>
            </header>

            {/* Demo Banner */}
            <AnimatePresence>
                {isDemo && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-6"
                    >
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-amber-200 font-medium">Sample Data Displayed</p>
                                <p className="text-amber-200/70 text-sm mt-1">
                                    You&apos;re viewing demo analytics. Start logging activities to
                                    see your real performance data. As you make calls, book
                                    meetings, and close deals, your dashboard will populate with
                                    actual metrics.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error State */}
            {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-red-200 font-medium">Error Loading Analytics</p>
                        <p className="text-red-200/70 text-sm mt-1">{error.message}</p>
                    </div>
                </div>
            )}

            {/* Revenue Forecast Card */}
            {data && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <GlassCard className="!py-4 !px-6 border-cyan-500/30 bg-cyan-500/5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        <div className="flex flex-wrap items-center gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-cyan-500/10 rounded-xl">
                                    <Target className="w-6 h-6 text-cyan-400 animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-cyan-500 uppercase font-bold tracking-widest">
                                        Revenue Won (
                                        {currentPeriod === '7d'
                                            ? 'This Week'
                                            : `Last ${currentPeriod.replace('d', ' Days')}`}
                                        )
                                    </p>
                                    <p className="text-3xl font-bold text-white leading-none mt-1">
                                        {formatCurrency(data.summary.revenueWon)}
                                    </p>
                                </div>
                            </div>
                            <div className="h-12 w-px bg-slate-700/50 hidden sm:block" />
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-500/10 rounded-xl">
                                    <DollarSign className="w-6 h-6 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-green-500 uppercase font-bold tracking-widest">
                                        Deals Closed
                                    </p>
                                    <p className="text-3xl font-bold text-white leading-none mt-1">
                                        {data.summary.dealsWon}
                                    </p>
                                </div>
                            </div>
                            <div className="h-12 w-px bg-slate-700/50 hidden sm:block" />
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-500/10 rounded-xl">
                                    <Clock className="w-6 h-6 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-purple-500 uppercase font-bold tracking-widest">
                                        Talk Time
                                    </p>
                                    <p className="text-3xl font-bold text-white leading-none mt-1">
                                        {Math.round(data.summary.totalTalkTime / 3600)}h{' '}
                                        {Math.round((data.summary.totalTalkTime % 3600) / 60)}m
                                    </p>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </motion.div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <StatCard {...stat} trend={stat.trend as 'up' | 'down' | 'neutral'} />
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pipeline Volume Chart */}
                <GlassCard className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-white">Pipeline Volume</h3>
                            <p className="text-xs text-slate-500 uppercase tracking-tighter">
                                {currentPeriod === '7d'
                                    ? '7-Day'
                                    : currentPeriod === '14d'
                                      ? '14-Day'
                                      : currentPeriod === '30d'
                                        ? '30-Day'
                                        : '90-Day'}{' '}
                                Revenue Velocity
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="info">{loading ? 'Updating...' : 'Live Feed'}</Badge>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorPipeline" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="#1e293b"
                                />
                                <XAxis
                                    dataKey="name"
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#0f172a',
                                        border: '1px solid #1e293b',
                                        borderRadius: '12px',
                                    }}
                                    itemStyle={{ color: '#f8fafc' }}
                                    formatter={(value) => [
                                        formatCurrency(value as number),
                                        'Pipeline',
                                    ]}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="pipeline"
                                    stroke="#3b82f6"
                                    fillOpacity={1}
                                    fill="url(#colorPipeline)"
                                    strokeWidth={3}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                {/* Activity Efficiency Chart */}
                <GlassCard>
                    <h3 className="text-lg font-bold text-white mb-6">Activity Efficiency</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.slice(-5)}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="#1e293b"
                                />
                                <XAxis
                                    dataKey="name"
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: '#1e293b', opacity: 0.4 }}
                                    contentStyle={{
                                        backgroundColor: '#0f172a',
                                        border: '1px solid #1e293b',
                                        borderRadius: '12px',
                                    }}
                                />
                                <Bar
                                    dataKey="connects"
                                    name="Connects"
                                    fill="#10b981"
                                    radius={[4, 4, 0, 0]}
                                    barSize={20}
                                />
                                <Bar
                                    dataKey="meetings"
                                    name="Meetings"
                                    fill="#a855f7"
                                    radius={[4, 4, 0, 0]}
                                    barSize={20}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-6 flex justify-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-xs text-slate-400">Connects</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                            <span className="text-xs text-slate-400">Meetings</span>
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Team Performance Leaderboard */}
            {data && data.leaderboard.length > 0 && (
                <GlassCard className="mt-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Target size={120} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Users className="text-blue-400" size={20} />
                        Elite Performance Leaderboard
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-500 uppercase text-[10px] tracking-widest border-b border-slate-800">
                                    <th className="pb-4 font-bold">Rank</th>
                                    <th className="pb-4 font-bold">Sales Professional</th>
                                    <th className="pb-4 font-bold">Activity Vol.</th>
                                    <th className="pb-4 font-bold">Conversion</th>
                                    <th className="pb-4 font-bold">Revenue Contrib.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {data.leaderboard.slice(0, 10).map((rep) => (
                                    <tr
                                        key={rep.repId}
                                        className="group hover:bg-blue-500/5 transition-all"
                                    >
                                        <td className="py-4">
                                            <div
                                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                                                    rep.rank === 1
                                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                                        : rep.rank === 2
                                                          ? 'bg-slate-400/20 text-slate-300 border border-slate-700'
                                                          : rep.rank === 3
                                                            ? 'bg-orange-500/20 text-orange-400 border border-orange-700'
                                                            : 'text-slate-500'
                                                }`}
                                            >
                                                {rep.rank}
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex items-center gap-3">
                                                {rep.repAvatar && (
                                                    <img
                                                        src={rep.repAvatar}
                                                        alt={rep.repName}
                                                        className="w-8 h-8 rounded-full"
                                                    />
                                                )}
                                                <span className="text-white font-semibold">
                                                    {rep.repName}
                                                </span>
                                                {rep.badges.map((badge) => (
                                                    <Badge
                                                        key={badge}
                                                        className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px] px-1.5 py-0"
                                                    >
                                                        {badge}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="py-4 font-mono text-slate-400">
                                            {rep.dials.toLocaleString()} dials
                                        </td>
                                        <td className="py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 w-16 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-green-500"
                                                        style={{
                                                            width: `${Math.min(rep.connectRate * 100 * 5, 100)}%`,
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-xs text-green-400 font-bold">
                                                    {(rep.connectRate * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-amber-400 font-bold font-mono">
                                            {formatCurrency(rep.revenueWon)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>
            )}
        </div>
    );
}
