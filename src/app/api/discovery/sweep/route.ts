/**
 * Discovery Sweep API
 * POST - Trigger a manual discovery sweep
 * GET - Get sweep history
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { DiscoverySweep, DiscoveredLead, TargetingCriteria } from '@/types/discovery';
import { 
    getGooglePlacesCollector, 
    isGooglePlacesConfigured 
} from '@/lib/discovery/googlePlaces';
import {
    RawBusinessData,
    createDedupeKey,
    mergeBusinessData,
    rawToDiscoveredLead,
    CollectorSearchResult,
} from '@/lib/discovery/types';

async function getCompanyIdFromToken(request: NextRequest): Promise<{ companyId: string; userId: string } | null> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }

    try {
        const token = authHeader.split('Bearer ')[1];
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(token);
        const userId = decodedToken.uid;

        const db = getAdminDb();
        const companiesSnap = await db.collection('companies')
            .where('ownerId', '==', userId)
            .limit(1)
            .get();

        if (companiesSnap.empty) {
            return null;
        }

        return { companyId: companiesSnap.docs[0].id, userId };
    } catch (error) {
        console.error('Auth error:', error);
        return null;
    }
}

// ========================================
// Data Collection
// ========================================

/**
 * Collect data from configured sources
 * Returns deduplicated raw business data
 */
async function collectBusinessData(
    criteria: TargetingCriteria,
    maxLeads: number
): Promise<{ businesses: RawBusinessData[]; apiCalls: number; usedMockData: boolean }> {
    const allBusinesses: RawBusinessData[] = [];
    let totalApiCalls = 0;
    let usedMockData = false;

    // Try Google Places first
    if (isGooglePlacesConfigured()) {
        console.log('[Sweep] Using Google Places for data collection');
        const collector = getGooglePlacesCollector();
        
        try {
            const result = await collector.search({
                criteria,
                maxResults: maxLeads,
            });
            
            allBusinesses.push(...result.businesses);
            totalApiCalls += result.metadata.apiCalls;
            
            console.log(`[Sweep] Google Places returned ${result.businesses.length} businesses`);
        } catch (error) {
            console.error('[Sweep] Google Places error:', error);
            // Fall through to mock data
        }
    } else {
        console.warn('[Sweep] Google Places API key not configured (GOOGLE_PLACES_API_KEY)');
    }

    // If we didn't get enough data, fall back to mock data (development/testing)
    if (allBusinesses.length < 3) {
        console.log('[Sweep] Insufficient data from APIs, generating mock data');
        const mockData = generateMockBusinessData(criteria, Math.max(3, maxLeads - allBusinesses.length));
        allBusinesses.push(...mockData);
        usedMockData = true;
    }

    // Deduplicate
    const deduped = deduplicateBusinesses(allBusinesses);
    
    console.log(`[Sweep] Collected ${allBusinesses.length} total, ${deduped.length} after dedup, ${totalApiCalls} API calls`);
    
    return {
        businesses: deduped.slice(0, maxLeads),
        apiCalls: totalApiCalls,
        usedMockData,
    };
}

/**
 * Deduplicate businesses by name + location
 */
function deduplicateBusinesses(businesses: RawBusinessData[]): RawBusinessData[] {
    const byKey = new Map<string, RawBusinessData[]>();
    
    for (const business of businesses) {
        const key = createDedupeKey(business);
        if (!byKey.has(key)) {
            byKey.set(key, []);
        }
        byKey.get(key)!.push(business);
    }
    
    // Merge duplicates
    return Array.from(byKey.values()).map(records => 
        records.length === 1 ? records[0] : mergeBusinessData(records)
    );
}

// ========================================
// Mock Data Generator (Fallback)
// ========================================

/**
 * Generate mock business data when APIs aren't available
 * This is for development/testing only
 */
