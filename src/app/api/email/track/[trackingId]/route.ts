import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

// 1x1 transparent GIF
const TRACKING_PIXEL = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
);

/**
 * GET /api/email/track/[trackingId] - Email open tracking pixel
 * 
 * When an email is opened, the image loads and we log the open event.
 * The trackingId encodes: userId_leadId_emailId_timestamp
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ trackingId: string }> }
) {
    try {
        const { trackingId } = await params;
        
        // Decode tracking ID
        // Format: base64(userId:leadId:emailId:sentAt)
        let userId: string, leadId: string, emailId: string, sentAt: string;
        
        try {
            const decoded = Buffer.from(trackingId, 'base64').toString('utf-8');
            [userId, leadId, emailId, sentAt] = decoded.split(':');
        } catch {
            // Invalid tracking ID, still return pixel to not break email
            return new NextResponse(TRACKING_PIXEL, {
                headers: {
                    'Content-Type': 'image/gif',
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                },
            });
        }

        if (!userId || !leadId || !emailId) {
            return new NextResponse(TRACKING_PIXEL, {
                headers: {
                    'Content-Type': 'image/gif',
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                },
            });
        }

        // Log the open event
        const db = getAdminDb();
        const now = Date.now();

        // Get user agent and IP for analytics
        const userAgent = request.headers.get('user-agent') || 'unknown';
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') || 
                   'unknown';

        // Check if we already logged this open (prevent duplicates from re-fetches)
        const existingOpen = await db
            .collection('users')
            .doc(userId)
            .collection('emailOpens')
            .where('emailId', '==', emailId)
            .limit(1)
            .get();

        const isFirstOpen = existingOpen.empty;

        // Always log the event (for analytics on repeat opens)
        await db
            .collection('users')
            .doc(userId)
            .collection('emailOpens')
            .add({
                emailId,
                leadId,
                sentAt: parseInt(sentAt) || 0,
                openedAt: now,
                userAgent,
                ip,
                isFirstOpen,
            });

        // If first open, update the email thread and lead
        if (isFirstOpen) {
            // Update email thread with open timestamp
            const emailThreadRef = db
                .collection('users')
                .doc(userId)
                .collection('emailThreads')
                .doc(emailId);
            
            const emailDoc = await emailThreadRef.get();
            if (emailDoc.exists) {
                await emailThreadRef.update({
                    openedAt: now,
                    openCount: 1,
                });
            }

            // Log activity
            await db
                .collection('users')
                .doc(userId)
                .collection('activities')
                .add({
                    type: 'email_opened',
                    leadId,
                    emailId,
                    timestamp: now,
                    description: 'Email was opened',
                });

            // Update lead's last activity
            if (leadId) {
                const leadRef = db
                    .collection('users')
                    .doc(userId)
                    .collection('leads')
                    .doc(leadId);
                
                const leadDoc = await leadRef.get();
                if (leadDoc.exists) {
                    await leadRef.update({
                        lastContactedAt: now,
                        lastActivity: 'Opened email',
                    });
                }
            }

            console.log(`[Email Tracking] First open: user=${userId}, lead=${leadId}, email=${emailId}`);
        }

        // Return the tracking pixel
        return new NextResponse(TRACKING_PIXEL, {
            headers: {
                'Content-Type': 'image/gif',
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        });
    } catch (error) {
        console.error('[Email Tracking] Error:', error);
        // Always return pixel even on error
        return new NextResponse(TRACKING_PIXEL, {
            headers: {
                'Content-Type': 'image/gif',
                'Cache-Control': 'no-store',
            },
        });
    }
}
