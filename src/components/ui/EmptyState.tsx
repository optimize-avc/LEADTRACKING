'use client';

/**
 * EmptyState Component
 *
 * Reusable empty state component for when no data is available.
 * Provides context-specific messaging and CTAs.
 *
 * Best practice 2026: Helpful empty states with clear next steps
 */

import React from 'react';
import {
    PlusCircle,
    FileText,
    Users,
    Mail,
    Calendar,
    BarChart3,
    Folder,
    Upload,
    Plus,
    type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';

export type EmptyStateType =
    | 'leads'
    | 'activities'
    | 'resources'
    | 'team'
    | 'emails'
    | 'analytics'
    | 'generic';

interface EmptyStateConfig {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    actionLink?: string;
    secondaryLabel?: string;
    secondaryLink?: string;
}

const EMPTY_STATE_CONFIGS: Record<EmptyStateType, EmptyStateConfig> = {
    leads: {
        icon: Users,
        title: 'No leads yet',
        description:
            'Start building your pipeline by adding your first lead or importing from a CSV file.',
        actionLabel: 'Add Lead',
        secondaryLabel: 'Import CSV',
    },
    activities: {
        icon: Calendar,
        title: 'No activities logged',
        description: 'Start tracking your sales activities like calls, emails, and meetings.',
        actionLabel: 'Log Activity',
        actionLink: '/activities',
    },
    resources: {
        icon: Folder,
        title: 'No resources yet',
        description: 'Add playbooks, battle cards, and training materials to the Enablement Hub.',
        actionLabel: 'Upload Resource',
    },
    team: {
        icon: Users,
        title: 'Just you for now',
        description: 'Invite team members to collaborate on leads and share insights.',
        actionLabel: 'Invite Team',
        actionLink: '/settings/team',
    },
    emails: {
        icon: Mail,
        title: 'No emails sent',
        description: 'Connect your email integration to start sending tracked emails to leads.',
        actionLabel: 'Configure Email',
        actionLink: '/settings/email',
    },
    analytics: {
        icon: BarChart3,
        title: 'Not enough data',
        description: 'Start logging activities to see your performance analytics and insights.',
        actionLabel: 'Log Activity',
        actionLink: '/activities',
    },
    generic: {
        icon: FileText,
        title: 'Nothing here yet',
        description: 'Get started by creating your first item.',
        actionLabel: 'Get Started',
    },
};

interface EmptyStateProps {
    // Simple props (backwards compatible)
    title?: string;
    description?: string;
    actionLabel?: string;
    actionLink?: string;
    icon?: React.ReactNode;
    // Type-based props (new)
    type?: EmptyStateType;
    onPrimaryAction?: () => void;
    onSecondaryAction?: () => void;
    secondaryLabel?: string;
    className?: string;
}

export function EmptyState({
    title,
    description,
    actionLabel,
    actionLink,
    icon,
    type = 'generic',
    onPrimaryAction,
    onSecondaryAction,
    secondaryLabel,
    className = '',
}: EmptyStateProps) {
    const config = EMPTY_STATE_CONFIGS[type];
    const Icon = config.icon;

    const displayTitle = title || config.title;
    const displayDescription = description || config.description;
    const displayActionLabel = actionLabel || config.actionLabel;
    const displayActionLink = actionLink || config.actionLink;
    const displaySecondaryLabel = secondaryLabel || config.secondaryLabel;
    const displayIcon = icon || <Icon className="w-12 h-12 text-slate-500" />;

    const handlePrimaryClick = () => {
        if (onPrimaryAction) {
            onPrimaryAction();
        }
    };

    const handleSecondaryClick = () => {
        if (onSecondaryAction) {
            onSecondaryAction();
        }
    };

    return (
        <div
            className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm ${className}`}
        >
            <div className="bg-slate-800/50 p-4 rounded-full mb-4">{displayIcon}</div>
            <h3 className="text-xl font-bold text-white mb-2">{displayTitle}</h3>
            <p className="text-slate-400 max-w-sm mb-6">{displayDescription}</p>

            <div className="flex flex-col sm:flex-row gap-3">
                {displayActionLabel &&
                    (onPrimaryAction ? (
                        <button
                            onClick={handlePrimaryClick}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-400 hover:to-violet-400 text-white rounded-xl font-medium transition-colors"
                        >
                            <Plus size={18} />
                            {displayActionLabel}
                        </button>
                    ) : displayActionLink ? (
                        <Link
                            href={displayActionLink}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-400 hover:to-violet-400 text-white rounded-xl font-medium transition-colors"
                        >
                            <PlusCircle size={18} />
                            {displayActionLabel}
                        </Link>
                    ) : null)}

                {displaySecondaryLabel && onSecondaryAction && (
                    <button
                        onClick={handleSecondaryClick}
                        className="flex items-center gap-2 px-6 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium rounded-xl transition-colors"
                    >
                        <Upload size={18} />
                        {displaySecondaryLabel}
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * LeadsEmptyState - Specific empty state for leads page
 */
export function LeadsEmptyState({
    onAddLead,
    onImportCSV,
}: {
    onAddLead: () => void;
    onImportCSV: () => void;
}) {
    return <EmptyState type="leads" onPrimaryAction={onAddLead} onSecondaryAction={onImportCSV} />;
}

/**
 * ActivitiesEmptyState - Specific empty state for activities
 */
export function ActivitiesEmptyState({ onLogActivity }: { onLogActivity?: () => void }) {
    return <EmptyState type="activities" onPrimaryAction={onLogActivity} />;
}

/**
 * ResourcesEmptyState - Specific empty state for resources
 */
export function ResourcesEmptyState({ onUpload }: { onUpload?: () => void }) {
    return <EmptyState type="resources" onPrimaryAction={onUpload} />;
}
