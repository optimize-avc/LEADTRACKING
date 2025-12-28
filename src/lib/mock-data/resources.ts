import { Resource } from '@/types';

export const MOCK_RESOURCES: Resource[] = [
    // Playbook
    {
        id: '1',
        title: 'Initial Outreach Script',
        category: 'Playbook',
        type: 'document',
        url: '#',
        description: 'Call script for first touch with cold leads.',
        tags: ['Script', 'Cold Call'],
        updatedAt: Date.now(),
    },
    {
        id: '2',
        title: 'Objection Handling Guide',
        category: 'Playbook',
        type: 'document',
        url: '#',
        description: 'Framework for overcoming common objections.',
        tags: ['Objections', 'Negotiation'],
        updatedAt: Date.now(),
    },
    // Learning
    {
        id: '3',
        title: 'AI Fundamentals for SMBs',
        category: 'Learning',
        type: 'video',
        url: '#',
        description: 'Training video on explaining AI to small business owners.',
        tags: ['Training', 'AI'],
        updatedAt: Date.now(),
    },
    // Prospecting
    {
        id: '4',
        title: 'Company Overview Deck',
        category: 'Prospecting',
        type: 'deck',
        url: '#',
        description: 'Standard slide deck for introduction meetings.',
        tags: ['Pitch Deck'],
        updatedAt: Date.now(),
    },
    {
        id: '5',
        title: 'ROI Calculator',
        category: 'Prospecting',
        type: 'sheet',
        url: '#',
        description: 'Spreadsheet to calculate potential client ROI.',
        tags: ['Tool', 'ROI'],
        updatedAt: Date.now(),
    },
    // Competitive
    {
        id: '6',
        title: 'Competitor Battlecards 2025',
        category: 'Competitive',
        type: 'document',
        url: '#',
        description: 'Comparison against top 3 competitors.',
        tags: ['Battlecard', 'Strategy'],
        updatedAt: Date.now(),
    },
    // Templates
    {
        id: '7',
        title: 'Follow-up Email Sequence',
        category: 'Templates',
        type: 'document',
        url: '#',
        description: '3-part email sequence for unresponsive leads.',
        tags: ['Email', 'Templates'],
        updatedAt: Date.now(),
    },
];
