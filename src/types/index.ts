export type Role = 'admin' | 'rep' | 'manager';

export interface User {
    uid: string;
    email: string;
    name: string;
    role: Role;
    avatarUrl?: string;
    createdAt: number; // Timestamp
}

export type LeadStatus =
    | 'New'
    | 'Contacted'
    | 'Qualified'
    | 'Proposal'
    | 'Negotiation'
    | 'Closed'
    | 'Lost';

export type LeadSource =
    | 'Website'
    | 'Referral'
    | 'Cold Call'
    | 'LinkedIn'
    | 'Event'
    | 'Email Campaign'
    | 'Partner'
    | 'Other';

export interface Lead {
    id: string;
    companyId?: string; // Multi-tenant company association
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    value: number;
    status: LeadStatus;
    assignedTo: string; // User UID
    industry?: string;
    source?: string;
    notes?: string;
    tags?: string[];
    lastContact?: number; // Timestamp of last contact
    nextStep?: string; // Next action to take
    probability?: number; // Win probability percentage
    discordChannelId?: string; // Discord Channel ID
    aiGenerated?: boolean; // If created by Bot
    enrichmentData?: {
        overview?: {
            description: string;
            industry: string;
            estimatedSize: string;
            keyPeople: string[];
            founded?: string;
            headquarters?: string;
        };
        digitalPresence?: {
            score: number;
            websiteQuality: string;
            mobileOptimized: boolean;
            seoStrength: string;
            socialProfiles: string[];
        };
        aiReadiness?: {
            score: number;
            currentAIUsage: string;
            opportunities: string[];
        };
        reviews?: {
            sentiment: string;
            averageRating?: number;
            keyThemes: string[];
            sources: string[];
        };
        painPoints?: string[];
        opportunities?: string[];
        talkingPoints?: string[];
        relevantResources?: {
            id: string;
            title: string;
            relevance: string;
        }[];
    };
    enrichedAt?: number; // Timestamp when AI enrichment was done
    createdAt: number;
    updatedAt: number;
}

export type ActivityType = 'call' | 'email' | 'meeting' | 'social' | 'demo';

export type ActivityOutcome =
    | 'connected'
    | 'voicemail'
    | 'no_answer'
    | 'wrong_number'
    | 'meeting_set'
    | 'qualified'
    | 'contract_sent'
    | 'closed_won'
    | 'none';

export interface Activity {
    id: string;
    type: ActivityType;
    outcome: ActivityOutcome;
    duration?: number; // seconds (for calls)
    timestamp: number;
    repId: string;
    leadId?: string;
    notes?: string;
    visibility?: 'public' | 'private'; // default: private (legacy) or specified
}

// Aggregated Metrics for Reporting
export interface DailyMetrics {
    id: string; // date_repId
    date: string; // YYYY-MM-DD
    repId: string;
    dials: number;
    connects: number;
    talkTime: number; // seconds
    meetingsHeld: number;
    revenueGenerated: number;
    leadsCreated: number;
}

// Enablement & Resources
export type ResourceCategory =
    | 'Playbook'
    | 'Learning'
    | 'Prospecting'
    | 'Templates'
    | 'Competitive'
    | 'Operational'
    | 'Scheduling'
    | 'Brand'
    | 'Insights';

export type ResourceType = 'document' | 'link' | 'video' | 'deck' | 'sheet';

export interface Resource {
    id: string;
    title: string;
    description: string;
    category: ResourceCategory;
    type: ResourceType;
    url: string;
    tags?: string[];
    updatedAt: number;
    createdAt?: string; // ISO String
    createdBy?: string; // User ID
    storagePath?: string; // Firebase Storage path
    visibility?: 'private' | 'company';
}
