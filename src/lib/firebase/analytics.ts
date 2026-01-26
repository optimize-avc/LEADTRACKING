/**
 * Analytics Service
 *
 * Tracks key events for admin dashboard display:
 * - signup: New user registration
 * - audit_run: User ran an AI audit
 * - lead_created: New lead added
 * - lead_status_change: Lead moved through pipeline
 * - email_sent: Email sent to lead
 * - activity_logged: User logged an activity
 */

import { getFirebaseDb } from './config';
import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export type AnalyticsEventType =
    | 'signup'
    | 'audit_run'
    | 'lead_created'
    | 'lead_status_change'
    | 'email_sent'
    | 'activity_logged'
    | 'onboarding_complete'
    | 'feature_used';

interface AnalyticsEvent {
    eventType: AnalyticsEventType;
    userId?: string;
    userEmail?: string;
    metadata?: Record<string, string | number | boolean>;
    timestamp: number;
}

export const AnalyticsService = {
    /**
     * Track an analytics event
     */
    async track(
        eventType: AnalyticsEventType,
        options?: {
            userId?: string;
            userEmail?: string;
            metadata?: Record<string, string | number | boolean>;
        }
    ): Promise<string | null> {
        try {
            const analyticsRef = collection(getFirebaseDb(), 'analytics');
            const event: AnalyticsEvent = {
                eventType,
                userId: options?.userId,
                userEmail: options?.userEmail,
                metadata: options?.metadata,
                timestamp: Date.now(),
            };

            const docRef = await addDoc(analyticsRef, event);
            console.log(`[Analytics] Tracked event: ${eventType}`);
            return docRef.id;
        } catch (error) {
            // Don't let analytics failures break the app
            console.error('[Analytics] Failed to track event:', error);
            return null;
        }
    },

    /**
     * Track signup event
     */
    async trackSignup(userId: string, userEmail: string): Promise<void> {
        await this.track('signup', { userId, userEmail });
    },

    /**
     * Track lead creation
     */
    async trackLeadCreated(userId: string, leadId: string): Promise<void> {
        await this.track('lead_created', { userId, metadata: { leadId } });
    },

    /**
     * Track AI audit run
     */
    async trackAuditRun(userId: string, auditType: string): Promise<void> {
        await this.track('audit_run', { userId, metadata: { auditType } });
    },

    /**
     * Track activity logged
     */
    async trackActivityLogged(userId: string, activityType: string): Promise<void> {
        await this.track('activity_logged', { userId, metadata: { activityType } });
    },

    /**
     * Track onboarding completion
     */
    async trackOnboardingComplete(userId: string): Promise<void> {
        await this.track('onboarding_complete', { userId });
    },

    /**
     * Track feature usage
     */
    async trackFeatureUsed(userId: string, featureName: string): Promise<void> {
        await this.track('feature_used', { userId, metadata: { featureName } });
    },

    /**
     * Get event counts for a time period
     */
    async getEventCounts(
        startTime: number,
        endTime: number = Date.now()
    ): Promise<Record<string, number>> {
        try {
            const analyticsRef = collection(getFirebaseDb(), 'analytics');
            const q = query(
                analyticsRef,
                where('timestamp', '>=', startTime),
                where('timestamp', '<=', endTime)
            );
            const snapshot = await getDocs(q);

            const counts: Record<string, number> = {};
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                const eventType = data.eventType as string;
                counts[eventType] = (counts[eventType] || 0) + 1;
            });

            return counts;
        } catch (error) {
            console.error('[Analytics] Failed to get event counts:', error);
            return {};
        }
    },

    /**
     * Get recent events
     */
    async getRecentEvents(eventLimit: number = 50): Promise<AnalyticsEvent[]> {
        try {
            const analyticsRef = collection(getFirebaseDb(), 'analytics');
            const q = query(analyticsRef, orderBy('timestamp', 'desc'), limit(eventLimit));
            const snapshot = await getDocs(q);

            return snapshot.docs.map((doc) => ({
                ...doc.data(),
            })) as AnalyticsEvent[];
        } catch (error) {
            console.error('[Analytics] Failed to get recent events:', error);
            return [];
        }
    },
};
