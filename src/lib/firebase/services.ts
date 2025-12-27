import { db } from './config';
import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    setDoc,
    deleteDoc,
    query,
    where,
    orderBy
} from 'firebase/firestore';
import { Lead, Activity, ActivityOutcome } from '@/types';

// Maximum reasonable lead value to prevent display overflow (~$10 billion)
const MAX_LEAD_VALUE = 10_000_000_000;

// Clamp lead value to prevent overflow in UI
function safeLeadValue(value: number | undefined | null): number {
    if (value === undefined || value === null || !isFinite(value)) {
        return 0;
    }
    return Math.min(Math.abs(value), MAX_LEAD_VALUE);
}

// ============================================
// LEADS SERVICE
// ============================================

export const LeadsService = {
    // Get all leads for a user
    async getLeads(userId: string): Promise<Lead[]> {
        const leadsRef = collection(db, 'users', userId, 'leads');
        const q = query(leadsRef, orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Clamp value to prevent overflow
                value: safeLeadValue(data.value)
            };
        }) as Lead[];
    },

    // Get single lead
    async getLead(userId: string, leadId: string): Promise<Lead | null> {
        const leadRef = doc(db, 'users', userId, 'leads', leadId);
        const snapshot = await getDoc(leadRef);
        if (!snapshot.exists()) return null;
        return { id: snapshot.id, ...snapshot.data() } as Lead;
    },

    // Create new lead
    async createLead(userId: string, lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'assignedTo'>): Promise<string> {
        const leadsRef = collection(db, 'users', userId, 'leads');
        const now = Date.now();
        const docRef = await addDoc(leadsRef, {
            ...lead,
            assignedTo: userId,
            createdAt: now,
            updatedAt: now
        });
        return docRef.id;
    },

    // Update lead
    async updateLead(userId: string, leadId: string, updates: Partial<Lead>): Promise<void> {
        const leadRef = doc(db, 'users', userId, 'leads', leadId);
        await updateDoc(leadRef, {
            ...updates,
            updatedAt: Date.now()
        });
    },

    // Delete lead
    async deleteLead(userId: string, leadId: string): Promise<void> {
        const leadRef = doc(db, 'users', userId, 'leads', leadId);
        await deleteDoc(leadRef);
    }
};

// ============================================
// ACTIVITIES SERVICE
// ============================================

