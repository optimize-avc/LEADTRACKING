import { getFirebaseDb } from '@/lib/firebase/config';
import {
    collection,
    query,
    getDocs,
    getDoc,
    orderBy,
    limit,
    where,
    doc,
    updateDoc,
    Timestamp,
    addDoc,
} from 'firebase/firestore';

export interface Lead {
    id: string;
    companyName: string;
    contactName: string;
    email?: string;
    value: number;
    status: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed' | 'Lost';
    source: string;
    stage?: string; // Discord stage
    discordChannelId?: string;
    notes: string;
    tags: string[];
    createdAt: Timestamp | number;
    updatedAt: Timestamp | number;
    aiGenerated: boolean;
    location?: string;
    companyId?: string;
    userId?: string;
}

export const LeadsService = {
    // Get user's companyId from their profile
    async getUserCompanyId(userId: string): Promise<string | null> {
        const userRef = doc(getFirebaseDb(), 'users', userId);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) return null;
        return userDoc.data()?.companyId || null;
    },

    // Get leads for dashboard - filtered by user's company
    async getLeads(userId: string, limitCount: number = 50): Promise<Lead[]> {
        // First get the user's companyId
        const companyId = await this.getUserCompanyId(userId);
        
        const leadsRef = collection(getFirebaseDb(), 'leads');
        let q;
        
        if (companyId) {
            // Multi-tenant: filter by company
            q = query(
                leadsRef, 
                where('companyId', '==', companyId),
                orderBy('createdAt', 'desc'), 
                limit(limitCount)
            );
        } else {
            // Fallback: filter by userId (for users without a company)
            q = query(
                leadsRef, 
                where('userId', '==', userId),
                orderBy('createdAt', 'desc'), 
                limit(limitCount)
            );
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Lead[];
    },

    // Update Lead Status - THIS TRIGGERS THE BOT AND CHANNEL CREATION
    async updateLeadStatus(leadId: string, newStatus: Lead['status']): Promise<void> {
        const leadRef = doc(getFirebaseDb(), 'leads', leadId);

        await updateDoc(leadRef, {
            status: newStatus,
            updatedAt: Date.now(),
        });
    },
};
