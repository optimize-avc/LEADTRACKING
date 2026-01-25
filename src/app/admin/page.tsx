'use client';

/**
 * Admin Metrics Dashboard
 *
 * Platform-wide metrics for admins: companies, users, revenue, churn.
 *
 * Best practice 2026: Real-time metrics with aggregations
 */

import React from 'react';
import {
    Building2,
    Users,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Activity,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react';

// This would be fetched from an admin API in production
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

// Mock data for demo - replace with actual API call
const mockMetrics: AdminMetrics = {
    totalCompanies: 127,
    activeCompanies: 98,
    totalUsers: 384,
    activeUsersDaily: 89,
    activeUsersWeekly: 156,
    activeUsersMonthly: 312,
    totalLeads: 12847,
    leadsCreatedToday: 234,
    mrr: 12450,
    mrrChange: 8.5,
    churnRate: 2.3,
    churnRateChange: -0.4,
    planBreakdown: {
        free: 78,
        pro: 42,
        enterprise: 7,
    },
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
    const metrics = mockMetrics;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
                    <p className="text-slate-400">Platform-wide metrics and analytics</p>
                </div>

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

                {/* Footer */}
                <div className="text-center text-slate-500 text-sm">
                    Last updated: {new Date().toLocaleString()}
                </div>
            </div>
        </div>
    );
}
