import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, getGmailUserEmail } from '@/lib/gmail/gmail-auth';
import { saveGmailTokens } from '@/lib/gmail/gmail-service';

// GET: Handle OAuth callback from Google
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // userId passed as state
    const error = searchParams.get('error');

    if (error) {
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=${encodeURIComponent(error)}`
        );
    }

    if (!code || !state) {
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=missing_params`
        );
    }

    try {
        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(code);

        // Get user's Gmail email
        const email = await getGmailUserEmail(tokens.accessToken);
        tokens.email = email;

        // Save tokens to Firebase
        await saveGmailTokens(state, tokens);

        // Redirect back to settings with success
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/settings?gmail=connected`
        );
    } catch (err) {
        console.error('Gmail OAuth error:', err);
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=oauth_failed`
        );
    }
}
