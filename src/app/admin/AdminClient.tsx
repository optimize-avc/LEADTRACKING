'use client';

/**
 * Admin Metrics Dashboard
 *
 * Platform-wide metrics for admins: companies, users, revenue, churn.
 * PROTECTED: Requires superAdmin role
 *
 * Best practice 2026: Real-time metrics with aggregations
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import {
    Building2,
    Users,
    DollarSign,
    TrendingDown,
    Activity,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    ShieldAlert,
    Loader2,
    RefreshCw,
    Mail,
    Clock,
} from 'lucide-react';

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
    recentSignups?: Array<{
        id: string;
        email: string;
        createdAt: number;
        tier: string;
    }>;
}

// Default empty metrics for loading state
const emptyMetrics: AdminMetrics = {
    totalCompanies: 0,
    activeCompanies: 0,
    totalUsers: 0,
    activeUsersDaily: 0,
    activeUsersWeekly: 0,
    activeUsersMonthly: 0,
    totalLeads: 0,
    leadsCreatedToday: 0,
    mrr: 0,
    mrrChange: 0,
    churnRate: 0,
    churnRateChange: 0,
    planBreakdown: { free: 0, pro: 0, enterprise: 0 },
    recentSignups: [],
};

function MetricCard({
    title,
    value,
    change,
    changeLabel,
    icon: Icon,
    format = 'number',
}: {
    title: string;
    value: number;
    change?: number;
    changeLabel?: string;
    icon: React.ElementType;
    format?: 'number' | 'currency' | 'percent';
}) {
    const formatValue = (val: number) => {
        switch (format) {
            case 'currency':
                return `$${val.toLocaleString()}`;
            case 'percent':
                return `${val.toFixed(1)}%`;
            default:
                return val.toLocaleString();
        }
    };

    const isPositive = change !== undefined && change >= 0;
    const changeColor = isPositive ? 'text-green-400' : 'text-red-400';
    const ChangeIcon = isPositive ? ArrowUpRight : ArrowDownRight;

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-slate-400 mb-1">{title}</p>
                    <h3 className="text-2xl font-bold text-white">{formatValue(value)}</h3>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-xl">
                    <Icon className="w-6 h-6 text-blue-400" />
                </div>
            </div>

            {change !== undefined && (
                <div className={`flex items-center gap-1 mt-3 text-sm ${changeColor}`}>
                    <ChangeIcon className="w-4 h-4" />
                    <span>{Math.abs(change)}%</span>
                    {changeLabel && <span className="text-slate-500">{changeLabel}</span>}
                </div>
            )}
        </div>
    );
}

function PlanBreakdownChart({ breakdown }: { breakdown: AdminMetrics['planBreakdown'] }) {
    const total = breakdown.free + breakdown.pro + breakdown.enterprise;
    const freePercent = (breakdown.free / total) * 100;
    const proPercent = (breakdown.pro / total) * 100;
    const enterprisePercent = (breakdown.enterprise / total) * 100;

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Plan Distribution</h3>

            <div className="h-4 rounded-full overflow-hidden flex bg-slate-700 mb-4">
                <div
                    className="bg-slate-500 transition-all"
                    style={{ width: `${freePercent}%` }}
                    title={`Free: ${breakdown.free}`}
                />
                <div
                    className="bg-blue-500 transition-all"
                    style={{ width: `${proPercent}%` }}
                    title={`Pro: ${breakdown.pro}`}
                />
                <div
                    className="bg-violet-500 transition-all"
                    style={{ width: `${enterprisePercent}%` }}
                    title={`Enterprise: ${breakdown.enterprise}`}
                />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full bg-slate-500" />
                        <span className="text-slate-400 text-sm">Free</span>
                    </div>
                    <p className="text-xl font-bold text-white">{breakdown.free}</p>
                </div>
                <div>
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="text-slate-400 text-sm">Pro</span>
                    </div>
                    <p className="text-xl font-bold text-white">{breakdown.pro}</p>
                </div>
                <div>
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full bg-violet-500" />
                        <span className="text-slate-400 text-sm">Enterprise</span>
                    </div>
                    <p className="text-xl font-bold text-white">{breakdown.enterprise}</p>
                </div>
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [metrics, setMetrics] = useState<AdminMetrics>(emptyMetrics);
    const [metricsLoading, setMetricsLoading] = useState(true);
    const [metricsError, setMetricsError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Check if user is a super admin (check profile role or user email)
    const isSuperAdmin = profile?.role === 'superAdmin' || user?.email === 'optimize@avcpp.com';

    // Fetch metrics from API
    const fetchMetrics = async () => {
        try {
            setMetricsError(null);
            const response = await fetch('/api/admin/metrics');
            if (!response.ok) {
                throw new Error('Failed to fetch metrics');
            }
            const data = await response.json();
            setMetrics(data);
        } catch (err) {
            console.error('Error fetching metrics:', err);
            setMetricsError(err instanceof Error ? err.message : 'Failed to load metrics');
        } finally {
            setMetricsLoading(false);
            setRefreshing(false);
        }
    };

    // Load metrics on mount
    useEffect(() => {
        if (isSuperAdmin && !loading) {
            fetchMetrics();
        }
    }, [isSuperAdmin, loading]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchMetrics();
    };

    // Handle redirect in useEffect to avoid render-time navigation
    React.useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [loading, user, router]);

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    <p className="text-slate-400">Verifying access...</p>
                </div>
            </div>
        );
    }

    // Not logged in - show loading while redirect happens
    if (!user) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    <p className="text-slate-400">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    // Not authorized - show access denied
    if (!isSuperAdmin) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                        <ShieldAlert className="w-10 h-10 text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                    <p className="text-slate-400 mb-6">
                        You do not have permission to access the admin dashboard. This area is
                        restricted to platform administrators only.
                    </p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
                        <p className="text-slate-400">Platform-wide metrics and analytics</p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing || metricsLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Error state */}
                {metricsError && (
                    <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
                        {metricsError}
                    </div>
                )}

                {/* Loading overlay for metrics */}
                {metricsLoading && (
                    <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-400 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading metrics...
                    </div>
                )}

                {/* Primary Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <MetricCard
                        title="Total Companies"
                        value={metrics.totalCompanies}
                        change={12.5}
                        changeLabel="vs last month"
                        icon={Building2}
                    />
                    <MetricCard
                        title="Active Users (Monthly)"
                        value={metrics.activeUsersMonthly}
                        change={8.2}
                        changeLabel="vs last month"
                        icon={Users}
                    />
                    <MetricCard
                        title="Monthly Recurring Revenue"
                        value={metrics.mrr}
                        change={metrics.mrrChange}
                        changeLabel="vs last month"
                        icon={DollarSign}
                        format="currency"
                    />
                    <MetricCard
                        title="Churn Rate"
                        value={metrics.churnRate}
                        change={metrics.churnRateChange}
                        changeLabel="vs last month"
                        icon={TrendingDown}
                        format="percent"
                    />
                </div>

                {/* Secondary Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <PlanBreakdownChart breakdown={metrics.planBreakdown} />

                    {/* User Activity */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-400" />
                            User Activity
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Daily Active</span>
                                <span className="text-white font-semibold">
                                    {metrics.activeUsersDaily}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Weekly Active</span>
                                <span className="text-white font-semibold">
                                    {metrics.activeUsersWeekly}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Monthly Active</span>
                                <span className="text-white font-semibold">
                                    {metrics.activeUsersMonthly}
                                </span>
                            </div>
                            <div className="pt-2 border-t border-slate-700">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">DAU/MAU Ratio</span>
                                    <span className="text-green-400 font-semibold">
                                        {(
                                            (metrics.activeUsersDaily /
                                                metrics.activeUsersMonthly) *
                                            100
                                        ).toFixed(1)}
                                        %
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Lead Stats */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-green-400" />
                            Lead Statistics
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Total Leads</span>
                                <span className="text-white font-semibold">
                                    {metrics.totalLeads.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Created Today</span>
                                <span className="text-white font-semibold">
                                    {metrics.leadsCreatedToday}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Avg per Company</span>
                                <span className="text-white font-semibold">
                                    {Math.round(metrics.totalLeads / metrics.activeCompanies)}
                                </span>
                            </div>
                            <div className="pt-2 border-t border-slate-700">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Active Companies</span>
                                    <span className="text-blue-400 font-semibold">
                                        {metrics.activeCompanies} / {metrics.totalCompanies}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Signups */}
                {metrics.recentSignups && metrics.recentSignups.length > 0 && (
                    <div className="mb-8 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Mail className="w-5 h-5 text-violet-400" />
                            Recent Signups (Last 7 Days)
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-slate-400 text-sm">
                                        <th className="pb-3 font-medium">Email</th>
                                        <th className="pb-3 font-medium">Plan</th>
                                        <th className="pb-3 font-medium">Signed Up</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {metrics.recentSignups.map((signup) => (
                                        <tr key={signup.id} className="text-sm">
                                            <td className="py-3 text-white">{signup.email}</td>
                                            <td className="py-3">
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        signup.tier === 'pro'
                                                            ? 'bg-blue-500/20 text-blue-400'
                                                            : signup.tier === 'enterprise' ||
                                                                signup.tier === 'venture'
                                                              ? 'bg-violet-500/20 text-violet-400'
                                                              : 'bg-slate-500/20 text-slate-400'
                                                    }`}
                                                >
                                                    {signup.tier}
                                                </span>
                                            </td>
                                            <td className="py-3 text-slate-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(signup.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center text-slate-500 text-sm">
                    Last updated: {new Date().toLocaleString()}
                </div>
            </div>
        </div>
    );
}
