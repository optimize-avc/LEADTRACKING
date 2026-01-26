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
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';

// Google Places API (New) types
interface PlaceResult {
    id: string;
    displayName?: { text: string };
    formattedAddress?: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    websiteUri?: string;
    rating?: number;
    userRatingCount?: number;
    currentOpeningHours?: {
        openNow?: boolean;
        weekdayDescriptions?: string[];
    };
    businessStatus?: string;
    types?: string[];
    primaryType?: string;
    primaryTypeDisplayName?: { text: string };
    reviews?: Array<{
        rating?: number;
        text?: { text: string };
        authorAttribution?: { displayName: string };
        relativePublishTimeDescription?: string;
    }>;
    photos?: Array<{ name: string }>;
    editorialSummary?: { text: string };
}

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

async function searchGooglePlaces(query: string): Promise<PlaceResult | null> {
    if (!GOOGLE_PLACES_API_KEY) {
        console.warn('[Audit API] No Google Places API key, skipping places search');
        return null;
    }

    try {
        // Step 1: Text Search to find the place
        const searchResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
                'X-Goog-FieldMask':
                    'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.businessStatus,places.types,places.primaryType,places.primaryTypeDisplayName',
            },
            body: JSON.stringify({
                textQuery: query,
                maxResultCount: 1,
            }),
        });

        if (!searchResponse.ok) {
            const errText = await searchResponse.text();
            console.error('[Audit API] Places search failed:', searchResponse.status, errText);
            return null;
        }

        const searchData = await searchResponse.json();
        const place = searchData.places?.[0];

        if (!place) {
            console.log('[Audit API] No places found for query:', query);
            return null;
        }

        // Step 2: Get Place Details (reviews, hours, photos)
        const detailsResponse = await fetch(`https://places.googleapis.com/v1/places/${place.id}`, {
            method: 'GET',
            headers: {
                'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
                'X-Goog-FieldMask':
                    'id,displayName,formattedAddress,nationalPhoneNumber,internationalPhoneNumber,websiteUri,rating,userRatingCount,currentOpeningHours,businessStatus,types,primaryType,primaryTypeDisplayName,reviews,photos,editorialSummary',
            },
        });

        if (!detailsResponse.ok) {
            console.warn('[Audit API] Places details failed, using search result');
            return place;
        }

        const detailsData = await detailsResponse.json();
        return detailsData;
    } catch (error) {
        console.error('[Audit API] Google Places error:', error);
        return null;
    }
}

