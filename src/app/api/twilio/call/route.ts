import { NextRequest, NextResponse } from 'next/server';
import { initiateCallWithLogging, formatPhoneE164, isValidPhoneNumber } from '@/lib/twilio/twilio-service';
import { isTwilioConfigured } from '@/lib/twilio/twilio-config';

// POST: Initiate an outbound call to a lead
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
        const { userId, leadId, to } = body;

        // Validate required fields
        if (!userId || !to) {
            return NextResponse.json(
                { error: 'Missing required fields: userId, to' },
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

        // Initiate call
        const result = await initiateCallWithLogging(
            userId,
            leadId || '',
            formattedPhone
        );

        if (result.success) {
            return NextResponse.json({
                success: true,
                callSid: result.callSid,
            });
        } else {
            return NextResponse.json(
                { error: result.error },
                { status: 500 }
            );
        }
    } catch (error: unknown) {
        console.error('Call API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to initiate call' },
            { status: 500 }
        );
    }
}
