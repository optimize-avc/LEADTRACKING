import { NextRequest, NextResponse } from 'next/server';
import { getGmailAuthUrl } from '@/lib/gmail/gmail-auth';

// GET: Redirect user to Google OAuth consent screen
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const authUrl = getGmailAuthUrl(userId);
    return NextResponse.redirect(authUrl);
}
