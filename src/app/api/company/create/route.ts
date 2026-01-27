/**
 * API Route: Create Company (Server-Side)
 *
 * Uses Firebase Admin SDK to create a company and link it to the user.
 * This bypasses Firestore security rules since it runs with admin credentials.
 *
 * POST /api/company/create
 * Body: { name: string, settings?: Partial<CompanySettings> }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, verifyIdToken } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { rateLimit, handleValidationError } from '@/lib/api-middleware';
import { createCompanySchema } from '@/lib/validation';
import { RATE_LIMITS } from '@/lib/rate-limit';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
    try {
        // 0. Rate limiting - prevent company spam creation
        const rateLimitResult = rateLimit(request, undefined, RATE_LIMITS.userAction);
        if (rateLimitResult) {
            return rateLimitResult;
        }

        // 1. Verify authentication
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const user = await verifyIdToken(token);

        if (!user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // 2. Parse request body
        const body = await request.json();
        const { name, settings } = body;

        if (!name || typeof name !== 'string') {
            return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
        }

        const db = getAdminDb();

        // 3. Check if user already has a company
        const userRef = db.collection('users').doc(user.uid);
        const userDoc = await userRef.get();

        if (userDoc.exists && userDoc.data()?.companyId) {
            return NextResponse.json(
                { error: 'User already belongs to a company', companyId: userDoc.data()?.companyId },
                { status: 400 }
            );
        }

        // 4. Create company with default settings
        const defaultSettings = {
            industry: '',
            persona: 'professional' as const,
            qualificationRules: [] as string[],
            prompts: {
                research: 'Research this business and identify their digital footprint defects.',
                qualification: 'Analyze if this lead meets our qualification criteria.',
            },
            channelMapping: {} as Record<string, string>,
            ...settings,
        };

        const now = Date.now();
        const companyRef = db.collection('companies').doc();

        await companyRef.set({
            name,
            ownerId: user.uid,
            settings: defaultSettings,
            createdAt: now,
            updatedAt: now,
        });

        // 5. Link user to company and set as admin
        if (userDoc.exists) {
            await userRef.update({
                companyId: companyRef.id,
                role: 'admin',
                updatedAt: now,
            });
        } else {
            // Create user document if it doesn't exist
            await userRef.set({
                email: user.email || '',
                name: user.name || '',
                companyId: companyRef.id,
                role: 'admin',
                createdAt: now,
                updatedAt: now,
            });
        }

        console.log(`[API] Company created: ${companyRef.id} for user: ${user.uid}`);

        return NextResponse.json({
            success: true,
            companyId: companyRef.id,
            message: 'Company created successfully',
        });
    } catch (error) {
        console.error('[API] Error creating company:', error);
        return NextResponse.json(
            { error: 'Failed to create company', details: String(error) },
            { status: 500 }
        );
    }
}
