/**
 * Discord Embed Templates for Lead Notifications
 *
 * Rich embeds for various lead events:
 * - New leads added to pipeline
 * - Deals won (closed)
 * - Leads needing triage/review
 */

import type { Lead } from '@/types';
import type { DiscordEmbed } from './types';

// Discord embed color constants (as integers)
const COLORS = {
    NEW_LEAD: 0x3498db, // Blue - new opportunity
    WIN: 0x2ecc71, // Green - success!
    TRIAGE: 0xe74c3c, // Red - needs attention
    INFO: 0x9b59b6, // Purple - informational
} as const;

/**
 * Format currency value for display
 */
function formatCurrency(value: number): string {
    if (!value) return 'Not specified';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

/**
 * Truncate text to a maximum length
 */
function truncate(text: string | undefined, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

/**
 * Create embed for new lead notification
 */
export function newLeadEmbed(lead: Lead, appUrl?: string): DiscordEmbed {
    const fields = [
        {
            name: '👤 Contact',
            value: lead.contactName || 'Not specified',
            inline: true,
        },
        {
            name: '💰 Deal Value',
            value: formatCurrency(lead.value),
            inline: true,
        },
        {
            name: '📊 Status',
            value: lead.status || 'New',
            inline: true,
        },
    ];

    // Add optional fields
    if (lead.email) {
        fields.push({
            name: '📧 Email',
            value: lead.email,
            inline: true,
        });
    }

    if (lead.phone) {
        fields.push({
            name: '📞 Phone',
            value: lead.phone,
            inline: true,
        });
    }

    if (lead.source) {
        fields.push({
            name: '📍 Source',
            value: lead.source,
            inline: true,
        });
    }

    if (lead.industry) {
        fields.push({
            name: '🏢 Industry',
            value: lead.industry,
            inline: true,
        });
    }

    if (lead.website) {
        fields.push({
            name: '🌐 Website',
            value: lead.website,
            inline: true,
        });
    }

    const embed: DiscordEmbed = {
        title: `🆕 New Lead: ${lead.companyName}`,
        description: lead.notes ? truncate(lead.notes, 200) : 'A new lead has been added to the pipeline.',
        color: COLORS.NEW_LEAD,
        fields,
        timestamp: new Date().toISOString(),
        footer: {
            text: 'SalesTracker',
        },
    };

    // Add link to lead in app if URL provided
    if (appUrl && lead.id) {
        embed.url = `${appUrl}/leads/${lead.id}`;
    }

    return embed;
}

/**
 * Create embed for deal won notification
 */
export function dealWonEmbed(lead: Lead, appUrl?: string): DiscordEmbed {
    const fields = [
        {
            name: '💰 Deal Value',
            value: formatCurrency(lead.value),
            inline: true,
        },
        {
            name: '👤 Contact',
            value: lead.contactName || 'Not specified',
            inline: true,
        },
    ];

    if (lead.source) {
        fields.push({
            name: '📍 Source',
            value: lead.source,
            inline: true,
        });
    }

    if (lead.industry) {
        fields.push({
            name: '🏢 Industry',
            value: lead.industry,
            inline: true,
        });
    }

    // Add timeline info
    if (lead.createdAt) {
        const daysInPipeline = Math.floor(
            (Date.now() - (typeof lead.createdAt === 'number' ? lead.createdAt : lead.createdAt)) /
                (1000 * 60 * 60 * 24)
        );
        fields.push({
            name: '📅 Days in Pipeline',
            value: `${daysInPipeline} days`,
            inline: true,
        });
    }

    const embed: DiscordEmbed = {
        title: `🎉 Deal Won: ${lead.companyName}`,
        description: `Congratulations! The deal with **${lead.companyName}** has been closed!`,
        color: COLORS.WIN,
        fields,
        timestamp: new Date().toISOString(),
        footer: {
            text: 'SalesTracker • Keep up the great work! 🚀',
        },
    };

    if (appUrl && lead.id) {
        embed.url = `${appUrl}/leads/${lead.id}`;
    }

    return embed;
}

/**
 * Create embed for triage notification (leads needing review)
 */
export function triageEmbed(
    lead: Lead,
    reason: string = 'This lead requires your attention.',
    appUrl?: string
): DiscordEmbed {
    const fields = [
        {
            name: '👤 Contact',
            value: lead.contactName || 'Not specified',
            inline: true,
        },
        {
            name: '💰 Deal Value',
            value: formatCurrency(lead.value),
            inline: true,
        },
        {
            name: '📊 Current Status',
            value: lead.status || 'Unknown',
            inline: true,
        },
        {
            name: '⚠️ Reason',
            value: truncate(reason, 200),
            inline: false,
        },
    ];

    if (lead.email) {
        fields.push({
            name: '📧 Email',
            value: lead.email,
            inline: true,
        });
    }

    if (lead.phone) {
        fields.push({
            name: '📞 Phone',
            value: lead.phone,
            inline: true,
        });
    }

    const embed: DiscordEmbed = {
        title: `🔔 Action Required: ${lead.companyName}`,
        description: lead.notes ? truncate(lead.notes, 150) : undefined,
        color: COLORS.TRIAGE,
        fields,
        timestamp: new Date().toISOString(),
        footer: {
            text: 'SalesTracker • Review this lead promptly',
        },
    };

    if (appUrl && lead.id) {
        embed.url = `${appUrl}/leads/${lead.id}`;
    }

    return embed;
}

/**
 * Create a simple info embed for general notifications
 */
export function infoEmbed(title: string, description: string, fields?: DiscordEmbed['fields']): DiscordEmbed {
    return {
        title,
        description,
        color: COLORS.INFO,
        fields,
        timestamp: new Date().toISOString(),
        footer: {
            text: 'SalesTracker',
        },
    };
}