function formatPlaceData(place: PlaceResult): string {
    const lines: string[] = ['=== GOOGLE PLACES DATA (Official Business Info) ==='];

    if (place.displayName?.text) {
        lines.push(`Business Name: ${place.displayName.text}`);
    }

    if (place.primaryTypeDisplayName?.text) {
        lines.push(`Category: ${place.primaryTypeDisplayName.text}`);
    } else if (place.primaryType) {
        lines.push(`Category: ${place.primaryType.replace(/_/g, ' ')}`);
    }

    if (place.formattedAddress) {
        lines.push(`Address: ${place.formattedAddress}`);
    }

    if (place.nationalPhoneNumber || place.internationalPhoneNumber) {
        lines.push(`Phone: ${place.nationalPhoneNumber || place.internationalPhoneNumber}`);
    }

    if (place.websiteUri) {
        lines.push(`Website: ${place.websiteUri}`);
    }

    if (place.rating !== undefined) {
        lines.push(`Google Rating: ${place.rating}/5 (${place.userRatingCount || 0} reviews)`);
    }

    if (place.businessStatus) {
        lines.push(`Status: ${place.businessStatus}`);
    }

    if (place.currentOpeningHours) {
        if (place.currentOpeningHours.openNow !== undefined) {
            lines.push(`Currently: ${place.currentOpeningHours.openNow ? 'OPEN' : 'CLOSED'}`);
        }
        if (place.currentOpeningHours.weekdayDescriptions?.length) {
            lines.push('Hours:');
            place.currentOpeningHours.weekdayDescriptions.forEach((d) => {
                lines.push(`  ${d}`);
            });
        }
    }

    if (place.editorialSummary?.text) {
        lines.push(`Summary: ${place.editorialSummary.text}`);
    }

    if (place.reviews?.length) {
        lines.push(`\n--- Recent Reviews (${place.reviews.length} shown) ---`);
        place.reviews.slice(0, 5).forEach((review, i) => {
            lines.push(
                `[${i + 1}] ${review.rating || '?'}/5 by ${review.authorAttribution?.displayName || 'Anonymous'} (${review.relativePublishTimeDescription || 'unknown time'})`
            );
            if (review.text?.text) {
                lines.push(
                    `   "${review.text.text.slice(0, 300)}${review.text.text.length > 300 ? '...' : ''}"`
                );
            }
        });
    }

    lines.push('=== END GOOGLE PLACES DATA ===\n');
    return lines.join('\n');
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
        // Authentication - optional for Discover page (public access for lead generation)
        // If token is provided, validate it; otherwise allow anonymous access
        const authHeader = req.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.split('Bearer ')[1]?.trim();
            const decodedToken = await verifyIdToken(token);
            if (!decodedToken) {
                return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
            }
        }
        // Anonymous access allowed - the Discover feature is publicly accessible

        const body = await req.json();
        const { query, resources = [] } = body as { query: string; resources: Resource[] };

        if (!query) {
            return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
        }

        console.log('[Audit API] Starting audit for:', query);

        // Step 1: Search Google Places for structured business data
        const placeData = await searchGooglePlaces(query);
        const formattedPlaceData = placeData ? formatPlaceData(placeData) : '';

        // If we found a website from Places, use it
        const businessWebsite = placeData?.websiteUri || null;

        // Step 2: Search the web for information about the company
        // Note: Free tier is limited to 1 req/sec, so we search sequentially with delay
        const searchQueries = [
            `${query} company information`,
            `${query} reviews ratings`,
            `${query} news recent`,
        ];

        const searchResults: string[] = [];
        for (const q of searchQueries) {
            const result = await searchBrave(q);
            searchResults.push(result);
            // Wait 1.1 seconds between requests to respect rate limit
            if (searchQueries.indexOf(q) < searchQueries.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 1100));
            }
        }
        const combinedSearchResults = searchResults.join('\n\n---\n\n');

        // Step 3: Try to fetch their website directly
        let websiteContent: string | null = null;

        // Use website from Places if available, otherwise check query
        if (businessWebsite) {
            websiteContent = await fetchWebsiteContent(businessWebsite);
        } else {
            // Check if query looks like a domain
            const domainMatch = query.match(
                /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/
            );
            if (domainMatch) {
                websiteContent = await fetchWebsiteContent(domainMatch[0]);
            } else {
                // Try to find website in search results and fetch it
                const urlMatch = combinedSearchResults.match(/https?:\/\/[^\s]+/);
                if (urlMatch) {
                    websiteContent = await fetchWebsiteContent(urlMatch[0]);
                }
            }
        }

        // Step 4: Build the prompt and generate audit
        // Combine Places data with web search results
        const enrichedSearchResults = formattedPlaceData
            ? `${formattedPlaceData}\n\n=== WEB SEARCH RESULTS ===\n${combinedSearchResults}`
            : combinedSearchResults;

        const prompt = buildAuditPrompt(query, enrichedSearchResults, websiteContent, resources);

        const aiResponse = await generateWithGemini(prompt);
        const auditResult = parseAuditResponse(aiResponse);

        if (!auditResult) {
            return NextResponse.json({ error: 'Failed to parse audit results' }, { status: 500 });
        }

        // Include raw search data for transparency
        auditResult.rawSearchData = enrichedSearchResults.slice(0, 5000);

        // Add Google Places metadata if available
        if (placeData) {
            auditResult.googlePlaces = {
                placeId: placeData.id,
                rating: placeData.rating,
                reviewCount: placeData.userRatingCount,
                website: placeData.websiteUri,
                phone: placeData.nationalPhoneNumber || placeData.internationalPhoneNumber,
                address: placeData.formattedAddress,
                businessStatus: placeData.businessStatus,
            };
        }

        return NextResponse.json({ audit: auditResult });
    } catch (error) {
        console.error('[Audit API] Error:', error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
