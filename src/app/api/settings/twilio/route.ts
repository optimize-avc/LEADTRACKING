import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { getAuthContext, isAdmin } from '@/lib/api/auth-helpers';
import { AuditService } from '@/lib/firebase/audit';
import twilio from 'twilio';

// POST: Save Twilio configuration for a company
export async function POST(request: NextRequest) {
    try {
        // Verify authentication and get company context
        const authContext = await getAuthContext(request);
        if (!authContext) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only admins/owners can update settings
        if (!isAdmin(authContext)) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { accountSid, authToken, phoneNumber } = body;

        // Validate credentials by making a test API call
        if (accountSid && authToken) {
            try {
                const client = twilio(accountSid, authToken);
                // Try to fetch account info to verify credentials
                await client.api.accounts(accountSid).fetch();
            } catch (error) {
                console.error('Twilio credential validation failed:', error);
                return NextResponse.json(
                    {
                        error: 'Invalid Twilio credentials. Please check your Account SID and Auth Token.',
                    },
                    { status: 400 }
                );
            }
        }

        const db = getAdminDb();
        const companyRef = db.collection('companies').doc(authContext.companyId);

        // Update Twilio config
        const twilioConfig = {
            accountSid: accountSid || '',
            authToken: authToken || '',
            phoneNumber: phoneNumber || '',
            connected: !!(accountSid && authToken && phoneNumber),
            connectedAt: Date.now(),
        };

        await companyRef.update({
            'settings.twilioConfig': twilioConfig,
            updatedAt: Date.now(),
        });

        // Audit log the Twilio configuration change
        try {
            await AuditService.logAction(
                authContext.companyId,
                authContext.userId,
                authContext.email || 'Unknown',
                'settings.updated',
                { type: 'settings', id: authContext.companyId, name: 'Twilio Configuration' },
                { action: 'configured', phoneNumber: phoneNumber || 'not set' }
            );
        } catch (auditError) {
            console.warn('[Twilio Settings API] Audit logging failed:', auditError);
        }

        return NextResponse.json({
            success: true,
            connected: twilioConfig.connected,
            phoneNumber: twilioConfig.phoneNumber,
        });
    } catch (error) {
        console.error('Error saving Twilio config:', error);
        return NextResponse.json({ error: 'Failed to save Twilio configuration' }, { status: 500 });
    }
}

// DELETE: Clear Twilio configuration for a company
export async function DELETE(request: NextRequest) {
    try {
        // Verify authentication and get company context
        const authContext = await getAuthContext(request);
        if (!authContext) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only admins/owners can update settings
        if (!isAdmin(authContext)) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const db = getAdminDb();
        const companyRef = db.collection('companies').doc(authContext.companyId);

        // Clear Twilio config
        await companyRef.update({
            'settings.twilioConfig': {},
            updatedAt: Date.now(),
        });

        // Audit log the Twilio config removal
        try {
            await AuditService.logAction(
                authContext.companyId,
                authContext.userId,
                authContext.email || 'Unknown',
                'settings.updated',
                { type: 'settings', id: authContext.companyId, name: 'Twilio Configuration' },
                { action: 'cleared' }
            );
        } catch (auditError) {
            console.warn('[Twilio Settings API] Audit logging failed:', auditError);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error clearing Twilio config:', error);
        return NextResponse.json(
            { error: 'Failed to clear Twilio configuration' },
            { status: 500 }
        );
    }
}

// GET: Get Twilio status for a company
export async function GET(request: NextRequest) {
    try {
        // Verify authentication and get company context
        const authContext = await getAuthContext(request);
        if (!authContext) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = getAdminDb();
        const companySnap = await db.collection('companies').doc(authContext.companyId).get();

        if (!companySnap.exists) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        const companyData = companySnap.data();
        const twilioConfig = companyData?.settings?.twilioConfig || {};

        return NextResponse.json({
            connected: twilioConfig.connected || false,
            phoneNumber: twilioConfig.phoneNumber || '',
            connectedAt: twilioConfig.connectedAt || null,
            // Don't expose accountSid or authToken in GET response
        });
    } catch (error) {
        console.error('Error getting Twilio status:', error);
        return NextResponse.json({ error: 'Failed to get Twilio status' }, { status: 500 });
    }
}
