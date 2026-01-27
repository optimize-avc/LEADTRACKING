import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
    // Disable Turbopack for build (use webpack)
    // turbopack: {
    //     root: path.resolve(__dirname),
    // },
    // Enable React strict mode for better development experience
    reactStrictMode: true,

    // Remove X-Powered-By header for security
    poweredByHeader: false,

    // Image optimization domains
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.googleusercontent.com',
            },
            {
                protocol: 'https',
                hostname: '**.firebasestorage.app',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'grainy-gradients.vercel.app',
            },
        ],
        formats: ['image/avif', 'image/webp'],
    },

    // Performance optimizations
    experimental: {
        optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
    },

    // Security headers added here as a second layer of defense
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
