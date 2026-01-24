import { getFirebaseDb } from './config';
import {
    collection,
    doc,
    setDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
} from 'firebase/firestore';

export type AuditAction =
    // Lead actions
    | 'lead.created'
    | 'lead.updated'
    | 'lead.deleted'
    | 'lead.statusChanged'
    | 'lead.assigned'
    | 'lead.imported'
    // Team actions
    | 'team.invited'
    | 'team.inviteAccepted'
    | 'team.roleChanged'
    | 'team.memberRemoved'
    // Activity actions
    | 'activity.logged'
    | 'activity.callLogged'
    | 'activity.meetingLogged'
    | 'activity.emailSent'
    // Settings actions
    | 'settings.updated'
    | 'settings.discordLinked'
    | 'settings.discordUnlinked';

export interface AuditLogEntry {
    id: string;
    action: AuditAction;
    userId: string;
    userName: string;
    targetType: 'lead' | 'team' | 'activity' | 'settings' | 'company';
    targetId?: string;
    targetName?: string;
    metadata?: Record<string, unknown>;
    timestamp: number;
    ipAddress?: string;
}

/**
 * AuditService - Records all important actions for compliance and tracking
 */
export const AuditService = {
    /**
     * Log an action to the audit trail
     */
    async logAction(
        companyId: string,
        userId: string,
        userName: string,
        action: AuditAction,
        target: {
            type: AuditLogEntry['targetType'];
            id?: string;
            name?: string;
        },
        metadata?: Record<string, unknown>
    ): Promise<string> {
        const db = getFirebaseDb();
        const auditRef = doc(collection(db, 'companies', companyId, 'auditLog'));

        const entry: Omit<AuditLogEntry, 'id'> = {
            action,
            userId,
            userName,
            targetType: target.type,
            targetId: target.id,
            targetName: target.name,
            metadata,
            timestamp: Date.now(),
        };

        await setDoc(auditRef, entry);
        return auditRef.id;
    },

    /**
     * Get recent audit log entries
     */
    async getRecentLogs(
        companyId: string,
        options?: {
            limit?: number;
            action?: AuditAction;
            userId?: string;
            targetType?: AuditLogEntry['targetType'];
        }
    ): Promise<AuditLogEntry[]> {
        const db = getFirebaseDb();
        const auditRef = collection(db, 'companies', companyId, 'auditLog');

        const q = query(auditRef, orderBy('timestamp', 'desc'), limit(options?.limit || 50));

        // Note: Firestore requires composite indexes for multiple where clauses
        // For now, we filter client-side for flexibility
        const snapshot = await getDocs(q);

        let entries = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as AuditLogEntry[];

        // Client-side filtering
        if (options?.action) {
            entries = entries.filter((e) => e.action === options.action);
        }
        if (options?.userId) {
            entries = entries.filter((e) => e.userId === options.userId);
        }
        if (options?.targetType) {
            entries = entries.filter((e) => e.targetType === options.targetType);
        }

        return entries;
    },

    /**
     * Get logs for a specific target (e.g., all actions on a specific lead)
     */
    async getLogsForTarget(
        companyId: string,
        targetType: AuditLogEntry['targetType'],
        targetId: string
    ): Promise<AuditLogEntry[]> {
        const db = getFirebaseDb();
        const auditRef = collection(db, 'companies', companyId, 'auditLog');

        const q = query(
            auditRef,
            where('targetType', '==', targetType),
            where('targetId', '==', targetId),
            orderBy('timestamp', 'desc')
        );

        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as AuditLogEntry[];
    },

    // =========================================================================
    // CONVENIENCE METHODS
    // =========================================================================

    /**
     * Log a lead creation
     */
    async logLeadCreated(
        companyId: string,
        userId: string,
        userName: string,
        leadId: string,
        leadName: string
    ): Promise<string> {
        return this.logAction(companyId, userId, userName, 'lead.created', {
            type: 'lead',
            id: leadId,
            name: leadName,
        });
    },

    /**
     * Log a lead status change
     */
    async logLeadStatusChange(
        companyId: string,
        userId: string,
        userName: string,
        leadId: string,
        leadName: string,
        oldStatus: string,
        newStatus: string
    ): Promise<string> {
        return this.logAction(
            companyId,
            userId,
            userName,
            'lead.statusChanged',
            { type: 'lead', id: leadId, name: leadName },
            { oldStatus, newStatus }
        );
    },

    /**
     * Log a team invite
     */
    async logTeamInvite(
        companyId: string,
        userId: string,
        userName: string,
        inviteeEmail: string,
        role: string
    ): Promise<string> {
        return this.logAction(
            companyId,
            userId,
            userName,
            'team.invited',
            { type: 'team', name: inviteeEmail },
            { role }
        );
    },

    /**
     * Log a role change
     */
    async logRoleChange(
        companyId: string,
        userId: string,
        userName: string,
        targetUserId: string,
        targetUserName: string,
        oldRole: string,
        newRole: string
    ): Promise<string> {
        return this.logAction(
            companyId,
            userId,
            userName,
            'team.roleChanged',
            { type: 'team', id: targetUserId, name: targetUserName },
            { oldRole, newRole }
        );
    },
};
