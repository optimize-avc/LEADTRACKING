import twilio from 'twilio';
import type { TwilioConfig } from '@/types/company';

// Platform-level Twilio Configuration (fallback)
// Add these to your .env.local file:
// TWILIO_ACCOUNT_SID=your-account-sid
// TWILIO_AUTH_TOKEN=your-auth-token
// TWILIO_PHONE_NUMBER=+1234567890

export const PLATFORM_TWILIO_CONFIG = {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
};

// Check if platform-level Twilio is configured
export function isPlatformTwilioConfigured(): boolean {
    return !!(
        PLATFORM_TWILIO_CONFIG.accountSid &&
        PLATFORM_TWILIO_CONFIG.authToken &&
        PLATFORM_TWILIO_CONFIG.phoneNumber
    );
}

// Check if tenant-level Twilio is configured
export function isTenantTwilioConfigured(twilioConfig?: TwilioConfig): boolean {
    return !!(twilioConfig?.accountSid && twilioConfig?.authToken && twilioConfig?.phoneNumber);
}

// Legacy function for backward compatibility
export function isTwilioConfigured(): boolean {
    return isPlatformTwilioConfigured();
}

// Get effective Twilio credentials (tenant > platform)
export function getEffectiveTwilioConfig(twilioConfig?: TwilioConfig): {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
    source: 'tenant' | 'platform' | 'none';
} {
    // Prefer tenant config if available
    if (isTenantTwilioConfigured(twilioConfig)) {
        return {
            accountSid: twilioConfig!.accountSid!,
            authToken: twilioConfig!.authToken!,
            phoneNumber: twilioConfig!.phoneNumber!,
            source: 'tenant',
        };
    }

    // Fall back to platform config
    if (isPlatformTwilioConfigured()) {
        return {
            accountSid: PLATFORM_TWILIO_CONFIG.accountSid,
            authToken: PLATFORM_TWILIO_CONFIG.authToken,
            phoneNumber: PLATFORM_TWILIO_CONFIG.phoneNumber,
            source: 'platform',
        };
    }

    return {
        accountSid: '',
        authToken: '',
        phoneNumber: '',
        source: 'none',
    };
}

// Get Twilio client with tenant-aware credentials
export function getTwilioClientForTenant(twilioConfig?: TwilioConfig) {
    const config = getEffectiveTwilioConfig(twilioConfig);

    if (config.source === 'none') {
        throw new Error('Twilio not configured. Please configure Twilio in Settings.');
    }

    return twilio(config.accountSid, config.authToken);
}

// Legacy function - uses platform credentials only
export function getTwilioClient() {
    if (!isPlatformTwilioConfigured()) {
        console.warn('Twilio client requested but not configured!');
    }
    return twilio(PLATFORM_TWILIO_CONFIG.accountSid, PLATFORM_TWILIO_CONFIG.authToken);
}

// Get phone number for tenant
export function getTwilioPhoneNumber(twilioConfig?: TwilioConfig): string {
    const config = getEffectiveTwilioConfig(twilioConfig);
    return config.phoneNumber;
}

// Types
export interface SMSMessage {
    to: string;
    body: string;
    leadId?: string;
}

export interface SMSResult {
    success: boolean;
    messageSid?: string;
    error?: string;
}

export interface CallResult {
    success: boolean;
    callSid?: string;
    error?: string;
}

export interface TwilioCredentials {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
    connected: boolean;
    connectedAt?: number;
}
