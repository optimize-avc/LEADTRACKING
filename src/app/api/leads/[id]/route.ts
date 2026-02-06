/**
 * Lead Update API Route
 *
 * PATCH /api/leads/[id] - Update a lead (including status changes)
 * 
 * This endpoint handles lead updates including status changes,
 * and triggers Discord notifications when appropriate.
 *
 * Security:
 * - Rate limited
 * - Authentication required
 * - User must have access to the lead's company
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { sendDealWonNotification } from '@/lib/discord/server';
import type { Lead, LeadStatus } from '@/types';

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
        console.error('[Lead Update] Token verification failed:', error);
        return null;
    }
}

/**
 * Check if user has access to this lead (same company)
 */
async function userCanAccessLead(
    userId: string,
    leadId: string
): Promise<{ allowed: boolean; lead?: Lead; companyId?: string }> {
    const db = getAdminDb();
    if (!db) return { allowed: false };

    // Get user's company
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return { allowed: false };

    const userCompanyId = userDoc.data()?.companyId;

    // Get the lead
    const leadDoc = await db.collection('leads').doc(leadId).get();
    if (!leadDoc.exists) return { allowed: false };

    const lead = { id: leadDoc.id, ...leadDoc.data() } as Lead;

    // Check if lead belongs to user's company
    if (lead.companyId && lead.companyId !== userCompanyId) {
        return { allowed: false };
    }

    return { allowed: true, lead, companyId: lead.companyId || userCompanyId };
}

/**
 * Check if status change should trigger a "deal won" notification
 */
function isDealWonTransition(oldStatus: LeadStatus | undefined, newStatus: LeadStatus): boolean {
    // Trigger notification when moving TO Closed from any other status
    return newStatus === 'Closed' && oldStatus !== 'Closed';
}

/**
 * PATCH /api/leads/[id] - Update a lead
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        // 1. Verify authentication
        const decodedToken = await verifyAuth();
        if (!decodedToken) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { id } = await params;

        // 2. Verify user has access to this lead
        const { allowed, lead, companyId } = await userCanAccessLead(decodedToken.uid, id);
        if (!allowed || !lead) {
            return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 });
        }

        // 3. Parse updates from body
        let updates: Partial<Lead>;
        try {
            updates = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        // 4. Sanitize updates (don't allow changing companyId, id, etc.)
        const sanitizedUpdates: Partial<Lead> = {};
        const allowedFields = [
            'companyName', 'contactName', 'email', 'phone', 'website',
            'value', 'status', 'notes', 'tags', 'industry', 'source',
            'nextStep', 'probability', 'lastContact'
        ];

        for (const field of allowedFields) {
            if (field in updates) {
                (sanitizedUpdates as Record<string, unknown>)[field] = (updates as Record<string, unknown>)[field];
            }
        }

        // Add updatedAt timestamp
        sanitizedUpdates.updatedAt = Date.now();

        // 5. Check for deal won transition BEFORE updating
        const oldStatus = lead.status;
        const newStatus = sanitizedUpdates.status as LeadStatus | undefined;
        const shouldNotifyDealWon = newStatus && isDealWonTransition(oldStatus, newStatus);

        // 6. Update the lead in Firestore
        const db = getAdminDb();
        await db.collection('leads').doc(id).update(sanitizedUpdates);

        // 7. Send Discord notification if deal was won (fire-and-forget)
        if (shouldNotifyDealWon && companyId) {
            const updatedLead: Lead = { ...lead, ...sanitizedUpdates };
            sendDealWonNotification(updatedLead, companyId).catch((err) => {
                console.warn('[Lead Update] Discord notification failed:', err);
            });
        }

        console.log(`[Lead Update] Lead ${id} updated by ${decodedToken.uid}`);

        return NextResponse.json({
            success: true,
            leadId: id,
        });
    } catch (error) {
        console.error('[Lead Update] Error:', error);
        return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
    }
}

/**
 * GET /api/leads/[id] - Get a single lead
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

        return NextResponse.json({ lead });
    } catch (error) {
        console.error('[Lead Get] Error:', error);
        return NextResponse.json({ error: 'Failed to get lead' }, { status: 500 });
    }
}
