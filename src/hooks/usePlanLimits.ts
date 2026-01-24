/**
 * usePlanLimits Hook
 *
 * Returns plan limits and usage information for the current user's tier.
 * Used to enforce feature gates and show usage meters.
 *
 * Best practice 2026: Centralized limit configuration with per-tenant overrides
 */

import { useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';

export interface PlanLimits {
    // Lead limits
    maxLeads: number;
    maxLeadsPerMonth: number;

    // Team limits
    maxTeamMembers: number;

    // Feature flags
    canUseEmailIntegration: boolean;
    canUseDiscordIntegration: boolean;
    canUseTwilioIntegration: boolean;
    canUseRealityLink: boolean;
    canUseAdvancedAnalytics: boolean;
    canUseAIInsights: boolean;
    canUseBulkOperations: boolean;
    canUseCustomFields: boolean;
    canExportData: boolean;
    canManageTeam: boolean;
    canUseBranding: boolean;
    canUseAPI: boolean;

    // Support
    supportLevel: 'community' | 'email' | 'priority' | 'dedicated';
}

export interface PlanInfo {
    tier: 'free' | 'pro' | 'enterprise';
    tierDisplayName: string;
    limits: PlanLimits;
    isUpgradeAvailable: boolean;
    nextTier: 'pro' | 'enterprise' | null;
}

// Plan configurations
const PLAN_LIMITS: Record<string, PlanLimits> = {
    free: {
        maxLeads: 50,
        maxLeadsPerMonth: 20,
        maxTeamMembers: 1,
        canUseEmailIntegration: false,
        canUseDiscordIntegration: false,
        canUseTwilioIntegration: false,
        canUseRealityLink: false,
        canUseAdvancedAnalytics: false,
        canUseAIInsights: false,
        canUseBulkOperations: false,
        canUseCustomFields: false,
        canExportData: true, // CSV export allowed
        canManageTeam: false,
        canUseBranding: false,
        canUseAPI: false,
        supportLevel: 'community',
    },
    pro: {
        maxLeads: -1, // Unlimited
        maxLeadsPerMonth: -1,
        maxTeamMembers: 10,
        canUseEmailIntegration: true,
        canUseDiscordIntegration: true,
        canUseTwilioIntegration: true,
        canUseRealityLink: true,
        canUseAdvancedAnalytics: true,
        canUseAIInsights: true,
        canUseBulkOperations: true,
        canUseCustomFields: true,
        canExportData: true,
        canManageTeam: true,
        canUseBranding: true,
        canUseAPI: false,
        supportLevel: 'priority',
    },
    enterprise: {
        maxLeads: -1,
        maxLeadsPerMonth: -1,
        maxTeamMembers: -1, // Unlimited
        canUseEmailIntegration: true,
        canUseDiscordIntegration: true,
        canUseTwilioIntegration: true,
        canUseRealityLink: true,
        canUseAdvancedAnalytics: true,
        canUseAIInsights: true,
        canUseBulkOperations: true,
        canUseCustomFields: true,
        canExportData: true,
        canManageTeam: true,
        canUseBranding: true,
        canUseAPI: true,
        supportLevel: 'dedicated',
    },
};

const TIER_DISPLAY_NAMES: Record<string, string> = {
    free: 'Starter',
    pro: 'Pro',
    enterprise: 'Venture',
};

/**
 * Hook to get current user's plan limits
 */
export function usePlanLimits(): PlanInfo {
    const { profile } = useAuth();

    return useMemo(() => {
        const tier = (profile?.tier as 'free' | 'pro' | 'enterprise') || 'free';
        const limits = PLAN_LIMITS[tier] || PLAN_LIMITS.free;

        return {
            tier,
            tierDisplayName: TIER_DISPLAY_NAMES[tier] || 'Starter',
            limits,
            isUpgradeAvailable: tier !== 'enterprise',
            nextTier: tier === 'free' ? 'pro' : tier === 'pro' ? 'enterprise' : null,
        };
    }, [profile?.tier]);
}

/**
 * Check if a specific limit is exceeded
 */
export function isLimitExceeded(limit: number, current: number): boolean {
    if (limit === -1) return false; // Unlimited
    return current >= limit;
}

/**
 * Get usage percentage for display
 */
export function getUsagePercentage(limit: number, current: number): number {
    if (limit === -1) return 0; // Unlimited shows as 0%
    if (limit === 0) return 100;
    return Math.min(Math.round((current / limit) * 100), 100);
}

/**
 * Format limit for display
 */
export function formatLimit(limit: number): string {
    if (limit === -1) return 'Unlimited';
    return limit.toLocaleString();
}
