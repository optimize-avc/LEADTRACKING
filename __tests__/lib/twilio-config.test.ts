import { describe, it, expect, vi } from 'vitest';
import { isTwilioConfigured, TWILIO_CONFIG } from '@/lib/twilio/twilio-config';

// Mock environment variables
vi.stubEnv('TWILIO_ACCOUNT_SID', '');
vi.stubEnv('TWILIO_AUTH_TOKEN', '');
vi.stubEnv('TWILIO_PHONE_NUMBER', '');

describe('Twilio Configuration', () => {
    describe('isTwilioConfigured', () => {
        it('returns false when no environment variables are set', () => {
            expect(isTwilioConfigured()).toBe(false);
        });
    });

    describe('TWILIO_CONFIG', () => {
        it('has expected structure', () => {
            expect(TWILIO_CONFIG).toHaveProperty('accountSid');
            expect(TWILIO_CONFIG).toHaveProperty('authToken');
            expect(TWILIO_CONFIG).toHaveProperty('phoneNumber');
        });
    });
});
