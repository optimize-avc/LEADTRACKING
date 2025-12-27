import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Image optimization domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
    ],
  },

  // Sentry will automatically instrument the app
  // No additional configuration needed here
};

// Wrap with Sentry only if DSN is configured
const sentryEnabled = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
    // Sentry webpack plugin options
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,

    // Only upload source maps in CI
    silent: !process.env.CI,

    // Upload source maps for better error reporting
    widenClientFileUpload: true,

    // Hide source maps from client
    hideSourceMaps: true,

    // Disable logger in production
    disableLogger: true,
  })
  : nextConfig;

