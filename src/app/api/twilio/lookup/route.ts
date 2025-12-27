import { NextRequest, NextResponse } from 'next/server';
import { lookupPhoneNumber } from '@/lib/twilio/lookup-service';
import { isTwilioConfigured } from '@/lib/twilio/twilio-config';
import { withAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        if (!isTwilioConfigured()) {
            return NextResponse.json(
                { error: 'Twilio not configured' },
                { status: 503 }
            );
        }

        const body = await request.json();
        const { phoneNumber } = body;

        if (!phoneNumber) {
            return NextResponse.json(
                { error: 'Phone number is required' },
                { status: 400 }
            );
        }

        const result = await lookupPhoneNumber(phoneNumber);

        return NextResponse.json(result);

    } catch (error) {
        console.error('Lookup API Error:', error);
        return NextResponse.json(
            { error: 'Failed to verify phone number' },
            { status: 500 }
        );
    }
}
