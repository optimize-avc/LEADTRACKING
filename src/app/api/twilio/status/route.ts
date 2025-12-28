import { NextRequest, NextResponse } from 'next/server';
import { getTwilioStatus, isTwilioConnected } from '@/lib/twilio/twilio-service';

// GET: Check Twilio connection status for a user
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 });
        }

        const connected = await isTwilioConnected(userId);
        const status = await getTwilioStatus(userId);

        return NextResponse.json({
            connected,
            phoneNumber: status?.phoneNumber || null,
        });
    } catch (error: unknown) {
        console.error('Twilio status error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get Twilio status' },
            { status: 500 }
        );
    }
}
