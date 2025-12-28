import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const response = NextResponse.next();

    // 1. Content Security Policy (CSP)
    // 2025 SaaS Gold Standard: Restrictive but allows required Firebase/Sentry domains
    const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://*.firebaseapp.com https://*.sentry.io;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://*.googleusercontent.com https://*.firebaseapp.com https://*.firebasestorage.app;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.sentry.io wss://*.firebaseio.com;
    frame-src 'self' https://*.firebaseapp.com;
    upgrade-insecure-requests;
  `
        .replace(/\s{2,}/g, ' ')
        .trim();

    response.headers.set('Content-Security-Policy', cspHeader);

    // 2. Strict Transport Security (HSTS)
    response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
    );

    // 3. X-Content-Type-Options
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // 4. X-Frame-Options (Prevent Clickjacking)
    response.headers.set('X-Frame-Options', 'DENY');

    // 5. Referrer-Policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
