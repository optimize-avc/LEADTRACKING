/**
 * Discovery Sweep API
 * POST - Trigger a manual discovery sweep
 * GET - Get sweep history
 * 
 * Phase 3: Now includes AI-powered lead scoring and analysis
 * @see SPEC-AI-LEAD-DISCOVERY.md sections 6.1, 8.1-8.3
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
} from '@/lib/discovery/types';
import { 
    analyzeAllLeads, 
    getAvailableProvider,
    AI_LIMITS 
} from '@/lib/discovery/aiAnalyzer';

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
// Lead Conversion (with AI Analysis - Phase 3)
// ========================================

/**
 * Convert raw business data to discovered leads with AI analysis
 * 
 * @param businesses Raw business data from collectors
 * @param aiAnalyses AI analysis results (indexed by business position)
 * @param companyId Company ID
 * @param profileId Discovery profile ID
 * @param sweepId Current sweep ID
 * @returns Discovered leads with full AI analysis
 */
function convertToDiscoveredLeads(
    businesses: RawBusinessData[],
    aiAnalyses: Map<number, import('@/types/discovery').DiscoveredLeadAIAnalysis>,
    companyId: string,
    profileId: string,
    sweepId: string
): Omit<DiscoveredLead, 'id'>[] {
    return businesses.map((business, index) => {
        // Get AI analysis for this lead
        const aiAnalysis = aiAnalyses.get(index) || {
            matchScore: 50,
            matchReasons: ['Basic criteria match'],
            painPointsIdentified: [],
            buyingSignals: [],
            summary: `${business.name} is a business that may match your criteria.`,
        };

        const baseLead = rawToDiscoveredLead(business, companyId, profileId, sweepId);
        
        return {
            ...baseLead,
            aiAnalysis,
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

        if (todaySweepsSnap.size >= 10) {
            return NextResponse.json(
                { error: 'Daily sweep limit reached (10 per day). Try again tomorrow.' },
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
        
        const maxLeads = Math.min(10, AI_LIMITS.maxLeadsToScore); // Stay within cost limits
        const criteria = profile.targetingCriteria as TargetingCriteria;
        
        // Collect business data from configured sources
        const { businesses, apiCalls, usedMockData } = await collectBusinessData(criteria, maxLeads);
        
        // ========================================
        // PHASE 3: AI Analysis
        // ========================================
        
        console.log(`[Sweep] Starting AI analysis for ${businesses.length} businesses`);
        const aiProvider = getAvailableProvider();
        console.log(`[Sweep] AI Provider: ${aiProvider || 'none (using rule-based fallback)'}`);
        
        // Run two-stage AI analysis
        const analysisResult = await analyzeAllLeads(businesses, criteria);
        
        // Log any warnings
        if (analysisResult.warnings.length > 0) {
            console.log(`[Sweep] AI Analysis warnings:`, analysisResult.warnings);
        }
        
        // Convert to discovered leads with AI analysis
        const leads = convertToDiscoveredLeads(
            businesses,
            analysisResult.leadAnalyses,
            auth.companyId,
            'current',
            sweepId
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

        // Calculate total cost (Google Places + AI tokens)
        const googlePlacesCost = apiCalls * 0.032;
        const totalCost = googlePlacesCost + analysisResult.totalTokenUsage.estimatedCostUSD;

        // Update sweep as completed
        batch.update(sweepRef, {
            status: 'completed',
            completedAt: Date.now(),
            tokenUsage: {
                tokensUsed: analysisResult.totalTokenUsage.tokensUsed,
                apiCalls: apiCalls + analysisResult.totalTokenUsage.apiCalls,
                estimatedCostUSD: totalCost,
                timestamp: Date.now(),
            },
            results: {
                sourcesSearched: isGooglePlacesConfigured() ? 1 : 0,
                rawResultsFound: businesses.length,
                afterDeduplication: businesses.length,
                afterVerification: leads.length,
                finalLeadsCount: leads.length,
            },
            errors: analysisResult.warnings.map(w => ({
                source: 'ai_analyzer',
                error: w,
                timestamp: Date.now(),
            })),
        });

        // Update profile stats
        batch.update(profileRef, {
            'stats.totalLeadsFound': FieldValue.increment(leads.length),
            'stats.lastSweepLeadsCount': leads.length,
            'schedule.lastRunAt': now,
        });

        await batch.commit();

        // Build response message
        let message = usedMockData 
            ? `Sweep completed with mock data. Found ${leads.length} leads.`
            : `Sweep completed! Found ${leads.length} new leads.`;
        
        if (!aiProvider) {
            message += ' (No AI key configured - using rule-based scoring)';
        } else {
            message += ` AI-scored with ${aiProvider === 'gemini' ? 'Gemini' : 'OpenAI'}.`;
        }
        
        if (!isGooglePlacesConfigured() && !usedMockData) {
            message += ' Configure GOOGLE_PLACES_API_KEY for real data.';
        }

        return NextResponse.json({
            success: true,
            sweepId,
            leadsFound: leads.length,
            message,
            dataSource: usedMockData ? 'mock' : 'google_places',
            aiProvider: aiProvider || 'rule-based',
            apiCalls,
            tokenUsage: {
                tokensUsed: analysisResult.totalTokenUsage.tokensUsed,
                aiApiCalls: analysisResult.totalTokenUsage.apiCalls,
            },
            estimatedCostUSD: totalCost,
            warnings: analysisResult.warnings.length > 0 ? analysisResult.warnings : undefined,
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
