/**
 * AI Lead Discovery Engine Types
 * Based on SPEC-AI-LEAD-DISCOVERY.md
 */

// ========================================
// Token Safety Types
// ========================================

export interface TokenSafetyConfig {
    // Per-sweep limits
    maxTokensPerSweep: number;
    maxAPICallsPerSweep: number;
    maxLeadsToAnalyze: number;

    // Per-company daily limits
    maxTokensPerCompanyPerDay: number;
    maxSweepsPerCompanyPerDay: number;

    // Global platform limits
    maxTokensPerHour: number;
    maxConcurrentSweeps: number;

    // Cost circuit breaker
    maxDailyCostUSD: number;
    alertThresholdUSD: number;
}

export interface TokenUsage {
    tokensUsed: number;
    apiCalls: number;
    estimatedCostUSD: number;
    timestamp: number;
}

export interface DailyUsageRecord {
    date: string; // YYYY-MM-DD
    totalTokens: number;
    totalCostUSD: number;
    sweepCount: number;
    byCompany: Record<
        string,
        {
            tokens: number;
            sweeps: number;
            costUSD: number;
        }
    >;
}

// ========================================
// Discovery Profile Types
// ========================================

export interface TargetingCriteria {
    industries: string[];
    companySize: {
        min: number;
        max: number;
    };
    geography: {
        countries: string[];
        states: string[];
        cities: string[];
        radius?: number; // miles from a point
    };
    painPoints: string[];
    buyingSignals: string[];
    excludeKeywords: string[];
    idealCustomerProfile: string; // AI-generated summary
}

export interface DiscoverySchedule {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
    customDays?: number; // If custom, run every N days
    preferredTime: string; // "09:00" UTC
    lastRunAt: number | null;
    nextRunAt: number | null;
}

export interface DiscoveryNotifications {
    discord: {
        enabled: boolean;
        channelId: string | null;
        mentionRole: string | null;
    };
    email: {
        enabled: boolean;
        recipients: string[];
    };
    inApp: {
        enabled: boolean;
    };
}

export interface DiscoveryStats {
    totalLeadsFound: number;
    leadsAddedToPipeline: number;
    leadsDismissed: number;
    lastSweepLeadsCount: number;
}

export interface DiscoveryProfile {
    id: string;
    companyId: string;

    // Raw user input
    businessDescription: string;

    // AI-parsed targeting criteria
    targetingCriteria: TargetingCriteria;

    // Schedule settings
    schedule: DiscoverySchedule;

    // Notification settings
    notifications: DiscoveryNotifications;

    // Stats
    stats: DiscoveryStats;

    createdAt: number;
    updatedAt: number;
}

// ========================================
// Discovered Lead Types
// ========================================

export interface DiscoveredLeadContact {
    name: string;
    title: string;
    email: string | null;
    phone: string | null;
    linkedin: string | null;
}

export interface DiscoveredLeadLocation {
    address: string | null;
    city: string;
    state: string;
    country: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
}

export interface DiscoveredLeadAIAnalysis {
    matchScore: number; // 0-100
    matchReasons: string[];
    painPointsIdentified: string[];
    buyingSignals: string[];
    summary: string;
}

export interface DiscoveredLeadVerification {
    status: 'pending' | 'verified' | 'failed';
    verifiedAt: number | null;
    checks: {
        websiteExists: boolean;
        phoneValid: boolean;
        emailValid: boolean;
        businessRegistered: boolean;
    };
}

export interface DiscoveredLeadSource {
    type: 'linkedin' | 'google' | 'directory' | 'news' | 'jobs' | 'social';
    url: string;
    foundAt: number;
}

export type DiscoveredLeadStatus = 'new' | 'reviewed' | 'added_to_pipeline' | 'dismissed';

export interface DiscoveredLead {
    id: string;
    companyId: string;
    discoveryProfileId: string;

    // Business info
    businessName: string;
    industry: string;
    website: string | null;

    // Contact info
    contacts: DiscoveredLeadContact[];

    // Location
    location: DiscoveredLeadLocation;

    // AI analysis
    aiAnalysis: DiscoveredLeadAIAnalysis;

    // Verification
    verification: DiscoveredLeadVerification;

    // Sources where we found them
    sources: DiscoveredLeadSource[];

