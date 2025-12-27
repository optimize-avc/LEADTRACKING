import { NextRequest, NextResponse } from 'next/server';
import { updateCallStatus } from '@/lib/twilio/call-service';
import { validateRequest } from 'twilio';

/**
 * Twilio webhook for call status updates
 * Twilio sends POST requests here when call status changes
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        // 1. Security Check: Validate Request Signature
        const twilioSignature = request.headers.get('x-twilio-signature');
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/webhook`;

        // Convert formData to object for validation
        const params: Record<string, string> = {};
        formData.forEach((value, key) => {
            params[key] = value as string;
        });

        if (process.env.NODE_ENV === 'production') {
            if (!twilioSignature || !authToken || !validateRequest(authToken, twilioSignature, url, params)) {
                console.error('Security Alert: Invalid Twilio Signature');
                return new NextResponse('Unauthorized', { status: 403 });
            }
        }

        const callSid = params['CallSid'];
        const callStatus = params['CallStatus'];
        const callDuration = params['CallDuration'];
        const recordingUrl = params['RecordingUrl'];

        // Get userId from query params (passed in statusCallback)
        const userId = request.nextUrl.searchParams.get('userId');
        const leadId = request.nextUrl.searchParams.get('leadId');



        // Map Twilio status to our status type
        const statusMap: Record<string, string> = {
            'queued': 'queued',
            'ringing': 'ringing',
            'in-progress': 'in-progress',
            'completed': 'completed',
            'busy': 'busy',
            'failed': 'failed',
            'no-answer': 'no-answer',
            'canceled': 'canceled',
        };

        const status = (statusMap[callStatus] || 'failed') as any;
        const duration = callDuration ? parseInt(callDuration) : undefined;

        if (userId) {
            try {
                await updateCallStatus(callSid, userId, status, duration, recordingUrl);
                console.log(`Updated call ${callSid} status to ${status} for user ${userId}`);
            } catch (error) {
                console.error(`Failed to update call status for ${callSid}:`, error);
                // Don't fail the webhook response, just log the error
            }
        } else {
            console.warn(`Received webhook for call ${callSid} without userId`);
        }

        // Return TwiML response (required by Twilio)
        return new NextResponse(
            '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
            {
                status: 200,
                headers: {
                    'Content-Type': 'text/xml',
                },
            }
        );
    } catch (error) {
        console.error('Error processing Twilio webhook:', error);
        return new NextResponse(
            '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
            {
                status: 200,
                headers: {
                    'Content-Type': 'text/xml',
                },
            }
        );
    }
}
