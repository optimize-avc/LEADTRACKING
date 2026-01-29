/**
 * Discovery Service - Core business logic for AI Lead Discovery
 * 
 * Handles:
 * - Discovery profile CRUD
 * - Discovered lead management
 * - Sweep orchestration (stubbed for Phase 1)
 */

import { getFirebaseDb } from '@/lib/firebase/config';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    orderBy,
    limit as firestoreLimit,
    getDocs,
    writeBatch,
    Timestamp,
} from 'firebase/firestore';
import {
    DiscoveryProfile,
    DiscoveredLead,
    DiscoverySweep,
    TargetingCriteria,
    DiscoveredLeadStatus,
    SweepStatus,
    createDefaultDiscoveryProfile,
    DEFAULT_TOKEN_SAFETY,
    TokenUsage,
} from '@/types/discovery';
import {
    TokenBudget,
    canRunSweep,
    updateDailyUsage,
    ensureCircuitClosed,
    recordSuccess,
    recordFailure,
} from './token-safety';

// ========================================
// Discovery Profile Operations
// ========================================

/**
 * Get company's discovery profile
 */
export async function getDiscoveryProfile(companyId: string): Promise<DiscoveryProfile | null> {
    const db = getFirebaseDb();
    const profileRef = doc(db, 'companies', companyId, 'discoveryProfile', 'current');
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
        return null;
    }

    return { id: profileSnap.id, ...profileSnap.data() } as DiscoveryProfile;
}

/**
 * Create or update discovery profile
 */
export async function saveDiscoveryProfile(
    companyId: string,
    data: Partial<DiscoveryProfile>
): Promise<DiscoveryProfile> {
    const db = getFirebaseDb();
    const profileRef = doc(db, 'companies', companyId, 'discoveryProfile', 'current');

    const existing = await getDoc(profileRef);
    const now = Date.now();

    if (existing.exists()) {
        // Update existing
        await updateDoc(profileRef, {
            ...data,
            updatedAt: now,
        });

        const updated = await getDoc(profileRef);
        return { id: updated.id, ...updated.data() } as DiscoveryProfile;
    } else {
        // Create new
        const defaultProfile = createDefaultDiscoveryProfile(companyId);
        const newProfile = {
            ...defaultProfile,
            ...data,
            id: 'current',
            companyId,
            createdAt: now,
            updatedAt: now,
        };

        await setDoc(profileRef, newProfile);
        return newProfile as DiscoveryProfile;
    }
}

/**
 * Delete discovery profile and all associated data
 */
export async function deleteDiscoveryProfile(companyId: string): Promise<void> {
    const db = getFirebaseDb();
    const batch = writeBatch(db);

    // Delete profile
    const profileRef = doc(db, 'companies', companyId, 'discoveryProfile', 'current');
    batch.delete(profileRef);

    // Delete all discovered leads (in production, would need pagination)
    const leadsRef = collection(db, 'companies', companyId, 'discoveredLeads');
    const leadsSnap = await getDocs(query(leadsRef, firestoreLimit(500)));
    leadsSnap.forEach(doc => batch.delete(doc.ref));

    // Delete all sweeps
    const sweepsRef = collection(db, 'companies', companyId, 'discoverySweeps');
    const sweepsSnap = await getDocs(query(sweepsRef, firestoreLimit(500)));
    sweepsSnap.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
}

/**
 * Calculate next run time based on schedule
 */
export function calculateNextRunTime(
    frequency: DiscoveryProfile['schedule']['frequency'],
    preferredTime: string,
    customDays?: number
): number {
    const now = new Date();
    const [hours, minutes] = preferredTime.split(':').map(Number);

    // Set to preferred time today
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);

    // If time has passed today, start from tomorrow
    if (next <= now) {
        next.setDate(next.getDate() + 1);
    }

    // Adjust based on frequency
    switch (frequency) {
        case 'daily':
            // Already set correctly
            break;
        case 'weekly':
            // Next Monday at preferred time
            const daysUntilMonday = (8 - next.getDay()) % 7 || 7;
            next.setDate(next.getDate() + daysUntilMonday);
            break;
        case 'biweekly':
            const daysUntilMondayBi = (8 - next.getDay()) % 7 || 7;
            next.setDate(next.getDate() + daysUntilMondayBi + 7);
            break;
        case 'monthly':
            next.setMonth(next.getMonth() + 1, 1);
            break;
        case 'custom':
            if (customDays) {
                next.setDate(next.getDate() + customDays);
            }
            break;
    }

    return next.getTime();
}

// ========================================
// Discovered Lead Operations
// ========================================

/**
 * Get discovered leads for a company
 */
export async function getDiscoveredLeads(
    companyId: string,
    options: {
        status?: DiscoveredLeadStatus;
        limit?: number;
        offset?: number;
    } = {}
): Promise<{ leads: DiscoveredLead[]; total: number }> {
    const db = getFirebaseDb();
    const leadsRef = collection(db, 'companies', companyId, 'discoveredLeads');

    let q = query(leadsRef, orderBy('discoveredAt', 'desc'));

    if (options.status) {
        q = query(leadsRef, where('status', '==', options.status), orderBy('discoveredAt', 'desc'));
    }

    if (options.limit) {
        q = query(q, firestoreLimit(options.limit));
    }

    const snapshot = await getDocs(q);
    const leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiscoveredLead));

    // For total count, we'd need a separate count query or maintain a counter
    // For now, return the fetched count
    return { leads, total: leads.length };
}

