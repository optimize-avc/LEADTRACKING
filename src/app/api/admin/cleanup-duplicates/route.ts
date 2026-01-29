import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

export async function POST(_request: NextRequest) {
    try {
        const adminDb = getAdminDb();

        // Get all leads
        const snapshot = await adminDb.collection('leads').get();
        const leads: Array<{ id: string; companyName: string; createdAt: number }> = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            leads.push({
                id: doc.id,
                companyName: data.companyName || '',
                createdAt: data.createdAt || 0,
            });
        });

        // Normalize and group by company name
        const byName: Record<string, typeof leads> = {};
        leads.forEach((lead) => {
            const name = lead.companyName
                .toLowerCase()
                .trim()
                .replace(/\s+/g, ' ')
                .replace(/[^\w\s]/g, ''); // Remove punctuation
            if (!name) return;
            if (!byName[name]) byName[name] = [];
            byName[name].push(lead);
        });

        // Find duplicates and delete older ones
        const toDelete: string[] = [];
        const duplicateGroups: Array<{ name: string; kept: string; deleted: string[] }> = [];

        for (const [_name, arr] of Object.entries(byName)) {
            if (arr.length <= 1) continue;

            // Sort by createdAt descending (newest first)
            arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            const kept = arr[0];
            const deleted = arr.slice(1);

            duplicateGroups.push({
                name: arr[0].companyName,
                kept: kept.id,
                deleted: deleted.map((d) => d.id),
            });

            toDelete.push(...deleted.map((d) => d.id));
        }

        // Delete duplicates
        const batch = adminDb.batch();
        for (const id of toDelete) {
            batch.delete(adminDb.collection('leads').doc(id));
        }
        await batch.commit();

        return NextResponse.json({
            success: true,
            totalLeads: leads.length,
            duplicateGroups: duplicateGroups.length,
            deleted: toDelete.length,
            remaining: leads.length - toDelete.length,
            details: duplicateGroups,
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        return NextResponse.json(
            { error: 'Failed to clean duplicates', details: String(error) },
            { status: 500 }
        );
    }
}
