'use client';

/**
 * BillingSettings Component
 *
 * Displays current subscription, usage, and provides upgrade/manage options.
 * Integrates with Stripe Customer Portal for self-service billing management.
 */

import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { usePlanLimits, formatLimit } from '@/hooks/usePlanLimits';
import { UsageMeter } from '@/components/ui/UpgradePrompt';
import { useAuth } from '@/components/providers/AuthProvider';
import { UsageService, CompanyUsage } from '@/lib/firebase/usage';
import {
    Crown,
    CreditCard,
    ExternalLink,
    CheckCircle,
    AlertCircle,
    Loader2,
    Zap,
    Users,
    Mail,
    BarChart3,
} from 'lucide-react';

export function BillingSettings() {
    const { user, profile } = useAuth();
    const { tier, tierDisplayName, limits, isUpgradeAvailable, nextTier } = usePlanLimits();
    const [usage, setUsage] = useState<CompanyUsage | null>(null);
    const [isLoadingUsage, setIsLoadingUsage] = useState(true);
    const [isLoadingPortal, setIsLoadingPortal] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load usage data
    useEffect(() => {
        async function loadUsage() {
            if (!profile?.companyId) {
                setIsLoadingUsage(false);
                return;
            }

            try {
                const usageData = await UsageService.getUsage(profile.companyId);
                setUsage(usageData);
            } catch (err) {
                console.error('Failed to load usage:', err);
            } finally {
                setIsLoadingUsage(false);
            }
        }

        loadUsage();
    }, [profile?.companyId]);

    // Open Stripe Customer Portal
    const handleManageBilling = async () => {
        if (!user) return;

        setIsLoadingPortal(true);
        setError(null);

        try {
            const response = await fetch('/api/stripe/portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid }),
            });

            if (!response.ok) {
                throw new Error('Failed to create portal session');
            }

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error('No portal URL returned');
            }
        } catch (err) {
            console.error('Portal error:', err);
            setError('Failed to open billing portal. Please try again.');
            setIsLoadingPortal(false);
        }
    };

    const subscriptionStatus = (profile as { subscriptionStatus?: string })?.subscriptionStatus;
    const isPastDue = subscriptionStatus === 'past_due';

    return (
        <div className="space-y-6">
            {/* Current Plan Card */}
            <GlassCard>
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div
                            className={`p-3 rounded-xl ${
                                tier === 'enterprise'
                                    ? 'bg-purple-500/20'
                                    : tier === 'pro'
                                      ? 'bg-amber-500/20'
                                      : 'bg-blue-500/20'
                            }`}
                        >
                            <Crown
                                className={`w-6 h-6 ${
                                    tier === 'enterprise'
                                        ? 'text-purple-400'
                                        : tier === 'pro'
                                          ? 'text-amber-400'
                                          : 'text-blue-400'
                                }`}
                            />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">{tierDisplayName} Plan</h3>
                            <div className="flex items-center gap-2 mt-1">
                                {isPastDue ? (
                                    <span className="flex items-center gap-1 text-sm text-red-400">
                                        <AlertCircle className="w-4 h-4" />
                                        Payment past due
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-sm text-emerald-400">
                                        <CheckCircle className="w-4 h-4" />
                                        Active
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {tier !== 'free' && (
                            <button
                                onClick={handleManageBilling}
                                disabled={isLoadingPortal}
                                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                            >
                                {isLoadingPortal ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CreditCard className="w-4 h-4" />
                                )}
                                Manage Billing
                            </button>
                        )}

                        {isUpgradeAvailable && (
                            <a
                                href="/pricing"
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold rounded-lg text-sm hover:from-amber-400 hover:to-amber-500 transition-colors"
                            >
                                <Zap className="w-4 h-4" />
                                Upgrade to {nextTier === 'pro' ? 'Pro' : 'Venture'}
                            </a>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                        {error}
                    </div>
                )}

                {isPastDue && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                        <p className="text-red-300 text-sm">
                            Your payment is past due. Please update your payment method to avoid
                            service interruption.
                        </p>
                        <button
                            onClick={handleManageBilling}
                            className="mt-2 text-red-400 hover:text-red-300 text-sm font-medium underline"
                        >
                            Update payment method
                        </button>
                    </div>
                )}

                {/* Plan Features */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <BarChart3 className="w-5 h-5 text-slate-400" />
                        <div>
                            <p className="text-xs text-slate-500">Leads</p>
                            <p className="text-sm font-medium text-white">
                                {formatLimit(limits.maxLeads)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-slate-400" />
                        <div>
                            <p className="text-xs text-slate-500">Team Members</p>
                            <p className="text-sm font-medium text-white">
                                {formatLimit(limits.maxTeamMembers)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-slate-400" />
                        <div>
                            <p className="text-xs text-slate-500">Email Integration</p>
                            <p className="text-sm font-medium text-white">
                                {limits.canUseEmailIntegration ? 'Included' : 'Not available'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5 text-slate-400" />
                        <div>
                            <p className="text-xs text-slate-500">AI Features</p>
                            <p className="text-sm font-medium text-white">
                                {limits.canUseAIInsights ? 'Full access' : 'Limited'}
                            </p>
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* Usage Stats */}
            <GlassCard>
                <h3 className="text-lg font-semibold text-white mb-4">Usage This Month</h3>

                {isLoadingUsage ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                ) : usage ? (
                    <div className="space-y-6">
                        <UsageMeter
                            label="Leads"
                            current={usage.leadCount}
                            limit={limits.maxLeads}
                        />
                        <UsageMeter
                            label="Team Members"
                            current={usage.teamMemberCount}
                            limit={limits.maxTeamMembers}
                        />
                        <UsageMeter
                            label="New Leads This Month"
                            current={usage.leadsThisMonth}
                            limit={limits.maxLeadsPerMonth}
                        />

                        <div className="pt-4 border-t border-slate-700/50">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Emails Sent</span>
                                <span className="text-white font-medium">
                                    {usage.emailsSentThisMonth}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm mt-2">
                                <span className="text-slate-400">Activities Logged</span>
                                <span className="text-white font-medium">
                                    {usage.activitiesThisMonth}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-slate-400 text-sm">
                        Usage data will appear once you&apos;ve set up your company.
                    </p>
                )}
            </GlassCard>

            {/* Billing History Link */}
            {tier !== 'free' && (
                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Billing History</h3>
                            <p className="text-sm text-slate-400">
                                View invoices and payment history
                            </p>
                        </div>
                        <button
                            onClick={handleManageBilling}
                            disabled={isLoadingPortal}
                            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                        >
                            View in Stripe
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    </div>
                </GlassCard>
            )}
        </div>
    );
}
