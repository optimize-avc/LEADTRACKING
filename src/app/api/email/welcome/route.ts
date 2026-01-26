import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/sendgrid';

/**
 * POST: Send a welcome email to a new user
 * Called after successful signup
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, name } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
        }

        const result = await sendWelcomeEmail({
            recipientEmail: email,
            userName: name,
        });

        if (!result.success) {
            console.warn('Failed to send welcome email:', result.error);
            // Don't fail the request - welcome email is non-critical
            return NextResponse.json({
                success: false,
                message: 'Welcome email could not be sent',
                error: result.error,
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Welcome email sent successfully',
        });
    } catch (error: unknown) {
        console.error('Welcome email error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to send welcome email' },
            { status: 500 }
        );
    }
}
