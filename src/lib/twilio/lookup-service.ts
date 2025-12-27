import 'server-only';
import { getTwilioClient } from './twilio-config';

export interface LookupResult {
    phoneNumber: string;
    valid: boolean;
    countryCode?: string;
    carrier?: {
        name: string;
        type: string; // 'mobile' | 'landline' | 'voip'
    };
    callerName?: string;
    error?: string;
}

export async function lookupPhoneNumber(phoneNumber: string): Promise<LookupResult> {
    const client = getTwilioClient();

    try {
        // Fetch phone number info with Carrier and CallerName add-ons
        // Note: CallerName determines line type (consumer vs business) in some regions, 
        // but mostly we want Carrier type to avoid texting landlines.
        const phoneInfo = await client.lookups.v2.phoneNumbers(phoneNumber)
            .fetch({ fields: 'line_type_intelligence,caller_name' });

        return {
            phoneNumber: phoneInfo.phoneNumber,
            valid: true,
            countryCode: phoneInfo.countryCode,
            carrier: phoneInfo.lineTypeIntelligence ? {
                name: phoneInfo.lineTypeIntelligence.carrierName || 'Unknown',
                type: phoneInfo.lineTypeIntelligence.type || 'unknown'
            } : undefined,
            callerName: phoneInfo.callerName?.callerName || undefined
        };
    } catch (error: unknown) {
        console.error('Twilio Lookup Error:', error);

        const twilioError = error as { status?: number; message?: string };

        // Handle 404 (Not Found) specifically - means number doesn't exist
        if (twilioError.status === 404) {
            return {
                phoneNumber,
                valid: false,
                error: 'Phone number not found'
            };
        }

        throw error;
    }
}
