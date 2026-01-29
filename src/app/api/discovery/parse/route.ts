/**
 * AI Parse Business Description API
 * POST - Parse business description into targeting criteria using AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api/auth-helpers';
import { TargetingCriteria, DEFAULT_TARGETING_CRITERIA } from '@/types/discovery';

interface ParseRequest {
    description: string;
}

/**
 * Parse business description using AI (stubbed for Phase 1)
 * In production, this would call OpenAI/Claude to extract targeting criteria
 */
function parseBusinessDescription(description: string): TargetingCriteria {
    const lowerDesc = description.toLowerCase();
    
    // Simple keyword extraction (Phase 1 stub - replace with AI in Phase 2)
    const criteria: TargetingCriteria = {
        ...DEFAULT_TARGETING_CRITERIA,
        idealCustomerProfile: description.substring(0, 500),
    };

    // Extract industries from common keywords
    const industryKeywords: Record<string, string[]> = {
        'Manufacturing': ['manufacturing', 'factory', 'production', 'industrial'],
        'Healthcare': ['healthcare', 'medical', 'hospital', 'clinic', 'health'],
        'Technology': ['technology', 'tech', 'software', 'saas', 'digital'],
        'Retail': ['retail', 'store', 'shop', 'ecommerce', 'e-commerce'],
        'Construction': ['construction', 'building', 'contractor'],
        'Real Estate': ['real estate', 'property', 'commercial real estate', 'office building'],
        'HVAC': ['hvac', 'heating', 'cooling', 'air conditioning'],
        'Logistics': ['logistics', 'warehouse', 'shipping', 'transportation'],
        'Finance': ['finance', 'financial', 'banking', 'insurance'],
        'Professional Services': ['consulting', 'legal', 'accounting', 'professional services'],
    };

    criteria.industries = Object.entries(industryKeywords)
        .filter(([_, keywords]) => keywords.some(k => lowerDesc.includes(k)))
        .map(([industry]) => industry);

    // Extract geography
    const stateKeywords: Record<string, string[]> = {
        'TX': ['texas', 'houston', 'dallas', 'austin', 'san antonio'],
        'CA': ['california', 'los angeles', 'san francisco', 'san diego'],
        'NY': ['new york', 'nyc', 'manhattan'],
        'FL': ['florida', 'miami', 'orlando', 'tampa'],
        'IL': ['illinois', 'chicago'],
        'PA': ['pennsylvania', 'philadelphia'],
        'OH': ['ohio', 'cleveland', 'columbus'],
        'GA': ['georgia', 'atlanta'],
        'WA': ['washington', 'seattle'],
        'AZ': ['arizona', 'phoenix'],
    };

    criteria.geography.states = Object.entries(stateKeywords)
        .filter(([_, keywords]) => keywords.some(k => lowerDesc.includes(k)))
        .map(([state]) => state);

    // Extract cities mentioned
    const cities = ['houston', 'dallas', 'austin', 'san antonio', 'los angeles', 'chicago', 'new york', 'miami', 'atlanta', 'phoenix', 'seattle', 'denver', 'boston'];
    criteria.geography.cities = cities
        .filter(city => lowerDesc.includes(city))
        .map(city => city.charAt(0).toUpperCase() + city.slice(1));

    // Extract company size hints
    const sizeMatch = description.match(/(\d+)\s*[-–to]+\s*(\d+)\s*(employees|staff|people)/i);
    if (sizeMatch) {
        criteria.companySize.min = parseInt(sizeMatch[1]);
        criteria.companySize.max = parseInt(sizeMatch[2]);
    } else if (lowerDesc.includes('small business')) {
        criteria.companySize = { min: 1, max: 50 };
    } else if (lowerDesc.includes('mid-size') || lowerDesc.includes('midsize')) {
        criteria.companySize = { min: 50, max: 250 };
    } else if (lowerDesc.includes('enterprise')) {
        criteria.companySize = { min: 250, max: 10000 };
    }

    // Extract pain points from common phrases
    const painPointPhrases = [
        'high energy costs', 'energy costs', 'reduce costs', 'cost reduction',
        'outdated equipment', 'aging equipment', 'old equipment',
        'manual processes', 'inefficient processes',
        'compliance', 'regulations',
        'customer retention', 'losing customers',
        'scaling', 'growth challenges',
        'digital transformation',
    ];
    criteria.painPoints = painPointPhrases.filter(pp => lowerDesc.includes(pp));

    // Extract buying signals
    const buyingSignalPhrases = [
        'expanding', 'expansion', 'new location',
        'hiring', 'growing team',
        'recently funded', 'funding', 'investment',
        'upgrading', 'modernizing',
        'sustainability', 'green initiatives',
    ];
    criteria.buyingSignals = buyingSignalPhrases.filter(bs => lowerDesc.includes(bs));

    return criteria;
}

export async function POST(request: NextRequest) {
    const auth = await getAuthContext(request);
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body: ParseRequest = await request.json();
        
        if (!body.description || body.description.trim().length < 20) {
            return NextResponse.json(
                { error: 'Please provide a more detailed business description (at least 20 characters)' },
                { status: 400 }
            );
        }

        const targetingCriteria = parseBusinessDescription(body.description);

        return NextResponse.json({
            success: true,
            targetingCriteria,
            note: 'Criteria parsed using keyword matching (Phase 1). AI parsing coming in Phase 2.',
        });
    } catch (error) {
        console.error('Error parsing business description:', error);
        return NextResponse.json(
            { error: 'Failed to parse business description' },
            { status: 500 }
        );
    }
}
