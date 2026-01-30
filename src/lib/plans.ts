/**
 * Plan Limits Configuration
 *
 * Defines usage limits for each subscription tier.
 * -1 means unlimited.
 *
 * Best practice 2026: Centralized plan configuration with type safety
 */

export type PlanTier = 'free' | 'pro' | 'enterprise';

export interface PlanLimits {
    leads: number; // Total leads allowed (-1 = unlimited)
    leadsPerMonth: number; // New leads per month (-1 = unlimited)
    teamMembers: number; // Team members allowed (-1 = unlimited)
    emailsPerMonth: number; // Emails sent per month (-1 = unlimited)
    activitiesPerMonth: number; // Activities logged per month (-1 = unlimited)
    customFields: boolean; // Can create custom lead fields
    aiFeatures: boolean; // Access to AI deal wargaming
    apiAccess: boolean; // API access for integrations
    brandedEmails: boolean; // Can use custom SendGrid config
    advancedAnalytics: boolean; // Advanced analytics dashboard
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
    free: {
        leads: 50,
        leadsPerMonth: 20,
        teamMembers: 1,
        emailsPerMonth: 100,
        activitiesPerMonth: 500,
        customFields: false,
        aiFeatures: false,
        apiAccess: false,
        brandedEmails: false,
        advancedAnalytics: false,
    },
    pro: {
        leads: -1, // Unlimited
        leadsPerMonth: -1,
        teamMembers: 10,
        emailsPerMonth: 5000,
        activitiesPerMonth: -1,
        customFields: true,
        aiFeatures: true,
        apiAccess: false,
        brandedEmails: true,
        advancedAnalytics: true,
    },
    enterprise: {
        leads: -1,
        leadsPerMonth: -1,
        teamMembers: -1,
        emailsPerMonth: -1,
        activitiesPerMonth: -1,
        customFields: true,
        aiFeatures: true,
        apiAccess: true,
        brandedEmails: true,
        advancedAnalytics: true,
    },
};

/**
 * Plan display information
 */
export const PLAN_INFO: Record<PlanTier, { name: string; price: string; description: string }> = {
    free: {
        name: 'Starter',
        price: '$0',
        description: 'Perfect for individual reps mastering their craft.',
    },
    pro: {
        name: 'Pro',
        price: '$49/mo',
        description: 'High-performance tools for dedicated closers.',
    },
    enterprise: {
        name: 'Venture',
        price: 'Contact Us',
        description: 'Venture-scale intelligence for enterprise teams.',
    },
};

/**
 * Check if a limit is exceeded
 * @param current Current usage count
 * @param limit Plan limit (-1 = unlimited)
 * @returns true if limit exceeded
 */
export function isLimitExceeded(current: number, limit: number): boolean {
    if (limit === -1) return false; // Unlimited
    return current >= limit;
}

/**
 * Get remaining usage
 * @param current Current usage count
 * @param limit Plan limit (-1 = unlimited)
 * @returns Remaining count or -1 for unlimited
 */
export function getRemainingUsage(current: number, limit: number): number {
    if (limit === -1) return -1; // Unlimited
    return Math.max(0, limit - current);
}

/**
 * Format limit for display
 * @param limit Plan limit (-1 = unlimited)
 * @returns Formatted string
 */
export function formatLimit(limit: number): string {
    if (limit === -1) return 'Unlimited';
    return limit.toLocaleString();
}

/**
 * Get upgrade message for a specific limit
 */
export function getUpgradeMessage(limitType: keyof PlanLimits, currentTier: PlanTier): string {
    const messages: Record<keyof PlanLimits, string> = {
        leads: 'Upgrade to Pro for unlimited leads',
        leadsPerMonth: 'Upgrade to Pro for unlimited monthly lead creation',
        teamMembers: 'Upgrade to Pro for up to 10 team members, or Venture for unlimited',
        emailsPerMonth: 'Upgrade to Pro for 5,000 emails/month',
        activitiesPerMonth: 'Upgrade to Pro for unlimited activity logging',
        customFields: 'Custom fields are available on Pro and Venture plans',
        aiFeatures: 'AI Deal Wargaming is available on Pro and Venture plans',
        apiAccess: 'API access is available on the Venture plan',
        brandedEmails: 'Branded emails are available on Pro and Venture plans',
        advancedAnalytics: 'Advanced analytics are available on Pro and Venture plans',
    };

    return messages[limitType] || 'Upgrade your plan for more features';
}
