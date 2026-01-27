import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ClientLayout } from '@/components/layout/ClientLayout';

export const metadata: Metadata = {
    title: {
        default: 'SalesTracker AI | Enterprise Sales Enablement',
        template: '%s | SalesTracker AI',
    },
    description:
        'AI-powered sales tracking, training, and real-time deal wargaming for high-performance teams.',
    keywords: ['sales tracking', 'AI sales coach', 'CRM', 'SaaS', 'Sales Training'],
    authors: [{ name: 'SalesTracker Team' }],
    creator: 'SalesTracker AI',
    publisher: 'SalesTracker AI',
    metadataBase: new URL('https://prod-lead-tracker--antigrav-tracking-final.us-central1.hosted.app'),
    manifest: '/manifest.json',
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'SalesTracker',
    },
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: 'https://prod-lead-tracker--antigrav-tracking-final.us-central1.hosted.app',
        siteName: 'SalesTracker AI',
        title: 'SalesTracker AI | Next-Gen Sales Enablement',
        description: 'Master your sales cycle with AI simulations and real-time deal analysis.',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: 'SalesTracker AI Platform',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'SalesTracker AI | Next-Gen Sales Enablement',
        description: 'Master your sales cycle with AI simulations and real-time deal analysis.',
        images: ['/og-image.png'],
    },
    icons: {
        icon: [
            { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
        apple: [
            { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
    },
};

export const viewport: Viewport = {
    themeColor: '#0b1121',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover', // For notched devices
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <body className="antialiased min-h-screen">
                <ClientLayout>{children}</ClientLayout>
            </body>
        </html>
    );
}
