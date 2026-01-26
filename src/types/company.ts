/**
 * Company types for multi-tenant SaaS
 * Mirrors the bot's Company.ts types for cross-app consistency
 */

/**
 * Email configuration for tenant-specific SendGrid integration
 */
export interface EmailConfig {
    sendgridApiKey?: string; // Tenant's own SendGrid API key
    fromEmail?: string; // Tenant's verified sender email
    fromName?: string; // Display name for sender (defaults to company name)
}

/**
 * Twilio configuration for tenant-specific telephony integration
 */
export interface TwilioConfig {
    accountSid?: string; // Tenant's Twilio Account SID
    authToken?: string; // Tenant's Twilio Auth Token
    phoneNumber?: string; // Tenant's Twilio phone number
    connected?: boolean; // Whether Twilio is configured
    connectedAt?: number; // When Twilio was connected
}

export interface Company {
    id: string;
    name: string;
    discordGuildId?: string;
    discordGuildName?: string;
    ownerId: string;
    settings: CompanySettings;
    createdAt: number;
    updatedAt: number;
}

export interface CompanySettings {
    industry: string;
    persona: 'professional' | 'friendly' | 'casual';
    qualificationRules: string[];
    prompts: Record<string, string>;
    channelMapping: ChannelMapping;
    emailConfig?: EmailConfig; // Tenant-specific email configuration
    twilioConfig?: TwilioConfig; // Tenant-specific Twilio configuration
}

export interface ChannelMapping {
    newLeads?: string;
    wins?: string;
    triage?: string;
    digest?: string;
}

export interface DiscordChannel {
    id: string;
    name: string;
    type: number; // 0 = text, 2 = voice, etc.
}

/**
 * Default settings for new companies
 */
export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
    industry: '',
    persona: 'professional',
    qualificationRules: [],
    prompts: {
        research: 'Research this business and identify their digital footprint defects.',
        qualification: 'Analyze if this lead meets our qualification criteria.',
    },
    channelMapping: {},
};
