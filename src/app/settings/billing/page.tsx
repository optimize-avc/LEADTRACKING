/**
 * Billing Settings Page
 *
 * Shows current plan, usage meters, and upgrade options.
 * Integrates with Stripe Customer Portal for self-service billing.
 *
 * Best practice 2026: Transparent usage visibility with clear upgrade path
 */

'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    CreditCard,
    TrendingUp,
    Users,
    Mail,
    FileText,
    Zap,
    ArrowRight,
    ExternalLink,
    CheckCircle,
    AlertCircle,
    Loader2,
    RefreshCw,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/components/providers/AuthProvider';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useCompanyUsage } from '@/hooks/useCompanySettings';
import { PLAN_INFO, formatLimit } from '@/lib/plans';
import { toast } from 'sonner';

export default function BillingPage() {
    const { user, profile } = useAuth();
    const {
        tier,
        limits,
        usage,
        remainingLeads,
        remainingTeamMembers,
        remainingEmailsThisMonth,
        isLoading,
    } = usePlanLimits();
    const { refresh: refreshUsage } = useCompanyUsage();

    const [isPortalLoading, setIsPortalLoading] = useState(false);
    const [isUpgradeLoading, setIsUpgradeLoading] = useState(false);
    const [isSyncingUsage, setIsSyncingUsage] = useState(false);

    const planInfo = PLAN_INFO[tier];

    const handleManageBilling = async () => {
        if (!user) {
            toast.error('You must be logged in');
            return;
        }

        setIsPortalLoading(true);
        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/stripe/portal', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Failed to access billing portal');
            }

            const { url } = await response.json();
            if (url) {
                window.location.href = url;
            } else {
                toast.info('No active subscription found. Subscribe first to access the portal.');
            }
        } catch (error) {
            console.error('Portal error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to open billing portal');
        } finally {
            setIsPortalLoading(false);
        }
    };

    const handleUpgrade = async () => {
        if (!user) {
            window.location.href = '/login?redirect=/pricing';
            return;
        }

        setIsUpgradeLoading(true);
        try {
            const response = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.uid,
                    tier: 'Pro',
                    email: user.email,
                }),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Failed to create checkout session');
            }

            const { url } = await response.json();
            if (url) {
                window.location.href = url;
            }
        } catch (error) {
            console.error('Checkout error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to start checkout');
        } finally {
            setIsUpgradeLoading(false);
        }
    };

    const handleSyncUsage = useCallback(async () => {
        if (!user) return;

        setIsSyncingUsage(true);
        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/company/usage', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to sync usage');
            }

            const { usage: newUsage } = await response.json();
            await refreshUsage();
            toast.success(`Usage synced! ${newUsage.leadCount} leads found.`);
        } catch (error) {
            console.error('Sync error:', error);
            toast.error('Failed to sync usage data');
        } finally {
            setIsSyncingUsage(false);
        }
    }, [user, refreshUsage]);

    if (isLoading) {
        return (
            <div className="p-8 min-h-screen flex items-center justify-center">
                <div className="text-slate-500 italic animate-pulse">
                    Loading billing information...
                </div>
            </div>
        );
    }

    // Calculate usage percentages for meters
    const leadsPercentage =
        limits.leads === -1 ? 0 : Math.min(100, (usage.leads / limits.leads) * 100);
    const teamPercentage =
        limits.teamMembers === -1
            ? 0
            : Math.min(100, (usage.teamMembers / limits.teamMembers) * 100);
    const emailsPercentage =
        limits.emailsPerMonth === -1
            ? 0
            : Math.min(100, (usage.emailsThisMonth / limits.emailsPerMonth) * 100);

    const getStatusColor = (percentage: number) => {
        if (percentage >= 90) return 'bg-red-500';
        if (percentage >= 75) return 'bg-amber-500';
        return 'bg-emerald-500';
    };

    return (
        <div className="p-8 min-h-screen">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                    Billing & Subscription
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                    Manage your plan, view usage, and access invoices
                </p>
            </header>

            <div className="grid gap-6 max-w-4xl">
                {/* Current Plan Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <GlassCard className="border-t-4 border-t-indigo-500">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                                    <CreditCard className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-bold text-white">
                                            {planInfo.name} Plan
                                        </h2>
                                        <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 uppercase text-[10px] font-bold tracking-wider">
                                            Current
                                        </Badge>
                                    </div>
                                    <p className="text-slate-400 text-sm mt-1">
                                        {planInfo.price === '$0'
                                            ? 'Free forever'
                                            : `${planInfo.price} billed monthly`}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                {tier !== 'enterprise' && (
                                    <button
                                        onClick={handleUpgrade}
                                        disabled={isUpgradeLoading}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                                    >
                                        {isUpgradeLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Zap className="w-4 h-4" />
                                        )}
                                        Upgrade Plan
                                    </button>
                                )}
                                {tier !== 'free' && (
                                    <button
                                        onClick={handleManageBilling}
                                        disabled={isPortalLoading}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium border border-white/10 transition-all disabled:opacity-50"
                                    >
                                        {isPortalLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <ExternalLink className="w-4 h-4" />
                                        )}
                                        Manage in Stripe
                                    </button>
                                )}
                            </div>
                        </div>
                    </GlassCard>
                </motion.div>

                {/* Usage Meters */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <GlassCard>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-400" />
                                Usage This Period
                            </h3>
                            <button
                                onClick={handleSyncUsage}
                                disabled={isSyncingUsage}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg border border-white/10 transition-all disabled:opacity-50"
                                title="Sync usage data with actual counts"
                            >
                                <RefreshCw
                                    className={`w-3 h-3 ${isSyncingUsage ? 'animate-spin' : ''}`}
                                />
                                Sync
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Leads Meter */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-blue-400" />
                                        <span className="text-sm text-slate-300">Total Leads</span>
                                    </div>
                                    <span className="text-sm text-slate-400">
                                        {usage.leads.toLocaleString()} / {formatLimit(limits.leads)}
                                        {remainingLeads > 0 && remainingLeads !== -1 && (
                                            <span className="text-slate-500 ml-2">
                                                ({remainingLeads.toLocaleString()} remaining)
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${getStatusColor(leadsPercentage)}`}
                                        style={{
                                            width:
                                                limits.leads === -1 ? '5%' : `${leadsPercentage}%`,
                                        }}
                                    />
                                </div>
                                {leadsPercentage >= 90 && limits.leads !== -1 && (
                                    <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        Approaching limit - consider upgrading
                                    </p>
                                )}
                            </div>

                            {/* Team Members Meter */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-emerald-400" />
                                        <span className="text-sm text-slate-300">Team Members</span>
                                    </div>
                                    <span className="text-sm text-slate-400">
                                        {usage.teamMembers} / {formatLimit(limits.teamMembers)}
                                        {remainingTeamMembers > 0 &&
                                            remainingTeamMembers !== -1 && (
                                                <span className="text-slate-500 ml-2">
                                                    ({remainingTeamMembers} remaining)
                                                </span>
                                            )}
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${getStatusColor(teamPercentage)}`}
                                        style={{
                                            width:
                                                limits.teamMembers === -1
                                                    ? '5%'
                                                    : `${teamPercentage}%`,
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Emails Meter */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-rose-400" />
                                        <span className="text-sm text-slate-300">
                                            Emails This Month
                                        </span>
                                    </div>
                                    <span className="text-sm text-slate-400">
                                        {usage.emailsThisMonth.toLocaleString()} /{' '}
                                        {formatLimit(limits.emailsPerMonth)}
                                        {remainingEmailsThisMonth > 0 &&
                                            remainingEmailsThisMonth !== -1 && (
                                                <span className="text-slate-500 ml-2">
                                                    ({remainingEmailsThisMonth.toLocaleString()}{' '}
                                                    remaining)
                                                </span>
                                            )}
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${getStatusColor(emailsPercentage)}`}
                                        style={{
                                            width:
                                                limits.emailsPerMonth === -1
                                                    ? '5%'
                                                    : `${emailsPercentage}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </motion.div>

                {/* Feature Access */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <GlassCard>
                        <h3 className="text-lg font-semibold text-white mb-6">Plan Features</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FeatureRow label="AI Deal Wargaming" enabled={limits.aiFeatures} />
                            <FeatureRow label="Custom Lead Fields" enabled={limits.customFields} />
                            <FeatureRow
                                label="Branded Emails (SendGrid)"
                                enabled={limits.brandedEmails}
                            />
                            <FeatureRow
                                label="Advanced Analytics"
                                enabled={limits.advancedAnalytics}
                            />
                            <FeatureRow label="API Access" enabled={limits.apiAccess} />
                        </div>

                        {tier === 'free' && (
                            <div className="mt-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                                <p className="text-sm text-indigo-300 flex items-center gap-2">
                                    <Zap className="w-4 h-4" />
                                    Upgrade to Pro to unlock all features and remove limits
                                </p>
                                <button
                                    onClick={handleUpgrade}
                                    className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                                >
                                    View Plans <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </GlassCard>
                </motion.div>

                {/* Quick Links */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <GlassCard>
                        <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <a
                                href="/pricing"
                                className="p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <h4 className="text-sm font-medium text-white">Compare Plans</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    See all features by tier
                                </p>
                            </a>

                            {tier !== 'free' && (
                                <button
                                    onClick={handleManageBilling}
                                    disabled={isPortalLoading}
                                    className="p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-left disabled:opacity-50"
                                >
                                    <h4 className="text-sm font-medium text-white">
                                        View Invoices
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Access in Stripe Portal
                                    </p>
                                </button>
                            )}

                            <a
                                href="mailto:support@salestracker-ai.com?subject=Billing%20Question"
                                className="p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <h4 className="text-sm font-medium text-white">Billing Support</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Get help with payments
                                </p>
                            </a>
                        </div>
                    </GlassCard>
                </motion.div>
            </div>
        </div>
    );
}

function FeatureRow({ label, enabled }: { label: string; enabled: boolean }) {
    return (
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <span className="text-sm text-slate-300">{label}</span>
            {enabled ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
                <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded">
                    Pro+
                </span>
            )}
        </div>
    );
}
