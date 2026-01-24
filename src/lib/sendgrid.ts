import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) {
    sgMail.setApiKey(apiKey);
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@salestracker.ai';
const APP_URL =
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://prod-lead-tracker--antigrav-tracking-final.us-central1.hosted.app';

export interface TeamInviteEmailData {
    recipientEmail: string;
    inviterName: string;
    companyName: string;
    role: string;
    inviteUrl: string;
}

/**
 * Send a team invitation email via SendGrid
 */
export async function sendTeamInviteEmail(data: TeamInviteEmailData): Promise<boolean> {
    if (!apiKey) {
        console.error('SendGrid API key not configured');
        return false;
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
            email: FROM_EMAIL,
            name: 'SalesTracker AI',
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
                                <span style="font-size: 24px; font-weight: bold; color: white;">SalesTracker AI</span>
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
        await sgMail.send(msg);
        console.log(`Team invite email sent to ${data.recipientEmail}`);
        return true;
    } catch (error) {
        console.error('Failed to send team invite email:', error);
        return false;
    }
}

/**
 * Generate invite URL for team member
 */
export function generateInviteUrl(companyId: string, inviteId: string): string {
    return `${APP_URL}/invite/accept?company=${companyId}&invite=${inviteId}`;
}
