import { describe, it, expect } from 'vitest';
import { formatPhoneE164, isValidPhoneNumber } from '@/lib/twilio/twilio-service';

describe('Twilio Utility Functions', () => {
    describe('formatPhoneE164', () => {
        it('formats 10-digit US phone number correctly', () => {
            expect(formatPhoneE164('5551234567')).toBe('+15551234567');
        });

        it('formats phone number with country code', () => {
            expect(formatPhoneE164('15551234567')).toBe('+15551234567');
        });

        it('handles phone numbers with dashes', () => {
            expect(formatPhoneE164('555-123-4567')).toBe('+15551234567');
        });

        it('handles phone numbers with parentheses', () => {
            expect(formatPhoneE164('(555) 123-4567')).toBe('+15551234567');
        });

        it('handles phone numbers with spaces', () => {
            expect(formatPhoneE164('555 123 4567')).toBe('+15551234567');
        });

        it('handles phone numbers with dots', () => {
            expect(formatPhoneE164('555.123.4567')).toBe('+15551234567');
        });
    });

    describe('isValidPhoneNumber', () => {
        it('validates 10-digit phone number', () => {
            expect(isValidPhoneNumber('5551234567')).toBe(true);
        });

        it('validates 11-digit phone number with country code', () => {
            expect(isValidPhoneNumber('15551234567')).toBe(true);
        });

        it('validates formatted phone number', () => {
            expect(isValidPhoneNumber('(555) 123-4567')).toBe(true);
        });

        it('rejects too short phone number', () => {
            expect(isValidPhoneNumber('5551234')).toBe(false);
        });

        it('rejects too long phone number', () => {
            expect(isValidPhoneNumber('1234567890123456')).toBe(false);
        });

        it('validates international phone number', () => {
            expect(isValidPhoneNumber('+447911123456')).toBe(true);
        });
    });
});
