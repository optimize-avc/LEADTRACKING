/**
 * Discord API Types for Notification System
 */

export interface DiscordEmbed {
    title?: string;
    description?: string;
    url?: string;
    timestamp?: string; // ISO8601 timestamp
    color?: number; // Integer color code
    footer?: {
        text: string;
        icon_url?: string;
    };
    image?: {
        url: string;
    };
    thumbnail?: {
        url: string;
    };
    author?: {
        name: string;
        url?: string;
        icon_url?: string;
    };
    fields?: DiscordEmbedField[];
}

export interface DiscordEmbedField {
    name: string;
    value: string;
    inline?: boolean;
}

export interface DiscordMessage {
    content?: string;
    embeds?: DiscordEmbed[];
    allowed_mentions?: {
        parse?: ('roles' | 'users' | 'everyone')[];
        roles?: string[];
        users?: string[];
    };
}

export interface DiscordAPIError {
    message: string;
    code: number;
    retry_after?: number; // Rate limit retry time in seconds
}

/**
 * Channel types for notification routing
 */
export type NotificationChannel = 'newLeads' | 'wins' | 'triage' | 'digest';

/**
 * Result of sending a notification
 */
export interface NotificationResult {
    success: boolean;
    messageId?: string;
    error?: string;
    rateLimited?: boolean;
    retryAfter?: number;
}
