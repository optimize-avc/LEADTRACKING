/**
 * Lead Enrichment Service
 *
 * Enriches lead data from various sources including LinkedIn.
 * Uses Apollo.io or similar enrichment APIs.
 *
 * Best practice 2026: Multi-source enrichment with caching
 */

import { getFirebaseDb } from '@/lib/firebase/config';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { Lead } from '@/types';

// Environment variables (to be set in .env.local)
// APOLLO_API_KEY - Apollo.io API key for enrichment
// CLEARBIT_API_KEY - Clearbit API key (alternative)

export interface EnrichedLeadData {
    // Person data
    firstName?: string;
    lastName?: string;
    title?: string;
    linkedInUrl?: string;
    photoUrl?: string;
    headline?: string;

    // Company data
    companyName?: string;
    companyDomain?: string;
    companyLinkedIn?: string;
    companyIndustry?: string;
    companySize?: string;
    companyLocation?: string;
    companyDescription?: string;
    companyLogoUrl?: string;

    // Additional data
    seniority?: string;
    department?: string;
    technologies?: string[];

    // Metadata
    enrichedAt: number;
    sources: string[];
    confidence: number;
}

export interface EnrichmentResult {
    success: boolean;
    data?: EnrichedLeadData;
    error?: string;
    cached?: boolean;
}

const ENRICHMENT_CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

// ============================================
// Apollo.io Enrichment
// ============================================

interface ApolloPersonResponse {
    person?: {
        first_name?: string;
        last_name?: string;
        title?: string;
        linkedin_url?: string;
        photo_url?: string;
        headline?: string;
        seniority?: string;
        departments?: string[];
    };
    organization?: {
        name?: string;
        website_url?: string;
        linkedin_url?: string;
        primary_industry?: string;
        estimated_num_employees?: number;
        city?: string;
        state?: string;
        country?: string;
        short_description?: string;
        logo_url?: string;
        technologies?: string[];
    };
}

async function enrichViaApollo(email: string): Promise<EnrichedLeadData | null> {
    const apiKey = process.env.APOLLO_API_KEY;
    if (!apiKey) {
        console.warn('APOLLO_API_KEY not configured');
        return null;
    }

    try {
        const response = await fetch('https://api.apollo.io/v1/people/match', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
            },
            body: JSON.stringify({
                api_key: apiKey,
                email: email,
            }),
        });

        if (!response.ok) {
            console.error(`Apollo API error: ${response.status}`);
            return null;
        }

        const data: ApolloPersonResponse = await response.json();

        if (!data.person && !data.organization) {
            return null;
        }

        const companySize = data.organization?.estimated_num_employees
            ? formatCompanySize(data.organization.estimated_num_employees)
            : undefined;

        return {
            firstName: data.person?.first_name,
            lastName: data.person?.last_name,
            title: data.person?.title,
            linkedInUrl: data.person?.linkedin_url,
            photoUrl: data.person?.photo_url,
            headline: data.person?.headline,
            seniority: data.person?.seniority,
            department: data.person?.departments?.[0],
            companyName: data.organization?.name,
            companyDomain: data.organization?.website_url?.replace(/^https?:\/\//, ''),
            companyLinkedIn: data.organization?.linkedin_url,
            companyIndustry: data.organization?.primary_industry,
            companySize,
            companyLocation: [
                data.organization?.city,
                data.organization?.state,
                data.organization?.country,
            ]
                .filter(Boolean)
                .join(', '),
            companyDescription: data.organization?.short_description,
            companyLogoUrl: data.organization?.logo_url,
            technologies: data.organization?.technologies,
            enrichedAt: new Date().getTime(),
            sources: ['apollo'],
            confidence: 0.9,
        };
    } catch (error) {
        console.error('Apollo enrichment failed:', error);
        return null;
    }
}

function formatCompanySize(employees: number): string {
    if (employees < 10) return '1-10';
    if (employees < 50) return '11-50';
    if (employees < 200) return '51-200';
    if (employees < 500) return '201-500';
    if (employees < 1000) return '501-1000';
    if (employees < 5000) return '1001-5000';
    return '5001+';
}

// ============================================
// Clearbit Enrichment (Alternative)
// ============================================

