import { NextResponse } from 'next/server';
import { sendNewLeadNotification, sendDealWonNotification, sendTriageNotification } from '@/lib/discord/server';

/**
 * POST /api/notifications/discord
 * Fire-and-forget Discord notification endpoint
 * 
 * Body: { type: 'newLead' | 'dealWon' | 'triage', companyId: string, lead: {...}, reason?: string }
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { type, companyId, lead, reason } = body;

        if (!type || !companyId || !lead) {
            return NextResponse.json(
                { error: 'Missing required fields: type, companyId, lead' },
                { status: 400 }
            );
        }

        // Fire-and-forget - don't await, just kick off the notification
        switch (type) {
            case 'newLead':
                sendNewLeadNotification(lead, companyId).catch((err) =>
                    console.error('[Discord Notification] New lead notification failed:', err)
                );
                break;
            case 'dealWon':
                sendDealWonNotification(lead, companyId).catch((err) =>
                    console.error('[Discord Notification] Deal won notification failed:', err)
                );
                break;
            case 'triage':
                sendTriageNotification(lead, reason || 'Needs review', companyId).catch((err) =>
                    console.error('[Discord Notification] Triage notification failed:', err)
                );
                break;
            default:
                return NextResponse.json({ error: `Unknown notification type: ${type}` }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'Notification queued' });
    } catch (error) {
        console.error('[Discord Notification] Error processing request:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
