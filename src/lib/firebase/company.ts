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
import type { Company, CompanySettings, DEFAULT_COMPANY_SETTINGS } from '@/types/company';

/**
 * CompanyService - Manages company/tenant data for multi-tenant SaaS
 */
export const CompanyService = {
    /**
     * Get company by user ID (looks up via user's companyId)
     */
    async getCompanyByUser(userId: string): Promise<Company | null> {
        const db = getFirebaseDb();

        // First get user's companyId
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return null;

        const companyId = userSnap.data()?.companyId;
        if (!companyId) return null;

        // Then get the company
        const companyRef = doc(db, 'companies', companyId);
        const companySnap = await getDoc(companyRef);

        if (!companySnap.exists()) return null;

        return { id: companySnap.id, ...companySnap.data() } as Company;
    },

    /**
     * Get company by ID directly
     */
    async getCompany(companyId: string): Promise<Company | null> {
        const db = getFirebaseDb();
        const companyRef = doc(db, 'companies', companyId);
        const companySnap = await getDoc(companyRef);

        if (!companySnap.exists()) return null;

        return { id: companySnap.id, ...companySnap.data() } as Company;
    },

    /**
     * Create a new company and link it to the user
     */
    async createCompany(
        userId: string,
        data: { name: string; settings?: Partial<CompanySettings> }
    ): Promise<string> {
        const db = getFirebaseDb();
        const now = Date.now();

        // Generate company ID
        const companyRef = doc(collection(db, 'companies'));

        const defaultSettings: CompanySettings = {
            industry: '',
            persona: 'professional',
            qualificationRules: [],
            prompts: {
                research: 'Research this business and identify their digital footprint defects.',
                qualification: 'Analyze if this lead meets our qualification criteria.',
            },
            channelMapping: {},
        };

        const company: Omit<Company, 'id'> = {
            name: data.name,
            ownerId: userId,
            settings: { ...defaultSettings, ...data.settings },
            createdAt: now,
            updatedAt: now,
        };

        await setDoc(companyRef, company);

        // Link user to company
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            companyId: companyRef.id,
            role: 'admin', // Creator is admin
            updatedAt: now,
        });

        return companyRef.id;
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
