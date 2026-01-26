import { describe, it, expect, vi } from 'vitest';
import {
    isPlatformTwilioConfigured,
    isTenantTwilioConfigured,
    PLATFORM_TWILIO_CONFIG,
    getEffectiveTwilioConfig,
} from '@/lib/twilio/twilio-config';

// Mock environment variables
vi.stubEnv('TWILIO_ACCOUNT_SID', '');
vi.stubEnv('TWILIO_AUTH_TOKEN', '');
vi.stubEnv('TWILIO_PHONE_NUMBER', '');

describe('Twilio Configuration', () => {
    describe('isPlatformTwilioConfigured', () => {
        it('returns false when no environment variables are set', () => {
            expect(isPlatformTwilioConfigured()).toBe(false);
        });
    });

    describe('PLATFORM_TWILIO_CONFIG', () => {
        it('has expected structure', () => {
            expect(PLATFORM_TWILIO_CONFIG).toHaveProperty('accountSid');
            expect(PLATFORM_TWILIO_CONFIG).toHaveProperty('authToken');
            expect(PLATFORM_TWILIO_CONFIG).toHaveProperty('phoneNumber');
        });
    });

    describe('isTenantTwilioConfigured', () => {
        it('returns false when no config provided', () => {
            expect(isTenantTwilioConfigured(undefined)).toBe(false);
        });

        it('returns false when config is incomplete', () => {
            expect(isTenantTwilioConfigured({ accountSid: 'test' })).toBe(false);
        });

        it('returns true when config is complete', () => {
            expect(
                isTenantTwilioConfigured({
                    accountSid: 'AC123',
                    authToken: 'token',
                    phoneNumber: '+1234567890',
                })
            ).toBe(true);
        });
    });

    describe('getEffectiveTwilioConfig', () => {
        it('returns none source when no config available', () => {
            const result = getEffectiveTwilioConfig(undefined);
            expect(result.source).toBe('none');
        });

        it('prefers tenant config over platform', () => {
            const tenantConfig = {
                accountSid: 'ACTenant',
                authToken: 'tenantToken',
                phoneNumber: '+1111111111',
            };
            const result = getEffectiveTwilioConfig(tenantConfig);
            expect(result.source).toBe('tenant');
            expect(result.accountSid).toBe('ACTenant');
        });
    });
});
