/**
 * Leads API Route
 *
 * Server-side lead management with plan limit enforcement.
 *
 * POST /api/leads - Create a new lead (checks plan limits)
 * GET /api/leads - List leads for user's company
 *
 * Security:
 * - Rate limited (30 req/min for user actions)
 * - Input validation with Zod
 * - Authentication required
 * - Audit logged
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { PLAN_LIMITS, PlanTier, isLimitExceeded } from '@/lib/plans';
import {
    rateLimit,
    errorResponse,
    getUserIdFromToken,
    handleValidationError,
} from '@/lib/api-middleware';
import { createLeadSchema } from '@/lib/validation';
import { RATE_LIMITS } from '@/lib/rate-limit';
import { AuditService } from '@/lib/firebase/audit';
import { ZodError } from 'zod';
import type { Lead } from '@/types';

/**
 * Verify Firebase Auth token from Authorization header
 */
async function verifyAuth(_request: Request) {
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
        console.error('[Leads API] Token verification failed:', error);
        return null;
    }
}

/**
 * Get user's plan tier and usage
 */
async function getUserPlanAndUsage(userId: string) {
    const db = getAdminDb();

    // Get user profile
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        return { tier: 'free' as PlanTier, usage: null, companyId: null };
    }

    const userData = userDoc.data();
    const tier = (userData?.tier || 'free') as PlanTier;
    const companyId = userData?.companyId;

    if (!companyId) {
        return { tier, usage: null, companyId: null };
    }

    // Get company usage
    const usageDoc = await db
        .collection('companies')
        .doc(companyId)
        .collection('meta')
        .doc('usage')
        .get();
    const usage = usageDoc.exists ? usageDoc.data() : null;

    return { tier, usage, companyId };
}

/**
 * POST /api/leads - Create a new lead
 */
