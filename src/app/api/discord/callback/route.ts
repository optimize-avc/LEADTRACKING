import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

/**
 * Discord OAuth2 Callback Handler
 * Handles the redirect from Discord after authorization
 * Links the Discord guild to the company
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('companyId') || searchParams.get('state'); // companyId
    const guildId = searchParams.get('guild_id');
    const error = searchParams.get('error');

    // Handle user cancellation
    if (error) {
        console.log('Discord OAuth cancelled:', error);
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/settings/bot?error=cancelled`
        );
    }

    // Validate required params
    if (!state) {
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/settings/bot?error=missing_state`
        );
    }

    // If guild_id is present, bot was added successfully
    if (guildId) {
        try {
            const db = getAdminDb();

            // Get guild info from Discord API (optional - we can just store the ID)
            // For now, we'll store guild_id and fetch name later

            // Update company with Discord guild info
            await db
                .collection('companies')
                .doc(state)
                .update({
                    discordGuildId: guildId,
                    discordGuildName: `Server ${guildId.slice(-4)}`, // Placeholder - will be updated by bot
                    updatedAt: Date.now(),
                });

            console.log(`✅ Linked Discord guild ${guildId} to company ${state}`);

            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/settings/bot?success=connected`
            );
        } catch (err) {
            console.error('Failed to link Discord:', err);
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/settings/bot?error=link_failed`
            );
        }
    }

    // If we have a code but no guild_id, exchange for token (alternative flow)
    if (code) {
        try {
            const clientId = process.env.DISCORD_CLIENT_ID;
            const clientSecret = process.env.DISCORD_CLIENT_SECRET;
            const redirectUri =
                process.env.DISCORD_REDIRECT_URI ||
                `${process.env.NEXT_PUBLIC_APP_URL}/api/discord/callback`;

            // Exchange code for access token
            const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: clientId!,
                    client_secret: clientSecret!,
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: redirectUri,
                }),
            });

            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.text();
                console.error('Token exchange failed:', errorData);
                return NextResponse.redirect(
                    `${process.env.NEXT_PUBLIC_APP_URL}/settings/bot?error=token_failed`
                );
            }

            const tokenData = await tokenResponse.json();

            // If we got the token but no guild, redirect with partial success
            // The guild_id should come from the OAuth response for bot flows
            if (tokenData.guild?.id) {
                const db = getAdminDb();

                await db
                    .collection('companies')
                    .doc(state)
                    .update({
                        discordGuildId: tokenData.guild.id,
                        discordGuildName:
                            tokenData.guild.name || `Server ${tokenData.guild.id.slice(-4)}`,
                        updatedAt: Date.now(),
                    });

                return NextResponse.redirect(
                    `${process.env.NEXT_PUBLIC_APP_URL}/settings/bot?success=connected`
                );
            }

            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/settings/bot?error=no_guild`
            );
        } catch (err) {
            console.error('OAuth callback error:', err);
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/settings/bot?error=callback_failed`
            );
        }
    }

    // No code or guild_id - unknown state
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/bot?error=unknown`);
}
