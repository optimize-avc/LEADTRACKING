import { getTwilioClient, TWILIO_CONFIG } from './twilio-config';
import { getFirebaseDb } from '@/lib/firebase/config';
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface CallRecord {
    callSid: string;
    userId: string;
    leadId: string;
    leadPhone: string;
    fromNumber: string;
    status:
        | 'queued'
        | 'ringing'
        | 'in-progress'
        | 'completed'
        | 'busy'
        | 'failed'
        | 'no-answer'
        | 'canceled';
    direction: 'outbound' | 'inbound';
    duration?: number;
    startTime: string;
    endTime?: string;
    recordingUrl?: string;
}

/**
 * Initiate an outbound call to a lead
 */
export async function initiateCall(
    leadPhone: string,
    userId: string,
    leadId: string,
    leadName: string
): Promise<{ callSid: string; status: string }> {
    const client = getTwilioClient();

    // Clean phone number (ensure it has country code)
    const toNumber = formatPhoneNumber(leadPhone);

    try {
        const call = await client.calls.create({
            to: toNumber,
            from: TWILIO_CONFIG.phoneNumber,
            // TwiML for the call - can be customized
            twiml: `<Response><Say>Connecting you to ${leadName}</Say><Dial>${toNumber}</Dial></Response>`,
            // Status callback for tracking call progress
            // statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/webhook`,
            statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/webhook?userId=${userId}&leadId=${leadId}`,
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            statusCallbackMethod: 'POST',
        });

        // Log call initiation to Firestore
        try {
            await logCallToFirestore({
                callSid: call.sid,
                userId,
                leadId,
                leadPhone: toNumber,
                fromNumber: TWILIO_CONFIG.phoneNumber,
                status: 'queued',
                direction: 'outbound',
                startTime: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Non-blocking error logging call:', error);
        }

        return {
            callSid: call.sid,
            status: call.status,
        };
    } catch (error) {
        console.error('Error initiating call:', error);
        throw error;
    }
}

/**
 * Get call status from Twilio
 */
export async function getCallStatus(callSid: string): Promise<{
    status: string;
    duration: number | null;
}> {
    const client = getTwilioClient();

    try {
        const call = await client.calls(callSid).fetch();
        return {
            status: call.status,
            duration: call.duration ? parseInt(call.duration) : null,
        };
    } catch (error) {
        console.error('Error fetching call status:', error);
        throw error;
    }
}

/**
 * Log call record to Firestore
 */
export async function logCallToFirestore(callRecord: CallRecord): Promise<void> {
    try {
        // Save to calls collection
        await setDoc(
            doc(getFirebaseDb(), 'users', callRecord.userId, 'calls', callRecord.callSid),
            {
                ...callRecord,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            }
        );

        // Also log as an activity
        await addDoc(collection(getFirebaseDb(), 'users', callRecord.userId, 'activities'), {
            type: 'call',
            leadId: callRecord.leadId,
            description: `Call ${callRecord.status} - ${callRecord.leadPhone}`,
            duration: callRecord.duration || 0,
            callSid: callRecord.callSid,
            outcome: callRecord.status === 'completed' ? 'connected' : callRecord.status,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error logging call to Firestore:', error);
        throw error;
    }
}

/**
 * Update call record when status changes (from webhook)
 */
export async function updateCallStatus(
    callSid: string,
    userId: string,
    status: CallRecord['status'],
    duration?: number,
    recordingUrl?: string
): Promise<void> {
    try {
        const callRef = doc(getFirebaseDb(), 'users', userId, 'calls', callSid);

        const updateData: Partial<CallRecord> & { updatedAt: ReturnType<typeof serverTimestamp> } =
            {
                status,
                updatedAt: serverTimestamp(),
            };

        if (duration !== undefined) {
            updateData.duration = duration;
        }
        if (recordingUrl) {
            updateData.recordingUrl = recordingUrl;
        }
        if (status === 'completed') {
            updateData.endTime = new Date().toISOString();
        }

        await setDoc(callRef, updateData, { merge: true });
    } catch (error) {
        console.error('Error updating call status:', error);
        throw error;
    }
}

/**
 * Format phone number to E.164 format
 */
function formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    // If starts with 1 and is 11 digits, assume US number
    if (digits.length === 11 && digits.startsWith('1')) {
        return `+${digits}`;
    }

    // If 10 digits, assume US number and add +1
    if (digits.length === 10) {
        return `+1${digits}`;
    }

    // Otherwise, assume it's already in proper format or international
    return phone.startsWith('+') ? phone : `+${digits}`;
}
