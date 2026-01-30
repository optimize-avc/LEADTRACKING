/**
 * Accept Team Invite API
 *
 * POST /api/team/accept
 *
 * Links the authenticated user to the company and marks the invite as accepted.
 * Uses Firebase Admin SDK to bypass security rules.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, verifyIdToken } from '@/lib/firebase/admin';
import { AuditService } from '@/lib/firebase/audit';
import { rateLimit } from '@/lib/api-middleware';
import { RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
    try {
        // 0. Rate limiting - prevent abuse
        const rateLimitResult = rateLimit(request, undefined, RATE_LIMITS.userAction);
        if (rateLimitResult) {
            return rateLimitResult;
        }

        // 1. Verify authentication
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const user = await verifyIdToken(token);

        if (!user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // 2. Parse request body
        const body = await request.json();
        const { companyId, inviteId } = body;

        if (!companyId || !inviteId) {
            return NextResponse.json({ error: 'Missing companyId or inviteId' }, { status: 400 });
        }

        const db = getAdminDb();

        // 3. Get and validate the invite
        const inviteRef = db
            .collection('companies')
            .doc(companyId)
            .collection('invites')
            .doc(inviteId);
        const inviteDoc = await inviteRef.get();

        if (!inviteDoc.exists) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
        }

        const invite = inviteDoc.data();

        // Check if expired
        if (invite?.expiresAt && invite.expiresAt < Date.now()) {
            return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 });
        }

        // Check if already used
        if (invite?.status !== 'pending') {
            return NextResponse.json(
                { error: 'This invitation has already been used' },
                { status: 410 }
            );
        }

        // 4. Get company details
        const companyRef = db.collection('companies').doc(companyId);
        const companyDoc = await companyRef.get();

        if (!companyDoc.exists) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        const company = companyDoc.data();
        const now = Date.now();

        // 5. Update user document to link to company
        const userRef = db.collection('users').doc(user.uid);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            // Update existing user
            await userRef.update({
                companyId,
                role: invite?.role || 'rep',
                updatedAt: now,
            });
        } else {
            // Create new user document
            await userRef.set({
                email: user.email || invite?.email,
                name: user.name || user.email?.split('@')[0] || 'User',
                companyId,
                role: invite?.role || 'rep',
                tier: 'free', // Inherit from company's tier later
                onboarded: true,
                createdAt: now,
                updatedAt: now,
            });
        }

        // 6. Add user to company's team members
        const teamMemberRef = db
            .collection('companies')
            .doc(companyId)
            .collection('team')
            .doc(user.uid);
        await teamMemberRef.set({
            userId: user.uid,
            email: user.email || invite?.email,
            name: user.name || user.email?.split('@')[0] || 'User',
            role: invite?.role || 'rep',
            status: 'active',
            invitedBy: invite?.invitedBy,
            joinedAt: now,
        });

        // 7. Mark invite as accepted
        await inviteRef.update({
            status: 'accepted',
            acceptedBy: user.uid,
            acceptedAt: now,
        });

        // 8. Update company's team member count in usage
        const usageRef = db.collection('companies').doc(companyId).collection('meta').doc('usage');
        const usageDoc = await usageRef.get();

        if (usageDoc.exists) {
            const currentCount = usageDoc.data()?.teamMemberCount || 1;
            await usageRef.update({
                teamMemberCount: currentCount + 1,
                lastUpdated: now,
            });
        } else {
            await usageRef.set({
                teamMemberCount: 2, // Owner + new member
                leadCount: 0,
                leadsThisMonth: 0,
                emailsSentThisMonth: 0,
                activitiesThisMonth: 0,
                lastUpdated: now,
            });
        }

        console.log(
            `[API] Invite accepted: User ${user.uid} joined company ${companyId} as ${invite?.role}`
        );

        // 9. Log audit event for invite acceptance
        try {
            await AuditService.logAction(
                companyId,
                user.uid,
                user.name || user.email || 'Unknown',
                'team.inviteAccepted',
                { type: 'team', id: user.uid, name: user.email || 'Unknown' },
                { role: invite?.role, invitedBy: invite?.invitedBy }
            );
        } catch (auditError) {
            console.warn('[Team Accept API] Audit logging failed:', auditError);
            // Don't fail the request if audit logging fails
        }

        return NextResponse.json({
            success: true,
            companyId,
            companyName: company?.name,
            role: invite?.role,
            message: `Welcome to ${company?.name}!`,
        });
    } catch (error) {
        console.error('[API] Error accepting invite:', error);
        return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
    }
}
