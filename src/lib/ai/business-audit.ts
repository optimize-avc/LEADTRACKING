import { Resource } from '@/types';

export interface GooglePlacesMetadata {
    placeId: string;
    rating?: number;
    reviewCount?: number;
    website?: string;
    phone?: string;
    address?: string;
    businessStatus?: string;
}

export interface BusinessAuditResult {
    companyName: string;
    website?: string;
    overview: {
        description: string;
        industry: string;
        estimatedSize: string;
        keyPeople: string[];
        founded?: string;
        headquarters?: string;
    };
    digitalPresence: {
        score: number; // 0-100
        websiteQuality: string;
        mobileOptimized: boolean;
        seoStrength: string;
        socialProfiles: string[];
    };
    aiReadiness: {
        score: number; // 0-100
        currentAIUsage: string;
        opportunities: string[];
    };
    reviews: {
        sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
        averageRating?: number;
        keyThemes: string[];
        sources: string[];
    };
    painPoints: string[];
    opportunities: string[];
    talkingPoints: string[];
    relevantResources: {
        id: string;
        title: string;
        relevance: string;
    }[];
    rawSearchData?: string;
    googlePlaces?: GooglePlacesMetadata;
    auditedAt: number;
}

export interface AuditRequest {
    query: string; // company name, website, or domain
    userId: string;
    resources: Resource[];
}

export function buildAuditPrompt(
    searchQuery: string,
    webSearchResults: string,
    websiteContent: string | null,
    userResources: Resource[]
): string {
    const resourceContext =
        userResources.length > 0
            ? `
USER'S ENABLEMENT MATERIALS (Reference these when suggesting how user can help):
${userResources.map((r) => `- ${r.title} (${r.category}): ${r.description}`).join('\n')}
`
            : '';

    return `You are a business intelligence analyst conducting a deep audit on a company.

SEARCH QUERY: "${searchQuery}"

WEB SEARCH RESULTS:
${webSearchResults}

${
    websiteContent
        ? `COMPANY WEBSITE CONTENT:
${websiteContent}`
        : ''
}

${resourceContext}

Analyze all available information and provide a comprehensive business intelligence report.

INSTRUCTIONS:
1. Synthesize ALL the data above into actionable insights
2. Be specific - cite actual findings from the search results
3. If you reference user's enablement materials, mention them by name
4. Score digital presence and AI readiness objectively (0-100)
5. Pain points should be REAL problems you can identify from the data
6. Opportunities should be specific ways the user could help this company
7. Talking points should be conversation starters based on actual findings

Return ONLY a valid JSON object with this EXACT structure:
{
    "companyName": "Full Company Name",
    "website": "https://company.com",
    "overview": {
        "description": "2-3 sentence company description based on findings",
        "industry": "Primary Industry",
        "estimatedSize": "Startup/SMB/Mid-Market/Enterprise (with employee estimate if found)",
        "keyPeople": ["CEO Name - Title", "Other Key Person - Title"],
        "founded": "Year if found",
        "headquarters": "Location if found"
    },
    "digitalPresence": {
        "score": 75,
        "websiteQuality": "Assessment of website quality, design, and user experience",
        "mobileOptimized": true,
        "seoStrength": "Assessment based on search visibility",
        "socialProfiles": ["LinkedIn", "Twitter", "etc"]
    },
    "aiReadiness": {
        "score": 60,
        "currentAIUsage": "What AI/automation they currently use if mentioned",
        "opportunities": ["Specific AI opportunity 1", "Specific AI opportunity 2"]
    },
    "reviews": {
        "sentiment": "positive",
        "averageRating": 4.5,
        "keyThemes": ["Theme from reviews", "Another theme"],
        "sources": ["Google Reviews", "G2", "etc"]
    },
    "painPoints": [
        "Specific pain point identified from data",
        "Another pain point"
    ],
    "opportunities": [
        "Specific way user could help based on findings",
        "Another opportunity"
    ],
    "talkingPoints": [
        "Specific conversation starter based on recent news/findings",
        "Another talking point referencing their business"
    ],
    "relevantResources": [
        {
            "id": "resource-id-if-applicable",
            "title": "Resource Title from User's Materials",
            "relevance": "How this resource could help them"
        }
    ]
}`;
}

export function parseAuditResponse(responseText: string): BusinessAuditResult | null {
    try {
        // Clean up markdown code blocks if present
        const cleanText = responseText
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/g, '')
            .trim();

        const parsed = JSON.parse(cleanText);

        // Validate required fields
        if (!parsed.companyName || !parsed.overview || !parsed.digitalPresence) {
            console.error('Missing required fields in audit response');
            return null;
        }

        return {
            ...parsed,
            auditedAt: Date.now(),
        } as BusinessAuditResult;
    } catch (error) {
        console.error('Failed to parse audit response:', error);
        return null;
    }
}
