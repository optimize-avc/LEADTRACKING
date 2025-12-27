import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        const fromNumber = formData.get('From') as string;
        const toNumber = formData.get('To') as string;
        const body = formData.get('Body') as string;
        const messageSid = formData.get('MessageSid') as string;

        console.log('Inbound SMS received:', { fromNumber, toNumber, messageSid });

        if (!fromNumber || !body) {
            return new NextResponse('<Response></Response>', {
                headers: { 'Content-Type': 'text/xml' },
            });
        }

        const db = getAdminDb();

        // 1. Find the lead with this phone number
        // We use collectionGroup query to search across all users' leads
        // Note: For this to work efficiently, 'leads' collection group index might be needed
        // For small scale, it should be fine.
        const leadsSnapshot = await db.collectionGroup('leads')
            .where('phone', '==', fromNumber)
            .limit(1)
            .get();

        // Try stripping standard formatting if exact match fails
        // Twilio sends +1234567890, user might save as (123) 456-7890
        // For MVP, we assume format matches or we'd need a more complex normalization search.

        if (leadsSnapshot.empty) {
            console.warn(`No lead found for incoming number: ${fromNumber}`);
            // Still return success to Twilio so they don't retry
            return new NextResponse('<Response></Response>', {
                headers: { 'Content-Type': 'text/xml' },
            });
        }

        const leadDoc = leadsSnapshot.docs[0];
        const leadId = leadDoc.id;

        // Parent of a lead doc is "leads" collection, parent of that is the User doc
        const userDocRef = leadDoc.ref.parent.parent;

        if (!userDocRef) {
            console.error('Lead document has no parent User document');
            return new NextResponse('<Response></Response>', {
                headers: { 'Content-Type': 'text/xml' },
            });
        }

        const userId = userDocRef.id;

        console.log(`Found lead ${leadId} for user ${userId}, logging message...`);

        // 2. Log the inbound message to users/{userId}/messages
        await userDocRef.collection('messages').doc(messageSid).set({
            userId,
            leadId,
            messageSid,
            body,
            fromNumber, // This is the lead's number (sender)
            toNumber,   // This is our Twilio number
            direction: 'inbound',
            status: 'received',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // 3. Log activity
        await userDocRef.collection('activities').add({
            type: 'sms',
            leadId,
            description: `Received SMS: "${body.substring(0, 50)}${body.length > 50 ? '...' : ''}"`,
            messageSid,
            createdAt: FieldValue.serverTimestamp(),
        });

        return new NextResponse(
            '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
            {
                status: 200,
                headers: { 'Content-Type': 'text/xml' },
            }
        );

    } catch (error) {
        console.error('Error handling inbound SMS:', error);
        return new NextResponse(
            '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
            {
                status: 200,
                headers: { 'Content-Type': 'text/xml' },
            }
        );
    }
}
