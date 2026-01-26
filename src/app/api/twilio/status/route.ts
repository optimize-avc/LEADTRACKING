import { NextRequest, NextResponse } from 'next/server';
import { getTwilioStatus, isTwilioConnected } from '@/lib/twilio/twilio-service';
import { isPlatformTwilioConfigured, PLATFORM_TWILIO_CONFIG } from '@/lib/twilio/twilio-config';

// GET: Check Twilio connection status for a user
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 });
        }

        try {
            // Try to get user-specific Twilio credentials via Admin SDK
            const connected = await isTwilioConnected(userId);
            const status = await getTwilioStatus(userId);

            return NextResponse.json({
                connected,
                phoneNumber: status?.phoneNumber || null,
            });
        } catch (adminError) {
            // Admin SDK failed (likely missing credentials in dev)
            // Fall back to environment-based config check
            console.warn('Twilio status: Admin SDK unavailable, checking env config:', adminError);

            if (isPlatformTwilioConfigured()) {
                return NextResponse.json({
                    connected: true,
                    phoneNumber: PLATFORM_TWILIO_CONFIG.phoneNumber,
                    source: 'environment',
                });
            }

            return NextResponse.json({
                connected: false,
                phoneNumber: null,
            });
        }
    } catch (error: unknown) {
        console.error('Twilio status error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get Twilio status' },
            { status: 500 }
        );
    }
}