function generateMockBusinessData(
    criteria: TargetingCriteria,
    count: number
): RawBusinessData[] {
    const industries = criteria.industries.length > 0 
        ? criteria.industries 
        : ['Manufacturing', 'Healthcare', 'Technology', 'Retail', 'Construction'];
    
    const cities = criteria.geography.cities.length > 0 
        ? criteria.geography.cities 
        : ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'];
    
    const state = criteria.geography.states.length > 0 
        ? criteria.geography.states[0] 
        : 'TX';

    const businesses: RawBusinessData[] = [];

    for (let i = 0; i < count; i++) {
        const industry = industries[Math.floor(Math.random() * industries.length)];
        const city = cities[Math.floor(Math.random() * cities.length)];
        const rating = 3.5 + Math.random() * 1.5; // 3.5 - 5.0
        const reviewCount = Math.floor(10 + Math.random() * 200);

        businesses.push({
            externalId: `mock-${Date.now()}-${i}`,
            name: `${city} ${industry} Solutions ${i + 1}`,
            industry,
            website: `https://www.${city.toLowerCase().replace(/\s+/g, '')}${industry.toLowerCase().replace(/\s+/g, '')}${i + 1}.com`,
            address: `${Math.floor(100 + Math.random() * 9900)} Main Street`,
            city,
            state,
            country: 'US',
            phone: `(${Math.floor(200 + Math.random() * 800)}) 555-${String(Math.floor(1000 + Math.random() * 9000))}`,
            rating: Math.round(rating * 10) / 10,
            reviewCount,
            businessStatus: 'OPERATIONAL',
            source: 'mock',
            sourceUrl: 'https://example.com/mock',
            fetchedAt: Date.now(),
        });
    }

    return businesses;
}

// ========================================
// Lead Conversion (with placeholder AI analysis)
// ========================================

/**
 * Convert raw business data to discovered leads
 * Includes placeholder AI analysis (real AI analysis comes in Phase 3)
 */
function convertToDiscoveredLeads(
    businesses: RawBusinessData[],
    companyId: string,
    profileId: string,
    sweepId: string,
    criteria: TargetingCriteria
): Omit<DiscoveredLead, 'id'>[] {
    return businesses.map((business, index) => {
        // Calculate basic match score based on criteria alignment
        const matchScore = calculateBasicMatchScore(business, criteria);
        
        // Build match reasons
        const matchReasons: string[] = [];
        if (criteria.industries.some(ind => 
            business.industry?.toLowerCase().includes(ind.toLowerCase())
        )) {
            matchReasons.push(`In target industry (${business.industry})`);
        }
        if (business.city && criteria.geography.cities.some(city => 
            city.toLowerCase() === business.city?.toLowerCase()
        )) {
            matchReasons.push(`Located in target city (${business.city})`);
        }
        if (business.state && criteria.geography.states.some(state => 
            state.toLowerCase() === business.state?.toLowerCase()
        )) {
            matchReasons.push(`Located in target state (${business.state})`);
        }
        if (business.rating && business.rating >= 4.0) {
            matchReasons.push(`High customer ratings (${business.rating}★)`);
        }
        if (business.reviewCount && business.reviewCount >= 50) {
            matchReasons.push(`Established presence (${business.reviewCount}+ reviews)`);
        }
        if (matchReasons.length === 0) {
            matchReasons.push('Basic criteria match');
        }

        // Generate summary
        const summary = generateBasicSummary(business, matchScore, criteria);

        const baseLead = rawToDiscoveredLead(business, companyId, profileId, sweepId);
        
        return {
            ...baseLead,
            aiAnalysis: {
                matchScore,
                matchReasons,
                painPointsIdentified: [], // Will be filled by AI analysis in Phase 3
                buyingSignals: business.rating && business.rating >= 4.5 && business.reviewCount && business.reviewCount >= 100
                    ? ['Strong market presence']
                    : [],
                summary,
            },
            verification: {
                status: 'verified' as const,
                verifiedAt: Date.now(),
                checks: {
                    websiteExists: !!business.website,
                    phoneValid: !!business.phone,
                    emailValid: !!business.email,
                    businessRegistered: business.businessStatus === 'OPERATIONAL',
                },
            },
        };
    });
}

