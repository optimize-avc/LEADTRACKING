import { getFirebaseDb } from './config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import type { Company, CompanySettings } from '@/types/company';

/**
 * CompanyService - Manages company/tenant data for multi-tenant SaaS
 *
 * Uses server-side API routes for operations that require admin privileges
 * to bypass Firestore security rules properly.
 */
export const CompanyService = {
    /**
     * Get company by user ID - Uses server-side API for bootstrapping
     * This bypasses the chicken-egg Firestore rules problem
     */
    async getCompanyByUser(userId: string, token?: string): Promise<Company | null> {
        try {
            // Get token if not provided
            const authToken = token || (await getAuth().currentUser?.getIdToken());

            if (!authToken) {
                console.warn('No auth token available');
                return null;
            }

            const response = await fetch('/api/company/get', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                console.error('Failed to get company:', response.statusText);
                return null;
            }

            const data = await response.json();
            return data.company || null;
        } catch (error) {
            console.error('Error getting company by user:', error);
            return null;
        }
    },

    /**
     * Get company by ID directly (uses client-side Firestore)
     * Only works when user already belongs to the company
     */
    async getCompany(companyId: string): Promise<Company | null> {
        const db = getFirebaseDb();
        const companyRef = doc(db, 'companies', companyId);
        const companySnap = await getDoc(companyRef);

        if (!companySnap.exists()) return null;

        return { id: companySnap.id, ...companySnap.data() } as Company;
    },

    /**
     * Create a new company and link it to the user - Uses server-side API
     * This bypasses Firestore security rules that block client-side company creation
     */
    async createCompany(
        userId: string,
        data: { name: string; settings?: Partial<CompanySettings> },
        token?: string
    ): Promise<string> {
        // Get token if not provided
        const authToken = token || (await getAuth().currentUser?.getIdToken());

        if (!authToken) {
            throw new Error('No auth token available');
        }

        const response = await fetch('/api/company/create', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: data.name,
                settings: data.settings,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create company');
        }

        const result = await response.json();
        return result.companyId;
    },

    /**
     * Update company settings - Uses server-side API to bypass Firestore rules
     */
    async updateSettings(companyId: string, settings: Partial<CompanySettings>): Promise<void> {
        const authToken = await getAuth().currentUser?.getIdToken();

        if (!authToken) {
            throw new Error('No auth token available');
        }

        const response = await fetch('/api/company/settings', {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                companyId,
                settings,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update settings');
        }
    },

    /**
     * Link Discord guild to company
     */
    async linkDiscord(companyId: string, guildId: string, guildName: string): Promise<void> {
        const db = getFirebaseDb();
        const companyRef = doc(db, 'companies', companyId);

        await updateDoc(companyRef, {
            discordGuildId: guildId,
            discordGuildName: guildName,
            updatedAt: Date.now(),
        });
    },

    /**
     * Unlink Discord from company
     */
    async unlinkDiscord(companyId: string): Promise<void> {
        const db = getFirebaseDb();
        const companyRef = doc(db, 'companies', companyId);

        await updateDoc(companyRef, {
            discordGuildId: null,
            discordGuildName: null,
            'settings.channelMapping': {},
            updatedAt: Date.now(),
        });
    },

    /**
     * Update channel mapping - Uses server-side API to bypass Firestore rules
     */
    async updateChannelMapping(
        companyId: string,
        channelMapping: Record<string, string>
    ): Promise<void> {
        const authToken = await getAuth().currentUser?.getIdToken();

        if (!authToken) {
            throw new Error('No auth token available');
        }

        const response = await fetch('/api/company/settings', {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                companyId,
                settings: { channelMapping },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update channel mapping');
        }
    },

    /**
     * Update email configuration (SendGrid) - Uses server-side API
     */
    async updateEmailConfig(
        companyId: string,
        emailConfig: { sendgridApiKey?: string; fromEmail?: string; fromName?: string }
    ): Promise<void> {
        const authToken = await getAuth().currentUser?.getIdToken();

        if (!authToken) {
            throw new Error('No auth token available');
        }

        const response = await fetch('/api/company/settings', {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                companyId,
                settings: { emailConfig },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update email config');
        }
    },

    /**
     * Clear email configuration (reverts to platform defaults)
     */
    async clearEmailConfig(companyId: string): Promise<void> {
        const authToken = await getAuth().currentUser?.getIdToken();

        if (!authToken) {
            throw new Error('No auth token available');
        }

        const response = await fetch('/api/company/settings', {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                companyId,
                settings: { emailConfig: {} },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to clear email config');
        }
    },

    /**
     * Update Twilio configuration - Uses server-side API
     */
    async updateTwilioConfig(
        companyId: string,
        twilioConfig: { accountSid?: string; authToken?: string; phoneNumber?: string }
    ): Promise<void> {
        const authToken = await getAuth().currentUser?.getIdToken();

        if (!authToken) {
            throw new Error('No auth token available');
        }

        // Add connection metadata
        const configWithMeta = {
            ...twilioConfig,
            connected: !!(
                twilioConfig.accountSid &&
                twilioConfig.authToken &&
                twilioConfig.phoneNumber
            ),
            connectedAt: Date.now(),
        };

        const response = await fetch('/api/company/settings', {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                companyId,
                settings: { twilioConfig: configWithMeta },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update Twilio config');
        }
    },

    /**
     * Clear Twilio configuration (reverts to platform defaults)
     */
    async clearTwilioConfig(companyId: string): Promise<void> {
        const authToken = await getAuth().currentUser?.getIdToken();

        if (!authToken) {
            throw new Error('No auth token available');
        }

        const response = await fetch('/api/company/settings', {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                companyId,
                settings: { twilioConfig: {} },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to clear Twilio config');
        }
    },
};
