/**
 * Lead Scoring Service
 *
 * AI-powered lead scoring based on engagement, profile, and behavior signals.
 * Calculates a 0-100 score with breakdown by category.
 *
 * Best practice 2026: Multi-dimensional scoring with explainability
 */

import { Lead, Activity } from '@/types';

// Scoring weights for different categories
const WEIGHTS = {
    engagement: 0.35, // Activity frequency and recency
    profile: 0.25, // Company info completeness
    behavior: 0.25, // Response patterns
    readiness: 0.15, // Sales-ready signals
};

// Score thresholds
export const SCORE_THRESHOLDS = {
    HOT: 80,
    WARM: 60,
    COOL: 40,
    COLD: 20,
};

export type ScoreCategory = 'hot' | 'warm' | 'cool' | 'cold';

export interface LeadScoreBreakdown {
    total: number;
    category: ScoreCategory;
    engagement: number;
    profile: number;
    behavior: number;
    readiness: number;
    signals: string[];
    lastUpdated: number;
}

/**
 * Calculate lead score based on multiple signals
 */
export function calculateLeadScore(lead: Lead, activities: Activity[] = []): LeadScoreBreakdown {
    const signals: string[] = [];

    // 1. Engagement Score (0-100)
    const engagementScore = calculateEngagementScore(lead, activities, signals);

    // 2. Profile Score (0-100)
    const profileScore = calculateProfileScore(lead, signals);

    // 3. Behavior Score (0-100)
    const behaviorScore = calculateBehaviorScore(activities, signals);

    // 4. Readiness Score (0-100)
    const readinessScore = calculateReadinessScore(lead, activities, signals);

    // Calculate weighted total
    const total = Math.round(
        engagementScore * WEIGHTS.engagement +
            profileScore * WEIGHTS.profile +
            behaviorScore * WEIGHTS.behavior +
            readinessScore * WEIGHTS.readiness
    );

    // Determine category
    const category = getScoreCategory(total);

    return {
        total,
        category,
        engagement: Math.round(engagementScore),
        profile: Math.round(profileScore),
        behavior: Math.round(behaviorScore),
        readiness: Math.round(readinessScore),
        signals,
        lastUpdated: new Date().getTime(),
    };
}

/**
 * Engagement Score - Activity frequency and recency
 */
function calculateEngagementScore(lead: Lead, activities: Activity[], signals: string[]): number {
    let score = 0;
    const now = new Date().getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    // Activity count in last 7 days
    const recentActivities = activities.filter((a) => now - a.timestamp < 7 * dayMs);

    if (recentActivities.length >= 5) {
        score += 40;
        signals.push('High activity volume (5+ in 7 days)');
    } else if (recentActivities.length >= 2) {
        score += 25;
        signals.push('Moderate activity (2-4 in 7 days)');
    } else if (recentActivities.length >= 1) {
        score += 10;
    }

    // Last contact recency
    if (lead.lastContact) {
        const daysSinceContact = (now - lead.lastContact) / dayMs;
        if (daysSinceContact < 1) {
            score += 30;
            signals.push('Contacted today');
        } else if (daysSinceContact < 3) {
            score += 20;
        } else if (daysSinceContact < 7) {
            score += 10;
        }
    }

    // Activity diversity (different types)
    const activityTypes = new Set(activities.map((a) => a.type));
    if (activityTypes.size >= 3) {
        score += 20;
        signals.push('Multi-channel engagement');
    } else if (activityTypes.size >= 2) {
        score += 10;
    }

    // Next step defined
    if (lead.nextStep) {
        score += 10;
        signals.push('Next step planned');
    }

    return Math.min(100, score);
}

/**
 * Profile Score - Data completeness and quality
 */
