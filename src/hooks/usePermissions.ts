'use client';

import { useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';

export type Permission =
    | 'canManageTeam'
    | 'canDeleteLeads'
    | 'canViewAnalytics'
    | 'canEditSettings'
    | 'canManageIntegrations'
    | 'canExportData'
    | 'canBulkImport';

export interface PermissionsResult {
    isAdmin: boolean;
    isManager: boolean;
    isRep: boolean;
    canManageTeam: boolean;
    canDeleteLeads: boolean;
    canViewAnalytics: boolean;
    canEditSettings: boolean;
    canManageIntegrations: boolean;
    canExportData: boolean;
    canBulkImport: boolean;
    hasPermission: (permission: Permission) => boolean;
}

/**
 * usePermissions - Role-based access control hook
 *
 * Roles hierarchy:
 * - Admin: Full access to all features
 * - Manager: Team analytics, lead management, no team admin
 * - Rep: Own leads and activities only
 */
export function usePermissions(): PermissionsResult {
    const { user, profile } = useAuth();

    const permissions = useMemo(() => {
        // Default: if no user profile, assume no permissions
        const role = (profile as { role?: string } | null)?.role || 'rep';

        const isAdmin = role === 'admin';
        const isManager = role === 'manager' || isAdmin;
        const isRep = role === 'rep';

        return {
            isAdmin,
            isManager,
            isRep,

            // Team Management: Admin only
            canManageTeam: isAdmin,

            // Delete Leads: Admin only (reps can only archive)
            canDeleteLeads: isAdmin,

            // Analytics: Managers and Admins
            canViewAnalytics: isManager,

            // Settings: Admin only
            canEditSettings: isAdmin,

            // Integrations: Admin only
            canManageIntegrations: isAdmin,

            // Export: Managers and Admins
            canExportData: isManager,

            // Bulk Import: Managers and Admins
            canBulkImport: isManager,

            // Helper function
            hasPermission: (permission: Permission): boolean => {
                switch (permission) {
                    case 'canManageTeam':
                        return isAdmin;
                    case 'canDeleteLeads':
                        return isAdmin;
                    case 'canViewAnalytics':
                        return isManager;
                    case 'canEditSettings':
                        return isAdmin;
                    case 'canManageIntegrations':
                        return isAdmin;
                    case 'canExportData':
                        return isManager;
                    case 'canBulkImport':
                        return isManager;
                    default:
                        return false;
                }
            },
        };
    }, [profile]);

    return permissions;
}

/**
 * PermissionGate - Wrapper component for permission-based rendering
 * Note: This is a simple pass-through for use in .tsx files
 */
export function PermissionGate({
    permission,
    children,
    fallback = null,
}: {
    permission: Permission;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}): React.ReactNode {
    const { hasPermission } = usePermissions();

    if (!hasPermission(permission)) {
        return fallback;
    }

    return children;
}