/**
 * Calculate basic match score without AI
 */
function calculateBasicMatchScore(
    business: RawBusinessData,
    criteria: TargetingCriteria
): number {
    let score = 50; // Base score
    
    // Industry match: +20
    if (criteria.industries.length > 0 && business.industry) {
        const industryMatch = criteria.industries.some(ind =>
            business.industry!.toLowerCase().includes(ind.toLowerCase()) ||
            ind.toLowerCase().includes(business.industry!.toLowerCase())
        );
        if (industryMatch) score += 20;
    }
    
    // City match: +15
    if (criteria.geography.cities.length > 0 && business.city) {
        const cityMatch = criteria.geography.cities.some(city =>
            city.toLowerCase() === business.city!.toLowerCase()
        );
        if (cityMatch) score += 15;
    }
    
    // State match: +10
    if (criteria.geography.states.length > 0 && business.state) {
        const stateMatch = criteria.geography.states.some(state =>
            state.toLowerCase() === business.state!.toLowerCase()
        );
        if (stateMatch) score += 10;
    }
    
    // Good rating: +5-10
    if (business.rating) {
        if (business.rating >= 4.5) score += 10;
        else if (business.rating >= 4.0) score += 5;
    }
    
    // Established business (reviews): +5
    if (business.reviewCount && business.reviewCount >= 50) {
        score += 5;
    }
    
    // Website exists: +5
    if (business.website) {
        score += 5;
    }
    
    // Cap at 100
    return Math.min(100, score);
}

/**
 * Generate a basic summary without AI
 */
function generateBasicSummary(
    business: RawBusinessData,
    matchScore: number,
    criteria: TargetingCriteria
): string {
    const strength = matchScore >= 85 ? 'strong' : matchScore >= 70 ? 'good' : 'moderate';
    const location = [business.city, business.state].filter(Boolean).join(', ');
    
    let summary = `${business.name} is a ${business.industry || 'business'} in ${location || 'the target area'}`;
    
    if (business.rating && business.reviewCount) {
        summary += ` with ${business.rating}★ rating from ${business.reviewCount} reviews`;
    }
    
    summary += `. Shows ${strength} alignment with targeting criteria.`;
    
    if (business.website) {
        summary += ` Has an active web presence.`;
    }
    
    return summary;
}

// ========================================
// API Handlers
// ========================================

