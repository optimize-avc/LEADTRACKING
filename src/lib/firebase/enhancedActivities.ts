/**
 * Activities Service with Analytics Integration
 *
 * Enhanced activity logging that automatically updates daily metrics
 * for the analytics dashboard. Multi-tenant aware.
 */

import { getFirebaseDb } from './config';
import {
    collection,
    doc,
    getDocs,
    query,
    where,
    orderBy,
    runTransaction,
    increment,
} from 'firebase/firestore';
import { Activity, ActivityOutcome, DailyMetrics } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface LogActivityOptions {
    userId: string;
    companyId: string;
    activity: Omit<Activity, 'id'>;
    leadValue?: number; // For tracking pipeline value
}

interface LogCallOptions {
    userId: string;
    companyId: string;
    leadId: string;
    outcome: ActivityOutcome;
    duration?: number;
    notes?: string;
    isPublic?: boolean;
    leadValue?: number;
}

interface LogMeetingOptions {
    userId: string;
    companyId: string;
    leadId: string;
    outcome: ActivityOutcome;
    notes?: string;
    isPublic?: boolean;
    pipelineValue?: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
}

// ============================================================================
// Enhanced Activities Service
// ============================================================================

export const EnhancedActivitiesService = {
    /**
     * Log an activity and update daily metrics
     * This is the core method - updates both the activity log and analytics metrics
     */
    async logActivity(options: LogActivityOptions): Promise<string> {
        const { userId, companyId, activity, leadValue } = options;
        const db = getFirebaseDb();

        // Determine activity collection based on visibility
        let activityCollectionRef;
        if (activity.visibility === 'public' && activity.leadId) {
            activityCollectionRef = collection(db, 'leads', activity.leadId, 'activities');
        } else {
            activityCollectionRef = collection(db, 'users', userId, 'activities');
        }

        // Run as transaction to ensure atomicity
        const activityId = await runTransaction(db, async (transaction) => {
            // 1. Create the activity document
            const activityDocRef = doc(activityCollectionRef);
            transaction.set(activityDocRef, {
                ...activity,
                repId: userId,
                visibility: activity.visibility || 'private',
            });

            // 2. Update daily metrics for analytics
            const today = formatDateKey(new Date());
            const metricsId = `${today}_${userId}`;
            const metricsRef = doc(db, 'companies', companyId, 'dailyMetrics', metricsId);

            // Build the metrics updates based on activity type
            const metricsUpdates: Record<string, unknown> = {};

            if (activity.type === 'call') {
                // Every call is a dial
                metricsUpdates.dials = increment(1);

                // Connected calls and meetings set count as connects
                if (
                    activity.outcome === 'connected' ||
                    activity.outcome === 'meeting_set' ||
                    activity.outcome === 'qualified'
                ) {
                    metricsUpdates.connects = increment(1);
                }

                // Track talk time
                if (activity.duration) {
                    metricsUpdates.talkTime = increment(activity.duration);
                }

                // Track meeting set outcome
                if (activity.outcome === 'meeting_set') {
                    metricsUpdates.meetingsHeld = increment(1);
                }
            }

            if (activity.type === 'meeting') {
                metricsUpdates.meetingsHeld = increment(1);

                // Track successful meeting outcomes that generate pipeline
                if (
                    activity.outcome === 'qualified' ||
                    activity.outcome === 'contract_sent' ||
                    activity.outcome === 'closed_won'
                ) {
                    if (leadValue) {
                        metricsUpdates.revenueGenerated = increment(leadValue);
                    }
                }
            }

            // Only update metrics if we have updates
            if (Object.keys(metricsUpdates).length > 0) {
                // We need to check if the document exists first
                const metricsDoc = await transaction.get(metricsRef);

                if (metricsDoc.exists()) {
                    transaction.update(metricsRef, metricsUpdates);
                } else {
                    // Create new metrics document with defaults
                    const newMetrics: DailyMetrics = {
                        id: metricsId,
                        date: today,
                        repId: userId,
                        dials: activity.type === 'call' ? 1 : 0,
                        connects:
                            activity.type === 'call' &&
                            (activity.outcome === 'connected' ||
                                activity.outcome === 'meeting_set' ||
                                activity.outcome === 'qualified')
                                ? 1
                                : 0,
                        talkTime: activity.duration || 0,
                        meetingsHeld:
                            activity.type === 'meeting' || activity.outcome === 'meeting_set'
                                ? 1
                                : 0,
                        revenueGenerated: leadValue || 0,
                        leadsCreated: 0,
                    };
                    transaction.set(metricsRef, newMetrics);
                }
            }

            // 3. Update lead's lastContact if associated with a lead
            if (activity.leadId) {
                const leadRef = doc(db, 'leads', activity.leadId);
                transaction.update(leadRef, {
                    lastContact: activity.timestamp,
                    updatedAt: Date.now(),
                });
            }

            return activityDocRef.id;
        });

        return activityId;
    },

    /**
     * Log a call with automatic analytics tracking
     */
    async logCall(options: LogCallOptions): Promise<string> {
        const {
            userId,
            companyId,
            leadId,
            outcome,
            duration,
            notes,
            isPublic = false,
            leadValue,
        } = options;

        return this.logActivity({
            userId,
            companyId,
            activity: {
                type: 'call',
                outcome,
                leadId,
                duration,
                notes,
                timestamp: Date.now(),
                repId: userId,
                visibility: isPublic ? 'public' : 'private',
            },
            leadValue,
        });
    },

    /**
     * Log a meeting with automatic analytics tracking
     */
    async logMeeting(options: LogMeetingOptions): Promise<string> {
        const {
            userId,
            companyId,
            leadId,
            outcome,
            notes,
            isPublic = false,
            pipelineValue,
        } = options;

        return this.logActivity({
            userId,
            companyId,
            activity: {
                type: 'meeting',
                outcome,
                leadId,
                notes,
                timestamp: Date.now(),
                repId: userId,
                visibility: isPublic ? 'public' : 'private',
            },
            leadValue: pipelineValue,
        });
    },

    /**
     * Log an email (no direct analytics impact, but tracked in activity log)
     */
    async logEmail(
        userId: string,
        companyId: string,
        leadId: string,
        subject: string,
        notes?: string,
        isPublic: boolean = false
    ): Promise<string> {
        return this.logActivity({
            userId,
            companyId,
            activity: {
                type: 'email',
                outcome: 'none',
                leadId,
                notes: notes || `Email sent: ${subject}`,
                timestamp: Date.now(),
                repId: userId,
                visibility: isPublic ? 'public' : 'private',
            },
        });
    },

    /**
     * Record a lead creation and update metrics
     */
    async recordLeadCreated(
        companyId: string,
        userId: string,
        leadValue: number = 0
    ): Promise<void> {
        const db = getFirebaseDb();
        const today = formatDateKey(new Date());
        const metricsId = `${today}_${userId}`;
        const metricsRef = doc(db, 'companies', companyId, 'dailyMetrics', metricsId);

        await runTransaction(db, async (transaction) => {
            const metricsDoc = await transaction.get(metricsRef);

            if (metricsDoc.exists()) {
                transaction.update(metricsRef, {
                    leadsCreated: increment(1),
                    revenueGenerated: increment(leadValue),
                });
            } else {
                const newMetrics: DailyMetrics = {
                    id: metricsId,
                    date: today,
                    repId: userId,
                    dials: 0,
                    connects: 0,
                    talkTime: 0,
                    meetingsHeld: 0,
                    revenueGenerated: leadValue,
                    leadsCreated: 1,
                };
                transaction.set(metricsRef, newMetrics);
            }
        });
    },

    // ========================================================================
    // Read operations (unchanged from original)
    // ========================================================================

    /**
     * Get all activities for a user
     */
    async getActivities(userId: string, limitCount: number = 50): Promise<Activity[]> {
        const db = getFirebaseDb();
        const activitiesRef = collection(db, 'users', userId, 'activities');
        const q = query(activitiesRef, orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.slice(0, limitCount).map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Activity[];
    },

    /**
     * Get activities for a specific lead (hybrid: private + public)
     */
    async getLeadActivities(userId: string, leadId: string): Promise<Activity[]> {
        const db = getFirebaseDb();

        // Fetch private activities
        const userActivitiesRef = collection(db, 'users', userId, 'activities');
        const privateQ = query(
            userActivitiesRef,
            where('leadId', '==', leadId),
            orderBy('timestamp', 'desc')
        );
        const privateSnapshot = await getDocs(privateQ);
        const privateActivities = privateSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            visibility: 'private',
        })) as Activity[];

        // Fetch public activities
        const publicActivitiesRef = collection(db, 'leads', leadId, 'activities');
        const publicQ = query(publicActivitiesRef, orderBy('timestamp', 'desc'));
        const publicSnapshot = await getDocs(publicQ);
        const publicActivities = publicSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            visibility: 'public',
        })) as Activity[];

        // Merge and sort
        return [...privateActivities, ...publicActivities].sort(
            (a, b) => b.timestamp - a.timestamp
        );
    },
};

export default EnhancedActivitiesService;
