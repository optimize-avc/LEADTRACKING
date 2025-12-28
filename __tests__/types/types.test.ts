import { describe, it, expect } from 'vitest';
import { Lead, Activity, Resource, User } from '@/types';

describe('TypeScript Types', () => {
    describe('Lead type', () => {
        it('accepts valid lead data', () => {
            const lead: Lead = {
                id: 'lead-1',
                companyName: 'Acme Inc',
                contactName: 'John Doe',
                email: 'john@acme.com',
                phone: '555-123-4567',
                status: 'New',
                value: 50000,
                probability: 25,
                createdAt: Date.now(),
                industry: 'Technology',
            };

            expect(lead.id).toBe('lead-1');
            expect(lead.companyName).toBe('Acme Inc');
            expect(lead.status).toBe('New');
        });

        it('supports optional fields', () => {
            const minimalLead: Lead = {
                id: 'lead-2',
                companyName: 'Beta Corp',
                contactName: 'Jane Smith',
                email: 'jane@beta.com',
                status: 'Contacted',
                value: 25000,
                createdAt: Date.now(),
            };

            expect(minimalLead.phone).toBeUndefined();
            expect(minimalLead.industry).toBeUndefined();
            expect(minimalLead.notes).toBeUndefined();
        });
    });

    describe('Activity type', () => {
        it('accepts valid activity data', () => {
            const activity: Activity = {
                id: 'activity-1',
                type: 'call',
                outcome: 'connected',
                timestamp: Date.now(),
                repId: 'user-1',
                leadId: 'lead-1',
                notes: 'Great call, very interested',
            };

            expect(activity.type).toBe('call');
            expect(activity.outcome).toBe('connected');
        });

        it('supports all activity types', () => {
            const types: Activity['type'][] = ['call', 'email', 'meeting', 'social'];
            const outcomes: Activity['outcome'][] = [
                'connected',
                'voicemail',
                'no_answer',
                'wrong_number',
            ];

            types.forEach((type) => {
                expect(typeof type).toBe('string');
            });

            outcomes.forEach((outcome) => {
                expect(typeof outcome).toBe('string');
            });
        });
    });

    describe('Resource type', () => {
        it('accepts valid resource data', () => {
            const resource: Resource = {
                id: 'resource-1',
                title: 'Sales Playbook',
                description: 'Comprehensive sales guide',
                category: 'Playbook',
                type: 'document',
                icon: '📚',
            };

            expect(resource.category).toBe('Playbook');
            expect(resource.type).toBe('document');
        });
    });

    describe('User type', () => {
        it('accepts valid user data', () => {
            const user: User = {
                id: 'user-1',
                name: 'Sales Rep',
                email: 'rep@company.com',
                role: 'rep',
            };

            expect(user.role).toBe('rep');
        });
    });
});
