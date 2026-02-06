/**
 * Discord Notification Service
 *
 * Centralized Discord notification system for multi-tenant SaaS.
 * Provides fire-and-forget notifications for lead events.
 */

// Types
export * from './types';

// Embed templates
export * from './templates';

// Core notification functions
export * from './notify';

// Server-side functions (use in API routes)
export {
    sendNewLeadNotification,
    sendDealWonNotification,
    sendTriageNotification,
    hasDiscordNotifications,
} from './server';

// Re-export key functions for convenience
export {
    sendDiscordMessage,
    sendEmbed,
    notifyNewLead,
    notifyDealWon,
    notifyTriage,
    shouldNotify,
    getNotificationChannel,
} from './notify';

export {
    newLeadEmbed,
    dealWonEmbed,
    triageEmbed,
    infoEmbed,
} from './templates';
