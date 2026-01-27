import { getFirebaseDb } from './config';
import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    query,
    where,
    getDocs,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import type { Company, CompanySettings, DEFAULT_COMPANY_SETTINGS } from '@/types/company';

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
            const authToken = token || await getAuth().currentUser?.getIdToken();

            if (!authToken) {
                console.warn('No auth token available');
                return null;
            }

            const response = await fetch('/api/company/get', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
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
        const authToken = token || await getAuth().currentUser?.getIdToken();

        if (!authToken) {
            throw new Error('No auth token available');
        }

        const response = await fetch('/api/company/create', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
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
     * Update company settings
     */
    async updateSettings(companyId: string, settings: Partial<CompanySettings>): Promise<void> {
        const db = getFirebaseDb();
        const companyRef = doc(db, 'companies', companyId);

        // Merge settings with existing
        const current = await getDoc(companyRef);
        if (!current.exists()) {
            throw new Error('Company not found');
        }

        const currentSettings = current.data()?.settings || {};

        await updateDoc(companyRef, {
            settings: { ...currentSettings, ...settings },
            updatedAt: Date.now(),
        });
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
     * Update channel mapping
     */
    async updateChannelMapping(
        companyId: string,
        channelMapping: Record<string, string>
    ): Promise<void> {
        const db = getFirebaseDb();
        const companyRef = doc(db, 'companies', companyId);

        await updateDoc(companyRef, {
            'settings.channelMapping': channelMapping,
            updatedAt: Date.now(),
        });
    },

    /**
     * Update email configuration (SendGrid)
     */
    async updateEmailConfig(
        companyId: string,
        emailConfig: { sendgridApiKey?: string; fromEmail?: string; fromName?: string }
    ): Promise<void> {
        const db = getFirebaseDb();
        const companyRef = doc(db, 'companies', companyId);

        // Get current settings to merge
        const current = await getDoc(companyRef);
        if (!current.exists()) {
            throw new Error('Company not found');
        }

        const currentSettings = current.data()?.settings || {};
        const currentEmailConfig = currentSettings.emailConfig || {};

        await updateDoc(companyRef, {
            'settings.emailConfig': { ...currentEmailConfig, ...emailConfig },
            updatedAt: Date.now(),
        });
    },

    /**
     * Clear email configuration (reverts to platform defaults)
     */
    async clearEmailConfig(companyId: string): Promise<void> {
        const db = getFirebaseDb();
        const companyRef = doc(db, 'companies', companyId);

        await updateDoc(companyRef, {
            'settings.emailConfig': {},
            updatedAt: Date.now(),
        });
    },

    /**
     * Update Twilio configuration
     */
    async updateTwilioConfig(
        companyId: string,
        twilioConfig: { accountSid?: string; authToken?: string; phoneNumber?: string }
    ): Promise<void> {
        const db = getFirebaseDb();
        const companyRef = doc(db, 'companies', companyId);

        // Get current settings to merge
        const current = await getDoc(companyRef);
        if (!current.exists()) {
            throw new Error('Company not found');
        }

        const currentSettings = current.data()?.settings || {};
        const currentTwilioConfig = currentSettings.twilioConfig || {};

        await updateDoc(companyRef, {
            'settings.twilioConfig': {
                ...currentTwilioConfig,
                ...twilioConfig,
                connected: !!(
                    twilioConfig.accountSid &&
                    twilioConfig.authToken &&
                    twilioConfig.phoneNumber
                ),
                connectedAt: Date.now(),
            },
            updatedAt: Date.now(),
        });
    },

    /**
     * Clear Twilio configuration (reverts to platform defaults)
     */
    async clearTwilioConfig(companyId: string): Promise<void> {
        const db = getFirebaseDb();
        const companyRef = doc(db, 'companies', companyId);

        await updateDoc(companyRef, {
            'settings.twilioConfig': {},
            updatedAt: Date.now(),
        });
    },
};
