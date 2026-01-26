/**
 * Gmail Service - Server-side functions for API routes
 * Uses Firebase Admin SDK for secure server-side operations
 */
import { GmailTokens, refreshAccessToken } from './gmail-auth';
import { getAdminDb } from '@/lib/firebase/admin';

// ============================================
// TOKEN MANAGEMENT (Server-side)
// ============================================

/**
 * Get a valid access token for a user (Server-side with Admin SDK)
 */
export async function getValidAccessTokenServer(userId: string): Promise<string | null> {
    const db = getAdminDb();
    const tokenDoc = await db
        .collection('users')
        .doc(userId)
        .collection('integrations')
        .doc('gmail')
        .get();

    if (!tokenDoc.exists) {
        return null;
    }

    const tokens = tokenDoc.data() as GmailTokens;

    // Check if token is expired (with 5 min buffer)
    if (tokens.expiresAt < Date.now() + 300000) {
        try {
            const refreshed = await refreshAccessToken(tokens.refreshToken);
            await db
                .collection('users')
                .doc(userId)
                .collection('integrations')
                .doc('gmail')
                .update({
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

/**
 * Save Gmail tokens for a user (Server-side with Admin SDK)
 */
export async function saveGmailTokens(userId: string, tokens: GmailTokens): Promise<void> {
    const db = getAdminDb();
    await db.collection('users').doc(userId).collection('integrations').doc('gmail').set(tokens);
}

/**
 * Check if Gmail is connected for a user (Server-side with Admin SDK)
 */
export async function isGmailConnectedServer(userId: string): Promise<boolean> {
    const db = getAdminDb();
    const tokenDoc = await db
        .collection('users')
        .doc(userId)
        .collection('integrations')
        .doc('gmail')
        .get();
    return tokenDoc.exists;
}

/**
 * Get Gmail connection status details (Server-side with Admin SDK)
 */
export async function getGmailStatusServer(
    userId: string
): Promise<{ connected: boolean; email?: string } | null> {
    const db = getAdminDb();
    const tokenDoc = await db
        .collection('users')
        .doc(userId)
        .collection('integrations')
        .doc('gmail')
        .get();

    if (!tokenDoc.exists) {
        return { connected: false };
    }

    const data = tokenDoc.data() as GmailTokens;
    return {
        connected: true,
        email: data.email,
    };
}

/**
 * Disconnect Gmail for a user (Server-side with Admin SDK)
 */
export async function disconnectGmailServer(userId: string): Promise<void> {
    const db = getAdminDb();
    await db.collection('users').doc(userId).collection('integrations').doc('gmail').delete();
}

// ============================================
// EMAIL SENDING (Server-side)
// ============================================

/**
 * Send an email via Gmail API (Server-side with Admin SDK)
 */
export async function sendEmailServer(
    userId: string,
    to: string,
    subject: string,
    body: string,
    leadId: string
): Promise<string> {
    const accessToken = await getValidAccessTokenServer(userId);
    if (!accessToken) {
        throw new Error('Gmail not connected');
    }

    // Get user's email for From header
    const db = getAdminDb();
    const userDoc = await db
        .collection('users')
        .doc(userId)
        .collection('integrations')
        .doc('gmail')
        .get();
    const userEmail = userDoc.exists ? (userDoc.data() as GmailTokens).email || '' : '';

    // Create RFC 2822 formatted email with From header
    const email = [
        `From: ${userEmail}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        'MIME-Version: 1.0',
        '',
        body,
    ].join('\r\n');

    // Base64 encode (URL-safe)
    const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encodedEmail }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to send email: ${error}`);
    }

    const result = await response.json();

    // Log the sent email using Admin SDK
    await db
        .collection('users')
        .doc(userId)
        .collection('emailMessages')
        .doc(result.id)
        .set({
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
