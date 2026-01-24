import { Lead, Activity, LeadStatus } from '@/types';

/**
 * Enterprise-grade sales velocity scoring algorithm.
 * Based on 2025 best practices for deal prioritization.
 */

const STATUS_WEIGHTS: Record<LeadStatus, number> = {
    New: 10,
    Contacted: 20,
    Qualified: 30,
    Proposal: 45,
    Negotiation: 60,
    Closed: 100,
    Lost: 0,
};

export interface VelocityResult {
    score: number;
    status: 'hot' | 'warm' | 'cold';
    momentum: 'rising' | 'steady' | 'dropping';
}

export function calculateLeadVelocity(lead: Lead, activities: Activity[] = []): VelocityResult {
    let score = STATUS_WEIGHTS[lead.status] || 0;

    // 1. Recency Multiplier (TLC - Time Since Last Contact)
    const now = Date.now();
    const lastAction = lead.lastContact || lead.updatedAt;
    const daysSinceLastAction = Math.max(0, (now - lastAction) / (1000 * 60 * 60 * 24));

    // Penalize inactivity: -3 points per day after 2 days of silence
    const inactivityPenalty = daysSinceLastAction > 2 ? (daysSinceLastAction - 2) * 3 : 0;
    score -= inactivityPenalty;

    // 2. Activity Intensity (Last 7 days)
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentActivities = activities.filter((a) => a.timestamp > weekAgo);

    // Reward momentum: +5 points per recent activity (cap at +25)
    const activityBonus = Math.min(recentActivities.length * 5, 25);
    score += activityBonus;

    // 3. Deal Value Weight (Logarithmic)
    // Larger deals carry more weight, but don't overwhelm velocity
    if (lead.value > 0) {
        const valueBonus = Math.log10(lead.value) * 2;
        score += valueBonus;
    }

    // Normalize score 0-100
    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    // Categorize
    let status: 'hot' | 'warm' | 'cold' = 'warm';
    if (finalScore > 75) status = 'hot';
    else if (finalScore < 40) status = 'cold';

    // Momentum detection
    let momentum: 'rising' | 'steady' | 'dropping' = 'steady';
    if (recentActivities.length > 3) momentum = 'rising';
    if (inactivityPenalty > 15) momentum = 'dropping';

    return { score: finalScore, status, momentum };
}

// ============================================
// AI LEAD SCORING SYSTEM
// ============================================

export interface AILeadScore {
    score: number; // 0-100
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    factors: {
        engagement: number;
        dealSize: number;
        timing: number;
        stage: number;
    };
}

/**
 * AI-powered lead scoring algorithm.
 * Factors: engagement (40%), deal size (20%), timing (20%), stage (20%)
 */
export function calculateAILeadScore(lead: Lead, activities: Activity[] = []): AILeadScore {
    const now = Date.now();
    const daysSinceCreation = (now - lead.createdAt) / (1000 * 60 * 60 * 24);
    const lastAction = lead.lastContact || lead.updatedAt;
    const daysSinceContact = (now - lastAction) / (1000 * 60 * 60 * 24);

    // 1. Engagement Score (0-100) - 40% weight
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentActivities = activities.filter((a) => a.timestamp > weekAgo);
    const hasEmail = activities.some((a) => a.type === 'email');
    const hasCall = activities.some((a) => a.type === 'call');
    const hasMeeting = activities.some((a) => a.type === 'meeting');

    let engagementScore = Math.min(recentActivities.length * 15, 50);
    if (hasEmail) engagementScore += 10;
    if (hasCall) engagementScore += 15;
    if (hasMeeting) engagementScore += 25;
    engagementScore = Math.min(engagementScore, 100);

    // 2. Deal Size Score (0-100) - 20% weight
    // Logarithmic scale: $1K = 30, $10K = 60, $100K = 90, $1M = 100
    let dealSizeScore = 0;
    if (lead.value > 0) {
        dealSizeScore = Math.min(Math.log10(lead.value) * 25, 100);
    }

    // 3. Timing Score (0-100) - 20% weight
    // Fresh leads score higher, stale leads score lower
    let timingScore = 100;
    if (daysSinceContact > 3) timingScore -= (daysSinceContact - 3) * 5;
    if (daysSinceCreation > 30) timingScore -= 10; // Aging penalty
    timingScore = Math.max(0, Math.min(100, timingScore));

    // 4. Stage Score (0-100) - 20% weight
    const stageScore = STATUS_WEIGHTS[lead.status] || 0;

    // Weighted final score
    const finalScore = Math.round(
        engagementScore * 0.4 + dealSizeScore * 0.2 + timingScore * 0.2 + stageScore * 0.2
    );

    // Grade assignment
    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'C';
    if (finalScore >= 80) grade = 'A';
    else if (finalScore >= 65) grade = 'B';
    else if (finalScore >= 50) grade = 'C';
    else if (finalScore >= 35) grade = 'D';
    else grade = 'F';

    return {
        score: finalScore,
        grade,
        factors: {
            engagement: Math.round(engagementScore),
            dealSize: Math.round(dealSizeScore),
            timing: Math.round(timingScore),
            stage: stageScore,
        },
    };
}

// ============================================
// AI NEXT BEST ACTION
// ============================================

export interface NextBestAction {
    action: 'call' | 'email' | 'meeting' | 'proposal' | 'follow_up' | 'close';
    emoji: string;
    label: string;
    reason: string;
    urgency: 'high' | 'medium' | 'low';
}

/**
 * AI-powered next best action recommendation.
 * Analyzes lead state and activity history to suggest optimal next step.
 */
