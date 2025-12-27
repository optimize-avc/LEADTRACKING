'use server';

import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { GmailMessage, GmailTokens, refreshAccessToken } from '@/lib/gmail/gmail-auth';
import { getAdminDb } from '@/lib/firebase/admin';

// ============================================
// HELPER FUNCTIONS (Moved from gmail-service to avoid circular deps)
// ============================================

export function parseEmailHeaders(headers: { name: string; value: string }[]): {
    from: string;
    to: string;
    subject: string;
    date: string;
} {
    const getHeader = (name: string) =>
        headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    return {
        from: getHeader('From'),
        to: getHeader('To'),
        subject: getHeader('Subject'),
        date: getHeader('Date'),
    };
}

export function extractEmailAddress(headerValue: string): string {
    const match = headerValue.match(/<(.+?)>/) || headerValue.match(/([^\s<>]+@[^\s<>]+)/);
    return match ? match[1] : headerValue;
}

export function decodeBase64(data: string): string {
    try {
        // Gmail uses URL-safe base64
        const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
        return Buffer.from(base64, 'base64').toString('utf-8');
    } catch {
        return '';
    }
}

export function getEmailBody(message: GmailMessage): string {
    // Try to get body from payload directly
    if (message.payload.body?.data) {
        return decodeBase64(message.payload.body.data);
    }

    // Try to get from parts (multipart email)
    if (message.payload.parts) {
        const textPart = message.payload.parts.find(p => p.mimeType === 'text/plain');
        if (textPart?.body?.data) {
            return decodeBase64(textPart.body.data);
        }
        const htmlPart = message.payload.parts.find(p => p.mimeType === 'text/html');
        if (htmlPart?.body?.data) {
            // Strip HTML tags for plain text
            return decodeBase64(htmlPart.body.data).replace(/<[^>]*>/g, '');
        }
    }

    return message.snippet || '';
}

// Re-export types needed by client components
export interface EmailRecord {
    id: string;
    threadId: string;
    leadId: string;
    direction: 'sent' | 'received';
    from: string;
    to: string;
    subject: string;
    snippet: string;
    body: string;
    timestamp: number;
}

// Helper: Get Valid Token (Server-Side Only)
// We rely on 'firebase-admin' or 'firebase/firestore' depending on environment. 
// Since this is a Server Action, we can use the Admin SDK for better permission handling if setup, 
// but existing code used client SDK with strict rules. We'll stick to client SDK with server env vars for consistency, 
// OR switch to Admin SDK if client SDK auth state is tricky in Server Actions.
// Given strict "commercial grade" request: We should use Admin SDK for data access if possible to bypass RLS issues on server,
// BUT preserving the existing 'firebase/config' usage is safer for now unless we do a full rewrite.
// HOWEVER, Server Actions run in a Node context where we can use process.env secrets.

// Let's stick to the logic from gmail-service.ts but ensure it runs on server.

async function getValidAccessToken(userId: string): Promise<string | null> {
    // Note: In a real Server Action, we might not have a signed-in firebase user in the global scope 
    // unless we pass the token. However, for getting the GMAIL token stored in DB, we can just query DB.

    // Using Admin DB to ensure we can read the user's secrets securely without worrying about Client Auth state
    const adminDb = getAdminDb();
    const tokenDoc = await adminDb.collection('users').doc(userId).collection('integrations').doc('gmail').get();

    if (!tokenDoc.exists) {
        return null;
    }

    const tokens = tokenDoc.data() as GmailTokens;

    // Check if token is expired (with 5 min buffer)
    if (tokens.expiresAt < Date.now() + 300000) {
        try {
            console.log('Refreshing Gmail access token...');
            const refreshed = await refreshAccessToken(tokens.refreshToken);

            await adminDb.collection('users').doc(userId).collection('integrations').doc('gmail').update({
                accessToken: refreshed.accessToken,
                expiresAt: refreshed.expiresAt,
            });
            return refreshed.accessToken;
        } catch (error) {
            console.error('Failed to refresh token:', error);
            return null;
        }
    }

    return tokens.accessToken;
}

async function fetchEmails(accessToken: string, queryStr: string, maxResults: number = 50): Promise<GmailMessage[]> {
    const params = new URLSearchParams({
        q: queryStr,
        maxResults: maxResults.toString(),
    });

    const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
        throw new Error('Failed to fetch messages from Gmail API');
    }

    const data = await response.json();
    if (!data.messages) return [];

    // Fetch full message details for each
    const messages = await Promise.all(
        data.messages.slice(0, maxResults).map(async (msg: { id: string }) => {
            const msgResponse = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            return msgResponse.json();
        })
    );

    return messages;
}

export async function syncEmailsForLeadAction(userId: string, leadEmail: string, leadId: string): Promise<EmailRecord[]> {
    try {
        const accessToken = await getValidAccessToken(userId);
        if (!accessToken) {
            throw new Error('Gmail not connected');
        }

        const queryStr = `from:${leadEmail} OR to:${leadEmail}`;
        const messages = await fetchEmails(accessToken, queryStr, 30);

        const adminDb = getAdminDb();
        const userDoc = await adminDb.collection('users').doc(userId).collection('integrations').doc('gmail').get();
        const userEmail = userDoc.exists ? userDoc.data()?.email : '';

        const emailRecords: EmailRecord[] = [];
        const batch = adminDb.batch();

        for (const message of messages) {
            const headers = parseEmailHeaders(message.payload.headers);
            const fromEmail = extractEmailAddress(headers.from);
            const direction = fromEmail.toLowerCase() === userEmail.toLowerCase() ? 'sent' : 'received';

            const record: EmailRecord = {
                id: message.id,
                threadId: message.threadId,
                leadId,
                direction,
                from: headers.from,
                to: headers.to,
                subject: headers.subject,
                snippet: message.snippet,
                body: getEmailBody(message),
                timestamp: parseInt(message.internalDate),
            };

            emailRecords.push(record);

            const docRef = adminDb.collection('users').doc(userId).collection('emailMessages').doc(message.id);
            batch.set(docRef, record, { merge: true });
        }

        await batch.commit();

        // Sort most recent first
        return emailRecords.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error('Sync Emails Error:', error);
        throw new Error('Failed to sync emails');
    }
}

export async function sendEmailAction(userId: string, to: string, subject: string, body: string, leadId: string): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const accessToken = await getValidAccessToken(userId);
        if (!accessToken) {
            return { success: false, error: 'Gmail not connected' };
        }

        // Create RFC 2822 formatted email
        const email = [
            `To: ${to}`,
            `Subject: ${subject}`,
            'Content-Type: text/plain; charset=utf-8',
            '',
            body
        ].join('\r\n');

        const encodedEmail = Buffer.from(email)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const response = await fetch(
            'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ raw: encodedEmail }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gmail API Error: ${errorText}`);
        }

        const result = await response.json();

        // Log to Firestore using Admin SDK
        const adminDb = getAdminDb();
        const userDoc = await adminDb.collection('users').doc(userId).collection('integrations').doc('gmail').get();
        const userEmail = userDoc.exists ? userDoc.data()?.email : '';

        const record = {
            id: result.id,
            threadId: result.threadId,
            leadId,
            direction: 'sent',
            from: userEmail,
            to,
            subject,
            snippet: body.substring(0, 200),
            body,
            timestamp: Date.now(),
        };

        await adminDb.collection('users').doc(userId).collection('emailMessages').doc(result.id).set(record);

        return { success: true, id: result.id };
    } catch (error: any) {
        console.error('Send Email Error:', error);
        return { success: false, error: error.message };
    }
}
