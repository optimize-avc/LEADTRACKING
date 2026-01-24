import sgMail, { MailService } from '@sendgrid/mail';
import type { EmailConfig } from '@/types/company';

// Platform-level defaults from environment
const PLATFORM_API_KEY = process.env.SENDGRID_API_KEY;
const PLATFORM_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@salestracker.ai';
const PLATFORM_FROM_NAME = 'SalesTracker AI';
const APP_URL =
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://prod-lead-tracker--antigrav-tracking-final.us-central1.hosted.app';

// Initialize platform-level client
if (PLATFORM_API_KEY) {
    sgMail.setApiKey(PLATFORM_API_KEY);
}

export interface TeamInviteEmailData {
    recipientEmail: string;
    inviterName: string;
    companyName: string;
    role: string;
    inviteUrl: string;
}

export interface SendEmailOptions {
    emailConfig?: EmailConfig; // Tenant's email config (optional)
}

/**
 * Create a SendGrid client with the specified API key
 * Each call creates a new instance to support per-tenant keys
 */
function createSendGridClient(apiKey: string): MailService {
    const client = new MailService();
    client.setApiKey(apiKey);
    return client;
}

/**
 * Determine which email configuration to use
 * Priority: Tenant config > Platform defaults
 */
function getEmailConfig(tenantConfig?: EmailConfig): {
    apiKey: string | undefined;
    fromEmail: string;
    fromName: string;
    isTenantConfig: boolean;
} {
    // If tenant has a valid API key configured, use their config
    if (tenantConfig?.sendgridApiKey) {
        return {
            apiKey: tenantConfig.sendgridApiKey,
            fromEmail: tenantConfig.fromEmail || PLATFORM_FROM_EMAIL,
            fromName: tenantConfig.fromName || PLATFORM_FROM_NAME,
            isTenantConfig: true,
        };
    }

    // Fall back to platform defaults
    return {
        apiKey: PLATFORM_API_KEY,
        fromEmail: PLATFORM_FROM_EMAIL,
        fromName: PLATFORM_FROM_NAME,
        isTenantConfig: false,
    };
}

/**
 * Send a team invitation email via SendGrid
 * Supports tenant-specific SendGrid configuration
 */
export async function sendTeamInviteEmail(
    data: TeamInviteEmailData,
    options?: SendEmailOptions
): Promise<{ success: boolean; usingTenantConfig: boolean; error?: string }> {
    const config = getEmailConfig(options?.emailConfig);

    if (!config.apiKey) {
        console.error('SendGrid API key not configured (neither tenant nor platform)');
        return { success: false, usingTenantConfig: false, error: 'No API key configured' };
    }

    const roleDisplay =
        {
            admin: 'Admin',
            manager: 'Manager',
            rep: 'Sales Representative',
        }[data.role] || data.role;

    const msg = {
        to: data.recipientEmail,
        from: {
            email: config.fromEmail,
            name: config.fromName,
        },
        subject: `${data.inviterName} invited you to join ${data.companyName} on SalesTracker`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; border: 1px solid rgba(148, 163, 184, 0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center;">
                            <div style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #6366f1); padding: 12px 24px; border-radius: 12px; margin-bottom: 20px;">
                                <span style="font-size: 24px; font-weight: bold; color: white;">${config.fromName}</span>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 20px 40px;">
                            <h1 style="color: #f1f5f9; font-size: 28px; font-weight: 600; margin: 0 0 16px; text-align: center;">
                                You're Invited!
                            </h1>
                            <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
                                <strong style="color: #f1f5f9;">${data.inviterName}</strong> has invited you to join 
                                <strong style="color: #f1f5f9;">${data.companyName}</strong> as a <strong style="color: #8b5cf6;">${roleDisplay}</strong>.
                            </p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 24px 0;">
                                        <a href="${data.inviteUrl}" 
                                           style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);">
                                            Accept Invitation
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Features -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 24px;">
                                <tr>
                                    <td style="padding: 16px; background: rgba(139, 92, 246, 0.1); border-radius: 12px; border: 1px solid rgba(139, 92, 246, 0.2);">
                                        <p style="color: #94a3b8; font-size: 14px; margin: 0 0 12px;">
                                            <strong style="color: #f1f5f9;">With SalesTracker AI, you'll get:</strong>
                                        </p>
                                        <ul style="color: #94a3b8; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
                                            <li>AI-powered lead scoring and recommendations</li>
                                            <li>Real-time pipeline management</li>
                                            <li>Discord integration for team notifications</li>
                                            <li>Advanced analytics and forecasting</li>
                                        </ul>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; border-top: 1px solid rgba(148, 163, 184, 0.1);">
                            <p style="color: #64748b; font-size: 12px; margin: 0; text-align: center;">
                                This invitation will expire in 7 days.<br>
                                If you didn't expect this email, you can safely ignore it.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `,
        text: `${data.inviterName} has invited you to join ${data.companyName} as a ${roleDisplay} on SalesTracker AI.\n\nAccept your invitation: ${data.inviteUrl}\n\nThis invitation expires in 7 days.`,
    };

    try {
        // Use tenant's client if they have their own API key, otherwise use platform client
        if (config.isTenantConfig) {
            const tenantClient = createSendGridClient(config.apiKey);
            await tenantClient.send(msg);
        } else {
            await sgMail.send(msg);
        }
        console.log(
            `Team invite email sent to ${data.recipientEmail} (tenant config: ${config.isTenantConfig})`
        );
        return { success: true, usingTenantConfig: config.isTenantConfig };
    } catch (error: unknown) {
        console.error('Failed to send team invite email:', error);
        // Log more details if available
        let errorMessage = 'Unknown error';
        if (error && typeof error === 'object' && 'response' in error) {
            const sgError = error as {
                response?: { body?: { errors?: Array<{ message?: string }> } };
            };
            console.error(
                'SendGrid response body:',
                JSON.stringify(sgError.response?.body, null, 2)
            );
            errorMessage = sgError.response?.body?.errors?.[0]?.message || 'SendGrid error';
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, usingTenantConfig: config.isTenantConfig, error: errorMessage };
    }
}

