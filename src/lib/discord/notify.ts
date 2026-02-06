/**
 * Discord REST API Notification Service
 *
 * Sends rich embed notifications to Discord channels via the REST API.
 * Features:
 * - Rate limiting awareness (respects 429 responses)
 * - Graceful error handling (doesn't crash if Discord is down)
 * - Fire-and-forget pattern (doesn't block main operations)
 * - Multi-tenant isolation (per-company channel routing)
 */

import type { DiscordEmbed, DiscordMessage, NotificationResult, NotificationChannel } from './types';
import type { Lead } from '@/types';
import type { ChannelMapping } from '@/types/company';
import { newLeadEmbed, dealWonEmbed, triageEmbed } from './templates';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

// Simple in-memory rate limit tracking (per channel)
const rateLimitState: Map<string, { resetAt: number }> = new Map();

/**
 * Check if we're currently rate limited for a channel
 */
function isRateLimited(channelId: string): boolean {
    const state = rateLimitState.get(channelId);
    if (!state) return false;
    
    if (Date.now() >= state.resetAt) {
        rateLimitState.delete(channelId);
        return false;
    }
    
    return true;
}

/**
 * Record a rate limit for a channel
 */
function recordRateLimit(channelId: string, retryAfter: number): void {
    rateLimitState.set(channelId, {
        resetAt: Date.now() + (retryAfter * 1000),
    });
}

/**
 * Send a message to a Discord channel
 *
 * @param channelId - Discord channel ID
 * @param message - Message to send (with embeds)
 * @returns Result of the send operation
 */
export async function sendDiscordMessage(
    channelId: string,
    message: DiscordMessage
): Promise<NotificationResult> {
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!botToken) {
        console.warn('[Discord] DISCORD_BOT_TOKEN not configured - skipping notification');
        return { success: false, error: 'Bot token not configured' };
    }

    // Check if we're rate limited
    if (isRateLimited(channelId)) {
        console.log(`[Discord] Rate limited for channel ${channelId} - skipping`);
        return { success: false, error: 'Rate limited', rateLimited: true };
    }

    try {
        const response = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${botToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        // Handle rate limiting
        if (response.status === 429) {
            const data = await response.json();
            const retryAfter = data.retry_after || 5;
            recordRateLimit(channelId, retryAfter);
            console.warn(`[Discord] Rate limited for channel ${channelId}, retry after ${retryAfter}s`);
            return {
                success: false,
                error: 'Rate limited',
                rateLimited: true,
                retryAfter,
            };
        }

        // Handle other errors
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`[Discord] Failed to send message: ${response.status}`, errorData);
            return {
                success: false,
                error: `Discord API error: ${response.status} - ${errorData.message || 'Unknown error'}`,
            };
        }

        const data = await response.json();
        console.log(`[Discord] Message sent to channel ${channelId}, message ID: ${data.id}`);
        return { success: true, messageId: data.id };

    } catch (error) {
        // Network errors, timeouts, etc.
        console.error('[Discord] Network error sending notification:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error',
        };
    }
}

/**
 * Send an embed to a Discord channel
 *
 * @param channelId - Discord channel ID
 * @param embed - Discord embed object
 * @param content - Optional message content
 */
export async function sendEmbed(
    channelId: string,
    embed: DiscordEmbed,
    content?: string
): Promise<NotificationResult> {
    return sendDiscordMessage(channelId, {
        content,
        embeds: [embed],
    });
}

/**
 * Get the channel ID for a specific notification type from company settings
 */
export function getNotificationChannel(
    channelMapping: ChannelMapping | undefined,
    type: NotificationChannel
): string | null {
    if (!channelMapping) return null;
    return channelMapping[type] || null;
}

/**
 * Send a new lead notification to the appropriate channel
 *
 * Fire-and-forget: Doesn't await, catches all errors internally
 */
export function notifyNewLead(
    lead: Lead,
    channelMapping: ChannelMapping | undefined,
    appUrl?: string
): void {
    const channelId = getNotificationChannel(channelMapping, 'newLeads');
    
    if (!channelId) {
        console.log('[Discord] No newLeads channel mapped - skipping notification');
        return;
    }

    // Fire and forget - don't await
    sendEmbed(channelId, newLeadEmbed(lead, appUrl)).catch((err) => {
        console.error('[Discord] Failed to send new lead notification:', err);
    });
}

/**
 * Send a deal won notification to the appropriate channel
 *
 * Fire-and-forget: Doesn't await, catches all errors internally
 */
export function notifyDealWon(
    lead: Lead,
    channelMapping: ChannelMapping | undefined,
    appUrl?: string
): void {
    const channelId = getNotificationChannel(channelMapping, 'wins');
    
    if (!channelId) {
        console.log('[Discord] No wins channel mapped - skipping notification');
        return;
    }

    // Fire and forget
    sendEmbed(channelId, dealWonEmbed(lead, appUrl)).catch((err) => {
        console.error('[Discord] Failed to send deal won notification:', err);
    });
}

/**
 * Send a triage notification to the appropriate channel
 *
 * Fire-and-forget: Doesn't await, catches all errors internally
 */
export function notifyTriage(
    lead: Lead,
    reason: string,
    channelMapping: ChannelMapping | undefined,
    appUrl?: string
): void {
    const channelId = getNotificationChannel(channelMapping, 'triage');
    
    if (!channelId) {
        console.log('[Discord] No triage channel mapped - skipping notification');
        return;
    }

    // Fire and forget
    sendEmbed(channelId, triageEmbed(lead, reason, appUrl)).catch((err) => {
        console.error('[Discord] Failed to send triage notification:', err);
    });
}

/**
 * Higher-level notification function that handles company lookup
 *
 * Use this when you have the company data already loaded
 */
export interface CompanyNotificationContext {
    channelMapping?: ChannelMapping;
    discordGuildId?: string;
}

export function shouldNotify(context: CompanyNotificationContext): boolean {
    // Skip if Discord not connected
    if (!context.discordGuildId) {
        return false;
    }
    
    // Skip if no channel mappings
    if (!context.channelMapping) {
        return false;
    }
    
    return true;
}
