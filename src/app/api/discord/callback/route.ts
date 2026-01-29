import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

/**
 * Discord OAuth2 Callback Handler for Multi-Tenant SaaS
 * 
 * This handles the bot install flow where:
 * 1. User clicks "Connect Discord" in our app
 * 2. User authorizes bot on their Discord server
 * 3. Discord redirects back with guild_id in URL params
 * 4. We store the guild_id linked to their company
 * 
 * For bot installs with `bot` scope, Discord returns guild_id directly
 * - no code exchange needed (that requires client_secret)
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const guildId = searchParams.get('guild_id');
    const state = searchParams.get('state'); // companyId passed from BotStudioClient
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const permissions = searchParams.get('permissions');

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prod-lead-tracker--antigrav-tracking-final.us-central1.hosted.app';

    console.log('Discord OAuth callback received:', {
        guildId,
        state,
        error,
        errorDescription,
        permissions,
        fullUrl: request.url
    });

    // Handle user cancellation or access denied
    if (error) {
        console.log('Discord OAuth error:', error, errorDescription);
        const errorMsg = error === 'access_denied' ? 'cancelled' : 'auth_error';
        return NextResponse.redirect(`${baseUrl}/settings/bot?error=${errorMsg}`);
    }

    // Validate state (companyId) is present
    if (!state) {
        console.error('Missing state parameter in Discord callback');
        return NextResponse.redirect(`${baseUrl}/settings/bot?error=missing_state`);
    }

    // For bot installs, Discord returns guild_id directly in the URL
    // This is the primary flow for multi-tenant SaaS bot connections
    if (guildId) {
        try {
            const db = getAdminDb();

            // Update company with Discord guild info
            await db.collection('companies').doc(state).update({
                discordGuildId: guildId,
                discordGuildName: null, // Will be fetched by the bot when it joins
                discordConnectedAt: Date.now(),
                discordPermissions: permissions || null,
                updatedAt: Date.now(),
            });

            console.log(`✅ Successfully linked Discord guild ${guildId} to company ${state}`);

            return NextResponse.redirect(`${baseUrl}/settings/bot?success=connected&guild=${guildId}`);
        } catch (err) {
            console.error('Failed to link Discord guild to company:', err);
            return NextResponse.redirect(`${baseUrl}/settings/bot?error=database_error`);
        }
    }

    // If we reach here without a guild_id, something went wrong
    // This shouldn't happen with the bot scope flow
    console.error('Discord callback missing guild_id - unexpected flow', {
        params: Object.fromEntries(searchParams.entries())
    });
    
    return NextResponse.redirect(`${baseUrl}/settings/bot?error=no_guild`);
}
