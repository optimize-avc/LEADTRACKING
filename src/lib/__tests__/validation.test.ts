/**
 * Validation Schema Tests
 *
 * Tests for Zod validation schemas used across the application.
 */

import { describe, it, expect } from 'vitest';
import {
    emailSchema,
    companyIdSchema,
    userIdSchema,
    leadStatusSchema,
    createLeadSchema,
    updateLeadSchema,
    teamRoleSchema,
    inviteTeamMemberSchema,
    acceptInviteSchema,
    createCompanySchema,
    sendEmailSchema,
    activityTypeSchema,
    createActivitySchema,
    updateSettingsSchema,
    updateEmailConfigSchema,
} from '../validation';

describe('Validation Schemas', () => {
    describe('emailSchema', () => {
        it('accepts valid email addresses', () => {
            expect(emailSchema.parse('test@example.com')).toBe('test@example.com');
            expect(emailSchema.parse('user.name@domain.co.uk')).toBe('user.name@domain.co.uk');
        });

        it('converts email to lowercase', () => {
            expect(emailSchema.parse('TEST@EXAMPLE.COM')).toBe('test@example.com');
        });

        it('rejects invalid email addresses', () => {
            expect(() => emailSchema.parse('invalid')).toThrow();
            expect(() => emailSchema.parse('test@')).toThrow();
            expect(() => emailSchema.parse('@domain.com')).toThrow();
        });
    });

    describe('companyIdSchema', () => {
        it('accepts non-empty strings', () => {
            expect(companyIdSchema.parse('company-123')).toBe('company-123');
        });

        it('rejects empty strings', () => {
            expect(() => companyIdSchema.parse('')).toThrow();
        });
    });

    describe('userIdSchema', () => {
        it('accepts non-empty strings', () => {
            expect(userIdSchema.parse('user-456')).toBe('user-456');
        });

        it('rejects empty strings', () => {
            expect(() => userIdSchema.parse('')).toThrow();
        });
    });

    describe('leadStatusSchema', () => {
        it('accepts valid statuses', () => {
            const validStatuses = [
                'New',
                'Contacted',
                'Qualified',
                'Proposal',
                'Negotiation',
                'Closed',
                'Lost',
            ];
            validStatuses.forEach((status) => {
                expect(leadStatusSchema.parse(status)).toBe(status);
            });
        });

        it('rejects invalid statuses', () => {
            expect(() => leadStatusSchema.parse('Invalid')).toThrow();
            expect(() => leadStatusSchema.parse('new')).toThrow(); // case sensitive
        });
    });

    describe('createLeadSchema', () => {
        it('accepts valid lead data', () => {
            const validLead = {
                businessName: 'Acme Corp',
                contactName: 'John Doe',
                email: 'john@acme.com',
                phone: '555-1234',
                status: 'New' as const,
            };
            const result = createLeadSchema.parse(validLead);
            expect(result.businessName).toBe('Acme Corp');
            expect(result.status).toBe('New');
        });

        it('requires businessName', () => {
            expect(() =>
                createLeadSchema.parse({
                    contactName: 'John Doe',
                })
            ).toThrow();
        });

        it('applies default status', () => {
            const result = createLeadSchema.parse({
                businessName: 'Test Corp',
            });
            expect(result.status).toBe('New');
        });

        it('validates phone format', () => {
            expect(() =>
                createLeadSchema.parse({
                    businessName: 'Test',
                    phone: 'invalid-phone!@#',
                })
            ).toThrow();
        });

        it('validates website URL', () => {
            const withUrl = createLeadSchema.parse({
                businessName: 'Test',
                website: 'https://example.com',
            });
            expect(withUrl.website).toBe('https://example.com');

            // Empty string is allowed
            const withEmpty = createLeadSchema.parse({
                businessName: 'Test',
                website: '',
            });
            expect(withEmpty.website).toBe('');
        });

        it('validates dealValue is non-negative', () => {
            expect(() =>
                createLeadSchema.parse({
                    businessName: 'Test',
                    dealValue: -100,
                })
            ).toThrow();
        });

        it('validates notes length', () => {
            expect(() =>
                createLeadSchema.parse({
                    businessName: 'Test',
                    notes: 'a'.repeat(5001),
                })
            ).toThrow();
        });
    });

    describe('updateLeadSchema', () => {
        it('requires id', () => {
            expect(() =>
                updateLeadSchema.parse({
                    businessName: 'Updated Name',
                })
            ).toThrow();
        });

        it('accepts partial updates with id', () => {
            const result = updateLeadSchema.parse({
                id: 'lead-123',
                status: 'Contacted',
            });
            expect(result.id).toBe('lead-123');
            expect(result.status).toBe('Contacted');
        });
    });

    describe('teamRoleSchema', () => {
        it('accepts valid roles', () => {
            expect(teamRoleSchema.parse('admin')).toBe('admin');
            expect(teamRoleSchema.parse('manager')).toBe('manager');
            expect(teamRoleSchema.parse('rep')).toBe('rep');
        });

        it('rejects invalid roles', () => {
            expect(() => teamRoleSchema.parse('superadmin')).toThrow();
        });
    });

    describe('inviteTeamMemberSchema', () => {
        it('accepts valid invite data', () => {
            const validInvite = {
                companyId: 'company-1',
                companyName: 'Test Company',
                email: 'new@example.com',
                role: 'rep' as const,
                invitedBy: 'user-1',
            };
            const result = inviteTeamMemberSchema.parse(validInvite);
            expect(result.email).toBe('new@example.com');
            expect(result.role).toBe('rep');
        });

        it('requires all mandatory fields', () => {
            expect(() =>
                inviteTeamMemberSchema.parse({
                    companyId: 'company-1',
                    email: 'test@example.com',
                    // missing companyName, role, invitedBy
                })
            ).toThrow();
        });
    });

    describe('acceptInviteSchema', () => {
        it('accepts valid accept data', () => {
            const result = acceptInviteSchema.parse({
                companyId: 'company-1',
                inviteId: 'invite-123',
            });
            expect(result.companyId).toBe('company-1');
            expect(result.inviteId).toBe('invite-123');
        });

        it('rejects empty inviteId', () => {
            expect(() =>
                acceptInviteSchema.parse({
                    companyId: 'company-1',
                    inviteId: '',
                })
            ).toThrow();
        });
    });

    describe('createCompanySchema', () => {
        it('accepts valid company data', () => {
            const result = createCompanySchema.parse({
                name: 'New Company',
                settings: {
                    industry: 'Technology',
                    persona: 'professional',
                },
            });
            expect(result.name).toBe('New Company');
            expect(result.settings?.industry).toBe('Technology');
        });

        it('requires name', () => {
            expect(() => createCompanySchema.parse({})).toThrow();
            expect(() => createCompanySchema.parse({ name: '' })).toThrow();
        });

        it('validates persona values', () => {
            expect(() =>
                createCompanySchema.parse({
                    name: 'Test',
                    settings: { persona: 'invalid' },
                })
            ).toThrow();
        });
    });

    describe('sendEmailSchema', () => {
        it('accepts valid email send request', () => {
            const result = sendEmailSchema.parse({
                to: 'recipient@example.com',
                subject: 'Hello',
                body: 'Message content',
            });
            expect(result.to).toBe('recipient@example.com');
        });

        it('requires to, subject, and body', () => {
            expect(() =>
                sendEmailSchema.parse({
                    to: 'test@example.com',
                    // missing subject and body
                })
            ).toThrow();
        });

        it('validates subject length', () => {
            expect(() =>
                sendEmailSchema.parse({
                    to: 'test@example.com',
                    subject: 'a'.repeat(201),
                    body: 'content',
                })
            ).toThrow();
        });
    });

    describe('activityTypeSchema', () => {
        it('accepts valid activity types', () => {
            const types = ['email', 'call', 'meeting', 'note', 'task', 'sms'];
            types.forEach((type) => {
                expect(activityTypeSchema.parse(type)).toBe(type);
            });
        });
    });

    describe('createActivitySchema', () => {
        it('accepts valid activity data', () => {
            const result = createActivitySchema.parse({
                leadId: 'lead-1',
                type: 'call',
                title: 'Follow-up call',
            });
            expect(result.leadId).toBe('lead-1');
            expect(result.completed).toBe(false); // default
        });

        it('requires leadId, type, and title', () => {
            expect(() =>
                createActivitySchema.parse({
                    type: 'call',
                    title: 'Test',
                    // missing leadId
                })
            ).toThrow();
        });
    });

    describe('updateSettingsSchema', () => {
        it('accepts valid settings', () => {
            const result = updateSettingsSchema.parse({
                industry: 'Finance',
                persona: 'professional',
                qualificationRules: ['Rule 1', 'Rule 2'],
            });
            expect(result.industry).toBe('Finance');
        });

        it('validates qualificationRules array length', () => {
            expect(() =>
                updateSettingsSchema.parse({
                    qualificationRules: Array(21).fill('rule'),
                })
            ).toThrow();
        });
    });

    describe('updateEmailConfigSchema', () => {
        it('accepts valid email config', () => {
            const result = updateEmailConfigSchema.parse({
                sendgridApiKey: 'SG.xxx',
                fromEmail: 'noreply@company.com',
                fromName: 'Company Name',
            });
            expect(result.fromEmail).toBe('noreply@company.com');
        });

        it('accepts partial config', () => {
            const result = updateEmailConfigSchema.parse({
                fromName: 'New Name',
            });
            expect(result.fromName).toBe('New Name');
        });
    });
});