export const ActivitiesService = {
    // Get all activities for a user
    async getActivities(userId: string, limit: number = 50): Promise<Activity[]> {
        const activitiesRef = collection(db, 'users', userId, 'activities');
        const q = query(activitiesRef, orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.slice(0, limit).map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Activity[];
    },

    // Get activities for a specific lead
    async getLeadActivities(userId: string, leadId: string): Promise<Activity[]> {
        const activitiesRef = collection(db, 'users', userId, 'activities');
        const q = query(
            activitiesRef,
            where('leadId', '==', leadId),
            orderBy('timestamp', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Activity[];
    },

    // Log new activity
    async logActivity(userId: string, activity: Omit<Activity, 'id'>): Promise<string> {
        const activitiesRef = collection(db, 'users', userId, 'activities');
        const docRef = await addDoc(activitiesRef, {
            ...activity,
            repId: userId
        });

        // Update lead's lastContact if associated with a lead
        if (activity.leadId) {
            try {
                await LeadsService.updateLead(userId, activity.leadId, {
                    lastContact: activity.timestamp
                });
            } catch (e) {
                console.warn('Could not update lead lastContact', e);
            }
        }

        return docRef.id;
    },

    // Quick log helpers
    async logCall(userId: string, leadId: string, outcome: ActivityOutcome, duration?: number, notes?: string): Promise<string> {
        return this.logActivity(userId, {
            type: 'call',
            outcome,
            leadId,
            duration,
            notes,
            timestamp: Date.now(),
            repId: userId
        });
    },

    async logEmail(userId: string, leadId: string, subject: string, notes?: string): Promise<string> {
        return this.logActivity(userId, {
            type: 'email',
            outcome: 'none',
            leadId,
            notes: notes || `Email sent: ${subject}`,
            timestamp: Date.now(),
            repId: userId
        });
    },

    async logMeeting(userId: string, leadId: string, outcome: ActivityOutcome, notes?: string): Promise<string> {
        return this.logActivity(userId, {
            type: 'meeting',
            outcome,
            leadId,
            notes,
            timestamp: Date.now(),
            repId: userId
        });
    },

    async logEmailReply(userId: string, leadId: string, replyContent: string): Promise<string> {
        return this.logActivity(userId, {
            type: 'email',
            outcome: 'connected',
            leadId,
            notes: `Reply received: ${replyContent.substring(0, 200)}...`,
            timestamp: Date.now(),
            repId: userId
        });
    }
};

// ============================================
// EMAIL THREADS SERVICE
// ============================================

export interface EmailThread {
    id: string;
    leadId: string;
    subject: string;
    body: string;
    status: 'sent' | 'replied';
    sentAt: number;
    repliedAt?: number;
    replyContent?: string;
    aiGenerated: boolean;
}

export const EmailThreadsService = {
    // Get email threads for a lead
    async getEmailThreads(userId: string, leadId: string): Promise<EmailThread[]> {
        const threadsRef = collection(db, 'users', userId, 'emailThreads');
        const q = query(
            threadsRef,
            where('leadId', '==', leadId),
            orderBy('sentAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as EmailThread[];
    },

    // Create email thread when email is sent
    async createThread(userId: string, thread: Omit<EmailThread, 'id'>): Promise<string> {
        const threadsRef = collection(db, 'users', userId, 'emailThreads');
        const docRef = await addDoc(threadsRef, thread);
        return docRef.id;
    },

    // Mark email as replied
    async markAsReplied(userId: string, threadId: string, replyContent: string): Promise<void> {
        const threadRef = doc(db, 'users', userId, 'emailThreads', threadId);
        await updateDoc(threadRef, {
            status: 'replied',
            repliedAt: Date.now(),
            replyContent
        });
    }
};

// ============================================
// DASHBOARD METRICS SERVICE
// ============================================

export const DashboardService = {
    async getMetrics(userId: string) {
        const [leads, activities] = await Promise.all([
            LeadsService.getLeads(userId),
            ActivitiesService.getActivities(userId, 100)
        ]);

        // Calculate metrics
        const now = Date.now();
        const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
        const todayStart = new Date().setHours(0, 0, 0, 0);

        const weekActivities = activities.filter(a => a.timestamp > weekAgo);
        const todayActivities = activities.filter(a => a.timestamp > todayStart);

        // Aggregate activities by day for the chart
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const activityByDay = weekActivities.reduce((acc, activity) => {
            const date = new Date(activity.timestamp);
            const dayName = days[date.getDay()];

            if (!acc[dayName]) {
                acc[dayName] = { day: dayName, dials: 0, connects: 0 };
            }

            if (activity.type === 'call') {
                acc[dayName].dials++;
                if (activity.outcome === 'connected' || activity.outcome === 'meeting_set') {
                    acc[dayName].connects++;
                }
            }
            return acc;
        }, {} as Record<string, { day: string; dials: number; connects: number }>);

        // Ensure we have entries for all days in the last week (or at least today)
        // For simplicity in this chart, we might just show what we have or fill gaps.
        // Let's return the last 7 days in order.
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now - (i * 24 * 60 * 60 * 1000));
            const dayName = days[d.getDay()];
            chartData.push(activityByDay[dayName] || { day: dayName, dials: 0, connects: 0 });
        }

        return {
            // Dials today
            dials: todayActivities.filter(a => a.type === 'call').length,

            // Pipeline value (sum of all lead values)
            pipelineValue: leads.reduce((sum, l) => sum + (l.value || 0), 0),

            // Meetings this week
            meetingsHeld: weekActivities.filter(a => a.type === 'meeting').length,

            // Pipeline status counts
            pipelineStatusCounts: leads.reduce((acc, lead) => {
                acc[lead.status] = (acc[lead.status] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),

            // Total leads
            totalLeads: leads.length,

            // Emails sent this week
            emailsSent: weekActivities.filter(a => a.type === 'email').length,

            // Chart data
            activityChart: chartData
        };
    }
};

// ============================================
// CONVENIENCE WRAPPER FUNCTIONS
// ============================================

// Wrapper for Activities page
export async function addActivity(userId: string, activity: Omit<Activity, 'id'>): Promise<string> {
    return ActivitiesService.logActivity(userId, activity);
}

export async function getActivities(userId: string, limit: number = 50): Promise<Activity[]> {
    return ActivitiesService.getActivities(userId, limit);
}

// Wrapper for Leads page
export async function getLeads(userId: string): Promise<Lead[]> {
    return LeadsService.getLeads(userId);
}

// ============================================
// PROFILE SERVICE
// ============================================

export interface UserProfile {
    uid: string;
    email: string;
    onboarded: boolean;
    tier: 'free' | 'pro' | 'enterprise';
    createdAt: number;
    updatedAt: number;
}

export const ProfileService = {
    async getProfile(userId: string): Promise<UserProfile | null> {
        const profileRef = doc(db, 'users', userId);
        const snapshot = await getDoc(profileRef);
        if (!snapshot.exists()) return null;
        return { uid: snapshot.id, ...snapshot.data() } as UserProfile;
    },

    async updateProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
        const profileRef = doc(db, 'users', userId);
        const now = Date.now();
        await setDoc(profileRef, {
            ...data,
            updatedAt: now
        }, { merge: true });
    },

    async setOnboarded(userId: string): Promise<void> {
        await this.updateProfile(userId, { onboarded: true });
    }
};
