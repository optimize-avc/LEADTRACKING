import { NextResponse } from 'next/server';

/**
 * Discord OAuth2 Initiation
 * Redirects user to Discord authorization page
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
        return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri =
        process.env.DISCORD_REDIRECT_URI ||
        `${process.env.NEXT_PUBLIC_APP_URL}/api/discord/callback`;

    if (!clientId) {
        return NextResponse.json({ error: 'Discord integration not configured' }, { status: 500 });
    }

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'bot guilds applications.commands',
        permissions: '2147485696', // Manage Channels, Send Messages, Embed Links, Read Message History
        state: companyId,
    });

    return NextResponse.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
}
