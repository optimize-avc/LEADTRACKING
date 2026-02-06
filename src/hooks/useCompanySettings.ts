'use client';

/**
 * useCompanySettings Hook
 *
 * Cached company settings with SWR.
 * Provides company config, integrations, and permissions.
 *
 * Best practice 2026: Efficient caching with SWR
 */

import useSWR from 'swr';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/config';
import { useAuth } from '@/components/providers/AuthProvider';
import { UsageService, CompanyUsage } from '@/lib/firebase/usage';

export interface CompanySettings {
    id: string;
    name: string;
    plan: 'free' | 'pro' | 'enterprise';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;

    // Integration configs
    integrations: {
        sendgrid?: {
            enabled: boolean;
            apiKey?: string;
            fromEmail?: string;
        };
        discord?: {
            enabled: boolean;
            webhookUrl?: string;
        };
        twilio?: {
            enabled: boolean;
            accountSid?: string;
        };
        calendly?: {
            enabled: boolean;
        };
    };

    // Feature flags
    features: {
        aiLeadScoring: boolean;
        bulkActions: boolean;
        enrichment: boolean;
        realityLink: boolean;
    };

    // Limits
    limits: {
        leads: number;
        users: number;
        emailsPerMonth: number;
    };

    createdAt: number;
    updatedAt: number;
}

const DEFAULT_FREE_SETTINGS: Partial<CompanySettings> = {
    plan: 'free',
    integrations: {},
    features: {
        aiLeadScoring: true,
        bulkActions: false,
        enrichment: false,
        realityLink: true,
    },
    limits: {
        leads: 100,
        users: 1,
        emailsPerMonth: 100,
    },
};

const DEFAULT_PRO_SETTINGS: Partial<CompanySettings> = {
    plan: 'pro',
    integrations: {},
    features: {
        aiLeadScoring: true,
        bulkActions: true,
        enrichment: true,
        realityLink: true,
    },
    limits: {
        leads: 5000,
        users: 10,
        emailsPerMonth: 5000,
    },
};

const DEFAULT_ENTERPRISE_SETTINGS: Partial<CompanySettings> = {
    plan: 'enterprise',
    integrations: {},
    features: {
        aiLeadScoring: true,
        bulkActions: true,
        enrichment: true,
        realityLink: true,
    },
    limits: {
        leads: -1, // unlimited
        users: -1,
        emailsPerMonth: -1,
    },
};

/**
 * Fetch company settings from Firestore
 */
async function fetchCompanySettings(companyId: string): Promise<CompanySettings | null> {
    const db = getFirebaseDb();
    const docRef = doc(db, 'companies', companyId);
    
    try {
        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) {
            return null;
        }

        const data = snapshot.data();
        const plan = data.plan || 'free';

        // Merge with defaults based on plan
        const defaults =
            plan === 'enterprise'
                ? DEFAULT_ENTERPRISE_SETTINGS
                : plan === 'pro'
                  ? DEFAULT_PRO_SETTINGS
                  : DEFAULT_FREE_SETTINGS;

        return {
            id: snapshot.id,
            ...defaults,
            ...data,
            features: { ...defaults.features, ...data.features },
            limits: { ...defaults.limits, ...data.limits },
        } as CompanySettings;
    } catch (error) {
        // Handle permission errors gracefully - return null
        const err = error as { code?: string; message?: string };
        if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
            return null;
        }
        throw error;
    }
}

/**
 * Hook for company settings with SWR caching
 */
export function useCompanySettings() {
    const { profile } = useAuth();

    const { data, error, isLoading, mutate } = useSWR(
        profile?.companyId ? ['company-settings', profile.companyId] : null,
        ([, companyId]) => fetchCompanySettings(companyId),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // Cache for 1 minute
            refreshInterval: 300000, // Refresh every 5 minutes
        }
    );

    return {
        settings: data,
        isLoading,
        error,
        refresh: mutate,

        // Convenience accessors
        plan: data?.plan || 'free',
        features: data?.features || DEFAULT_FREE_SETTINGS.features!,
        limits: data?.limits || DEFAULT_FREE_SETTINGS.limits!,
        integrations: data?.integrations || {},
    };
}

/**
 * Check if a feature is enabled
 */
export function useFeatureFlag(feature: keyof CompanySettings['features']): boolean {
    const { features } = useCompanySettings();
    return features[feature] ?? false;
}

/**
 * Check if within limits
 */
export function useWithinLimit(
    limitType: keyof CompanySettings['limits'],
    currentUsage: number
): { withinLimit: boolean; limit: number; remaining: number } {
    const { limits } = useCompanySettings();
    const limit = limits[limitType] ?? 0;

    // -1 means unlimited
    if (limit === -1) {
        return { withinLimit: true, limit: -1, remaining: -1 };
    }

    const remaining = Math.max(0, limit - currentUsage);
    return {
        withinLimit: currentUsage < limit,
        limit,
        remaining,
    };
}

/**
 * Hook for company usage data with SWR caching
 */
export function useCompanyUsage() {
    const { profile } = useAuth();

    const { data, error, isLoading, mutate } = useSWR<CompanyUsage | null>(
        profile?.companyId ? ['company-usage', profile.companyId] : null,
        ([, companyId]: [string, string]) => UsageService.getUsage(companyId),
        {
            revalidateOnFocus: true,
            dedupingInterval: 30000, // Cache for 30 seconds
            refreshInterval: 60000, // Refresh every minute
        }
    );

    return {
        usage: data,
        isLoading,
        error,
        refresh: mutate,
    };
}