async function enrichViaClearbit(email: string): Promise<EnrichedLeadData | null> {
    const apiKey = process.env.CLEARBIT_API_KEY;
    if (!apiKey) {
        return null;
    }

    try {
        const response = await fetch(
            `https://person.clearbit.com/v2/combined/find?email=${encodeURIComponent(email)}`,
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                },
            }
        );

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        return {
            firstName: data.person?.name?.givenName,
            lastName: data.person?.name?.familyName,
            title: data.person?.employment?.title,
            linkedInUrl: data.person?.linkedin?.handle
                ? `https://linkedin.com/in/${data.person.linkedin.handle}`
                : undefined,
            photoUrl: data.person?.avatar,
            headline: data.person?.bio,
            seniority: data.person?.employment?.seniority,
            companyName: data.company?.name,
            companyDomain: data.company?.domain,
            companyIndustry: data.company?.category?.industry,
            companySize: data.company?.metrics?.employeesRange,
            companyLocation: data.company?.geo?.city
                ? `${data.company.geo.city}, ${data.company.geo.country}`
                : undefined,
            companyDescription: data.company?.description,
            companyLogoUrl: data.company?.logo,
            technologies: data.company?.tech,
            enrichedAt: new Date().getTime(),
            sources: ['clearbit'],
            confidence: 0.85,
        };
    } catch (error) {
        console.error('Clearbit enrichment failed:', error);
        return null;
    }
}

// ============================================
// Main Enrichment Service
// ============================================

/**
 * Enrich a lead with additional data from external sources
 */
export async function enrichLead(
    lead: Lead,
    options: { force?: boolean } = {}
): Promise<EnrichmentResult> {
    const { force = false } = options;

    // Check cache first
    if (!force) {
        const cached = await getCachedEnrichment(lead.id);
        if (cached && new Date().getTime() - cached.enrichedAt < ENRICHMENT_CACHE_TTL) {
            return { success: true, data: cached, cached: true };
        }
    }

    // Try Apollo first, then Clearbit
    let enrichedData = await enrichViaApollo(lead.email);

    if (!enrichedData) {
        enrichedData = await enrichViaClearbit(lead.email);
    }

    if (!enrichedData) {
        return { success: false, error: 'No enrichment data found' };
    }

    // Cache the result
    await cacheEnrichment(lead.id, enrichedData);

    return { success: true, data: enrichedData };
}

/**
 * Apply enriched data to a lead
 */
export async function applyEnrichmentToLead(
    leadId: string,
    enrichedData: EnrichedLeadData
): Promise<void> {
    const leadRef = doc(getFirebaseDb(), 'leads', leadId);

    const updates: Partial<Lead> & { enrichment: EnrichedLeadData } = {
        updatedAt: Date.now(),
        enrichment: enrichedData,
    };

    // Optionally update lead fields if they're empty
    // (don't overwrite user-entered data)
    const leadDoc = await getDoc(leadRef);
    if (leadDoc.exists()) {
        const lead = leadDoc.data() as Lead;

        if (!lead.industry && enrichedData.companyIndustry) {
            updates.industry = enrichedData.companyIndustry;
        }
    }

    await updateDoc(leadRef, updates);
}

// ============================================
// Caching
// ============================================

const CACHE_COLLECTION = 'enrichment_cache';

async function getCachedEnrichment(leadId: string): Promise<EnrichedLeadData | null> {
    const cacheRef = doc(getFirebaseDb(), CACHE_COLLECTION, leadId);
    const snapshot = await getDoc(cacheRef);

    if (!snapshot.exists()) return null;
    return snapshot.data() as EnrichedLeadData;
}

async function cacheEnrichment(leadId: string, data: EnrichedLeadData): Promise<void> {
    const cacheRef = doc(getFirebaseDb(), CACHE_COLLECTION, leadId);
    await setDoc(cacheRef, data);
}

/**
 * Bulk enrich leads (with rate limiting)
 */
export async function bulkEnrichLeads(
    leads: Lead[],
    options: { concurrency?: number; delayMs?: number } = {}
): Promise<Map<string, EnrichmentResult>> {
    const { concurrency = 2, delayMs = 1000 } = options;
    const results = new Map<string, EnrichmentResult>();

    // Process in batches
    for (let i = 0; i < leads.length; i += concurrency) {
        const batch = leads.slice(i, i + concurrency);

        const batchResults = await Promise.all(batch.map((lead) => enrichLead(lead)));

        batch.forEach((lead, idx) => {
            results.set(lead.id, batchResults[idx]);
        });

        // Rate limiting
        if (i + concurrency < leads.length) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }

    return results;
}
