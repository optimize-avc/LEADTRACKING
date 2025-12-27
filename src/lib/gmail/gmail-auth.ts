// Gmail OAuth Configuration
// Add these to your .env.local file:
// GOOGLE_CLIENT_ID=your-client-id
// GOOGLE_CLIENT_SECRET=your-client-secret
// NEXT_PUBLIC_APP_URL=http://localhost:3000

export const GMAIL_CONFIG = {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/gmail/callback`,
    scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email',
    ],
};

// Generate OAuth URL for user to authenticate
export function getGmailAuthUrl(state?: string): string {
    const params = new URLSearchParams({
        client_id: GMAIL_CONFIG.clientId,
        redirect_uri: GMAIL_CONFIG.redirectUri,
        response_type: 'code',
        scope: GMAIL_CONFIG.scopes.join(' '),
        access_type: 'offline',
        prompt: 'consent',
        ...(state && { state }),
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string): Promise<GmailTokens> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: GMAIL_CONFIG.clientId,
            client_secret: GMAIL_CONFIG.clientSecret,
            redirect_uri: GMAIL_CONFIG.redirectUri,
            grant_type: 'authorization_code',
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to exchange code: ${error}`);
    }

    const data = await response.json();
    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in * 1000),
        email: '', // Will be populated after fetching user info
    };
}

// Refresh access token
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: number }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: GMAIL_CONFIG.clientId,
            client_secret: GMAIL_CONFIG.clientSecret,
            grant_type: 'refresh_token',
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    return {
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000),
    };
}

// Get user's email from Gmail API
export async function getGmailUserEmail(accessToken: string): Promise<string> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        throw new Error('Failed to get user info');
    }

    const data = await response.json();
    return data.email;
}

// Types
export interface GmailTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    email: string;
}

export interface GmailMessage {
    id: string;
    threadId: string;
    snippet: string;
    payload: {
        headers: { name: string; value: string }[];
        body?: { data?: string };
        parts?: { mimeType: string; body: { data?: string } }[];
    };
    internalDate: string;
    labelIds: string[];
}

export interface GmailThread {
    id: string;
    messages: GmailMessage[];
}
