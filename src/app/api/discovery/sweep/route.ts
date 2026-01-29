/**
 * Discovery Sweep API
 * POST - Trigger a manual discovery sweep
 * GET - Get sweep history
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { DiscoverySweep, DiscoveredLead } from '@/types/discovery';

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

/**
 * Generate mock leads for Phase 1 testing
 */
function generateMockLeads(
    companyId: string,
    profileId: string,
    sweepId: string,
    count: number
): Omit<DiscoveredLead, 'id'>[] {
    const industries = ['Manufacturing', 'Healthcare', 'Technology', 'Retail', 'Construction'];
    const cities = ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'];
    const painPoints = [
        'Outdated equipment needs replacement',
        'High energy costs impacting margins',
        'Struggling with digital transformation',
        'Customer retention challenges',
        'Manual processes slowing growth',
    ];

    const leads: Omit<DiscoveredLead, 'id'>[] = [];

    for (let i = 0; i < count; i++) {
        const industry = industries[Math.floor(Math.random() * industries.length)];
        const city = cities[Math.floor(Math.random() * cities.length)];
        const matchScore = Math.floor(70 + Math.random() * 30);

        leads.push({
            companyId,
            discoveryProfileId: profileId,
            businessName: `${city} ${industry} Solutions ${i + 1}`,
            industry,
            website: `https://www.${city.toLowerCase()}${industry.toLowerCase().replace(' ', '')}${i + 1}.com`,
            contacts: [
                {
                    name: `John Smith ${i + 1}`,
                    title: 'Operations Manager',
                    email: `jsmith@${city.toLowerCase()}${industry.toLowerCase().replace(' ', '')}${i + 1}.com`,
                    phone: `(${Math.floor(200 + Math.random() * 800)}) 555-${String(Math.floor(1000 + Math.random() * 9000))}`,
                    linkedin: null,
                },
            ],
            location: {
                address: `${Math.floor(100 + Math.random() * 9900)} Main Street`,
                city,
                state: 'TX',
                country: 'US',
            },
            aiAnalysis: {
                matchScore,
                matchReasons: [
                    `In target industry (${industry})`,
                    `Located in target geography (${city}, TX)`,
                    matchScore > 85 ? 'Strong buying signals detected' : 'Moderate fit based on profile',
                ],
                painPointsIdentified: [painPoints[Math.floor(Math.random() * painPoints.length)]],
                buyingSignals: matchScore > 85 ? ['Recent expansion', 'Hiring for new roles'] : [],
                summary: `${city} ${industry} company showing ${matchScore > 85 ? 'strong' : 'moderate'} alignment with targeting criteria. Recently mentioned ${painPoints[Math.floor(Math.random() * painPoints.length)].toLowerCase()} in public communications.`,
            },
            verification: {
                status: 'verified',
                verifiedAt: Date.now(),
                checks: {
                    websiteExists: true,
                    phoneValid: true,
                    emailValid: true,
                    businessRegistered: true,
                },
            },
            sources: [
                {
                    type: 'google',
                    url: 'https://google.com/search?q=...',
                    foundAt: Date.now() - 60000,
                },
            ],
            status: 'new',
            sweepId,
            discoveredAt: Date.now(),
            reviewedAt: null,
            reviewedBy: null,
        });
    }

    return leads;
}

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

        // Check daily sweep limit (simple check)
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

        // Generate mock leads (Phase 1)
        const leadsCount = Math.floor(3 + Math.random() * 5); // 3-7 leads
        const mockLeads = generateMockLeads(auth.companyId, 'current', sweepId, leadsCount);

        // Save leads
        const batch = db.batch();
        const leadIds: string[] = [];
        
        for (const lead of mockLeads) {
            const leadRef = db.collection('companies')
                .doc(auth.companyId)
                .collection('discoveredLeads')
                .doc();
            batch.set(leadRef, lead);
            leadIds.push(leadRef.id);
        }

        // Update sweep as completed
        batch.update(sweepRef, {
            status: 'completed',
            completedAt: Date.now(),
            results: {
                sourcesSearched: 3,
                rawResultsFound: leadsCount * 3,
                afterDeduplication: leadsCount * 2,
                afterVerification: leadsCount,
                finalLeadsCount: leadsCount,
            },
        });

        // Update profile stats
        batch.update(profileRef, {
            'stats.totalLeadsFound': FieldValue.increment(leadsCount),
            'stats.lastSweepLeadsCount': leadsCount,
            'schedule.lastRunAt': now,
        });

        await batch.commit();

        return NextResponse.json({
            success: true,
            sweepId,
            leadsFound: leadsCount,
            message: `Sweep completed! Found ${leadsCount} new leads.`,
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
