'use client';

/**
 * Admin Dashboard - Real-time Platform Metrics
 *
 * Restricted to optimize@avcpp.com
 * Displays actual Firestore data: users, signups, activity
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { GlassCard } from '@/components/ui/GlassCard';
import {
    Users,
    UserPlus,
    Activity,
    Target,
    TrendingUp,
    Clock,
    RefreshCw,
    ShieldAlert,
    Loader2,
    BarChart3,
    Zap,
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminMetrics {
    totalUsers: number;
    activeUsersDaily: number;
    activeUsersWeekly: number;
    activeUsersMonthly: number;
    recentSignups: {
        email: string;
        createdAt: number;
        tier: string;
    }[];
    tierBreakdown: {
        free: number;
        pro: number;
        enterprise: number;
    };
    totalLeads: number;
    leadsCreatedToday: number;
    analyticsEvents: Record<string, number>;
    fetchedAt: number;
}

// Admin emails allowed to access this dashboard
const ADMIN_EMAILS = ['optimize@avcpp.com'];

function MetricCard({
    title,
    value,
    subtitle,
    icon: Icon,
    color = 'blue',
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ElementType;
    color?: 'blue' | 'green' | 'violet' | 'amber' | 'emerald';
}) {
    const colorClasses = {
        blue: 'from-blue-500/20 to-blue-600/10 text-blue-400',
        green: 'from-green-500/20 to-green-600/10 text-green-400',
        violet: 'from-violet-500/20 to-violet-600/10 text-violet-400',
        amber: 'from-amber-500/20 to-amber-600/10 text-amber-400',
        emerald: 'from-emerald-500/20 to-emerald-600/10 text-emerald-400',
    };

    return (
        <GlassCard className="relative overflow-hidden">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-slate-400 mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-white">{value}</h3>
                    {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </GlassCard>
    );
}

function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

export default function AdminDashboardPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isAdmin = profile?.email && ADMIN_EMAILS.includes(profile.email.toLowerCase());

    const fetchMetrics = async () => {
        if (!profile?.email) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/metrics', {
                headers: {
                    'x-user-email': profile.email,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch metrics');
            }

            const data = await response.json();
            setMetrics(data);
        } catch (err) {
            console.error('Error fetching metrics:', err);
            setError('Failed to load metrics. Please try again.');
            toast.error('Failed to load metrics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    useEffect(() => {
        if (profile?.email && isAdmin) {
            fetchMetrics();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.email, isAdmin]);

    // Auth loading
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    <p className="text-slate-400">Verifying access...</p>
                </div>
            </div>
        );
    }

    // Not logged in
    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    <p className="text-slate-400">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    // Not authorized
    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8">
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
        <div className="p-8 min-h-screen">
            {/* Header */}
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                        Admin Dashboard
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Platform-wide metrics and analytics
                    </p>
                </div>
                <button
                    onClick={fetchMetrics}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-white transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </header>

            {error ? (
                <GlassCard className="text-center py-12">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={fetchMetrics}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
                    >
                        Try Again
                    </button>
                </GlassCard>
            ) : loading || !metrics ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
            ) : (
                <div className="space-y-8 max-w-7xl mx-auto">
                    {/* Primary Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <MetricCard
                            title="Total Users"
                            value={metrics.totalUsers}
                            subtitle="Registered accounts"
                            icon={Users}
                            color="blue"
                        />
                        <MetricCard
                            title="Active (7 days)"
                            value={metrics.activeUsersWeekly}
                            subtitle={`${Math.round((metrics.activeUsersWeekly / metrics.totalUsers) * 100) || 0}% of total`}
                            icon={Activity}
                            color="green"
                        />
                        <MetricCard
                            title="Total Leads"
                            value={metrics.totalLeads.toLocaleString()}
                            subtitle={`+${metrics.leadsCreatedToday} today`}
                            icon={Target}
                            color="violet"
                        />
                        <MetricCard
                            title="DAU/MAU Ratio"
                            value={`${Math.round((metrics.activeUsersDaily / metrics.activeUsersMonthly) * 100) || 0}%`}
                            subtitle="Stickiness"
                            icon={TrendingUp}
                            color="emerald"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Recent Signups */}
                        <GlassCard>
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-green-400" />
                                Recent Signups
                            </h2>
                            {metrics.recentSignups.length === 0 ? (
                                <p className="text-slate-500 text-sm">
                                    No signups in the last 7 days
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {metrics.recentSignups.map((signup, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                                        >
                                            <div>
                                                <p className="text-white text-sm font-medium">
                                                    {signup.email}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {formatRelativeTime(signup.createdAt)}
                                                </p>
                                            </div>
                                            <span
                                                className={`text-xs px-2 py-1 rounded-full ${
                                                    signup.tier === 'pro'
                                                        ? 'bg-blue-500/20 text-blue-400'
                                                        : signup.tier === 'enterprise'
                                                          ? 'bg-violet-500/20 text-violet-400'
                                                          : 'bg-slate-700 text-slate-400'
                                                }`}
                                            >
                                                {signup.tier}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </GlassCard>

                        {/* User Activity */}
                        <GlassCard>
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-blue-400" />
                                User Activity
                            </h2>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                                    <span className="text-slate-400">Daily Active</span>
                                    <span className="text-white font-semibold">
                                        {metrics.activeUsersDaily}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                                    <span className="text-slate-400">Weekly Active</span>
                                    <span className="text-white font-semibold">
                                        {metrics.activeUsersWeekly}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                                    <span className="text-slate-400">Monthly Active</span>
                                    <span className="text-white font-semibold">
                                        {metrics.activeUsersMonthly}
                                    </span>
                                </div>
                            </div>
                        </GlassCard>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Tier Distribution */}
                        <GlassCard>
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-violet-400" />
                                Plan Distribution
                            </h2>
                            <div className="space-y-4">
                                {/* Progress bar */}
                                <div className="h-4 rounded-full overflow-hidden flex bg-slate-800">
                                    <div
                                        className="bg-slate-500 transition-all"
                                        style={{
                                            width: `${(metrics.tierBreakdown.free / metrics.totalUsers) * 100}%`,
                                        }}
                                        title={`Free: ${metrics.tierBreakdown.free}`}
                                    />
                                    <div
                                        className="bg-blue-500 transition-all"
                                        style={{
                                            width: `${(metrics.tierBreakdown.pro / metrics.totalUsers) * 100}%`,
                                        }}
                                        title={`Pro: ${metrics.tierBreakdown.pro}`}
                                    />
                                    <div
                                        className="bg-violet-500 transition-all"
                                        style={{
                                            width: `${(metrics.tierBreakdown.enterprise / metrics.totalUsers) * 100}%`,
                                        }}
                                        title={`Enterprise: ${metrics.tierBreakdown.enterprise}`}
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <div className="flex items-center justify-center gap-2 mb-1">
                                            <div className="w-3 h-3 rounded-full bg-slate-500" />
                                            <span className="text-slate-400 text-sm">Free</span>
                                        </div>
                                        <p className="text-xl font-bold text-white">
                                            {metrics.tierBreakdown.free}
                                        </p>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-center gap-2 mb-1">
                                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                                            <span className="text-slate-400 text-sm">Pro</span>
                                        </div>
                                        <p className="text-xl font-bold text-white">
                                            {metrics.tierBreakdown.pro}
                                        </p>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-center gap-2 mb-1">
                                            <div className="w-3 h-3 rounded-full bg-violet-500" />
                                            <span className="text-slate-400 text-sm">
                                                Enterprise
                                            </span>
                                        </div>
                                        <p className="text-xl font-bold text-white">
                                            {metrics.tierBreakdown.enterprise}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>

                        {/* Analytics Events */}
                        <GlassCard>
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-amber-400" />
                                Events (7 days)
                            </h2>
                            {Object.keys(metrics.analyticsEvents).length === 0 ? (
                                <p className="text-slate-500 text-sm">No events tracked yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {Object.entries(metrics.analyticsEvents).map(
                                        ([event, count]) => (
                                            <div
                                                key={event}
                                                className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                                            >
                                                <span className="text-slate-300 text-sm">
                                                    {event}
                                                </span>
                                                <span className="text-white font-semibold">
                                                    {count}
                                                </span>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </GlassCard>
                    </div>

                    {/* Footer */}
                    <div className="text-center text-slate-500 text-xs pt-4">
                        Last updated: {new Date(metrics.fetchedAt).toLocaleString()}
                    </div>
                </div>
            )}
        </div>
    );
}
