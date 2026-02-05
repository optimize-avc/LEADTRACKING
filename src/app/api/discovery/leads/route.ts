/**
 * Discovered Leads API
 * GET - List discovered leads for the company
 * PATCH - Update lead status (review, dismiss)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuthContext } from '@/lib/api/auth-helpers';
import { DiscoveredLead, DiscoveredLeadStatus } from '@/types/discovery';

export async function GET(request: NextRequest) {
    const auth = await getAuthContext(request);
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const db = getAdminDb();
        const { searchParams } = new URL(request.url);

        const status = searchParams.get('status') as DiscoveredLeadStatus | null;
        const limitParam = parseInt(searchParams.get('limit') || '50');
        const offsetParam = parseInt(searchParams.get('offset') || '0');

        const collectionRef = db
            .collection('companies')
            .doc(auth.companyId)
            .collection('discoveredLeads');

        // Check if collection has any documents first (handles new companies)
        const checkSnapshot = await collectionRef.limit(1).get();
        if (checkSnapshot.empty) {
            // Return empty result for new companies without discovered leads
            return NextResponse.json({
                leads: [],
                total: 0,
                limit: limitParam,
                offset: offsetParam,
            });
        }

        // Build query - filter first, then order
        // This is the correct order for Firestore composite queries
        let query: FirebaseFirestore.Query = collectionRef;

        if (status) {
            query = query.where('status', '==', status);
        }

        // Order by discoveredAt descending
        query = query.orderBy('discoveredAt', 'desc');

        // Apply pagination
        const snapshot = await query.limit(limitParam + offsetParam).get();
        const allDocs = snapshot.docs.slice(offsetParam, offsetParam + limitParam);

        const leads = allDocs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as DiscoveredLead[];

        // Get total count for the filtered query
        let totalQuery: FirebaseFirestore.Query = collectionRef;
        if (status) {
            totalQuery = totalQuery.where('status', '==', status);
        }
        const totalSnapshot = await totalQuery.count().get();

        return NextResponse.json({
            leads,
            total: totalSnapshot.data().count,
            limit: limitParam,
            offset: offsetParam,
        });
    } catch (error) {
        console.error('[Discovery Leads] Error fetching discovered leads:', error);

        // Check if it's a missing index error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('index')) {
            console.error(
                '[Discovery Leads] Missing Firestore index. Run: firebase deploy --only firestore:indexes'
            );
            return NextResponse.json(
                {
                    error: 'Database configuration issue. Please contact support.',
                    _debug: 'Missing Firestore composite index for discoveredLeads',
                },
                { status: 500 }
            );
        }

        // Return empty state for other errors
        return NextResponse.json({
            leads: [],
            total: 0,
            limit: 50,
            offset: 0,
            _error: 'Discovery not configured',
        });
    }
}

export async function PATCH(request: NextRequest) {
    const auth = await getAuthContext(request);
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
        const leadRef = db
            .collection('companies')
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

        // Update profile stats (with error handling - don't fail if profile doesn't exist)
        try {
            const profileRef = db
                .collection('companies')
                .doc(auth.companyId)
                .collection('discoveryProfile')
                .doc('current');

            const profileSnap = await profileRef.get();
            if (profileSnap.exists) {
                if (status === 'added_to_pipeline') {
                    await profileRef.update({
                        'stats.leadsAddedToPipeline': FieldValue.increment(1),
                    });
                } else if (status === 'dismissed') {
                    await profileRef.update({
                        'stats.leadsDismissed': FieldValue.increment(1),
                    });
                }
            }
        } catch (statsError) {
            // Log but don't fail the main operation
            console.warn('[Discovery Leads] Failed to update discovery stats:', statsError);
        }

        const updatedSnap = await leadRef.get();
        return NextResponse.json({
            success: true,
            lead: { id: updatedSnap.id, ...updatedSnap.data() },
        });
    } catch (error) {
        console.error('[Discovery Leads] Error updating lead:', error);
        return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
    }
}
