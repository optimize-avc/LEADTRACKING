/**
 * Usage Tracking Service
 *
 * Tracks resource usage per company for plan limit enforcement.
 * Uses Firestore for real-time usage data.
 *
 * Best practice 2026: Server-side usage tracking with client caching
 */

import { getFirebaseDb } from './config';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    increment,
    collection,
    query,
    where,
    getDocs,
    Timestamp,
} from 'firebase/firestore';

export interface CompanyUsage {
    leadCount: number;
    leadsThisMonth: number;
    teamMemberCount: number;
    emailsSentThisMonth: number;
    activitiesThisMonth: number;
    lastUpdated: number;
    monthStartDate: string; // YYYY-MM format for monthly tracking
}

export interface UsageResult {
    usage: CompanyUsage;
    isLoading: boolean;
    error: string | null;
}

/**
 * Get current month key for tracking
 */
function getCurrentMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * UsageService - Tracks company resource usage
 */
export const UsageService = {
    /**
     * Get usage stats for a company
     */
    async getUsage(companyId: string): Promise<CompanyUsage> {
        const db = getFirebaseDb();
        const usageRef = doc(db, 'companies', companyId, 'meta', 'usage');
        const usageSnap = await getDoc(usageRef);

        const currentMonth = getCurrentMonthKey();

        if (!usageSnap.exists()) {
            // Initialize usage document
            const initialUsage: CompanyUsage = {
                leadCount: 0,
                leadsThisMonth: 0,
                teamMemberCount: 1,
                emailsSentThisMonth: 0,
                activitiesThisMonth: 0,
                lastUpdated: Date.now(),
                monthStartDate: currentMonth,
            };
            await setDoc(usageRef, initialUsage);
            return initialUsage;
        }

        const usage = usageSnap.data() as CompanyUsage;

        // Reset monthly counters if new month
        if (usage.monthStartDate !== currentMonth) {
            const resetUsage = {
                ...usage,
                leadsThisMonth: 0,
                emailsSentThisMonth: 0,
                activitiesThisMonth: 0,
                monthStartDate: currentMonth,
                lastUpdated: Date.now(),
            };
            await setDoc(usageRef, resetUsage);
            return resetUsage;
        }

        return usage;
    },

    /**
     * Increment lead count
     */
    async incrementLeadCount(companyId: string, count: number = 1): Promise<void> {
        const db = getFirebaseDb();
        const usageRef = doc(db, 'companies', companyId, 'meta', 'usage');

        await updateDoc(usageRef, {
            leadCount: increment(count),
            leadsThisMonth: increment(count),
            lastUpdated: Date.now(),
        });
    },

    /**
     * Decrement lead count (when deleting)
     */
    async decrementLeadCount(companyId: string, count: number = 1): Promise<void> {
        const db = getFirebaseDb();
        const usageRef = doc(db, 'companies', companyId, 'meta', 'usage');

        await updateDoc(usageRef, {
            leadCount: increment(-count),
            lastUpdated: Date.now(),
        });
    },

    /**
     * Update team member count
     */
    async setTeamMemberCount(companyId: string, count: number): Promise<void> {
        const db = getFirebaseDb();
        const usageRef = doc(db, 'companies', companyId, 'meta', 'usage');

        await updateDoc(usageRef, {
            teamMemberCount: count,
            lastUpdated: Date.now(),
        });
    },

    /**
     * Increment email sent count
     */
    async incrementEmailCount(companyId: string): Promise<void> {
        const db = getFirebaseDb();
        const usageRef = doc(db, 'companies', companyId, 'meta', 'usage');

        await updateDoc(usageRef, {
            emailsSentThisMonth: increment(1),
            lastUpdated: Date.now(),
        });
    },

    /**
     * Increment activity count
     */
    async incrementActivityCount(companyId: string): Promise<void> {
        const db = getFirebaseDb();
        const usageRef = doc(db, 'companies', companyId, 'meta', 'usage');

        await updateDoc(usageRef, {
            activitiesThisMonth: increment(1),
            lastUpdated: Date.now(),
        });
    },

    /**
     * Recalculate all usage counts (for data consistency)
     * Should be run periodically or after data imports
     */
    async recalculateUsage(companyId: string): Promise<CompanyUsage> {
        const db = getFirebaseDb();

        // Count leads
        const leadsRef = collection(db, 'leads');
        const leadsQuery = query(leadsRef, where('companyId', '==', companyId));
        const leadsSnap = await getDocs(leadsQuery);
        const leadCount = leadsSnap.size;

        // Count team members
        const usersRef = collection(db, 'users');
        const usersQuery = query(usersRef, where('companyId', '==', companyId));
        const usersSnap = await getDocs(usersQuery);
        const teamMemberCount = usersSnap.size;

        // Get current usage for monthly stats (don't reset those)
        const currentUsage = await this.getUsage(companyId);

        const updatedUsage: CompanyUsage = {
            ...currentUsage,
            leadCount,
            teamMemberCount,
            lastUpdated: Date.now(),
        };

        const usageRef = doc(db, 'companies', companyId, 'meta', 'usage');
        await setDoc(usageRef, updatedUsage);

        return updatedUsage;
    },
};

/**
 * Hook-compatible usage fetcher
 */
export async function fetchCompanyUsage(companyId: string): Promise<CompanyUsage> {
    return UsageService.getUsage(companyId);
}
