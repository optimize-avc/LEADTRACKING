import { NextResponse } from 'next/server';
import { getAdminDb, verifyIdToken } from '@/lib/firebase/admin';

/**
 * GET /api/discord/channels
 * Fetches text channels from a connected Discord guild
 *
 * Requires: Authorization header with Firebase ID token
 * Returns: Array of { id, name, type } for text channels
 */
export async function GET(request: Request) {
    try {
        // Verify auth
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await verifyIdToken(token);
        if (!decodedToken) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const userId = decodedToken.uid;
        const db = getAdminDb();

        // Find user's company
        const userDoc = await db.collection('users').doc(userId).get();
        const companyId = userDoc.data()?.companyId;

        if (!companyId) {
            return NextResponse.json({ error: 'No company found' }, { status: 404 });
        }

        // Get company's Discord guild ID
        const companyDoc = await db.collection('companies').doc(companyId).get();
        const guildId = companyDoc.data()?.discordGuildId;

        if (!guildId) {
            return NextResponse.json({ error: 'Discord not connected' }, { status: 400 });
        }

        // Fetch channels from Discord API
        const botToken = process.env.DISCORD_BOT_TOKEN;
        if (!botToken) {
            return NextResponse.json({ error: 'Discord bot not configured' }, { status: 500 });
        }

        const discordResponse = await fetch(
            `https://discord.com/api/v10/guilds/${guildId}/channels`,
            {
                headers: {
                    Authorization: `Bot ${botToken}`,
                },
            }
        );

        if (!discordResponse.ok) {
            console.error('Discord API error:', await discordResponse.text());
            return NextResponse.json(
                { error: 'Failed to fetch channels from Discord' },
                { status: 502 }
            );
        }

        const channels = await discordResponse.json();

        // Filter to text channels only (type 0) and format response
        const textChannels = channels
            .filter((ch: { type: number }) => ch.type === 0)
            .map((ch: { id: string; name: string; type: number; position: number }) => ({
                id: ch.id,
                name: ch.name,
                type: ch.type,
                position: ch.position,
            }))
            .sort((a: { position: number }, b: { position: number }) => a.position - b.position);

        return NextResponse.json({ channels: textChannels });
    } catch (error) {
        console.error('Error fetching Discord channels:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