/**
 * Send a test email to verify configuration
 */
export async function sendTestEmail(
    recipientEmail: string,
    emailConfig?: EmailConfig
): Promise<{ success: boolean; usingTenantConfig: boolean; error?: string }> {
    const config = getEmailConfig(emailConfig);

    if (!config.apiKey) {
        return { success: false, usingTenantConfig: false, error: 'No API key configured' };
    }

    const msg = {
        to: recipientEmail,
        from: {
            email: config.fromEmail,
            name: config.fromName,
        },
        subject: `Test Email from ${config.fromName}`,
        html: `
            <div style="font-family: sans-serif; padding: 20px;">
                <h2>✅ Email Configuration Test Successful!</h2>
                <p>This test email confirms that your SendGrid configuration is working correctly.</p>
                <p><strong>From Email:</strong> ${config.fromEmail}</p>
                <p><strong>From Name:</strong> ${config.fromName}</p>
                <p><strong>Using:</strong> ${config.isTenantConfig ? 'Your custom SendGrid API key' : 'Platform default'}</p>
            </div>
        `,
        text: `Email Configuration Test Successful!\n\nFrom: ${config.fromEmail}\nName: ${config.fromName}\nUsing: ${config.isTenantConfig ? 'Your custom SendGrid API key' : 'Platform default'}`,
    };

    try {
        if (config.isTenantConfig) {
            const tenantClient = createSendGridClient(config.apiKey);
            await tenantClient.send(msg);
        } else {
            await sgMail.send(msg);
        }
        return { success: true, usingTenantConfig: config.isTenantConfig };
    } catch (error: unknown) {
        let errorMessage = 'Unknown error';
        if (error && typeof error === 'object' && 'response' in error) {
            const sgError = error as {
                response?: { body?: { errors?: Array<{ message?: string }> } };
            };
            errorMessage = sgError.response?.body?.errors?.[0]?.message || 'SendGrid error';
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, usingTenantConfig: config.isTenantConfig, error: errorMessage };
    }
}

/**
 * Generate invite URL for team member
 */
export function generateInviteUrl(companyId: string, inviteId: string): string {
    return `${APP_URL}/invite/accept?company=${companyId}&invite=${inviteId}`;
}
