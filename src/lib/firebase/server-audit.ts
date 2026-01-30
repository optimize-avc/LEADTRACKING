/**
 * Server-side Audit Service
 *
 * Uses Firebase Admin SDK for logging audit events from API routes.
 */

import { getAdminDb } from '@/lib/firebase/admin';

export const ServerAuditService = {
    /**
     * Log a lead creation event
     */
    async logLeadCreated(
        companyId: string,
        userId: string,
        userName: string,
        leadId: string,
        leadName: string
    ): Promise<string> {
        const db = getAdminDb();
        const auditRef = db.collection('companies').doc(companyId).collection('auditLog').doc();

        await auditRef.set({
            action: 'lead.created',
            userId,
            userName,
            targetType: 'lead',
            targetId: leadId,
            targetName: leadName,
            timestamp: Date.now(),
        });

        return auditRef.id;
    },

    /**
     * Log a team invite event
     */
    async logTeamInvite(
        companyId: string,
        userId: string,
        userName: string,
        inviteeEmail: string,
        role: string
    ): Promise<string> {
        const db = getAdminDb();
        const auditRef = db.collection('companies').doc(companyId).collection('auditLog').doc();

        await auditRef.set({
            action: 'team.invited',
            userId,
            userName,
            targetType: 'team',
            targetName: inviteeEmail,
            metadata: { role },
            timestamp: Date.now(),
        });

        return auditRef.id;
    },

    /**
     * Log an admin action
     */
    async logAdminAction(
        companyId: string,
        adminId: string,
        action: string,
        metadata?: Record<string, unknown>
    ): Promise<string> {
        const db = getAdminDb();
        const auditRef = db.collection('companies').doc(companyId).collection('auditLog').doc();

        await auditRef.set({
            action: `admin.${action}`,
            userId: adminId,
            userName: 'Super Admin',
            targetType: 'company',
            targetId: companyId,
            metadata,
            timestamp: Date.now(),
            isAdminAction: true,
        });

        return auditRef.id;
    },

    /**
     * Log an impersonation event
     */
    async logImpersonation(
        companyId: string,
        adminId: string,
        targetUserId: string,
        reason: string
    ): Promise<string> {
        const db = getAdminDb();
        const auditRef = db.collection('companies').doc(companyId).collection('auditLog').doc();

        await auditRef.set({
            action: 'admin.impersonation',
            userId: adminId,
            userName: 'Super Admin',
            targetType: 'team',
            targetId: targetUserId,
            metadata: { reason },
            timestamp: Date.now(),
            isAdminAction: true,
            isSensitive: true,
        });

        return auditRef.id;
    },
};
