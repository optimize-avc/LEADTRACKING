/**
 * Discovered Leads API
 * GET - List discovered leads for the company
 * PATCH - Update lead status (review, dismiss)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { DiscoveredLead, DiscoveredLeadStatus } from '@/types/discovery';

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

export async function GET(request: NextRequest) {
    const auth = await getCompanyIdFromToken(request);
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const db = getAdminDb();
        const { searchParams } = new URL(request.url);
        
        const status = searchParams.get('status') as DiscoveredLeadStatus | null;
        const limitParam = parseInt(searchParams.get('limit') || '50');
        const offsetParam = parseInt(searchParams.get('offset') || '0');

        let query = db.collection('companies')
            .doc(auth.companyId)
            .collection('discoveredLeads')
            .orderBy('discoveredAt', 'desc');

        if (status) {
            query = query.where('status', '==', status);
        }

        // Apply pagination
        const snapshot = await query.limit(limitParam + offsetParam).get();
        const allDocs = snapshot.docs.slice(offsetParam, offsetParam + limitParam);
        
        const leads = allDocs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as DiscoveredLead[];

        // Get total count
        const totalSnapshot = await db.collection('companies')
            .doc(auth.companyId)
            .collection('discoveredLeads')
            .count()
            .get();

        return NextResponse.json({
            leads,
            total: totalSnapshot.data().count,
            limit: limitParam,
            offset: offsetParam,
        });
    } catch (error) {
        console.error('Error fetching discovered leads:', error);
        return NextResponse.json(
            { error: 'Failed to fetch discovered leads' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    const auth = await getCompanyIdFromToken(request);
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { leadId, status, dismissReason, pipelineLeadId } = body;

        if (!leadId) {
            return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
        }

        if (!status || !['reviewed', 'added_to_pipeline', 'dismissed'].includes(status)) {
            return NextResponse.json({ error: 'Valid status is required' }, { status: 400 });
        }

        const db = getAdminDb();
        const leadRef = db.collection('companies')
            .doc(auth.companyId)
            .collection('discoveredLeads')
            .doc(leadId);

        const leadSnap = await leadRef.get();
        if (!leadSnap.exists) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        const updates: Record<string, unknown> = {
            status,
            reviewedAt: Date.now(),
            reviewedBy: auth.userId,
        };

        if (status === 'dismissed' && dismissReason) {
            updates.dismissReason = dismissReason;
        }

        if (status === 'added_to_pipeline' && pipelineLeadId) {
            updates.pipelineLeadId = pipelineLeadId;
        }

        await leadRef.update(updates);

        // Update profile stats
        const profileRef = db.collection('companies')
            .doc(auth.companyId)
            .collection('discoveryProfile')
            .doc('current');

        if (status === 'added_to_pipeline') {
            await profileRef.update({
                'stats.leadsAddedToPipeline': FieldValue.increment(1),
            });
        } else if (status === 'dismissed') {
            await profileRef.update({
                'stats.leadsDismissed': FieldValue.increment(1),
            });
        }

        const updatedSnap = await leadRef.get();
        return NextResponse.json({
            success: true,
            lead: { id: updatedSnap.id, ...updatedSnap.data() },
        });
    } catch (error) {
        console.error('Error updating lead:', error);
        return NextResponse.json(
            { error: 'Failed to update lead' },
            { status: 500 }
        );
    }
}
