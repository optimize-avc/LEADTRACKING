import { NextRequest, NextResponse } from 'next/server';
import {
    initiateCallWithLogging,
    formatPhoneE164,
    isValidPhoneNumber,
} from '@/lib/twilio/twilio-service';
import { isTwilioConfigured } from '@/lib/twilio/twilio-config';
import { verifyIdToken } from '@/lib/firebase/admin';

/**
 * POST /api/twilio/call - Initiate an outbound call to a lead
 * 
 * Requires Authorization: Bearer <firebase-token>
 */
export async function POST(request: NextRequest) {
    try {
        // Check if Twilio is configured
        if (!isTwilioConfigured()) {
            return NextResponse.json({ error: 'Twilio is not configured' }, { status: 503 });
        }

        // Verify auth token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const token = authHeader.substring(7);
        const decodedToken = await verifyIdToken(token);
        
        if (!decodedToken) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const body = await request.json();
        const { leadId, to } = body;
        
        // Use authenticated user ID instead of trusting the body
        const userId = decodedToken.uid;

        // Validate required fields
        if (!to) {
            return NextResponse.json(
                { error: 'Missing required field: to (phone number)' },
                { status: 400 }
            );
        }

        // Validate phone number
        if (!isValidPhoneNumber(to)) {
            return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
        }

        // Format phone to E.164
        const formattedPhone = formatPhoneE164(to);

        // Initiate call
        const result = await initiateCallWithLogging(userId, leadId || '', formattedPhone);

        if (result.success) {
            return NextResponse.json({
                success: true,
                callSid: result.callSid,
            });
        } else {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }
    } catch (error: unknown) {
        console.error('Call API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to initiate call' },
            { status: 500 }
        );
    }
}
