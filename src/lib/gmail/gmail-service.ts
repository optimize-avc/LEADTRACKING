import { GmailMessage, GmailThread, GmailTokens, refreshAccessToken } from './gmail-auth';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

// ============================================
// TOKEN MANAGEMENT
// ============================================

export async function getValidAccessToken(userId: string): Promise<string | null> {
    const tokenDoc = await getDoc(doc(db, 'users', userId, 'integrations', 'gmail'));

    if (!tokenDoc.exists()) {
        return null;
    }

    const tokens = tokenDoc.data() as GmailTokens;

    // Check if token is expired (with 5 min buffer)
    if (tokens.expiresAt < Date.now() + 300000) {
        try {
            const refreshed = await refreshAccessToken(tokens.refreshToken);
            await updateDoc(doc(db, 'users', userId, 'integrations', 'gmail'), {
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

export async function saveGmailTokens(userId: string, tokens: GmailTokens): Promise<void> {
    await setDoc(doc(db, 'users', userId, 'integrations', 'gmail'), tokens);
}

export async function isGmailConnected(userId: string): Promise<boolean> {
    const tokenDoc = await getDoc(doc(db, 'users', userId, 'integrations', 'gmail'));
    return tokenDoc.exists();
}

// ============================================
// EMAIL FETCHING
// ============================================

export async function fetchEmails(
    accessToken: string,
    query: string,
    maxResults: number = 50
): Promise<GmailMessage[]> {
    const params = new URLSearchParams({
        q: query,
        maxResults: maxResults.toString(),
    });

    const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
        throw new Error('Failed to fetch messages');
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

export async function fetchThread(accessToken: string, threadId: string): Promise<GmailThread> {
    const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
        throw new Error('Failed to fetch thread');
    }

    return response.json();
}

// ============================================
// EMAIL PARSING
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
        // Gmail uses URL-safe base64 - convert to standard base64
        const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
        // Add padding if needed
        const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
        // Use atob for browser compatibility (works in both Node 16+ and browsers)
        const decoded = atob(padded);
        // Handle UTF-8 encoding
        return decodeURIComponent(
            decoded.split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
        );
    } catch (error) {
        console.warn('Base64 decoding failed:', error);
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

// ============================================
// SYNC EMAILS FOR LEADS
// ============================================

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
    aiAnalysis?: EmailAnalysis;
}

export interface EmailAnalysis {
    sentiment: 'positive' | 'neutral' | 'negative';
    intent: 'interested' | 'objection' | 'question' | 'scheduling' | 'not_interested' | 'unknown';
    summary: string;
    keyPoints: string[];
    suggestedNextStep: string;
    dealSignals: string[];
}

export async function syncEmailsForLead(
    userId: string,
    leadEmail: string,
    leadId: string
): Promise<EmailRecord[]> {
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
        throw new Error('Gmail not connected');
    }

    // Search for emails to/from this lead
    const query = `from:${leadEmail} OR to:${leadEmail}`;
    const messages = await fetchEmails(accessToken, query, 30);

    const userDoc = await getDoc(doc(db, 'users', userId, 'integrations', 'gmail'));
    const userEmail = userDoc.exists() ? userDoc.data().email : '';

    const emailRecords: EmailRecord[] = [];

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

        // Save to Firebase
        await setDoc(
            doc(db, 'users', userId, 'emailMessages', message.id),
            record
        );
    }

    return emailRecords;
}

// ============================================
// GET EMAILS FOR A LEAD
// ============================================

export async function getLeadEmails(userId: string, leadId: string): Promise<EmailRecord[]> {
    const emailsRef = collection(db, 'users', userId, 'emailMessages');
    const q = query(emailsRef, where('leadId', '==', leadId));
    const snapshot = await getDocs(q);

    const emails = snapshot.docs.map(doc => doc.data() as EmailRecord);
    return emails.sort((a, b) => b.timestamp - a.timestamp);
}

// ============================================
// SEND EMAIL VIA GMAIL API
// ============================================

export async function sendEmail(
    userId: string,
    to: string,
    subject: string,
    body: string,
    leadId: string
): Promise<string> {
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
        throw new Error('Gmail not connected');
    }

    // Get user's email for From header
    const userDoc = await getDoc(doc(db, 'users', userId, 'integrations', 'gmail'));
    const userEmail = userDoc.exists() ? userDoc.data().email : '';

    // Create RFC 2822 formatted email with From header
    const email = [
        `From: ${userEmail}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        'MIME-Version: 1.0',
        '',
        body
    ].join('\r\n');

    // Base64 encode (URL-safe) - using btoa for browser compatibility
    const encodedEmail = btoa(unescape(encodeURIComponent(email)))
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
        const error = await response.text();
        throw new Error(`Failed to send email: ${error}`);
    }

    const result = await response.json();

    // Log the sent email (reuse userEmail from earlier)

    await setDoc(doc(db, 'users', userId, 'emailMessages', result.id), {
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
    });

    return result.id;
}
