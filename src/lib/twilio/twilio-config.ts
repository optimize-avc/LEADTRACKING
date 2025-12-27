// Twilio Configuration
// Add these to your .env.local file:
// TWILIO_ACCOUNT_SID=your-account-sid
// TWILIO_AUTH_TOKEN=your-auth-token
// TWILIO_PHONE_NUMBER=+1234567890

export const TWILIO_CONFIG = {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
};

// Check if Twilio is configured
export function isTwilioConfigured(): boolean {
    return !!(
        TWILIO_CONFIG.accountSid &&
        TWILIO_CONFIG.authToken &&
        TWILIO_CONFIG.phoneNumber
    );
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
