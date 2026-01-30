/**
 * usePlanLimits Hook
 *
 * Provides plan limit checking and usage tracking for components.
 * Combines user's tier with current usage to enable/disable features.
 *
 * Best practice 2026: React hook for centralized plan enforcement
 */

'use client';

import { useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCompanyUsage } from './useCompanySettings';
import {
    PLAN_LIMITS,
    PlanTier,
    PlanLimits,
    isLimitExceeded,
    getRemainingUsage,
    getUpgradeMessage,
    formatLimit,
} from '@/lib/plans';

// Re-export formatLimit for convenience
export { formatLimit };

// Tier display names
const TIER_DISPLAY_NAMES: Record<PlanTier, string> = {
    free: 'Free',
    pro: 'Pro',
    enterprise: 'Enterprise',
};

// Next tier for upgrade path
const NEXT_TIER: Record<PlanTier, PlanTier | null> = {
    free: 'pro',
    pro: 'enterprise',
    enterprise: null,
};

export interface UsePlanLimitsResult {
    // Current tier
    tier: PlanTier;
    tierDisplayName: string;
    limits: PlanLimits;

    // Upgrade info
    isUpgradeAvailable: boolean;
    nextTier: PlanTier | null;

    // Usage data
    usage: {
        leads: number;
        leadsThisMonth: number;
        teamMembers: number;
        emailsThisMonth: number;
        activitiesThisMonth: number;
    };

    // Limit checks
    canCreateLead: boolean;
    canAddTeamMember: boolean;
    canSendEmail: boolean;
    canLogActivity: boolean;
    canUseCustomFields: boolean;
    canUseAiFeatures: boolean;
    canUseApi: boolean;
    canUseBrandedEmails: boolean;
    canUseAdvancedAnalytics: boolean;

    // Remaining counts
    remainingLeads: number;
    remainingLeadsThisMonth: number;
    remainingTeamMembers: number;
    remainingEmailsThisMonth: number;

    // Helpers
    isLimitReached: (limitType: keyof PlanLimits) => boolean;
    getUpgradeMessage: (limitType: keyof PlanLimits) => string;
    formatLimit: (limit: number) => string;

    // Loading state
    isLoading: boolean;
}

export function usePlanLimits(): UsePlanLimitsResult {
    const { profile, loading: authLoading } = useAuth();
    const { usage, isLoading: usageLoading } = useCompanyUsage();

    const tier = (profile?.tier as PlanTier) || 'free';
    const tierDisplayName = TIER_DISPLAY_NAMES[tier];
    const nextTier = NEXT_TIER[tier];
    const isUpgradeAvailable = nextTier !== null;
    const limits = PLAN_LIMITS[tier];

    const currentUsage = useMemo(
        () => ({
            leads: usage?.leadCount || 0,
            leadsThisMonth: usage?.leadsThisMonth || 0,
            teamMembers: usage?.teamMemberCount || 1,
            emailsThisMonth: usage?.emailsSentThisMonth || 0,
            activitiesThisMonth: usage?.activitiesThisMonth || 0,
        }),
        [usage]
    );

    // Calculate can/cannot for each limit type
    const canCreateLead = useMemo(() => {
        return (
            !isLimitExceeded(currentUsage.leads, limits.leads) &&
            !isLimitExceeded(currentUsage.leadsThisMonth, limits.leadsPerMonth)
        );
    }, [currentUsage.leads, currentUsage.leadsThisMonth, limits.leads, limits.leadsPerMonth]);

    const canAddTeamMember = useMemo(() => {
        return !isLimitExceeded(currentUsage.teamMembers, limits.teamMembers);
    }, [currentUsage.teamMembers, limits.teamMembers]);

    const canSendEmail = useMemo(() => {
        return !isLimitExceeded(currentUsage.emailsThisMonth, limits.emailsPerMonth);
    }, [currentUsage.emailsThisMonth, limits.emailsPerMonth]);

    const canLogActivity = useMemo(() => {
        return !isLimitExceeded(currentUsage.activitiesThisMonth, limits.activitiesPerMonth);
    }, [currentUsage.activitiesThisMonth, limits.activitiesPerMonth]);

    // Remaining counts
    const remainingLeads = getRemainingUsage(currentUsage.leads, limits.leads);
    const remainingLeadsThisMonth = getRemainingUsage(
        currentUsage.leadsThisMonth,
        limits.leadsPerMonth
    );
    const remainingTeamMembers = getRemainingUsage(currentUsage.teamMembers, limits.teamMembers);
    const remainingEmailsThisMonth = getRemainingUsage(
        currentUsage.emailsThisMonth,
        limits.emailsPerMonth
    );

    // Helper to check if a specific limit is reached
    const isLimitReached = (limitType: keyof PlanLimits): boolean => {
        switch (limitType) {
            case 'leads':
                return isLimitExceeded(currentUsage.leads, limits.leads);
            case 'leadsPerMonth':
                return isLimitExceeded(currentUsage.leadsThisMonth, limits.leadsPerMonth);
            case 'teamMembers':
                return isLimitExceeded(currentUsage.teamMembers, limits.teamMembers);
            case 'emailsPerMonth':
                return isLimitExceeded(currentUsage.emailsThisMonth, limits.emailsPerMonth);
            case 'activitiesPerMonth':
                return isLimitExceeded(currentUsage.activitiesThisMonth, limits.activitiesPerMonth);
            default:
                // Boolean features
                return !limits[limitType];
        }
    };

    return {
        tier,
        tierDisplayName,
        limits,

        isUpgradeAvailable,
        nextTier,

        usage: currentUsage,

        canCreateLead,
        canAddTeamMember,
        canSendEmail,
        canLogActivity,
        canUseCustomFields: limits.customFields,
        canUseAiFeatures: limits.aiFeatures,
        canUseApi: limits.apiAccess,
        canUseBrandedEmails: limits.brandedEmails,
        canUseAdvancedAnalytics: limits.advancedAnalytics,

        remainingLeads,
        remainingLeadsThisMonth,
        remainingTeamMembers,
        remainingEmailsThisMonth,

        isLimitReached,
        getUpgradeMessage: (limitType) => getUpgradeMessage(limitType, tier),
        formatLimit,

        isLoading: authLoading || usageLoading,
    };
}

/**
 * Hook for checking a single feature gate
 * Lightweight alternative when you just need one check
 */
export function useFeatureGate(feature: keyof PlanLimits): {
    allowed: boolean;
    upgradeMessage: string;
    isLoading: boolean;
} {
    const { profile, loading } = useAuth();
    const tier = (profile?.tier as PlanTier) || 'free';
    const limits = PLAN_LIMITS[tier];

    const allowed =
        typeof limits[feature] === 'boolean'
            ? (limits[feature] as boolean)
            : (limits[feature] as number) !== 0;

    return {
        allowed,
        upgradeMessage: getUpgradeMessage(feature, tier),
        isLoading: loading,
    };
}
