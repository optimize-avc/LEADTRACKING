import { NextRequest, NextResponse } from 'next/server';
import { sendTestEmail } from '@/lib/sendgrid';

/**
 * POST /api/email/test
 * Send a test email to verify email configuration
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { companyId, recipientEmail } = body;

        if (!recipientEmail) {
            return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
        }

        // Fetch company's email config if companyId is provided
        let emailConfig:
            | { sendgridApiKey?: string; fromEmail?: string; fromName?: string }
            | undefined;

        if (companyId) {
            try {
                const { getAdminDb } = await import('@/lib/firebase/admin');
                const db = getAdminDb();
                const companyDoc = await db.collection('companies').doc(companyId).get();

                if (companyDoc.exists) {
                    emailConfig = companyDoc.data()?.settings?.emailConfig;
                }
            } catch (error) {
                // If Admin SDK fails (e.g., local dev), continue with platform defaults
                console.warn(
                    'Could not fetch company email config, using platform defaults:',
                    error
                );
            }
        }

        // Send test email
        const result = await sendTestEmail(recipientEmail, emailConfig);

        if (result.success) {
            return NextResponse.json({
                success: true,
                usingTenantConfig: result.usingTenantConfig,
                message: result.usingTenantConfig
                    ? 'Test email sent using your custom configuration'
                    : 'Test email sent using platform defaults',
            });
        } else {
            return NextResponse.json(
                {
                    success: false,
                    error: result.error,
                    usingTenantConfig: result.usingTenantConfig,
                },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Failed to send test email:', error);
        return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
    }
}
