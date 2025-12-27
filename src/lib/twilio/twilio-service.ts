import { TWILIO_CONFIG, isTwilioConfigured, SMSMessage, SMSResult, CallResult, TwilioCredentials, getTwilioClient } from './twilio-config';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';

// Twilio Client is now managed via twilio-config.ts helper

// ============================================
// SMS FUNCTIONS
// ============================================

/**
 * Send an SMS message via Twilio
 */
export async function sendSMS(message: SMSMessage): Promise<SMSResult> {
    try {
        const client = await getTwilioClient();

        const result = await client.messages.create({
            body: message.body,
            from: TWILIO_CONFIG.phoneNumber,
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
 * Send SMS and log activity to Firebase
 */
export async function sendSMSWithLogging(
    userId: string,
    leadId: string,
    to: string,
    body: string
): Promise<SMSResult> {
    const result = await sendSMS({ to, body, leadId });

    // Log activity regardless of success
    await addDoc(collection(db, 'users', userId, 'activities'), {
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
// CALL FUNCTIONS
// ============================================

/**
 * Initiate an outbound call via Twilio
 * Note: This creates a call but requires TwiML for call handling
 */
export async function initiateCall(to: string): Promise<CallResult> {
    try {
        const client = await getTwilioClient();

        // Basic call - will need TwiML App or URL for full functionality
        const result = await client.calls.create({
            to,
            from: TWILIO_CONFIG.phoneNumber,
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
 * Initiate call and log activity to Firebase
 */
export async function initiateCallWithLogging(
    userId: string,
    leadId: string,
    to: string
): Promise<CallResult> {
    const result = await initiateCall(to);

    // Log activity
    await addDoc(collection(db, 'users', userId, 'activities'), {
        type: 'call',
        outcome: result.success ? 'connected' : 'no_answer',
        timestamp: Date.now(),
        repId: userId,
        leadId,
        notes: result.success
            ? `Call initiated to ${to}`
            : `Call failed: ${result.error}`,
        callSid: result.callSid,
    });

    return result;
}

// ============================================
// CREDENTIAL MANAGEMENT
// ============================================

/**
 * Save Twilio credentials for a user (for per-user Twilio accounts)
 */
export async function saveTwilioCredentials(
    userId: string,
    credentials: Omit<TwilioCredentials, 'connected' | 'connectedAt'>
): Promise<void> {
    await setDoc(doc(db, 'users', userId, 'integrations', 'twilio'), {
        ...credentials,
        connected: true,
        connectedAt: Date.now(),
    });
}

/**
 * Get Twilio connection status for a user
 */
export async function getTwilioStatus(userId: string): Promise<TwilioCredentials | null> {
    // First check if user has their own Twilio credentials
    const userDoc = await getDoc(doc(db, 'users', userId, 'integrations', 'twilio'));

    if (userDoc.exists()) {
        return userDoc.data() as TwilioCredentials;
    }

    // Fall back to checking environment configuration
    if (isTwilioConfigured()) {
        return {
            accountSid: TWILIO_CONFIG.accountSid,
            authToken: '***hidden***',
            phoneNumber: TWILIO_CONFIG.phoneNumber,
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
 * Disconnect Twilio for a user
 */
export async function disconnectTwilio(userId: string): Promise<void> {
    await setDoc(doc(db, 'users', userId, 'integrations', 'twilio'), {
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
