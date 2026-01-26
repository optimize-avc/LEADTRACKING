import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { verifyIdToken } from '@/lib/firebase/admin';
import { buildAuditPrompt, parseAuditResponse } from '@/lib/ai/business-audit';
import { Resource } from '@/types';

const GEMINI_API_KEY =
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    '';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY || '';

// Vertex AI client (lazy initialized)
let vertexAIClient: unknown = null;
let vertexInitAttempted = false;

// Google GenAI client (lazy initialized)
let genAI: GoogleGenerativeAI | null = null;

async function tryInitializeVertexAI(): Promise<unknown> {
    if (vertexAIClient) return vertexAIClient;
    if (vertexInitAttempted) return null;

    vertexInitAttempted = true;

    try {
        const { VertexAI } = await import('@google-cloud/vertexai');
        const projectId =
            process.env.GOOGLE_CLOUD_PROJECT ||
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
            'antigrav-tracking-final';
        vertexAIClient = new VertexAI({ project: projectId, location: 'us-central1' });
        return vertexAIClient;
    } catch (e) {
        console.warn('[Audit API] Vertex AI initialization failed:', e);
        return null;
    }
}

async function generateWithGemini(prompt: string): Promise<string> {
    // Try Vertex AI first
    try {
        const vertexAI = await tryInitializeVertexAI();
        if (vertexAI) {
            const model = (
                vertexAI as unknown as {
                    getGenerativeModel: (config: { model: string }) => {
                        generateContent: (prompt: string) => Promise<{
                            response?: {
                                candidates?: Array<{
                                    content?: { parts?: Array<{ text?: string }> };
                                }>;
                            };
                        }>;
                    };
                }
            ).getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await model.generateContent(prompt);
            return result.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
    } catch (e) {
        console.warn('[Audit API] Vertex AI generation failed:', e);
    }

    // Fallback to API key
    if (!GEMINI_API_KEY) {
        throw new Error('No AI service available');
    }

    if (!genAI) {
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

async function searchBrave(query: string): Promise<string> {
    if (!BRAVE_API_KEY) {
        console.warn('[Audit API] No Brave API key, skipping web search');
        return 'No web search results available.';
    }

    try {
        const searchUrl = new URL('https://api.search.brave.com/res/v1/web/search');
        searchUrl.searchParams.set('q', query);
        searchUrl.searchParams.set('count', '10');

        const response = await fetch(searchUrl.toString(), {
            headers: {
                Accept: 'application/json',
                'X-Subscription-Token': BRAVE_API_KEY,
            },
        });

        if (!response.ok) {
            throw new Error(`Brave search failed: ${response.status}`);
        }

        const data = await response.json();
        const results = data.web?.results || [];

        return results
            .map(
                (r: { title: string; url: string; description: string }, i: number) =>
                    `[${i + 1}] ${r.title}\n${r.url}\n${r.description}`
            )
            .join('\n\n');
    } catch (error) {
        console.error('[Audit API] Brave search error:', error);
        return 'Web search temporarily unavailable.';
    }
}

async function fetchWebsiteContent(url: string): Promise<string | null> {
    try {
        // Normalize URL
        let normalizedUrl = url;
        if (!url.startsWith('http')) {
            normalizedUrl = `https://${url}`;
        }

        const response = await fetch(normalizedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; BusinessAuditBot/1.0)',
            },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            return null;
        }

        const html = await response.text();

        // Basic HTML to text extraction
        const textContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 15000); // Limit content

        return textContent;
    } catch (error) {
        console.warn('[Audit API] Website fetch error:', error);
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        // Authentication
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            if (process.env.NODE_ENV !== 'development') {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        } else {
            const token = authHeader.split('Bearer ')[1]?.trim();
            const decodedToken = await verifyIdToken(token);
            if (!decodedToken) {
                return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
            }
        }

        const body = await req.json();
        const { query, resources = [] } = body as { query: string; resources: Resource[] };

        if (!query) {
            return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
        }

        console.log('[Audit API] Starting audit for:', query);

        // Step 1: Search the web for information about the company
        const searchQueries = [
            `${query} company information`,
            `${query} reviews ratings`,
            `${query} news recent`,
        ];

        const searchPromises = searchQueries.map((q) => searchBrave(q));
        const searchResults = await Promise.all(searchPromises);
        const combinedSearchResults = searchResults.join('\n\n---\n\n');

        // Step 2: Try to fetch their website directly
        let websiteContent: string | null = null;

        // Check if query looks like a domain
        const domainMatch = query.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
        if (domainMatch) {
            websiteContent = await fetchWebsiteContent(domainMatch[0]);
        } else {
            // Try to find website in search results and fetch it
            const urlMatch = combinedSearchResults.match(/https?:\/\/[^\s]+/);
            if (urlMatch) {
                websiteContent = await fetchWebsiteContent(urlMatch[0]);
            }
        }

        // Step 3: Build the prompt and generate audit
        const prompt = buildAuditPrompt(query, combinedSearchResults, websiteContent, resources);

        const aiResponse = await generateWithGemini(prompt);
        const auditResult = parseAuditResponse(aiResponse);

        if (!auditResult) {
            return NextResponse.json({ error: 'Failed to parse audit results' }, { status: 500 });
        }

        // Include raw search data for transparency
        auditResult.rawSearchData = combinedSearchResults.slice(0, 5000);

        return NextResponse.json({ audit: auditResult });
    } catch (error) {
        console.error('[Audit API] Error:', error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
