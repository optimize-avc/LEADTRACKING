import { getTwilioClient, TWILIO_CONFIG } from './twilio-config';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';

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
 * Send an SMS to a lead
 */
export async function sendSMS(
    toNumber: string,
    message: string,
    userId: string,
    leadId: string
): Promise<{ messageSid: string; status: string }> {
    const client = getTwilioClient();

    // Clean phone number
    const formattedNumber = formatPhoneNumber(toNumber);

    try {
        const sms = await client.messages.create({
            to: formattedNumber,
            from: TWILIO_CONFIG.phoneNumber,
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
                fromNumber: TWILIO_CONFIG.phoneNumber,
                body: message,
                status: 'queued',
                direction: 'outbound',
                sentAt: new Date().toISOString(),
            });

            // Also log as activity
            await addDoc(collection(db, 'users', userId, 'activities'), {
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
 * Log SMS record to Firestore
 */
export async function logSMSToFirestore(smsRecord: SMSRecord): Promise<void> {
    try {
        // Use setDoc with messageSid as ID for easier lookups/updates
        await setDoc(doc(db, 'users', smsRecord.userId, 'messages', smsRecord.messageSid), {
            ...smsRecord,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
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
        const msgRef = doc(db, 'users', userId, 'messages', messageSid);

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