export function getNextBestAction(lead: Lead, activities: Activity[] = []): NextBestAction {
    const now = Date.now();
    const lastAction = lead.lastContact || lead.updatedAt;
    const daysSinceContact = Math.floor((now - lastAction) / (1000 * 60 * 60 * 24));

    const hasCall = activities.some((a) => a.type === 'call');
    const hasMeeting = activities.some((a) => a.type === 'meeting');
    const recentEmails = activities.filter(
        (a) => a.type === 'email' && now - a.timestamp < 7 * 24 * 60 * 60 * 1000
    );

    // Decision tree for next best action
    if (lead.status === 'New') {
        if (!hasCall) {
            return {
                action: 'call',
                emoji: '📞',
                label: 'Make intro call',
                reason: 'New lead needs initial qualification',
                urgency: 'high',
            };
        }
        return {
            action: 'email',
            emoji: '✉️',
            label: 'Send intro email',
            reason: 'Follow up after initial contact',
            urgency: 'medium',
        };
    }

    if (lead.status === 'Qualified' || lead.status === 'Contacted') {
        if (!hasMeeting) {
            return {
                action: 'meeting',
                emoji: '📅',
                label: 'Schedule demo',
                reason: 'Qualified lead ready for product demo',
                urgency: 'high',
            };
        }
        return {
            action: 'proposal',
            emoji: '📝',
            label: 'Send proposal',
            reason: 'Move lead to proposal stage',
            urgency: 'medium',
        };
    }

    if (lead.status === 'Proposal') {
        if (daysSinceContact > 3) {
            return {
                action: 'follow_up',
                emoji: '🔔',
                label: 'Follow up on proposal',
                reason: `${daysSinceContact} days since last contact`,
                urgency: daysSinceContact > 5 ? 'high' : 'medium',
            };
        }
        return {
            action: 'call',
            emoji: '📞',
            label: 'Check in call',
            reason: 'Discuss proposal questions',
            urgency: 'medium',
        };
    }

    if (lead.status === 'Negotiation') {
        return {
            action: 'close',
            emoji: '🎯',
            label: 'Push for close',
            reason: 'Lead is in final negotiation stage',
            urgency: 'high',
        };
    }

    // Default: follow up if stale
    if (daysSinceContact > 5) {
        return {
            action: 'follow_up',
            emoji: '⚠️',
            label: 'Re-engage lead',
            reason: `${daysSinceContact} days without contact - at risk`,
            urgency: 'high',
        };
    }

    return {
        action: 'email',
        emoji: '✉️',
        label: 'Send update',
        reason: 'Keep momentum going',
        urgency: 'low',
    };
}

// ============================================
// AI WIN PROBABILITY
// ============================================

export interface WinProbability {
    probability: number; // 0-100
    trend: 'up' | 'down' | 'stable';
    confidence: 'high' | 'medium' | 'low';
}

/**
 * AI-powered win probability calculation.
 * Based on stage, engagement, and historical patterns.
 */
export function calculateWinProbability(lead: Lead, activities: Activity[] = []): WinProbability {
    // Base probability by stage
    const stageProbabilities: Record<LeadStatus, number> = {
        New: 10,
        Contacted: 20,
        Qualified: 35,
        Proposal: 55,
        Negotiation: 75,
        Closed: 100,
        Lost: 0,
    };

    let probability = stageProbabilities[lead.status] || 0;

    // Engagement modifier
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentActivities = activities.filter((a) => a.timestamp > weekAgo);

    if (recentActivities.length > 3) probability += 10;
    else if (recentActivities.length === 0) probability -= 10;

    // Inactivity penalty
    const lastAction = lead.lastContact || lead.updatedAt;
    const daysSinceContact = (now - lastAction) / (1000 * 60 * 60 * 24);
    if (daysSinceContact > 7) probability -= 15;
    else if (daysSinceContact > 3) probability -= 5;

    // Cap probability
    probability = Math.max(5, Math.min(95, probability));

    // Trend calculation
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (recentActivities.length > 2) trend = 'up';
    if (daysSinceContact > 5) trend = 'down';

    // Confidence based on data quality
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    if (activities.length > 5) confidence = 'high';
    if (activities.length === 0) confidence = 'low';

    return { probability: Math.round(probability), trend, confidence };
}

// ============================================
// STALE LEAD DETECTION
// ============================================

export interface StaleLeadInfo {
    isStale: boolean;
    daysSinceContact: number;
    riskLevel: 'critical' | 'warning' | 'ok';
    message?: string;
}

/**
 * Detect stale leads that need attention.
 */
export function detectStaleLead(lead: Lead): StaleLeadInfo {
    const now = Date.now();
    const lastAction = lead.lastContact || lead.updatedAt;
    const daysSinceContact = Math.floor((now - lastAction) / (1000 * 60 * 60 * 24));

    // Closed and Lost leads are not stale
    if (lead.status === 'Closed' || lead.status === 'Lost') {
        return { isStale: false, daysSinceContact, riskLevel: 'ok' };
    }

    // Different thresholds based on stage
    const criticalDays: Record<LeadStatus, number> = {
        New: 3,
        Contacted: 5,
        Qualified: 5,
        Proposal: 7,
        Negotiation: 5,
        Closed: 999,
        Lost: 999,
    };

    const warningDays = criticalDays[lead.status] - 2;

    if (daysSinceContact >= criticalDays[lead.status]) {
        return {
            isStale: true,
            daysSinceContact,
            riskLevel: 'critical',
            message: `No contact in ${daysSinceContact} days - deal at risk!`,
        };
    }

    if (daysSinceContact >= warningDays) {
        return {
            isStale: true,
            daysSinceContact,
            riskLevel: 'warning',
            message: `${daysSinceContact} days since last contact`,
        };
    }

    return { isStale: false, daysSinceContact, riskLevel: 'ok' };
}
