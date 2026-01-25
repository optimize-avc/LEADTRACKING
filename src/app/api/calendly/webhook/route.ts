/**
 * Calendly Webhook Handler
 *
 * Processes Calendly webhook events to auto-log meetings as activities.
 *
 * Webhook Events:
 * - invitee.created - Meeting scheduled
 * - invitee.canceled - Meeting canceled
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import crypto from 'crypto';

// Webhook signing key from environment
const CALENDLY_WEBHOOK_SIGNING_KEY = process.env.CALENDLY_WEBHOOK_SIGNING_KEY || '';

interface CalendlyWebhookPayload {
    event: 'invitee.created' | 'invitee.canceled';
    payload: {
        event: string;
        invitee: {
            email: string;
            name: string;
            uri: string;
        };
        scheduled_event: {
            uri: string;
            name: string;
            start_time: string;
            end_time: string;
            location?: {
                type: string;
                join_url?: string;
            };
        };
        tracking?: {
            utm_source?: string;
            utm_campaign?: string;
        };
    };
}

/**
 * Verify Calendly webhook signature
 */
function verifySignature(payload: string, signature: string): boolean {
    if (!CALENDLY_WEBHOOK_SIGNING_KEY) {
        console.warn('CALENDLY_WEBHOOK_SIGNING_KEY not set, skipping verification');
        return true;
    }

    const expectedSignature = crypto
        .createHmac('sha256', CALENDLY_WEBHOOK_SIGNING_KEY)
        .update(payload)
        .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();
        const signature = request.headers.get('Calendly-Webhook-Signature') || '';

        // Verify signature
        if (!verifySignature(rawBody, signature)) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const data: CalendlyWebhookPayload = JSON.parse(rawBody);
        const { event, payload } = data;

        console.log(`[Calendly Webhook] Event: ${event}`);

        const db = getAdminDb();
        if (!db) {
            console.error('Firebase Admin DB not available');
            return NextResponse.json({ error: 'Server error' }, { status: 500 });
        }

        // Find lead by email
        const leadsRef = db.collection('leads');
        const leadSnapshot = await leadsRef
            .where('email', '==', payload.invitee.email)
            .limit(1)
            .get();

        if (leadSnapshot.empty) {
            console.log(`[Calendly] No lead found for email: ${payload.invitee.email}`);
            // Still return success - meeting may be with non-lead
            return NextResponse.json({ success: true, message: 'No matching lead' });
        }

        const leadDoc = leadSnapshot.docs[0];
        const lead = leadDoc.data();

        if (event === 'invitee.created') {
            // Create activity for meeting scheduled
            const activityRef = db.collection('activities').doc();
            const startTime = new Date(payload.scheduled_event.start_time).getTime();
            const endTime = new Date(payload.scheduled_event.end_time).getTime();
            const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));

            await activityRef.set({
                id: activityRef.id,
                type: 'meeting',
                outcome: 'meeting_set',
                duration: durationMinutes * 60, // Convert to seconds
                timestamp: startTime,
                repId: lead.assignedTo || 'system',
                leadId: leadDoc.id,
                notes:
                    `Meeting scheduled via Calendly: ${payload.scheduled_event.name}` +
                    (payload.scheduled_event.location?.join_url
                        ? `\nJoin URL: ${payload.scheduled_event.location.join_url}`
                        : ''),
                visibility: 'public',
                source: 'calendly',
                calendlyEventUri: payload.scheduled_event.uri,
                createdAt: Date.now(),
            });

            // Update lead's last contact and next step
            await leadDoc.ref.update({
                lastContact: Date.now(),
                nextStep: `Meeting scheduled for ${new Date(startTime).toLocaleDateString()}`,
                updatedAt: Date.now(),
            });

            console.log(`[Calendly] Activity logged for lead ${leadDoc.id}`);
        } else if (event === 'invitee.canceled') {
            // Find and update the activity
            const activitiesRef = db.collection('activities');
            const activitySnapshot = await activitiesRef
                .where('calendlyEventUri', '==', payload.scheduled_event.uri)
                .limit(1)
                .get();

            if (!activitySnapshot.empty) {
                const activityDoc = activitySnapshot.docs[0];
                await activityDoc.ref.update({
                    outcome: 'none',
                    notes: `${activityDoc.data().notes}\n\n⚠️ CANCELED by invitee`,
                    updatedAt: Date.now(),
                });

                // Update lead's next step
                await leadDoc.ref.update({
                    nextStep: 'Meeting canceled - reschedule needed',
                    updatedAt: Date.now(),
                });

                console.log(`[Calendly] Meeting canceled for lead ${leadDoc.id}`);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Calendly Webhook] Error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}

// Health check
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        service: 'calendly-webhook',
        timestamp: new Date().toISOString(),
    });
}
