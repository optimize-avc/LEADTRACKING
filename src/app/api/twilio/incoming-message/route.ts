import { NextRequest } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

/**
 * Twilio Inbound Webhook (Dec 2025)
 * Captures replies and routes them to the correct lead history.
 */
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const from = formData.get('From') as string;
        const body = formData.get('Body') as string;
        const messageSid = formData.get('MessageSid') as string;

        if (!from || !body) {
            return new Response('Invalid Request', { status: 400 });
        }

        // Use Admin SDK for server-side Firestore access
        const db = getAdminDb();

        // 1. Find the lead associated with this phone number
        // We search across all users since webhooks are global
        // In production, you'd use a more efficient lookup index
        const leadsSnapshot = await db.collection('leads').where('phone', '==', from).get();

        if (leadsSnapshot.empty) {
            console.log(`No lead found for number: ${from}`);
            return new Response('Lead not found', { status: 200 }); // Still return 200 to Twilio
        }

        // 2. Log the activity for each user/lead matching this number
        const logPromises = leadsSnapshot.docs.map(async (leadDoc) => {
            const leadData = leadDoc.data();
            const userId = leadData.ownerId; // Assuming ownerId exists on lead

            if (userId) {
                return db.collection('users').doc(userId).collection('activities').add({
                    type: 'social',
                    outcome: 'connected',
                    timestamp: Date.now(),
                    repId: userId,
                    leadId: leadDoc.id,
                    notes: `Inbound Message: ${body}`,
                    channel: 'sms',
                    messageSid,
                });
            }
        });

        await Promise.all(logPromises);

        // 3. Respond with empty TwiML to acknowledge receipt
        return new Response('<Response></Response>', {
            headers: { 'Content-Type': 'text/xml' },
        });
    } catch (error) {
        console.error('Webhook Error:', error);
        return new Response('Internal error', { status: 500 });
    }
}
