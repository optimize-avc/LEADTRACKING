import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

/**
 * GET: Check if user has a company
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 });
        }

        const db = getAdminDb();
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        return NextResponse.json({
            hasCompany: !!userData?.companyId,
            companyId: userData?.companyId || null,
        });
    } catch (error: unknown) {
        console.error('Check company error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to check company' },
            { status: 500 }
        );
    }
}

/**
 * POST: Bootstrap a company for a user who doesn't have one
 * This is used for initial setup / testing
 */
export async function POST(request: NextRequest) {
    try {
        const { userId, email, companyName } = await request.json();

        if (!userId || !email) {
            return NextResponse.json({ error: 'userId and email required' }, { status: 400 });
        }

        const db = getAdminDb();

        // Check if user already has a company
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        if (userData?.companyId) {
            return NextResponse.json({
                message: 'User already has a company',
                companyId: userData.companyId,
            });
        }

        // Create a new company
        const now = Date.now();
        const name = companyName || email.split('@')[1]?.split('.')[0] || 'My Company';

        const companyRef = await db.collection('companies').add({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            plan: 'free',
            ownerId: userId,
            members: [userId],
            settings: {},
            integrations: {},
            features: {
                aiLeadScoring: true,
                bulkActions: false,
                enrichment: false,
                realityLink: true,
            },
            limits: {
                leads: 100,
                users: 1,
                emailsPerMonth: 100,
            },
            createdAt: now,
            updatedAt: now,
        });

        // Link user to the company
        await db.collection('users').doc(userId).set(
            {
                companyId: companyRef.id,
                updatedAt: now,
            },
            { merge: true }
        );

        return NextResponse.json({
            success: true,
            companyId: companyRef.id,
            message: 'Company created and linked to user',
        });
    } catch (error: unknown) {
        console.error('Bootstrap company error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to bootstrap company' },
            { status: 500 }
        );
    }
}
