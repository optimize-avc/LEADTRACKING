/**
 * Lightweight Analytics Service for tracking user events.
 * This can be easily connected to PostHog, Amplitude, or Google Analytics.
 */

type AnalyticsEvent = {
    name: string;
    properties?: Record<string, unknown>;
    userId?: string;
};

class AnalyticsService {
    private isEnabled: boolean = typeof window !== 'undefined';

    public track(name: string, properties?: Record<string, unknown>) {
        if (!this.isEnabled) return;

        // In a real app, this would send to PostHog/Amplitude
        console.log(`[Analytics] Event: ${name}`, properties);

        // You can integrate a real provider here:
        // posthog.capture(name, properties);
    }

    public identify(userId: string, properties?: Record<string, unknown>) {
        if (!this.isEnabled) return;
        console.log(`[Analytics] Identify User: ${userId}`, properties);
        // posthog.identify(userId, properties);
    }

    public pageView(url: string) {
        if (!this.isEnabled) return;
        console.log(`[Analytics] Page View: ${url}`);
        // posthog.capture('$pageview', { $current_url: url });
    }
}

export const analytics = new AnalyticsService();
