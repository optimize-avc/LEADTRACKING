/**
 * API Route: Update Company Settings (Server-Side)
 *
 * Uses Firebase Admin SDK to update company settings.
 * Only allows updates if user belongs to company and is admin.
 *
 * PATCH /api/company/settings
 * Body: { companyId: string, settings: Partial<CompanySettings> }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, verifyIdToken } from '@/lib/firebase/admin';

export async function PATCH(request: NextRequest) {
    try {
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
        const { companyId, settings } = body;

        if (!companyId || !settings) {
            return NextResponse.json(
                { error: 'companyId and settings are required' },
                { status: 400 }
            );
        }

        const db = getAdminDb();

        // 3. Verify user belongs to company and is admin
        const userRef = db.collection('users').doc(user.uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userData = userDoc.data();
        if (userData?.companyId !== companyId) {
            return NextResponse.json({ error: 'User does not belong to this company' }, { status: 403 });
        }

        if (userData?.role !== 'admin') {
            return NextResponse.json({ error: 'Only admins can update company settings' }, { status: 403 });
        }

        // 4. Get current company settings
        const companyRef = db.collection('companies').doc(companyId);
        const companyDoc = await companyRef.get();

        if (!companyDoc.exists) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        const currentSettings = companyDoc.data()?.settings || {};

        // 5. Merge and update settings
        await companyRef.update({
            settings: { ...currentSettings, ...settings },
            updatedAt: Date.now(),
        });

        console.log(`[API] Company settings updated: ${companyId} by user: ${user.uid}`);

        return NextResponse.json({
            success: true,
            message: 'Settings updated successfully',
        });
    } catch (error) {
        console.error('[API] Error updating company settings:', error);
        return NextResponse.json(
            { error: 'Failed to update settings', details: String(error) },
            { status: 500 }
        );
    }
}