function calculateProfileScore(lead: Lead, signals: string[]): number {
    let score = 0;

    // Required fields
    if (lead.contactName) score += 20;
    if (lead.email) score += 20;
    if (lead.phone) score += 15;
    if (lead.companyName) {
        score += 15;
        signals.push('Company identified');
    }

    // Optional enrichment fields
    if (lead.industry) score += 10;
    if (lead.source) score += 5;
    if (lead.tags && lead.tags.length > 0) score += 5;

    // Notes indicate research
    if (lead.notes && lead.notes.length > 50) {
        score += 10;
        signals.push('Detailed notes captured');
    }

    return Math.min(100, score);
}

/**
 * Behavior Score - Response patterns
 */
function calculateBehaviorScore(activities: Activity[], signals: string[]): number {
    let score = 50; // Baseline

    if (activities.length === 0) return score;

    // Meeting booked = strong signal
    const meetings = activities.filter((a) => a.type === 'meeting');
    if (meetings.length > 0) {
        score += 30;
        signals.push(`${meetings.length} meeting(s) scheduled`);
    }

    // Check outcomes
    const successfulOutcomes = activities.filter(
        (a) => a.outcome === 'connected' || a.outcome === 'meeting_set' || a.outcome === 'qualified'
    );
    if (successfulOutcomes.length > 0) {
        score += 15;
        signals.push('Positive engagement outcomes');
    }

    // Demo completed
    const demos = activities.filter((a) => a.type === 'demo');
    if (demos.length > 0) {
        score += 5 * Math.min(demos.length, 2);
    }

    return Math.min(100, score);
}

/**
 * Readiness Score - Sales-ready signals
 */
function calculateReadinessScore(lead: Lead, activities: Activity[], signals: string[]): number {
    let score = 0;

    // Pipeline stage
    const stageScores: Record<string, number> = {
        New: 10,
        Contacted: 20,
        Qualified: 50,
        Proposal: 70,
        Negotiation: 85,
        Closed: 100,
        Lost: 0,
    };
    score += stageScores[lead.status] || 10;

    if (lead.status === 'Qualified') {
        signals.push('Lead qualified');
    } else if (lead.status === 'Proposal') {
        signals.push('Proposal sent');
    } else if (lead.status === 'Negotiation') {
        signals.push('In negotiation');
    }

    // High value deal
    if (lead.value >= 10000) {
        score += 15;
        signals.push('High-value opportunity');
    } else if (lead.value >= 5000) {
        score += 10;
    }

    // Probability set and high
    if (lead.probability && lead.probability >= 70) {
        score += 10;
        signals.push('High win probability');
    }

    // Recent activity velocity
    const now = new Date().getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    const last30Days = activities.filter((a) => now - a.timestamp < 30 * dayMs);
    const last7Days = activities.filter((a) => now - a.timestamp < 7 * dayMs);

    // Accelerating engagement
    if (last7Days.length > last30Days.length / 2 && last30Days.length > 0) {
        signals.push('Accelerating engagement');
    }

    return Math.min(100, score);
}

/**
 * Get score category label
 */
function getScoreCategory(score: number): ScoreCategory {
    if (score >= SCORE_THRESHOLDS.HOT) return 'hot';
    if (score >= SCORE_THRESHOLDS.WARM) return 'warm';
    if (score >= SCORE_THRESHOLDS.COOL) return 'cool';
    return 'cold';
}

/**
 * Get category color for UI
 */
export function getScoreCategoryColor(category: ScoreCategory): string {
    switch (category) {
        case 'hot':
            return 'text-red-400 bg-red-500/20';
        case 'warm':
            return 'text-orange-400 bg-orange-500/20';
        case 'cool':
            return 'text-blue-400 bg-blue-500/20';
        case 'cold':
            return 'text-slate-400 bg-slate-500/20';
    }
}

/**
 * Get category emoji for display
 */
export function getScoreCategoryEmoji(category: ScoreCategory): string {
    switch (category) {
        case 'hot':
            return '🔥';
        case 'warm':
            return '☀️';
        case 'cool':
            return '❄️';
        case 'cold':
            return '🧊';
    }
}
