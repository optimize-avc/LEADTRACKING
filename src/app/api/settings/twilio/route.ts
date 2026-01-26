import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import twilio from 'twilio';

// POST: Save Twilio configuration for a company
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, companyId, accountSid, authToken, phoneNumber } = body;

        if (!userId || !companyId) {
            return NextResponse.json({ error: 'Missing userId or companyId' }, { status: 400 });
        }

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
        const companyRef = db.collection('companies').doc(companyId);

        // Get current company to verify ownership
        const companySnap = await companyRef.get();
        if (!companySnap.exists) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        const companyData = companySnap.data();
        if (companyData?.ownerId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

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
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const companyId = searchParams.get('companyId');

        if (!userId || !companyId) {
            return NextResponse.json({ error: 'Missing userId or companyId' }, { status: 400 });
        }

        const db = getAdminDb();
        const companyRef = db.collection('companies').doc(companyId);

        // Get current company to verify ownership
        const companySnap = await companyRef.get();
        if (!companySnap.exists) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        const companyData = companySnap.data();
        if (companyData?.ownerId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Clear Twilio config
        await companyRef.update({
            'settings.twilioConfig': {},
            updatedAt: Date.now(),
        });

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
        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get('companyId');

        if (!companyId) {
            return NextResponse.json({ error: 'Missing companyId' }, { status: 400 });
        }

        const db = getAdminDb();
        const companySnap = await db.collection('companies').doc(companyId).get();

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