export async function POST(request: NextRequest) {
    try {
        // 0. Rate limiting - by user if authenticated, otherwise by IP
        const authHeader = request.headers.get('Authorization');
        const rateLimitKey = getUserIdFromToken(authHeader) || undefined;
        const rateLimitResult = rateLimit(request, rateLimitKey, RATE_LIMITS.userAction);
        if (rateLimitResult) {
            return rateLimitResult;
        }

        // 1. Verify authentication
        const decodedToken = await verifyAuth(request);
        if (!decodedToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = decodedToken.uid;

        // 2. Parse and validate input with Zod
        let validatedData;
        try {
            const body = await request.json();
            console.log('[Leads API] Received body:', JSON.stringify(body, null, 2));
            validatedData = createLeadSchema.parse(body);
        } catch (error) {
            console.error('[Leads API] Validation error:', error);
            if (error instanceof ZodError) {
                return handleValidationError(error);
            }
            return errorResponse('Invalid request body', 400);
        }

        // 3. Get user's plan and usage
        const { tier, usage, companyId } = await getUserPlanAndUsage(userId);

        // Use companyId from request or user profile
        const effectiveCompanyId = validatedData.companyId || companyId;

        if (!effectiveCompanyId) {
            return NextResponse.json(
                { error: 'No company associated with user. Please complete onboarding.' },
                { status: 400 }
            );
        }

        const limits = PLAN_LIMITS[tier];

        // 4. Check plan limits
        const currentLeadCount = usage?.leadCount || 0;
        const currentMonthlyLeads = usage?.leadsThisMonth || 0;

        if (isLimitExceeded(currentLeadCount, limits.leads)) {
            return NextResponse.json(
                {
                    error: 'Lead limit reached',
                    code: 'LIMIT_EXCEEDED',
                    limitType: 'leads',
                    current: currentLeadCount,
                    limit: limits.leads,
                    upgradeMessage: 'Upgrade to Pro for unlimited leads',
                },
                { status: 403 }
            );
        }

        if (isLimitExceeded(currentMonthlyLeads, limits.leadsPerMonth)) {
            return NextResponse.json(
                {
                    error: 'Monthly lead creation limit reached',
                    code: 'LIMIT_EXCEEDED',
                    limitType: 'leadsPerMonth',
                    current: currentMonthlyLeads,
                    limit: limits.leadsPerMonth,
                    upgradeMessage: 'Upgrade to Pro for unlimited monthly lead creation',
                },
                { status: 403 }
            );
        }

        // 5. Create the lead with validated data
        const db = getAdminDb();
        const now = Date.now();

        const leadData: Omit<Lead, 'id'> = {
            companyId: effectiveCompanyId,
            companyName: validatedData.businessName, // Map businessName to companyName for Lead type
            contactName: validatedData.contactName || '',
            email: validatedData.email || '',
            phone: validatedData.phone || '',
            value: validatedData.dealValue || 0,
            status: validatedData.status || 'New',
            source: 'Manual', // Default source
            notes: validatedData.notes || '',
            tags: [],
            assignedTo: userId,
            aiGenerated: false,
            enrichmentData: validatedData.enrichmentData,
            createdAt: now,
            updatedAt: now,
        };

        // Add optional fields only if they have values (Firestore doesn't like undefined)
        if (validatedData.website) {
            leadData.website = validatedData.website;
        }
        if (validatedData.industry) {
            leadData.industry = validatedData.industry;
        }

        const leadRef = await db.collection('leads').add(leadData);

        // 6. Audit log the lead creation
        try {
            await AuditService.logLeadCreated(
                effectiveCompanyId,
                userId,
                decodedToken.email || 'Unknown',
                leadRef.id,
                validatedData.businessName
            );
        } catch (auditError) {
            console.warn('[Leads API] Audit logging failed:', auditError);
            // Don't fail the request if audit logging fails
        }

        // 7. Update usage counters
        const usageRef = db
            .collection('companies')
            .doc(effectiveCompanyId)
            .collection('meta')
            .doc('usage');
        const usageDoc = await usageRef.get();

        if (usageDoc.exists) {
            // Increment existing counters
            await usageRef.update({
                leadCount: (usageDoc.data()?.leadCount || 0) + 1,
                leadsThisMonth: (usageDoc.data()?.leadsThisMonth || 0) + 1,
                lastUpdated: now,
            });
        } else {
            // Initialize usage document
            await usageRef.set({
                leadCount: 1,
                leadsThisMonth: 1,
                teamMemberCount: 1,
                emailsSentThisMonth: 0,
                activitiesThisMonth: 0,
                lastUpdated: now,
                monthStartDate: new Date().toISOString().slice(0, 7),
            });
        }

        return NextResponse.json({
            success: true,
            leadId: leadRef.id,
            lead: { id: leadRef.id, ...leadData },
        });
    } catch (error) {
        console.error('[Leads API] Error creating lead:', error);
        return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
    }
}

/**
 * GET /api/leads - List leads for user's company
 */
export async function GET(request: NextRequest) {
    try {
        // 0. Rate limiting
        const authHeader = request.headers.get('Authorization');
        const rateLimitKey = getUserIdFromToken(authHeader) || undefined;
        const rateLimitResult = rateLimit(request, rateLimitKey, RATE_LIMITS.userAction);
        if (rateLimitResult) {
            return rateLimitResult;
        }

        // 1. Verify authentication
        const decodedToken = await verifyAuth(request);
        if (!decodedToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = decodedToken.uid;

        // 2. Get user's company
        const db = getAdminDb();
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const companyId = userDoc.data()?.companyId;

        // 3. Fetch leads - ALWAYS require company or user filtering
        let leadsQuery;

        if (companyId) {
            // Multi-tenant: filter by company
            leadsQuery = db
                .collection('leads')
                .where('companyId', '==', companyId)
                .orderBy('createdAt', 'desc')
                .limit(100);
        } else {
            // No company - filter by userId as fallback (shouldn't normally happen)
            leadsQuery = db
                .collection('leads')
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .limit(100);
        }

        const leadsSnapshot = await leadsQuery.get();
        const leads = leadsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json({ leads });
    } catch (error) {
        console.error('[Leads API] Error fetching leads:', error);
        return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }
}
