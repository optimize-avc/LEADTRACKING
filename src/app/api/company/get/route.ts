/**
 * API Route: Get Company (Server-Side)
 *
 * Uses Firebase Admin SDK to get a user's company data.
 * This bypasses Firestore security rules for bootstrapping new users.
 *
 * GET /api/company/get
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, verifyIdToken } from '@/lib/firebase/admin';

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

        // 2. Get user document
        const userRef = db.collection('users').doc(user.uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return NextResponse.json({ company: null, message: 'User not found' });
        }

        const companyId = userDoc.data()?.companyId;
        if (!companyId) {
            return NextResponse.json({ company: null, message: 'User has no company' });
        }

        // 3. Get company document
        const companyRef = db.collection('companies').doc(companyId);
        const companyDoc = await companyRef.get();

        if (!companyDoc.exists) {
            return NextResponse.json({ company: null, message: 'Company not found' });
        }

        return NextResponse.json({
            company: {
                id: companyDoc.id,
                ...companyDoc.data(),
            },
        });
    } catch (error) {
        console.error('[API] Error getting company:', error);
        return NextResponse.json(
            { error: 'Failed to get company', details: String(error) },
            { status: 500 }
        );
    }
}
