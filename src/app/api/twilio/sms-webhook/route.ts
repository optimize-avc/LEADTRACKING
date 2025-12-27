import { NextRequest, NextResponse } from 'next/server';
import { updateSMSStatus } from '@/lib/twilio/sms-service';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        const messageSid = formData.get('MessageSid') as string;
        const messageStatus = formData.get('MessageStatus') as string;

        // Get generic params
        const userId = request.nextUrl.searchParams.get('userId');
        const leadId = request.nextUrl.searchParams.get('leadId');



        // Map Twilio status
        const validStatuses = ['queued', 'sent', 'delivered', 'failed', 'undelivered'];
        const status = validStatuses.includes(messageStatus) ? messageStatus as any : 'sent';

        if (userId && messageSid) {
            try {
                await updateSMSStatus(messageSid, userId, status);
                await updateSMSStatus(messageSid, userId, status);
            } catch (error) {
                console.error(`Failed to update SMS status:`, error);
            }
        } else {
            console.warn('Missing userId or messageSid in SMS webhook');
        }

        return new NextResponse(
            '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
            {
                status: 200,
                headers: { 'Content-Type': 'text/xml' }
            }
        );
    } catch (error: unknown) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
    }
}