/**
 * Get a single discovered lead
 */
export async function getDiscoveredLead(
    companyId: string,
    leadId: string
): Promise<DiscoveredLead | null> {
    const db = getFirebaseDb();
    const leadRef = doc(db, 'companies', companyId, 'discoveredLeads', leadId);
    const leadSnap = await getDoc(leadRef);

    if (!leadSnap.exists()) {
        return null;
    }

    return { id: leadSnap.id, ...leadSnap.data() } as DiscoveredLead;
}

/**
 * Update a discovered lead's status
 */
export async function updateDiscoveredLeadStatus(
    companyId: string,
    leadId: string,
    status: DiscoveredLeadStatus,
    userId: string,
    dismissReason?: string
): Promise<void> {
    const db = getFirebaseDb();
    const leadRef = doc(db, 'companies', companyId, 'discoveredLeads', leadId);

    const updates: Record<string, unknown> = {
        status,
        reviewedAt: Date.now(),
        reviewedBy: userId,
    };

    if (status === 'dismissed' && dismissReason) {
        updates.dismissReason = dismissReason;
    }

    await updateDoc(leadRef, updates);

    // Update profile stats
    await updateDiscoveryStats(companyId, status);
}

/**
 * Link discovered lead to pipeline lead
 */
export async function linkDiscoveredLeadToPipeline(
    companyId: string,
    discoveredLeadId: string,
    pipelineLeadId: string,
    userId: string
): Promise<void> {
    const db = getFirebaseDb();
    const leadRef = doc(db, 'companies', companyId, 'discoveredLeads', discoveredLeadId);

    await updateDoc(leadRef, {
        status: 'added_to_pipeline',
        pipelineLeadId,
        reviewedAt: Date.now(),
        reviewedBy: userId,
    });

    await updateDiscoveryStats(companyId, 'added_to_pipeline');
}

/**
 * Save discovered leads from a sweep
 */
export async function saveDiscoveredLeads(
    companyId: string,
    leads: Omit<DiscoveredLead, 'id'>[]
): Promise<string[]> {
    const db = getFirebaseDb();
    const batch = writeBatch(db);
    const ids: string[] = [];

    for (const lead of leads) {
        const leadRef = doc(collection(db, 'companies', companyId, 'discoveredLeads'));
        batch.set(leadRef, lead);
        ids.push(leadRef.id);
    }

    await batch.commit();
    return ids;
}

/**
 * Update discovery profile stats
 */
async function updateDiscoveryStats(
    companyId: string,
    status: DiscoveredLeadStatus
): Promise<void> {
    const profile = await getDiscoveryProfile(companyId);
    if (!profile) return;

    const stats = { ...profile.stats };

    switch (status) {
        case 'added_to_pipeline':
            stats.leadsAddedToPipeline += 1;
            break;
        case 'dismissed':
            stats.leadsDismissed += 1;
            break;
    }

    await saveDiscoveryProfile(companyId, { stats });
}

// ========================================
// Sweep Operations
// ========================================

/**
 * Create a new sweep record
 */
export async function createSweep(
    companyId: string,
    profileId: string,
    triggeredBy: 'schedule' | 'manual',
    userId?: string
): Promise<string> {
    const db = getFirebaseDb();
    const sweepRef = doc(collection(db, 'companies', companyId, 'discoverySweeps'));

    const sweep: Omit<DiscoverySweep, 'id'> = {
        companyId,
        discoveryProfileId: profileId,
        status: 'pending',
        startedAt: Date.now(),
        completedAt: null,
        tokenUsage: {
            tokensUsed: 0,
            apiCalls: 0,
            estimatedCostUSD: 0,
            timestamp: Date.now(),
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
        triggeredBy,
        triggeredByUserId: userId,
    };

    await setDoc(sweepRef, sweep);
    return sweepRef.id;
}

/**
 * Update sweep status and results
 */
export async function updateSweep(
    companyId: string,
    sweepId: string,
    updates: Partial<DiscoverySweep>
): Promise<void> {
    const db = getFirebaseDb();
    const sweepRef = doc(db, 'companies', companyId, 'discoverySweeps', sweepId);
    await updateDoc(sweepRef, updates);
}

/**
 * Get sweep history
 */
export async function getSweepHistory(
    companyId: string,
    limitCount: number = 10
): Promise<DiscoverySweep[]> {
    const db = getFirebaseDb();
    const sweepsRef = collection(db, 'companies', companyId, 'discoverySweeps');
    const q = query(sweepsRef, orderBy('startedAt', 'desc'), firestoreLimit(limitCount));

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiscoverySweep));
}

/**
 * Get a single sweep
 */
