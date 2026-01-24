import { NextRequest, NextResponse } from 'next/server';
import { TeamService } from '@/lib/firebase/team';
import { sendTeamInviteEmail, generateInviteUrl } from '@/lib/sendgrid';

/**
 * POST /api/team/invite
 * Create a team invite and send email notification
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { companyId, companyName, email, role, invitedBy, invitedByName } = body;

        // Validate required fields
        if (!companyId || !email || !role || !invitedBy) {
            return NextResponse.json(
                { error: 'Missing required fields: companyId, email, role, invitedBy' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
        }

        // Check if user already has pending invite
        const hasPending = await TeamService.hasPendingInvite(companyId, email);
        if (hasPending) {
            return NextResponse.json(
                { error: 'This email already has a pending invitation' },
                { status: 409 }
            );
        }

        // Create the invite in Firestore
        const inviteId = await TeamService.createInvite(
            companyId,
            companyName || 'Your Team',
            email,
            role,
            invitedBy,
            invitedByName || 'A team admin'
        );

        // Generate invite URL
        const inviteUrl = generateInviteUrl(companyId, inviteId);

        // Send email via SendGrid
        const emailSent = await sendTeamInviteEmail({
            recipientEmail: email,
            inviterName: invitedByName || 'A team admin',
            companyName: companyName || 'Your Team',
            role,
            inviteUrl,
        });

        return NextResponse.json({
            success: true,
            inviteId,
            emailSent,
            message: emailSent
                ? 'Invitation sent successfully'
                : 'Invitation created but email failed to send',
        });
    } catch (error) {
        console.error('Failed to create team invite:', error);
        return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }
}

/**
 * GET /api/team/invite?company={companyId}&invite={inviteId}
 * Get invite details for accept flow
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const companyId = searchParams.get('company');
        const inviteId = searchParams.get('invite');

        if (!companyId || !inviteId) {
            return NextResponse.json({ error: 'Missing company or invite ID' }, { status: 400 });
        }

        const invite = await TeamService.getInvite(companyId, inviteId);

        if (!invite) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
        }

        // Check if expired
        if (invite.expiresAt < Date.now()) {
            return NextResponse.json(
                { error: 'This invitation has expired', expired: true },
                { status: 410 }
            );
        }

        // Check if already accepted
        if (invite.status !== 'pending') {
            return NextResponse.json(
                { error: 'This invitation has already been used', status: invite.status },
                { status: 410 }
            );
        }

        return NextResponse.json({
            success: true,
            invite: {
                email: invite.email,
                role: invite.role,
                companyName: invite.companyName,
                invitedByName: invite.invitedByName,
                expiresAt: invite.expiresAt,
            },
        });
    } catch (error) {
        console.error('Failed to get invite:', error);
        return NextResponse.json({ error: 'Failed to retrieve invitation' }, { status: 500 });
    }
}