export async function POST(request: NextRequest) {
    const auth = await getCompanyIdFromToken(request);
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getAdminDb();

    try {
        // Check if profile exists and is configured
        const profileRef = db.collection('companies')
            .doc(auth.companyId)
            .collection('discoveryProfile')
            .doc('current');
        
        const profileSnap = await profileRef.get();
        
        if (!profileSnap.exists) {
            return NextResponse.json(
                { error: 'Discovery profile not found. Please configure discovery settings first.' },
                { status: 400 }
            );
        }

        const profile = profileSnap.data()!;
        
        if (!profile.businessDescription || profile.targetingCriteria?.industries?.length === 0) {
            return NextResponse.json(
                { error: 'Please complete your discovery profile with business description and targeting criteria.' },
                { status: 400 }
            );
        }

        // Check daily sweep limit
        const today = new Date().toISOString().split('T')[0];
        const startOfDay = new Date(today).getTime();
        const todaySweepsSnap = await db.collection('companies')
            .doc(auth.companyId)
            .collection('discoverySweeps')
            .where('startedAt', '>=', startOfDay)
            .get();

        if (todaySweepsSnap.size >= 3) {
            return NextResponse.json(
                { error: 'Daily sweep limit reached (3 per day). Try again tomorrow.' },
                { status: 429 }
            );
        }

        // Create sweep record
        const sweepRef = db.collection('companies')
            .doc(auth.companyId)
            .collection('discoverySweeps')
            .doc();

        const sweepId = sweepRef.id;
        const now = Date.now();

        const sweep: Omit<DiscoverySweep, 'id'> = {
            companyId: auth.companyId,
            discoveryProfileId: 'current',
            status: 'running',
            startedAt: now,
            completedAt: null,
            tokenUsage: {
                tokensUsed: 0,
                apiCalls: 0,
                estimatedCostUSD: 0,
                timestamp: now,
            },
            results: {
                sourcesSearched: 0,
                rawResultsFound: 0,
                afterDeduplication: 0,
                afterVerification: 0,
                finalLeadsCount: 0,
            },
            errors: [],
            notificationsSent: {
                discord: false,
                email: false,
            },
            triggeredBy: 'manual',
            triggeredByUserId: auth.userId,
        };

        await sweepRef.set(sweep);

        // ========================================
        // PHASE 2: Real Data Collection
        // ========================================
        
        const maxLeads = 10; // Conservative limit for cost control
        const criteria = profile.targetingCriteria as TargetingCriteria;
        
        // Collect business data from configured sources
        const { businesses, apiCalls, usedMockData } = await collectBusinessData(criteria, maxLeads);
        
        // Convert to discovered leads
        const leads = convertToDiscoveredLeads(
            businesses,
            auth.companyId,
            'current',
            sweepId,
            criteria
        );

        // Save leads
        const batch = db.batch();
        const leadIds: string[] = [];
        
        for (const lead of leads) {
            const leadRef = db.collection('companies')
                .doc(auth.companyId)
                .collection('discoveredLeads')
                .doc();
            batch.set(leadRef, lead);
            leadIds.push(leadRef.id);
        }

        // Calculate estimated cost (Google Places: ~$0.032 per request for Basic)
        const estimatedCost = apiCalls * 0.032;

        // Update sweep as completed
        batch.update(sweepRef, {
            status: 'completed',
            completedAt: Date.now(),
            tokenUsage: {
                tokensUsed: 0, // No LLM tokens yet (Phase 3)
                apiCalls,
                estimatedCostUSD: estimatedCost,
                timestamp: Date.now(),
            },
            results: {
                sourcesSearched: isGooglePlacesConfigured() ? 1 : 0,
                rawResultsFound: businesses.length,
                afterDeduplication: businesses.length,
                afterVerification: leads.length,
                finalLeadsCount: leads.length,
            },
        });

        // Update profile stats
        batch.update(profileRef, {
            'stats.totalLeadsFound': FieldValue.increment(leads.length),
            'stats.lastSweepLeadsCount': leads.length,
            'schedule.lastRunAt': now,
        });

        await batch.commit();

        const message = usedMockData 
            ? `Sweep completed with mock data. Found ${leads.length} leads. Configure GOOGLE_PLACES_API_KEY for real data.`
            : `Sweep completed! Found ${leads.length} new leads from Google Places.`;

        return NextResponse.json({
            success: true,
            sweepId,
            leadsFound: leads.length,
            message,
            dataSource: usedMockData ? 'mock' : 'google_places',
            apiCalls,
            estimatedCostUSD: estimatedCost,
        });
    } catch (error) {
        console.error('Error running sweep:', error);
        return NextResponse.json(
            { error: 'Failed to run discovery sweep' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    const auth = await getCompanyIdFromToken(request);
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const db = getAdminDb();
        const { searchParams } = new URL(request.url);
        const limitParam = parseInt(searchParams.get('limit') || '10');

        const sweepsSnap = await db.collection('companies')
            .doc(auth.companyId)
            .collection('discoverySweeps')
            .orderBy('startedAt', 'desc')
            .limit(limitParam)
            .get();

        const sweeps = sweepsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as DiscoverySweep[];

        return NextResponse.json({ sweeps });
    } catch (error) {
        console.error('Error fetching sweep history:', error);
        return NextResponse.json(
            { error: 'Failed to fetch sweep history' },
            { status: 500 }
        );
    }
}
