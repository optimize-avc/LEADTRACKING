import { getFirebaseDb } from '@/lib/firebase/config';
import {
    collection,
    query,
    getDocs,
    orderBy,
    limit,
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
}

export const LeadsService = {
    // Get leads for dashboard
    async getLeads(limitCount: number = 50): Promise<Lead[]> {
        const leadsRef = collection(getFirebaseDb(), 'leads');
        const q = query(leadsRef, orderBy('createdAt', 'desc'), limit(limitCount));

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
