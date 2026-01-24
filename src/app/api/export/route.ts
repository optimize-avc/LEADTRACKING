import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

/**
 * Data Export API
 *
 * Exports all company data for GDPR right-to-data-portability compliance.
 * Supports JSON and CSV formats.
 */

interface ExportRequest {
    userId: string;
    companyId: string;
    format: 'json' | 'csv';
    includeTypes?: ('leads' | 'activities' | 'resources' | 'team')[];
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as ExportRequest;
        const { userId, companyId, format = 'json', includeTypes } = body;

        if (!userId || !companyId) {
            return new NextResponse('Missing userId or companyId', { status: 400 });
        }

        // Verify user belongs to company
        const db = getAdminDb();
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            return new NextResponse('User not found', { status: 404 });
        }

        const userData = userDoc.data();
        if (userData?.companyId !== companyId) {
            return new NextResponse('Unauthorized', { status: 403 });
        }

        // Collect all data
        const exportData: Record<string, unknown[]> = {};
        const typesToExport = includeTypes || ['leads', 'activities', 'resources', 'team'];

        // Export leads
        if (typesToExport.includes('leads')) {
            const leadsSnap = await db
                .collection('leads')
                .where('companyId', '==', companyId)
                .get();

            // Also get leads without companyId for legacy data
            const allLeadsSnap = await db.collection('leads').get();
            const leads = leadsSnap.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            // Add legacy leads assigned to this user
            const legacyLeads = allLeadsSnap.docs
                .filter((doc) => !doc.data().companyId && doc.data().assignedTo === userId)
                .map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));

            exportData.leads = [...leads, ...legacyLeads];
        }

        // Export activities
        if (typesToExport.includes('activities')) {
            // Activities from leads
            const leadActivities: unknown[] = [];
            if (exportData.leads) {
                for (const lead of exportData.leads as { id: string }[]) {
                    const activitiesSnap = await db
                        .collection('leads')
                        .doc(lead.id)
                        .collection('activities')
                        .get();

                    activitiesSnap.docs.forEach((doc) => {
                        leadActivities.push({
                            id: doc.id,
                            leadId: lead.id,
                            ...doc.data(),
                        });
                    });
                }
            }

            // User's personal activities
            const userActivitiesSnap = await db
                .collection('users')
                .doc(userId)
                .collection('activities')
                .get();

            const userActivities = userActivitiesSnap.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            exportData.activities = [...leadActivities, ...userActivities];
        }

        // Export resources
        if (typesToExport.includes('resources')) {
            const resourcesSnap = await db
                .collection('resources')
                .where('createdBy', '==', userId)
                .get();

            exportData.resources = resourcesSnap.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
        }

        // Export team members (admin only)
        if (typesToExport.includes('team') && userData?.role === 'admin') {
            const teamSnap = await db.collection('users').where('companyId', '==', companyId).get();

            exportData.team = teamSnap.docs.map((doc) => {
                const data = doc.data();
                // Exclude sensitive fields
                return {
                    id: doc.id,
                    email: data.email,
                    name: data.name || data.displayName,
                    role: data.role,
                    createdAt: data.createdAt,
                };
            });
        }

        // Format response based on requested format
        if (format === 'csv') {
            // Convert to CSV
            const csvParts: string[] = [];

            for (const [type, records] of Object.entries(exportData)) {
                if (records.length === 0) continue;

                // Get all unique keys from records
                const keys = new Set<string>();
                (records as Record<string, unknown>[]).forEach((record) => {
                    Object.keys(record).forEach((key) => keys.add(key));
                });

                const headers = Array.from(keys);
                csvParts.push(`\n--- ${type.toUpperCase()} ---\n`);
                csvParts.push(headers.join(','));

                (records as Record<string, unknown>[]).forEach((record) => {
                    const row = headers.map((h) => {
                        const value = record[h];
                        if (value === null || value === undefined) return '';
                        if (typeof value === 'object') return JSON.stringify(value);
                        const strValue = String(value);
                        // Escape CSV special characters
                        if (
                            strValue.includes(',') ||
                            strValue.includes('"') ||
                            strValue.includes('\n')
                        ) {
                            return `"${strValue.replace(/"/g, '""')}"`;
                        }
                        return strValue;
                    });
                    csvParts.push(row.join(','));
                });
            }

            return new NextResponse(csvParts.join('\n'), {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="salestracker-export-${Date.now()}.csv"`,
                },
            });
        }

        // Return JSON
        return NextResponse.json(
            {
                exportedAt: new Date().toISOString(),
                companyId,
                userId,
                data: exportData,
            },
            {
                headers: {
                    'Content-Disposition': `attachment; filename="salestracker-export-${Date.now()}.json"`,
                },
            }
        );
    } catch (error: unknown) {
        console.error('[Export Error]:', error);
        return new NextResponse(error instanceof Error ? error.message : 'Export failed', {
            status: 500,
        });
    }
}
