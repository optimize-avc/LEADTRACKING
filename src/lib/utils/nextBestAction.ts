/**
 * AI Next Best Action Service
 *
 * Recommends the optimal next action for each lead based on
 * current status, engagement history, and timing.
 *
 * Best practice 2026: Actionable AI suggestions with urgency
 */

import { Lead, Activity, ActivityType } from '@/types';

// NextBestAction can recommend any activity type including notes
export type ActionType = ActivityType | 'note';

export type ActionPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface NextBestAction {
    id: string;
    action: string;
    description: string;
    type: ActionType;
    priority: ActionPriority;
    reason: string;
    suggestedTemplate?: string;
    expiresAt?: number; // When this action becomes stale
}

interface ActionContext {
    lead: Lead;
    activities: Activity[];
    daysSinceContact: number;
    lastActivityType: ActivityType | null;
    meetingsCount: number;
    emailsCount: number;
    callsCount: number;
}

/**
 * Get next best action recommendations for a lead
 */
export function getNextBestActions(lead: Lead, activities: Activity[] = []): NextBestAction[] {
    const now = new Date().getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    // Build context
    const sortedActivities = [...activities].sort((a, b) => b.timestamp - a.timestamp);
    const lastActivity = sortedActivities[0];
    const daysSinceContact = lead.lastContact ? (now - lead.lastContact) / dayMs : 999;

    const context: ActionContext = {
        lead,
        activities: sortedActivities,
        daysSinceContact,
        lastActivityType: lastActivity?.type || null,
        meetingsCount: activities.filter((a) => a.type === 'meeting').length,
        emailsCount: activities.filter((a) => a.type === 'email').length,
        callsCount: activities.filter((a) => a.type === 'call').length,
    };

    const actions: NextBestAction[] = [];

    // Check each rule and add applicable actions
    actions.push(...checkOverdueFollowUp(context));
    actions.push(...checkStageSpecificActions(context));
    actions.push(...checkEngagementPatterns(context));
    actions.push(...checkTimingOptimizations(context, now));

    // Sort by priority and deduplicate
    return sortAndDeduplicate(actions);
}

/**
 * Check for overdue follow-ups
 */
function checkOverdueFollowUp(ctx: ActionContext): NextBestAction[] {
    const actions: NextBestAction[] = [];

    // No contact in 7+ days
    if (ctx.daysSinceContact > 7 && ctx.lead.status !== 'Closed' && ctx.lead.status !== 'Lost') {
        actions.push({
            id: 'reengagement',
            action: 'Re-engage the lead',
            description: `No contact in ${Math.floor(ctx.daysSinceContact)} days`,
            type: 'email',
            priority: ctx.daysSinceContact > 14 ? 'urgent' : 'high',
            reason: 'Lead going cold',
            suggestedTemplate: `Hey ${ctx.lead.contactName}, just wanted to check in and see if you had any questions about our conversation...`,
        });
    }

    // No contact in 3+ days for active stages
    if (
        ctx.daysSinceContact > 3 &&
        ['Qualified', 'Proposal', 'Negotiation'].includes(ctx.lead.status)
    ) {
        actions.push({
            id: 'stay-active',
            action: 'Maintain momentum',
            description: 'Active deal needs regular touchpoints',
            type: 'call',
            priority: 'high',
            reason: 'Keep deal warm',
        });
    }

    return actions;
}

/**
 * Stage-specific actions
 */
function checkStageSpecificActions(ctx: ActionContext): NextBestAction[] {
    const actions: NextBestAction[] = [];

    switch (ctx.lead.status) {
        case 'New':
            actions.push({
                id: 'initial-outreach',
                action: 'Send introduction',
                description: 'New lead needs first contact',
                type: 'email',
                priority: 'high',
                reason: 'New lead in pipeline',
                suggestedTemplate: `Hi ${ctx.lead.contactName}, I noticed ${ctx.lead.companyName} and wanted to reach out about...`,
            });
            break;

        case 'Contacted':
            if (ctx.emailsCount >= 2 && ctx.callsCount === 0) {
                actions.push({
                    id: 'try-calling',
                    action: 'Try calling',
                    description: '2+ emails sent, try phone',
                    type: 'call',
                    priority: 'medium',
                    reason: 'Email-only engagement, try different channel',
                });
            }
            if (ctx.daysSinceContact > 3) {
                actions.push({
                    id: 'follow-up-email',
                    action: 'Send follow-up',
                    description: 'Time for a gentle nudge',
                    type: 'email',
                    priority: 'medium',
                    reason: 'Advance to qualified stage',
                });
            }
            break;

        case 'Qualified':
            if (ctx.meetingsCount === 0) {
                actions.push({
                    id: 'book-meeting',
                    action: 'Book a meeting',
                    description: 'Qualified leads need face time',
                    type: 'meeting',
                    priority: 'high',
                    reason: 'Qualified but no meetings scheduled',
                    suggestedTemplate: `Would you be available for a 30-minute call this week to discuss how we can help ${ctx.lead.companyName}?`,
                });
            }
            break;

        case 'Proposal':
            actions.push({
                id: 'proposal-followup',
                action: 'Check on proposal',
                description: 'Ensure proposal was received',
                type: 'call',
                priority: 'high',
                reason: 'Proposal sent, confirm receipt',
            });
            break;

        case 'Negotiation':
            actions.push({
                id: 'close-deal',
                action: 'Push for close',
                description: 'Deal is in final stages',
                type: 'meeting',
                priority: 'urgent',
                reason: 'Negotiation stage needs active engagement',
            });
            break;
    }

    return actions;
}

