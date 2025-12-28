import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/gmail/gmail-service';

// POST: Send an email via Gmail API
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, to, subject, emailBody, leadId } = body;

        if (!userId || !to || !subject || !emailBody || !leadId) {
            return NextResponse.json(
                { error: 'Missing required fields: userId, to, subject, emailBody, leadId' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
        }

        const messageId = await sendEmail(userId, to, subject, emailBody, leadId);

        return NextResponse.json({
            success: true,
            messageId,
        });
    } catch (error: unknown) {
        console.error('Email send error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to send email' },
            { status: 500 }
        );
    }
}
