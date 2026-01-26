import {
    PLATFORM_TWILIO_CONFIG,
    isPlatformTwilioConfigured,
    isTenantTwilioConfigured,
    getEffectiveTwilioConfig,
    getTwilioClientForTenant,
    getTwilioPhoneNumber,
    SMSMessage,
    SMSResult,
    CallResult,
    TwilioCredentials,
    getTwilioClient,
} from './twilio-config';
import { getAdminDb } from '@/lib/firebase/admin';
import type { TwilioConfig } from '@/types/company';

// ============================================
// HELPER: Get company's Twilio config
// ============================================

/**
 * Get Twilio config for a user's company (server-side)
 */
export async function getTwilioConfigForUser(userId: string): Promise<TwilioConfig | undefined> {
    const db = getAdminDb();

    // Get user's company ID
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return undefined;

    const companyId = userDoc.data()?.companyId;
    if (!companyId) return undefined;

    // Get company's Twilio config
    const companyDoc = await db.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) return undefined;

    return companyDoc.data()?.settings?.twilioConfig;
}

// ============================================
// SMS FUNCTIONS (Tenant-Aware)
// ============================================

/**
 * Send an SMS message via Twilio (tenant-aware)
 */
export async function sendSMS(
    message: SMSMessage,
    twilioConfig?: TwilioConfig
): Promise<SMSResult> {
    try {
        const client = getTwilioClientForTenant(twilioConfig);
        const fromNumber = getTwilioPhoneNumber(twilioConfig);

        const result = await client.messages.create({
            body: message.body,
            from: fromNumber,
            to: message.to,
        });

        return {
            success: true,
            messageSid: result.sid,
        };
    } catch (error: unknown) {
        console.error('Twilio SMS error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send SMS',
        };
    }
}

/**
 * Send SMS and log activity to Firebase (Server-side with Admin SDK, tenant-aware)
 */
export async function sendSMSWithLogging(
    userId: string,
    leadId: string,
    to: string,
    body: string
): Promise<SMSResult> {
    // Get tenant's Twilio config
    const twilioConfig = await getTwilioConfigForUser(userId);

    const result = await sendSMS({ to, body, leadId }, twilioConfig);

    // Log activity regardless of success using Admin SDK
    const db = getAdminDb();
    await db
        .collection('users')
        .doc(userId)
        .collection('activities')
        .add({
            type: 'social', // Using 'social' as SMS type since it's close
            outcome: result.success ? 'connected' : 'no_answer',
            timestamp: Date.now(),
            repId: userId,
            leadId,
            notes: result.success
                ? `SMS sent: ${body.substring(0, 100)}...`
                : `SMS failed: ${result.error}`,
            channel: 'sms',
            messageSid: result.messageSid,
        });

    return result;
}

// ============================================
// CALL FUNCTIONS (Tenant-Aware)
// ============================================

/**
 * Initiate an outbound call via Twilio (tenant-aware)
 */
export async function initiateCall(to: string, twilioConfig?: TwilioConfig): Promise<CallResult> {
    try {
        const client = getTwilioClientForTenant(twilioConfig);
        const fromNumber = getTwilioPhoneNumber(twilioConfig);

        // Basic call - will need TwiML App or URL for full functionality
        const result = await client.calls.create({
            to,
            from: fromNumber,
            // For now, just play a message - in production, you'd use a webhook
            twiml: '<Response><Say>Connecting your call...</Say><Dial>' + to + '</Dial></Response>',
        });

        return {
            success: true,
            callSid: result.sid,
        };
    } catch (error: unknown) {
        console.error('Twilio call error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to initiate call',
        };
    }
}

/**
 * Initiate call and log activity to Firebase (Server-side with Admin SDK, tenant-aware)
 */
export async function initiateCallWithLogging(
    userId: string,
    leadId: string,
    to: string
): Promise<CallResult> {
    // Get tenant's Twilio config
    const twilioConfig = await getTwilioConfigForUser(userId);

    const result = await initiateCall(to, twilioConfig);

    // Log activity using Admin SDK
    const db = getAdminDb();
    await db
        .collection('users')
        .doc(userId)
        .collection('activities')
        .add({
            type: 'call',
            outcome: result.success ? 'connected' : 'no_answer',
            timestamp: Date.now(),
            repId: userId,
            leadId,
            notes: result.success ? `Call initiated to ${to}` : `Call failed: ${result.error}`,
            callSid: result.callSid,
        });

    return result;
}

// ============================================
// CREDENTIAL MANAGEMENT (Tenant-Aware)
// ============================================

/**
 * Save Twilio credentials for a user (legacy - use company settings instead)
 * Uses Admin SDK for server-side operations
 */
export async function saveTwilioCredentials(
    userId: string,
    credentials: Omit<TwilioCredentials, 'connected' | 'connectedAt'>
): Promise<void> {
    const db = getAdminDb();
    await db
        .collection('users')
        .doc(userId)
        .collection('integrations')
        .doc('twilio')
        .set({
            ...credentials,
            connected: true,
            connectedAt: Date.now(),
        });
}

/**
 * Get Twilio connection status for a user (tenant-aware)
 * Checks company config first, then falls back to platform config
 */
export async function getTwilioStatus(userId: string): Promise<TwilioCredentials | null> {
    const db = getAdminDb();

    // First check company's Twilio config
    const twilioConfig = await getTwilioConfigForUser(userId);
    if (isTenantTwilioConfigured(twilioConfig)) {
        return {
            accountSid: twilioConfig!.accountSid!,
            authToken: '***hidden***',
            phoneNumber: twilioConfig!.phoneNumber!,
            connected: true,
            connectedAt: twilioConfig!.connectedAt,
        };
    }

    // Then check user's personal Twilio credentials (legacy)
    const userDoc = await db
        .collection('users')
        .doc(userId)
        .collection('integrations')
        .doc('twilio')
        .get();

    if (userDoc.exists && userDoc.data()?.connected) {
        return userDoc.data() as TwilioCredentials;
    }

    // Fall back to checking platform configuration
    if (isPlatformTwilioConfigured()) {
        return {
            accountSid: PLATFORM_TWILIO_CONFIG.accountSid,
            authToken: '***hidden***',
            phoneNumber: PLATFORM_TWILIO_CONFIG.phoneNumber,
            connected: true,
        };
    }

    return null;
}

/**
 * Check if Twilio is connected for a user
 */
export async function isTwilioConnected(userId: string): Promise<boolean> {
    const status = await getTwilioStatus(userId);
    return status?.connected ?? false;
}

/**
 * Disconnect Twilio for a user (legacy)
 * Uses Admin SDK for server-side operations
 */
export async function disconnectTwilio(userId: string): Promise<void> {
    const db = getAdminDb();
    await db.collection('users').doc(userId).collection('integrations').doc('twilio').set({
        connected: false,
        disconnectedAt: Date.now(),
    });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format phone number to E.164 format
 */
export function formatPhoneE164(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // Add +1 if US number without country code
    if (digits.length === 10) {
        return `+1${digits}`;
    }

    // Already has country code
    if (digits.length === 11 && digits.startsWith('1')) {
        return `+${digits}`;
    }

    // Return with + prefix
    return `+${digits}`;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
}
