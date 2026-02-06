import { NextRequest, NextResponse } from 'next/server';
import { getGmailStatusServer, disconnectGmailServer } from '@/lib/gmail/gmail-service-server';
import { verifyIdToken } from '@/lib/firebase/admin';

/**
 * GET /api/auth/gmail/status - Check Gmail connection status
 */
export async function GET(request: NextRequest) {
    try {
        // Get auth token from header
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ connected: false, error: 'No auth token' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decodedToken = await verifyIdToken(token);
        
        if (!decodedToken) {
            return NextResponse.json({ connected: false, error: 'Invalid token' }, { status: 401 });
        }

        const status = await getGmailStatusServer(decodedToken.uid);
        
        return NextResponse.json({
            connected: status?.connected || false,
            email: status?.email || null,
        });
    } catch (error) {
        console.error('Gmail status check error:', error);
        return NextResponse.json({ connected: false, error: 'Failed to check status' }, { status: 500 });
    }
}

/**
 * DELETE /api/auth/gmail/status - Disconnect Gmail
 */
export async function DELETE(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'No auth token' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decodedToken = await verifyIdToken(token);
        
        if (!decodedToken) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        await disconnectGmailServer(decodedToken.uid);
        
        return NextResponse.json({ success: true, message: 'Gmail disconnected' });
    } catch (error) {
        console.error('Gmail disconnect error:', error);
        return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
    }
}
