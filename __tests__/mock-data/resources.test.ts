import { describe, it, expect } from 'vitest';
import { MOCK_RESOURCES } from '@/lib/mock-data/resources';

describe('Mock Resources Data', () => {
    it('contains multiple resources', () => {
        expect(MOCK_RESOURCES.length).toBeGreaterThan(0);
    });

    it('each resource has required fields', () => {
        MOCK_RESOURCES.forEach(resource => {
            expect(resource).toHaveProperty('id');
            expect(resource).toHaveProperty('title');
            expect(resource).toHaveProperty('description');
            expect(resource).toHaveProperty('category');
            expect(resource).toHaveProperty('type');
        });
    });

    it('resources have valid categories', () => {
        const validCategories = ['Playbook', 'Learning', 'Prospecting', 'Competitive', 'Templates'];
        MOCK_RESOURCES.forEach(resource => {
            expect(validCategories).toContain(resource.category);
        });
    });

    it('resources have valid types', () => {
        const validTypes = ['document', 'video', 'deck', 'sheet'];
        MOCK_RESOURCES.forEach(resource => {
            expect(validTypes).toContain(resource.type);
        });
    });

    it('resources have non-empty titles', () => {
        MOCK_RESOURCES.forEach(resource => {
            expect(resource.title.length).toBeGreaterThan(0);
        });
    });

    it('resources have unique IDs', () => {
        const ids = MOCK_RESOURCES.map(r => r.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    it('resources have URLs', () => {
        MOCK_RESOURCES.forEach(resource => {
            expect(resource).toHaveProperty('url');
        });
    });

    it('resources have tags', () => {
        MOCK_RESOURCES.forEach(resource => {
            expect(resource).toHaveProperty('tags');
            expect(Array.isArray(resource.tags)).toBe(true);
        });
    });
});
