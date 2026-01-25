/**
 * Lead Enrichment API Route
 *
 * POST /api/leads/[id]/enrich - Enrich a lead with external data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { enrichLead, applyEnrichmentToLead } from '@/lib/integrations/enrichment';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        // Optional: parse body for options
        let force = false;
        try {
            const body = await request.json();
            force = body.force === true;
        } catch {
            // No body, use defaults
        }

        const db = getAdminDb();
        if (!db) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Get the lead
        const leadDoc = await db.collection('leads').doc(id).get();

        if (!leadDoc.exists) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        const lead = { id: leadDoc.id, ...leadDoc.data() } as import('@/types').Lead;

        // Check if email exists
        if (!lead.email) {
            return NextResponse.json({ error: 'Lead has no email address' }, { status: 400 });
        }

        // Enrich the lead
        const result = await enrichLead(lead, { force });

        if (!result.success || !result.data) {
            return NextResponse.json(
                { error: result.error || 'Enrichment failed' },
                { status: 422 }
            );
        }

        // Apply enrichment to lead (updates the lead document)
        await applyEnrichmentToLead(id, result.data);

        return NextResponse.json({
            success: true,
            cached: result.cached,
            enrichment: result.data,
        });
    } catch (error) {
        console.error('[Lead Enrichment] Error:', error);
        return NextResponse.json({ error: 'Enrichment failed' }, { status: 500 });
    }
}

// Get current enrichment data
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        const db = getAdminDb();
        if (!db) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Get from cache
        const cacheDoc = await db.collection('enrichment_cache').doc(id).get();

        if (!cacheDoc.exists) {
            return NextResponse.json({ enrichment: null });
        }

        return NextResponse.json({
            enrichment: cacheDoc.data(),
        });
    } catch (error) {
        console.error('[Lead Enrichment GET] Error:', error);
        return NextResponse.json({ error: 'Failed to get enrichment' }, { status: 500 });
    }
}
