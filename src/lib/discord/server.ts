/**
 * Server-side Discord Notification Service
 *
 * This module handles the full notification flow including:
 * - Looking up company settings from Firestore (using Admin SDK)
 * - Checking if Discord is connected and channels are mapped
 * - Sending notifications via the Discord REST API
 *
 * Use this from API routes where you have server-side context.
 */

import { getAdminDb } from '@/lib/firebase/admin';
import type { Lead } from '@/types';
import type { ChannelMapping } from '@/types/company';
import { notifyNewLead, notifyDealWon, notifyTriage, shouldNotify } from './notify';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://prod-lead-tracker--antigrav-tracking-final.us-central1.hosted.app';

interface CompanyDiscordConfig {
    discordGuildId?: string;
    channelMapping?: ChannelMapping;
}

/**
 * Get Discord configuration for a company
 */
async function getCompanyDiscordConfig(companyId: string): Promise<CompanyDiscordConfig | null> {
    try {
        const db = getAdminDb();
        const companyDoc = await db.collection('companies').doc(companyId).get();

        if (!companyDoc.exists) {
            console.log(`[Discord] Company ${companyId} not found`);
            return null;
        }

        const data = companyDoc.data();
        return {
            discordGuildId: data?.discordGuildId,
            channelMapping: data?.settings?.channelMapping,
        };
    } catch (error) {
        console.error('[Discord] Error fetching company config:', error);
        return null;
    }
}

/**
 * Send a new lead notification for a company
 *
 * Fire-and-forget: This function doesn't throw and handles all errors internally.
 * Call this when a lead is created.
 *
 * @param lead - The lead that was created
 * @param companyId - The company to notify
 */
export async function sendNewLeadNotification(lead: Lead, companyId: string): Promise<void> {
    try {
        const config = await getCompanyDiscordConfig(companyId);
        
        if (!config || !shouldNotify(config)) {
            console.log(`[Discord] Skipping new lead notification for company ${companyId} (not configured)`);
            return;
        }

        console.log(`[Discord] Sending new lead notification for ${lead.companyName} to company ${companyId}`);
        notifyNewLead(lead, config.channelMapping, APP_URL);
    } catch (error) {
        // Log but don't throw - notifications should never break the main flow
        console.error('[Discord] Error sending new lead notification:', error);
    }
}

/**
 * Send a deal won notification for a company
 *
 * Fire-and-forget: This function doesn't throw and handles all errors internally.
 * Call this when a lead status changes to Closed.
 *
 * @param lead - The lead that was won
 * @param companyId - The company to notify
 */
export async function sendDealWonNotification(lead: Lead, companyId: string): Promise<void> {
    try {
        const config = await getCompanyDiscordConfig(companyId);
        
        if (!config || !shouldNotify(config)) {
            console.log(`[Discord] Skipping deal won notification for company ${companyId} (not configured)`);
            return;
        }

        console.log(`[Discord] Sending deal won notification for ${lead.companyName} to company ${companyId}`);
        notifyDealWon(lead, config.channelMapping, APP_URL);
    } catch (error) {
        console.error('[Discord] Error sending deal won notification:', error);
    }
}

/**
 * Send a triage notification for a company
 *
 * Fire-and-forget: This function doesn't throw and handles all errors internally.
 * Call this when a lead needs review.
 *
 * @param lead - The lead needing triage
 * @param reason - Why this lead needs attention
 * @param companyId - The company to notify
 */
export async function sendTriageNotification(
    lead: Lead,
    reason: string,
    companyId: string
): Promise<void> {
    try {
        const config = await getCompanyDiscordConfig(companyId);
        
        if (!config || !shouldNotify(config)) {
            console.log(`[Discord] Skipping triage notification for company ${companyId} (not configured)`);
            return;
        }

        console.log(`[Discord] Sending triage notification for ${lead.companyName} to company ${companyId}`);
        notifyTriage(lead, reason, config.channelMapping, APP_URL);
    } catch (error) {
        console.error('[Discord] Error sending triage notification:', error);
    }
}

/**
 * Check if a company has Discord notifications enabled
 */
export async function hasDiscordNotifications(companyId: string): Promise<boolean> {
    const config = await getCompanyDiscordConfig(companyId);
    return config !== null && shouldNotify(config);
}