    // Status
    status: DiscoveredLeadStatus;
    dismissReason?: string;
    pipelineLeadId?: string;

    // Sweep info
    sweepId: string;
    discoveredAt: number;
    reviewedAt: number | null;
    reviewedBy: string | null;
}

// ========================================
// Discovery Sweep Types
// ========================================

export type SweepStatus = 'pending' | 'running' | 'completed' | 'failed';
export type SweepTrigger = 'schedule' | 'manual';

export interface SweepResults {
    sourcesSearched: number;
    rawResultsFound: number;
    afterDeduplication: number;
    afterVerification: number;
    finalLeadsCount: number;
}

export interface SweepError {
    source: string;
    error: string;
    timestamp: number;
}

export interface DiscoverySweep {
    id: string;
    companyId: string;
    discoveryProfileId: string;

    // Execution
    status: SweepStatus;
    startedAt: number;
    completedAt: number | null;

    // Token usage tracking
    tokenUsage: TokenUsage;

    // Results
    results: SweepResults;

    // Errors if any
    errors: SweepError[];

    // Notifications sent
    notificationsSent: {
        discord: boolean;
        email: boolean;
    };

    // Trigger info
    triggeredBy: SweepTrigger;
    triggeredByUserId?: string;
}

// ========================================
// API Request/Response Types
// ========================================

export interface ParseBusinessDescriptionRequest {
    description: string;
}

export interface ParseBusinessDescriptionResponse {
    success: boolean;
    targetingCriteria?: TargetingCriteria;
    error?: string;
}

export interface TriggerSweepRequest {
    companyId: string;
    userId?: string;
}

export interface TriggerSweepResponse {
    success: boolean;
    sweepId?: string;
    error?: string;
}

export interface DiscoveredLeadsQuery {
    status?: DiscoveredLeadStatus;
    limit?: number;
    offset?: number;
}

// ========================================
// Default Values
// ========================================

export const DEFAULT_TOKEN_SAFETY: TokenSafetyConfig = {
    // Per-sweep limits
    maxTokensPerSweep: 50_000,
    maxAPICallsPerSweep: 20,
    maxLeadsToAnalyze: 50,

    // Per-company daily limits
    maxTokensPerCompanyPerDay: 100_000,
    maxSweepsPerCompanyPerDay: 3,

    // Global platform limits
    maxTokensPerHour: 500_000,
    maxConcurrentSweeps: 5,

    // Cost circuit breaker
    maxDailyCostUSD: 50.0,
    alertThresholdUSD: 25.0,
};

export const DEFAULT_TARGETING_CRITERIA: TargetingCriteria = {
    industries: [],
    companySize: { min: 10, max: 500 },
    geography: {
        countries: ['US'],
        states: [],
        cities: [],
    },
    painPoints: [],
    buyingSignals: [],
    excludeKeywords: [],
    idealCustomerProfile: '',
};

export const DEFAULT_DISCOVERY_SCHEDULE: DiscoverySchedule = {
    enabled: false,
    frequency: 'weekly',
    preferredTime: '09:00',
    lastRunAt: null,
    nextRunAt: null,
};

export const DEFAULT_DISCOVERY_NOTIFICATIONS: DiscoveryNotifications = {
    discord: {
        enabled: false,
        channelId: null,
        mentionRole: null,
    },
    email: {
        enabled: false,
        recipients: [],
    },
    inApp: {
        enabled: true,
    },
};

export const DEFAULT_DISCOVERY_STATS: DiscoveryStats = {
    totalLeadsFound: 0,
    leadsAddedToPipeline: 0,
    leadsDismissed: 0,
    lastSweepLeadsCount: 0,
};

export function createDefaultDiscoveryProfile(companyId: string): Omit<DiscoveryProfile, 'id'> {
    const now = Date.now();
    return {
        companyId,
        businessDescription: '',
        targetingCriteria: { ...DEFAULT_TARGETING_CRITERIA },
        schedule: { ...DEFAULT_DISCOVERY_SCHEDULE },
        notifications: { ...DEFAULT_DISCOVERY_NOTIFICATIONS },
        stats: { ...DEFAULT_DISCOVERY_STATS },
        createdAt: now,
        updatedAt: now,
    };
}
