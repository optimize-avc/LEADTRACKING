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
