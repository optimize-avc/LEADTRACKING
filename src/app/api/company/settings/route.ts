/**
 * API Route: Update Company Settings (Server-Side)
 *
 * Uses Firebase Admin SDK to update company settings.
 * This bypasses Firestore security rules since it runs with admin credentials.
 *
 * PATCH /api/company/settings
 * Body: { companyId: string, settings: Partial<CompanySettings> }
 * 
 * Supports updating:
 * - channelMapping
 * - industry
 * - persona
 * - qualificationRules
 * - emailConfig
 * - twilioConfig
 * - prompts
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

        if (!companyId || typeof companyId !== 'string') {
            return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
        }

        if (!settings || typeof settings !== 'object') {
            return NextResponse.json({ error: 'Settings object is required' }, { status: 400 });
        }

        const db = getAdminDb();

        // 3. Verify user belongs to this company and is admin/owner
        const userRef = db.collection('users').doc(user.uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userData = userDoc.data();
        
        // Check user belongs to the company
        if (userData?.companyId !== companyId) {
            return NextResponse.json({ error: 'User does not belong to this company' }, { status: 403 });
        }

        // Check user is admin or owner
        const companyRef = db.collection('companies').doc(companyId);
        const companyDoc = await companyRef.get();

        if (!companyDoc.exists) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        const companyData = companyDoc.data();
        const isOwner = companyData?.ownerId === user.uid;
        const isAdmin = userData?.role === 'admin';

        if (!isOwner && !isAdmin) {
            return NextResponse.json({ error: 'Only admins can update company settings' }, { status: 403 });
        }

        // 4. Merge settings
        const currentSettings = companyData?.settings || {};
        const updatedSettings = { ...currentSettings };

        // Merge each setting individually to preserve nested objects
        const allowedSettings = [
            'channelMapping',
            'industry', 
            'persona',
            'qualificationRules',
            'emailConfig',
            'twilioConfig',
            'prompts'
        ];

        for (const key of allowedSettings) {
            if (settings[key] !== undefined) {
                if (typeof settings[key] === 'object' && !Array.isArray(settings[key])) {
                    // Merge objects
                    updatedSettings[key] = { ...(currentSettings[key] || {}), ...settings[key] };
                } else {
                    // Replace primitives and arrays
                    updatedSettings[key] = settings[key];
                }
            }
        }

        // 5. Update company
        await companyRef.update({
            settings: updatedSettings,
            updatedAt: Date.now(),
        });

        console.log(`[API] Company settings updated: ${companyId} by user: ${user.uid}`);

        return NextResponse.json({
            success: true,
            message: 'Settings updated successfully',
            settings: updatedSettings,
        });
    } catch (error) {
        console.error('[API] Error updating company settings:', error);
        return NextResponse.json(
            { error: 'Failed to update settings', details: String(error) },
            { status: 500 }
        );
    }
}

// GET endpoint to fetch current settings
export async function GET(request: NextRequest) {
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

        const db = getAdminDb();

        // 2. Get user's company
        const userRef = db.collection('users').doc(user.uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userData = userDoc.data();
        const companyId = userData?.companyId;

        if (!companyId) {
            return NextResponse.json({ error: 'User does not belong to a company' }, { status: 404 });
        }

        // 3. Get company settings
        const companyRef = db.collection('companies').doc(companyId);
        const companyDoc = await companyRef.get();

        if (!companyDoc.exists) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        const companyData = companyDoc.data();

        return NextResponse.json({
            success: true,
            companyId,
            settings: companyData?.settings || {},
        });
    } catch (error) {
        console.error('[API] Error fetching company settings:', error);
        return NextResponse.json(
            { error: 'Failed to fetch settings', details: String(error) },
            { status: 500 }
        );
    }
}
