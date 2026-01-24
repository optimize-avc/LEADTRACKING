'use client';

/**
 * UpgradePrompt Component
 *
 * Shows upgrade prompts when users reach plan limits or try to access gated features.
 * Follows 2026 best practices for conversion-focused UI.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Zap, ArrowRight, Sparkles } from 'lucide-react';
import { usePlanLimits, formatLimit } from '@/hooks/usePlanLimits';

interface UpgradePromptProps {
    feature: string;
    description?: string;
    isOpen: boolean;
    onClose: () => void;
    currentUsage?: number;
    limit?: number;
}

export function UpgradePrompt({
    feature,
    description,
    isOpen,
    onClose,
    currentUsage,
    limit,
}: UpgradePromptProps) {
    const { tier, nextTier } = usePlanLimits();
    const [isLoading, setIsLoading] = useState(false);

    const handleUpgrade = () => {
        setIsLoading(true);
        // Navigate to pricing page
        window.location.href = '/pricing';
    };

    if (!isOpen) return null;

    const isLimitReached = currentUsage !== undefined && limit !== undefined;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
                >
                    {/* Decorative gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-violet-500/10 pointer-events-none" />

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white transition-colors z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="relative p-8">
                        {/* Icon */}
                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-gradient-to-br from-amber-500/20 to-violet-500/20 rounded-2xl">
                                <Crown className="w-12 h-12 text-amber-400" />
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-2xl font-bold text-white text-center mb-2">
                            {isLimitReached ? 'Limit Reached' : 'Upgrade to Unlock'}
                        </h2>

                        {/* Description */}
                        <p className="text-slate-400 text-center mb-6">
                            {isLimitReached ? (
                                <>
                                    You&apos;ve used{' '}
                                    <span className="text-white font-semibold">{currentUsage}</span>{' '}
                                    of{' '}
                                    <span className="text-white font-semibold">
                                        {formatLimit(limit!)}
                                    </span>{' '}
                                    {feature}. Upgrade to continue growing.
                                </>
                            ) : (
                                description ||
                                `${feature} is available on ${nextTier === 'pro' ? 'Pro' : 'Venture'} plans.`
                            )}
                        </p>

                        {/* Benefits */}
                        <div className="space-y-3 mb-8">
                            <div className="flex items-center gap-3 text-sm">
                                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                <span className="text-slate-300">
                                    Unlimited leads & team members
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Zap className="w-4 h-4 text-violet-400 flex-shrink-0" />
                                <span className="text-slate-300">
                                    AI insights & Reality Link HUD
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Crown className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                <span className="text-slate-300">
                                    Email, Discord & Twilio integrations
                                </span>
                            </div>
                        </div>

                        {/* CTA Buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={handleUpgrade}
                                disabled={isLoading}
                                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    'Loading...'
                                ) : (
                                    <>
                                        Upgrade to Pro
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>

                            <button
                                onClick={onClose}
                                className="w-full py-3 text-slate-400 hover:text-white text-sm font-medium transition-colors"
                            >
                                Maybe later
                            </button>
                        </div>

                        {/* Current plan badge */}
                        <div className="mt-6 pt-4 border-t border-slate-700/50 text-center">
                            <span className="text-xs text-slate-500">
                                Current plan:{' '}
                                <span className="text-slate-400 font-medium capitalize">
                                    {tier}
                                </span>
                            </span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

/**
 * Inline upgrade banner for subtle prompts
 */
interface UpgradeBannerProps {
    feature: string;
    className?: string;
}

export function UpgradeBanner({ feature, className = '' }: UpgradeBannerProps) {
    const { nextTier } = usePlanLimits();

    return (
        <a
            href="/pricing"
            className={`block p-4 bg-gradient-to-r from-amber-500/10 to-violet-500/10 border border-amber-500/20 rounded-xl hover:border-amber-500/40 transition-colors ${className}`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Crown className="w-5 h-5 text-amber-400" />
                    <div>
                        <p className="text-sm font-medium text-white">Unlock {feature}</p>
                        <p className="text-xs text-slate-400">
                            Available on {nextTier === 'pro' ? 'Pro' : 'Venture'} plan
                        </p>
                    </div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-400" />
            </div>
        </a>
    );
}

/**
 * Usage meter component for settings
 */
interface UsageMeterProps {
    label: string;
    current: number;
    limit: number;
    className?: string;
}

export function UsageMeter({ label, current, limit, className = '' }: UsageMeterProps) {
    const isUnlimited = limit === -1;
    const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
    const isNearLimit = percentage >= 80;
    const isAtLimit = percentage >= 100;

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{label}</span>
                <span
                    className={`font-medium ${isAtLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-slate-300'}`}
                >
                    {current.toLocaleString()} / {formatLimit(limit)}
                </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all ${
                        isAtLimit
                            ? 'bg-red-500'
                            : isNearLimit
                              ? 'bg-amber-500'
                              : 'bg-gradient-to-r from-blue-500 to-violet-500'
                    }`}
                    style={{ width: isUnlimited ? '0%' : `${percentage}%` }}
                />
            </div>
            {isAtLimit && (
                <p className="text-xs text-red-400">
                    Limit reached.{' '}
                    <a href="/pricing" className="underline hover:text-red-300">
                        Upgrade now
                    </a>
                </p>
            )}
        </div>
    );
}
