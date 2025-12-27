import { NextRequest, NextResponse } from 'next/server';
import { sendSMSWithLogging, formatPhoneE164, isValidPhoneNumber } from '@/lib/twilio/twilio-service';
import { isTwilioConfigured } from '@/lib/twilio/twilio-config';

// POST: Send SMS to a lead
export async function POST(request: NextRequest) {
    try {
        // Check if Twilio is configured
        if (!isTwilioConfigured()) {
            return NextResponse.json(
                { error: 'Twilio is not configured' },
                { status: 503 }
            );
        }

        const body = await request.json();
        const { userId, leadId, to, message } = body;

        // Validate required fields
        if (!userId || !to || !message) {
            return NextResponse.json(
                { error: 'Missing required fields: userId, to, message' },
                { status: 400 }
            );
        }

        // Validate phone number
        if (!isValidPhoneNumber(to)) {
            return NextResponse.json(
                { error: 'Invalid phone number format' },
                { status: 400 }
            );
        }

        // Format phone to E.164
        const formattedPhone = formatPhoneE164(to);

        // Send SMS
        const result = await sendSMSWithLogging(
            userId,
            leadId || '',
            formattedPhone,
            message
        );

        if (result.success) {
            return NextResponse.json({
                success: true,
                messageSid: result.messageSid,
            });
        } else {
            return NextResponse.json(
                { error: result.error },
                { status: 500 }
            );
        }
    } catch (error: unknown) {
        console.error('SMS API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to send SMS' },
            { status: 500 }
        );
    }
}
