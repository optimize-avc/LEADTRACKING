/**
 * Lead Enrichment API Route
 *
 * POST /api/leads/[id]/enrich - Enrich a lead with external data
 * GET /api/leads/[id]/enrich - Get current enrichment data
 *
 * Security:
 * - Authentication required
 * - User must have access to the lead's company
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { enrichLead, applyEnrichmentToLead } from '@/lib/integrations/enrichment';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * Verify Firebase Auth token from Authorization header
 */
async function verifyAuth() {
    const headersList = await headers();
    const authHeader = headersList.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);

    try {
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(token);
        return decodedToken;
    } catch (error) {
        console.error('[Lead Enrichment] Token verification failed:', error);
        return null;
    }
}

/**
 * Check if user has access to this lead (same company)
 */
async function userCanAccessLead(
    userId: string,
    leadId: string
): Promise<{ allowed: boolean; lead?: import('@/types').Lead }> {
    const db = getAdminDb();
    if (!db) return { allowed: false };

    // Get user's company
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return { allowed: false };

    const userCompanyId = userDoc.data()?.companyId;

    // Get the lead
    const leadDoc = await db.collection('leads').doc(leadId).get();
    if (!leadDoc.exists) return { allowed: false };

    const lead = { id: leadDoc.id, ...leadDoc.data() } as import('@/types').Lead;

    // Check if lead belongs to user's company
    if (lead.companyId && lead.companyId !== userCompanyId) {
        return { allowed: false };
    }

    return { allowed: true, lead };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        // 1. Verify authentication
        const decodedToken = await verifyAuth();
        if (!decodedToken) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { id } = await params;

        // 2. Verify user has access to this lead
        const { allowed, lead } = await userCanAccessLead(decodedToken.uid, id);
        if (!allowed || !lead) {
            return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 });
        }

        // 3. Parse options from body
        let force = false;
        try {
            const body = await request.json();
            force = body.force === true;
        } catch {
            // No body, use defaults
        }

        // 4. Check if email exists
        if (!lead.email) {
            return NextResponse.json({ error: 'Lead has no email address' }, { status: 400 });
        }

        // 5. Enrich the lead
        const result = await enrichLead(lead, { force });

        if (!result.success || !result.data) {
            return NextResponse.json(
                { error: result.error || 'Enrichment failed' },
                { status: 422 }
            );
        }

        // 6. Apply enrichment to lead (updates the lead document)
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
        // 1. Verify authentication
        const decodedToken = await verifyAuth();
        if (!decodedToken) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { id } = await params;

        // 2. Verify user has access to this lead
        const { allowed } = await userCanAccessLead(decodedToken.uid, id);
        if (!allowed) {
            return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 });
        }

        const db = getAdminDb();
        if (!db) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // 3. Get from cache
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
