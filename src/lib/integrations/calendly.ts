/**
 * Calendly Integration Service
 *
 * Integrates with Calendly for meeting scheduling.
 * Provides booking links and webhook handling.
 *
 * Best practice 2026: Seamless calendar integration
 */

import { getFirebaseDb } from '@/lib/firebase/config';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

// Environment variables (to be set in .env.local)
// CALENDLY_API_KEY - Personal Access Token from Calendly
// CALENDLY_WEBHOOK_SIGNING_KEY - For webhook verification

export interface CalendlyConfig {
    accessToken: string;
    userUri?: string;
    schedulingUrl?: string;
    webhookUri?: string;
    createdAt: number;
    updatedAt: number;
}

export interface CalendlyEvent {
    id: string;
    uri: string;
    name: string;
    startTime: string;
    endTime: string;
    status: 'active' | 'canceled';
    location?: {
        type: string;
        location?: string;
        joinUrl?: string;
    };
    invitees: {
        email: string;
        name: string;
    }[];
    createdAt: string;
    canceledAt?: string;
}

export interface CalendlyEventType {
    uri: string;
    name: string;
    slug: string;
    duration: number;
    schedulingUrl: string;
    color: string;
    active: boolean;
}

const CALENDLY_API_BASE = 'https://api.calendly.com';

/**
 * Calendly API client
 */
export class CalendlyService {
    private accessToken: string;
    private userUri?: string;

    constructor(accessToken: string, userUri?: string) {
        this.accessToken = accessToken;
        this.userUri = userUri;
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const response = await fetch(`${CALENDLY_API_BASE}${endpoint}`, {
            ...options,
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Calendly API error: ${response.status} - ${error}`);
        }

        return response.json();
    }

    /**
     * Get current user info
     */
    async getCurrentUser(): Promise<{
        uri: string;
        name: string;
        email: string;
        schedulingUrl: string;
    }> {
        const response = await this.request<{
            resource: {
                uri: string;
                name: string;
                email: string;
                scheduling_url: string;
            };
        }>('/users/me');

        return {
            uri: response.resource.uri,
            name: response.resource.name,
            email: response.resource.email,
            schedulingUrl: response.resource.scheduling_url,
        };
    }

    /**
     * Get available event types
     */
    async getEventTypes(): Promise<CalendlyEventType[]> {
        if (!this.userUri) {
            const user = await this.getCurrentUser();
            this.userUri = user.uri;
        }

        const response = await this.request<{
            collection: Array<{
                uri: string;
                name: string;
                slug: string;
                duration: number;
                scheduling_url: string;
                color: string;
                active: boolean;
            }>;
        }>(`/event_types?user=${encodeURIComponent(this.userUri)}`);

        return response.collection.map((et) => ({
            uri: et.uri,
            name: et.name,
            slug: et.slug,
            duration: et.duration,
            schedulingUrl: et.scheduling_url,
            color: et.color,
            active: et.active,
        }));
    }

    /**
     * Get scheduled events
     */
    async getScheduledEvents(minStartTime?: Date, maxStartTime?: Date): Promise<CalendlyEvent[]> {
        if (!this.userUri) {
            const user = await this.getCurrentUser();
            this.userUri = user.uri;
        }

        let endpoint = `/scheduled_events?user=${encodeURIComponent(this.userUri)}`;

        if (minStartTime) {
            endpoint += `&min_start_time=${minStartTime.toISOString()}`;
        }
        if (maxStartTime) {
            endpoint += `&max_start_time=${maxStartTime.toISOString()}`;
        }

        const response = await this.request<{
            collection: Array<{
                uri: string;
                name: string;
                start_time: string;
                end_time: string;
                status: 'active' | 'canceled';
                location?: {
                    type: string;
                    location?: string;
                    join_url?: string;
                };
                created_at: string;
                canceled_at?: string;
            }>;
        }>(endpoint);

        return response.collection.map((event) => ({
            id: event.uri.split('/').pop() || '',
            uri: event.uri,
            name: event.name,
            startTime: event.start_time,
            endTime: event.end_time,
            status: event.status,
            location: event.location
                ? {
                      type: event.location.type,
                      location: event.location.location,
                      joinUrl: event.location.join_url,
                  }
                : undefined,
            invitees: [], // Will be populated separately if needed
            createdAt: event.created_at,
            canceledAt: event.canceled_at,
        }));
    }

    /**
     * Get invitees for an event
     */
    async getEventInvitees(eventUri: string): Promise<{ email: string; name: string }[]> {
        const response = await this.request<{
            collection: Array<{
                email: string;
                name: string;
            }>;
        }>(`/scheduled_events/${eventUri.split('/').pop()}/invitees`);

        return response.collection.map((inv) => ({
            email: inv.email,
            name: inv.name,
        }));
    }

    /**
     * Create a scheduling link for a specific lead
     */
    async createSchedulingLink(
        eventTypeUri: string,
        leadEmail: string,
        leadName: string
    ): Promise<string> {
        const response = await this.request<{
            resource: {
                booking_url: string;
            };
        }>('/scheduling_links', {
            method: 'POST',
            body: JSON.stringify({
                max_event_count: 1,
                owner: eventTypeUri,
                owner_type: 'EventType',
            }),
        });

        // Add prefill parameters
        const url = new URL(response.resource.booking_url);
        url.searchParams.set('email', leadEmail);
        url.searchParams.set('name', leadName);

        return url.toString();
    }
}

// ============================================
// Firestore Integration Config Storage
// ============================================

const COLLECTION_NAME = 'integrations';

/**
 * Save Calendly config for a company
 */
export async function saveCalendlyConfig(
    companyId: string,
    config: Omit<CalendlyConfig, 'createdAt' | 'updatedAt'>
): Promise<void> {
    const docRef = doc(getFirebaseDb(), COLLECTION_NAME, `${companyId}_calendly`);
    const now = new Date().getTime();

    await setDoc(
        docRef,
        {
            ...config,
            companyId,
            type: 'calendly',
            createdAt: now,
            updatedAt: now,
        },
        { merge: true }
    );
}

/**
 * Get Calendly config for a company
 */
export async function getCalendlyConfig(companyId: string): Promise<CalendlyConfig | null> {
    const docRef = doc(getFirebaseDb(), COLLECTION_NAME, `${companyId}_calendly`);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;
    return snapshot.data() as CalendlyConfig;
}

/**
 * Delete Calendly config for a company
 */
export async function deleteCalendlyConfig(companyId: string): Promise<void> {
    const docRef = doc(getFirebaseDb(), COLLECTION_NAME, `${companyId}_calendly`);
    await setDoc(docRef, { deleted: true, deletedAt: new Date().getTime() }, { merge: true });
}

/**
 * Create a CalendlyService instance for a company
 */
export async function getCalendlyServiceForCompany(
    companyId: string
): Promise<CalendlyService | null> {
    const config = await getCalendlyConfig(companyId);
    if (!config?.accessToken) return null;

    return new CalendlyService(config.accessToken, config.userUri);
}
