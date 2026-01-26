import {
    getTwilioClientForTenant,
    getTwilioPhoneNumber,
    getEffectiveTwilioConfig,
} from './twilio-config';
import { getFirebaseDb } from '@/lib/firebase/config';
import { collection, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import type { TwilioConfig } from '@/types/company';

export interface SMSRecord {
    messageSid: string;
    userId: string;
    leadId: string;
    toNumber: string;
    fromNumber: string;
    body: string;
    status: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
    direction: 'outbound' | 'inbound';
    sentAt: string;
}

/**
 * Send an SMS to a lead (tenant-aware)
 */
export async function sendSMS(
    toNumber: string,
    message: string,
    userId: string,
    leadId: string,
    twilioConfig?: TwilioConfig
): Promise<{ messageSid: string; status: string }> {
    const client = getTwilioClientForTenant(twilioConfig);
    const fromNumber = getTwilioPhoneNumber(twilioConfig);

    // Clean phone number
    const formattedNumber = formatPhoneNumber(toNumber);

    try {
        const sms = await client.messages.create({
            to: formattedNumber,
            from: fromNumber,
            body: message,
            statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/sms-webhook?userId=${userId}&leadId=${leadId}`,
        });

        // Log SMS to Firestore
        try {
            await logSMSToFirestore({
                messageSid: sms.sid,
                userId,
                leadId,
                toNumber: formattedNumber,
                fromNumber: fromNumber,
                body: message,
                status: 'queued',
                direction: 'outbound',
                sentAt: new Date().toISOString(),
            });

            // Also log as activity
            await addDoc(collection(getFirebaseDb(), 'users', userId, 'activities'), {
                type: 'sms',
                leadId,
                description: `SMS sent: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
                messageSid: sms.sid,
                createdAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Non-blocking error logging SMS:', error);
        }

        return {
            messageSid: sms.sid,
            status: sms.status,
        };
    } catch (error) {
        console.error('Error sending SMS:', error);
        throw error;
    }
}

/**
 * Check if Twilio is available for a tenant
 */
export function isTwilioAvailable(twilioConfig?: TwilioConfig): boolean {
    const config = getEffectiveTwilioConfig(twilioConfig);
    return config.source !== 'none';
}

/**
 * Get Twilio status for display
 */
export function getTwilioStatus(twilioConfig?: TwilioConfig): {
    connected: boolean;
    phoneNumber: string;
    source: 'tenant' | 'platform' | 'none';
} {
    const config = getEffectiveTwilioConfig(twilioConfig);
    return {
        connected: config.source !== 'none',
        phoneNumber: config.phoneNumber,
        source: config.source,
    };
}

/**
 * Log SMS record to Firestore
 */
export async function logSMSToFirestore(smsRecord: SMSRecord): Promise<void> {
    try {
        // Use setDoc with messageSid as ID for easier lookups/updates
        await setDoc(
            doc(getFirebaseDb(), 'users', smsRecord.userId, 'messages', smsRecord.messageSid),
            {
                ...smsRecord,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            }
        );
    } catch (error) {
        console.error('Error logging SMS to Firestore:', error);
        throw error;
    }
}

/**
 * Update SMS status
 */
export async function updateSMSStatus(
    messageSid: string,
    userId: string,
    status: SMSRecord['status']
): Promise<void> {
    try {
        const msgRef = doc(getFirebaseDb(), 'users', userId, 'messages', messageSid);

        await setDoc(
            msgRef,
            {
                status,
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );
    } catch (error) {
        console.error('Error updating SMS status:', error);
        throw error;
    }
}

/**
 * SMS templates for quick sending
 */
export const SMS_TEMPLATES = {
    followUp: (name: string) =>
        `Hi ${name}, just following up on our conversation. Let me know if you have any questions!`,
    meetingReminder: (name: string, time: string) =>
        `Hi ${name}, just a reminder about our meeting at ${time}. Looking forward to speaking with you!`,
    thankYou: (name: string) =>
        `Thank you ${name} for taking the time to speak with me today. I'll send over the details we discussed shortly.`,
    introduction: (name: string, senderName: string) =>
        `Hi ${name}, this is ${senderName}. I wanted to reach out regarding your inquiry. When's a good time to chat?`,
};

/**
 * Format phone number to E.164 format
 */
function formatPhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '');

    if (digits.length === 11 && digits.startsWith('1')) {
        return `+${digits}`;
    }

    if (digits.length === 10) {
        return `+1${digits}`;
    }

    return phone.startsWith('+') ? phone : `+${digits}`;
}
