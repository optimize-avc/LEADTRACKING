/**
 * Discovery Profile API
 * GET - Get company's discovery profile
 * POST - Create/update discovery profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { getAuthContext } from '@/lib/api/auth-helpers';
import {
    DiscoveryProfile,
    createDefaultDiscoveryProfile,
    TargetingCriteria,
    DiscoverySchedule,
    DiscoveryNotifications,
} from '@/types/discovery';

interface RequestBody {
    businessDescription?: string;
    targetingCriteria?: Partial<TargetingCriteria>;
    schedule?: Partial<DiscoverySchedule>;
    notifications?: Partial<DiscoveryNotifications>;
}

export async function GET(request: NextRequest) {
    const auth = await getAuthContext(request);
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const db = getAdminDb();
        const profileRef = db
            .collection('companies')
            .doc(auth.companyId)
            .collection('discoveryProfile')
            .doc('current');
        const profileSnap = await profileRef.get();

        if (!profileSnap.exists) {
            // Return default profile structure (not saved yet)
            const defaultProfile = createDefaultDiscoveryProfile(auth.companyId);
            return NextResponse.json({
                profile: { ...defaultProfile, id: 'current' },
                isNew: true,
            });
        }

        return NextResponse.json({
            profile: { id: profileSnap.id, ...profileSnap.data() } as DiscoveryProfile,
            isNew: false,
        });
    } catch (error) {
        console.error('Error fetching discovery profile:', error);

        // Return default profile on error (better UX than 500)
        const defaultProfile = createDefaultDiscoveryProfile(auth.companyId);
        return NextResponse.json({
            profile: { ...defaultProfile, id: 'current' },
            isNew: true,
            _error: 'Could not load saved profile',
        });
    }
}

export async function POST(request: NextRequest) {
    const auth = await getAuthContext(request);
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body: RequestBody = await request.json();
        const db = getAdminDb();
        const profileRef = db
            .collection('companies')
            .doc(auth.companyId)
            .collection('discoveryProfile')
            .doc('current');

        const existing = await profileRef.get();
        const now = Date.now();

        let profileData: Partial<DiscoveryProfile>;

        if (existing.exists) {
            // Update existing
            const currentData = existing.data() as DiscoveryProfile;
            profileData = {
                ...currentData,
                updatedAt: now,
            };

            // Merge in updates
            if (body.businessDescription !== undefined) {
                profileData.businessDescription = body.businessDescription;
            }
            if (body.targetingCriteria) {
                profileData.targetingCriteria = {
                    ...currentData.targetingCriteria,
                    ...body.targetingCriteria,
                };
            }
            if (body.schedule) {
                profileData.schedule = {
                    ...currentData.schedule,
                    ...body.schedule,
                };
            }
            if (body.notifications) {
                profileData.notifications = {
                    discord: {
                        ...currentData.notifications.discord,
                        ...body.notifications.discord,
                    },
                    email: {
                        ...currentData.notifications.email,
                        ...body.notifications.email,
                    },
                    inApp: {
                        ...currentData.notifications.inApp,
                        ...body.notifications.inApp,
                    },
                };
            }

            await profileRef.update(profileData);
        } else {
            // Create new
            const defaultProfile = createDefaultDiscoveryProfile(auth.companyId);
            profileData = {
                ...defaultProfile,
                id: 'current',
                companyId: auth.companyId,
                createdAt: now,
                updatedAt: now,
            };

            // Apply initial values
            if (body.businessDescription) {
                profileData.businessDescription = body.businessDescription;
            }
            if (body.targetingCriteria) {
                profileData.targetingCriteria = {
                    ...defaultProfile.targetingCriteria,
                    ...body.targetingCriteria,
                };
            }
            if (body.schedule) {
                profileData.schedule = {
                    ...defaultProfile.schedule,
                    ...body.schedule,
                };
            }
            if (body.notifications) {
                profileData.notifications = {
                    discord: {
                        ...defaultProfile.notifications.discord,
                        ...body.notifications.discord,
                    },
                    email: {
                        ...defaultProfile.notifications.email,
                        ...body.notifications.email,
                    },
                    inApp: {
                        ...defaultProfile.notifications.inApp,
                        ...body.notifications.inApp,
                    },
                };
            }

            await profileRef.set(profileData);
        }

        const updated = await profileRef.get();
        return NextResponse.json({
            success: true,
            profile: { id: updated.id, ...updated.data() } as DiscoveryProfile,
        });
    } catch (error) {
        console.error('Error saving discovery profile:', error);
        return NextResponse.json({ error: 'Failed to save discovery profile' }, { status: 500 });
    }
}