export async function getSweep(
    companyId: string,
    sweepId: string
): Promise<DiscoverySweep | null> {
    const db = getFirebaseDb();
    const sweepRef = doc(db, 'companies', companyId, 'discoverySweeps', sweepId);
    const sweepSnap = await getDoc(sweepRef);

    if (!sweepSnap.exists()) {
        return null;
    }

    return { id: sweepSnap.id, ...sweepSnap.data() } as DiscoverySweep;
}

// ========================================
// Sweep Execution (Stubbed for Phase 1)
// ========================================

/**
 * Execute a discovery sweep
 * 
 * This is the main orchestration function that:
 * 1. Validates limits
 * 2. Creates sweep record
 * 3. Runs data collection (stubbed)
 * 4. Runs AI analysis (stubbed)
 * 5. Saves results
 * 6. Updates stats
 */
export async function executeSweep(
    companyId: string,
    userId?: string
): Promise<{ success: boolean; sweepId?: string; error?: string }> {
    // 1. Get profile
    const profile = await getDiscoveryProfile(companyId);
    if (!profile) {
        return { success: false, error: 'Discovery profile not found. Please configure discovery settings first.' };
    }

    if (!profile.businessDescription || profile.targetingCriteria.industries.length === 0) {
        return { success: false, error: 'Please complete your discovery profile with business description and targeting criteria.' };
    }

    // 2. Check limits
    const limitCheck = await canRunSweep(companyId);
    if (!limitCheck.allowed) {
        return { success: false, error: limitCheck.reason };
    }

    // 3. Check circuit breaker
    try {
        ensureCircuitClosed();
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }

    // 4. Create sweep record
    const sweepId = await createSweep(companyId, profile.id, userId ? 'manual' : 'schedule', userId);

    try {
        // 5. Update sweep to running
        await updateSweep(companyId, sweepId, { status: 'running' });

        // 6. Create token budget for this sweep
        const budget = new TokenBudget(sweepId);

        // 7. Execute sweep phases (STUBBED for Phase 1)
        // In production, this would:
        // - Run data collectors (Google, LinkedIn, etc.)
        // - Deduplicate results
        // - Run AI analysis
        // - Verify contacts
        // - Save leads

        // Simulate some token usage for testing
        const mockUsage: TokenUsage = {
            tokensUsed: 0,
            apiCalls: 0,
            estimatedCostUSD: 0,
            timestamp: Date.now(),
        };

        // 8. Generate mock leads for testing
        const mockLeads = generateMockLeads(companyId, profile.id, sweepId, 3);
        const savedLeadIds = await saveDiscoveredLeads(companyId, mockLeads);

        // 9. Update sweep results
        await updateSweep(companyId, sweepId, {
            status: 'completed',
            completedAt: Date.now(),
            tokenUsage: mockUsage,
            results: {
                sourcesSearched: 3,
                rawResultsFound: 10,
                afterDeduplication: 5,
                afterVerification: 3,
                finalLeadsCount: savedLeadIds.length,
            },
        });

        // 10. Update profile stats and schedule
        await saveDiscoveryProfile(companyId, {
            stats: {
                ...profile.stats,
                totalLeadsFound: profile.stats.totalLeadsFound + savedLeadIds.length,
                lastSweepLeadsCount: savedLeadIds.length,
            },
            schedule: {
                ...profile.schedule,
                lastRunAt: Date.now(),
                nextRunAt: profile.schedule.enabled
                    ? calculateNextRunTime(
                          profile.schedule.frequency,
                          profile.schedule.preferredTime,
                          profile.schedule.customDays
                      )
                    : null,
            },
        });

        // 11. Update daily usage tracking
        await updateDailyUsage(companyId, mockUsage, true);

        // 12. Record success
        recordSuccess();

        return { success: true, sweepId };
    } catch (error) {
        // Handle errors
        console.error(`[Sweep:${sweepId}] Error:`, error);
        recordFailure();

        await updateSweep(companyId, sweepId, {
            status: 'failed',
            completedAt: Date.now(),
            errors: [
                {
                    source: 'orchestrator',
                    error: (error as Error).message,
                    timestamp: Date.now(),
                },
            ],
        });

        return { success: false, sweepId, error: (error as Error).message };
    }
}

// ========================================
// Mock Data Generator (For Testing)
// ========================================

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
            website: `https://www.${city.toLowerCase()}${industry.toLowerCase()}${i + 1}.com`,
            contacts: [
                {
                    name: `John Smith ${i + 1}`,
                    title: 'Operations Manager',
                    email: `jsmith@${city.toLowerCase()}${industry.toLowerCase()}${i + 1}.com`,
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

// ========================================
// Exports
// ========================================

export const DiscoveryService = {
    // Profile
    getProfile: getDiscoveryProfile,
    saveProfile: saveDiscoveryProfile,
    deleteProfile: deleteDiscoveryProfile,

    // Leads
    getLeads: getDiscoveredLeads,
    getLead: getDiscoveredLead,
    updateLeadStatus: updateDiscoveredLeadStatus,
    linkLeadToPipeline: linkDiscoveredLeadToPipeline,

    // Sweeps
    getSweepHistory,
    getSweep,
    executeSweep,
};
