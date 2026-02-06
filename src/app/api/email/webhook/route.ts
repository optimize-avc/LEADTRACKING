import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { getValidAccessTokenServer } from '@/lib/gmail/gmail-service-server';

/**
 * POST /api/email/webhook - Gmail Push Notification Webhook
 * 
 * Gmail sends notifications when new emails arrive.
 * This webhook processes those notifications to track replies.
 * 
 * Setup required:
 * 1. Create a Google Cloud Pub/Sub topic
 * 2. Grant publish permission to gmail-api-push@system.gserviceaccount.com
 * 3. Create a push subscription pointing to this webhook
 * 4. Call gmail.users.watch() to start watching the user's inbox
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Gmail sends base64-encoded Pub/Sub message
        if (!body.message?.data) {
            return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
        }

        // Decode the Pub/Sub message
        const decodedData = Buffer.from(body.message.data, 'base64').toString('utf-8');
        const notification = JSON.parse(decodedData);
        
        console.log('[Gmail Webhook] Received notification:', notification);

        // notification contains: { emailAddress, historyId }
        const { emailAddress, historyId } = notification;

        if (!emailAddress || !historyId) {
            console.log('[Gmail Webhook] Missing emailAddress or historyId');
            return NextResponse.json({ received: true });
        }

        // Find the user with this email
        const db = getAdminDb();
        const usersSnapshot = await db
            .collectionGroup('integrations')
            .where('email', '==', emailAddress)
            .limit(1)
            .get();

        if (usersSnapshot.empty) {
            console.log('[Gmail Webhook] No user found for email:', emailAddress);
            return NextResponse.json({ received: true });
        }

        // Get user ID from the document path
        const integrationDoc = usersSnapshot.docs[0];
        const userId = integrationDoc.ref.parent.parent?.id;

        if (!userId) {
            console.log('[Gmail Webhook] Could not extract userId');
            return NextResponse.json({ received: true });
        }

        // Get valid access token
        const accessToken = await getValidAccessTokenServer(userId);
        if (!accessToken) {
            console.log('[Gmail Webhook] No valid access token for user:', userId);
            return NextResponse.json({ received: true });
        }

        // Fetch new messages using history API
        const lastHistoryId = integrationDoc.data()?.lastHistoryId;
        
        const historyResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${lastHistoryId || historyId}&historyTypes=messageAdded`,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        if (!historyResponse.ok) {
            console.log('[Gmail Webhook] History API error:', await historyResponse.text());
            return NextResponse.json({ received: true });
        }

        const historyData = await historyResponse.json();
        
        // Update last history ID
        await integrationDoc.ref.update({ lastHistoryId: historyData.historyId });

        // Process new messages
        if (historyData.history) {
            for (const historyItem of historyData.history) {
                if (historyItem.messagesAdded) {
                    for (const { message } of historyItem.messagesAdded) {
                        await processIncomingEmail(userId, message.id, accessToken, db);
                    }
                }
            }
        }

        return NextResponse.json({ received: true, processed: true });
    } catch (error) {
        console.error('[Gmail Webhook] Error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}

/**
 * Process an incoming email to check if it's a reply to a tracked thread
 */
async function processIncomingEmail(
    userId: string,
    messageId: string,
    accessToken: string,
    db: FirebaseFirestore.Firestore
) {
    try {
        // Fetch full message
        const msgResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=In-Reply-To`,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        if (!msgResponse.ok) {
            console.log('[Gmail Webhook] Failed to fetch message:', messageId);
            return;
        }

        const message = await msgResponse.json();
        
        // Extract headers
        const headers = message.payload?.headers || [];
        const fromHeader = headers.find((h: { name: string }) => h.name === 'From')?.value || '';
        const subjectHeader = headers.find((h: { name: string }) => h.name === 'Subject')?.value || '';
        const inReplyTo = headers.find((h: { name: string }) => h.name === 'In-Reply-To')?.value || '';

        // Check if this is a reply to one of our sent emails
        if (inReplyTo) {
            // Look for the original email thread
            const threadsSnapshot = await db
                .collection('users')
                .doc(userId)
                .collection('emailMessages')
                .where('messageId', '==', inReplyTo.replace(/[<>]/g, ''))
                .limit(1)
                .get();

            if (!threadsSnapshot.empty) {
                const originalEmail = threadsSnapshot.docs[0];
                const leadId = originalEmail.data().leadId;

                console.log('[Gmail Webhook] Found reply to tracked email for lead:', leadId);

                // Log the reply
                await db
                    .collection('users')
                    .doc(userId)
                    .collection('emailMessages')
                    .add({
                        id: messageId,
                        threadId: message.threadId,
                        leadId,
                        direction: 'received',
                        from: fromHeader,
                        subject: subjectHeader,
                        snippet: message.snippet || '',
                        timestamp: Date.now(),
                        inReplyTo,
                    });

                // Update lead status - they replied!
                if (leadId) {
                    await db
                        .collection('users')
                        .doc(userId)
                        .collection('leads')
                        .doc(leadId)
                        .update({
                            lastContactedAt: Date.now(),
                            lastActivity: 'Email reply received',
                            // Optionally bump status
                        });

                    // Log activity
                    await db
                        .collection('users')
                        .doc(userId)
                        .collection('activities')
                        .add({
                            type: 'email_received',
                            leadId,
                            description: `Reply received: "${subjectHeader}"`,
                            from: fromHeader,
                            timestamp: Date.now(),
                        });
                }
            }
        }
    } catch (error) {
        console.error('[Gmail Webhook] Error processing email:', messageId, error);
    }
}

// Also support verification GET for Google
export async function GET(request: NextRequest) {
    // Google Cloud Pub/Sub verification
    const challenge = request.nextUrl.searchParams.get('hub.challenge');
    if (challenge) {
        return new NextResponse(challenge, { status: 200 });
    }
    return NextResponse.json({ status: 'Gmail webhook endpoint' });
}
