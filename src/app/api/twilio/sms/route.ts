import { NextRequest, NextResponse } from 'next/server';
import { sendSMSWithLogging } from '@/lib/twilio/twilio-service';
import { getAdminAuth } from '@/lib/firebase/admin';

/**
 * Enterprise-grade SMS Endpoint (Dec 2025)
 * Securely handles outbound messaging with full audit logging.
 */
export async function POST(req: NextRequest) {
    try {
        // 1. Authenticate Request (JWT Verification)
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const adminAuth = getAdminAuth();
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;

        // 2. Parse and Validate Payload
        const body = await req.json();
        const { to, body: messageBody, leadId } = body;

        if (!to || !messageBody || !leadId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 3. Dispatch SMS via Service Layer
        const result = await sendSMSWithLogging(userId, leadId, to, messageBody);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            messageSid: result.messageSid,
            note: 'Message queued for delivery'
        });

    } catch (error: unknown) {
        console.error('API SMS Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Internal server error'
        }, { status: 500 });
    }
}