/**
 * Engagement pattern analysis
 */
function checkEngagementPatterns(ctx: ActionContext): NextBestAction[] {
    const actions: NextBestAction[] = [];

    // Check for positive outcomes but no meeting
    const successfulActivity = ctx.activities.find(
        (a) => a.outcome === 'connected' || a.outcome === 'meeting_set'
    );
    if (successfulActivity && ctx.meetingsCount === 0) {
        actions.push({
            id: 'convert-to-meeting',
            action: 'Request meeting',
            description: 'Lead is responsive, capitalize',
            type: 'meeting',
            priority: 'high',
            reason: 'Lead engaged positively, upgrade to meeting',
        });
    }

    // Multiple calls with voicemail outcomes
    const voicemails = ctx.activities.filter((a) => a.type === 'call' && a.outcome === 'voicemail');
    if (voicemails.length >= 2) {
        actions.push({
            id: 'try-email',
            action: 'Switch to email',
            description: `${voicemails.length} voicemails left`,
            type: 'email',
            priority: 'medium',
            reason: 'Phone may not be preferred channel',
            suggestedTemplate: `Hi ${ctx.lead.contactName}, I've tried reaching you by phone. Would email work better for you?`,
        });
    }

    return actions;
}

/**
 * Timing optimizations
 */
function checkTimingOptimizations(ctx: ActionContext, now: number): NextBestAction[] {
    const actions: NextBestAction[] = [];

    // Best time to call (Tuesday-Thursday, 10am-12pm or 2pm-4pm)
    const date = new Date(now);
    const hour = date.getHours();
    const day = date.getDay();

    const isGoodCallTime =
        day >= 2 &&
        day <= 4 && // Tuesday-Thursday
        ((hour >= 10 && hour < 12) || (hour >= 14 && hour < 16));

    if (
        isGoodCallTime &&
        ctx.lead.status !== 'Closed' &&
        ctx.lead.status !== 'Lost' &&
        ctx.callsCount < 3
    ) {
        actions.push({
            id: 'optimal-call-time',
            action: 'Call now (optimal time)',
            description: 'Best time for reaching decision makers',
            type: 'call',
            priority: 'medium',
            reason: 'Optimal calling window',
        });
    }

    // End of week wrap-up
    if (day === 5 && hour >= 14) {
        // Friday afternoon
        if (ctx.lead.status === 'Proposal' || ctx.lead.status === 'Negotiation') {
            actions.push({
                id: 'eow-update',
                action: 'Send EOW update',
                description: 'Keep deal warm over weekend',
                type: 'email',
                priority: 'medium',
                reason: 'Maintain momentum before weekend',
            });
        }
    }

    return actions;
}

/**
 * Sort by priority and remove duplicates
 */
function sortAndDeduplicate(actions: NextBestAction[]): NextBestAction[] {
    const priorityOrder: Record<ActionPriority, number> = {
        urgent: 0,
        high: 1,
        medium: 2,
        low: 3,
    };

    // Remove duplicates by id
    const uniqueActions = actions.reduce((acc, action) => {
        if (!acc.some((a) => a.id === action.id)) {
            acc.push(action);
        }
        return acc;
    }, [] as NextBestAction[]);

    // Sort by priority
    return uniqueActions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

/**
 * Get priority badge styles
 */
export function getPriorityStyles(priority: ActionPriority): string {
    switch (priority) {
        case 'urgent':
            return 'bg-red-500/20 text-red-400 border-red-500/50';
        case 'high':
            return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
        case 'medium':
            return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
        case 'low':
            return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
    }
}

/**
 * Get action type icon name
 */
export function getActionTypeIcon(type: ActionType): string {
    switch (type) {
        case 'call':
            return 'Phone';
        case 'email':
            return 'Mail';
        case 'meeting':
            return 'Calendar';
        case 'note':
            return 'FileText';
        default:
            return 'MessageSquare';
    }
}
