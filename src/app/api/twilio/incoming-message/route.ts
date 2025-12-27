import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

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

        // 1. Find the lead associated with this phone number
        // We search across all users since webhooks are global
        // In production, you'd use a more efficient lookup index
        const leadsQuery = query(collection(db, 'leads'), where('phone', '==', from));
        const leadsSnapshot = await getDocs(leadsQuery);

        if (leadsSnapshot.empty) {
            console.log(`No lead found for number: ${from}`);
            return new Response('Lead not found', { status: 200 }); // Still return 200 to Twilio
        }

        // 2. Log the activity for each user/lead matching this number
        const logPromises = leadsSnapshot.docs.map(async (leadDoc) => {
            const leadData = leadDoc.data();
            const userId = leadData.ownerId; // Assuming ownerId exists on lead

            if (userId) {
                return addDoc(collection(db, 'users', userId, 'activities'), {
                    type: 'social',
                    outcome: 'connected',
                    timestamp: Date.now(),
                    repId: userId,
                    leadId: leadDoc.id,
                    notes: `Inbound Message: ${body}`,
                    channel: 'sms',
                    messageSid
                });
            }
        });

        await Promise.all(logPromises);

        // 3. Respond with empty TwiML to acknowledge receipt
        return new Response('<Response></Response>', {
            headers: { 'Content-Type': 'text/xml' }
        });

    } catch (error) {
        console.error('Webhook Error:', error);
        return new Response('Internal error', { status: 500 });
    }
}
