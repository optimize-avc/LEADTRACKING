/**
 * Skeleton UI Components
 *
 * Loading placeholder animations for data-heavy components.
 * Best practice 2026: Reduce perceived load time with content placeholders
 */

import { cn } from '@/lib/utils';

/**
 * Basic skeleton line/block
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('animate-pulse rounded-md bg-white/10', className)} {...props} />;
}

/**
 * Skeleton for text content
 */
function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton key={i} className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} />
            ))}
        </div>
    );
}

/**
 * Skeleton for avatar/profile image
 */
function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
    };

    return <Skeleton className={`${sizeClasses[size]} rounded-full`} />;
}

/**
 * Skeleton card for dashboard metrics
 */
function SkeletonMetricCard() {
    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-32" />
                </div>
                <Skeleton className="w-12 h-12 rounded-xl" />
            </div>
            <div className="mt-4 flex items-center gap-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-20" />
            </div>
        </div>
    );
}

/**
 * Skeleton for lead row in pipeline
 */
function SkeletonLeadRow() {
    return (
        <div className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <SkeletonAvatar size="md" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded" />
        </div>
    );
}

/**
 * Skeleton for activity feed item
 */
function SkeletonActivityItem() {
    return (
        <div className="flex items-start gap-3 p-3">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-3 w-16" />
        </div>
    );
}

/**
 * Skeleton for the full leads page
 */
function SkeletonLeadsPage() {
    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-32 rounded-lg" />
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <Skeleton className="h-10 w-40 rounded-lg" />
                <Skeleton className="h-10 w-40 rounded-lg" />
                <Skeleton className="h-10 flex-1 rounded-lg" />
            </div>

            {/* Lead rows */}
            <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonLeadRow key={i} />
                ))}
            </div>
        </div>
    );
}

/**
 * Skeleton for dashboard page
 */
function SkeletonDashboard() {
    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div>
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-48" />
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonMetricCard key={i} />
                ))}
            </div>

            {/* Charts area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <Skeleton className="h-6 w-40 mb-4" />
                    <Skeleton className="h-64 w-full rounded" />
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <Skeleton className="h-6 w-40 mb-4" />
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <SkeletonActivityItem key={i} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Skeleton for settings cards
 */
function SkeletonSettingsCard() {
    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-8 w-8 rounded" />
            </div>
        </div>
    );
}

export {
    Skeleton,
    SkeletonText,
    SkeletonAvatar,
    SkeletonMetricCard,
    SkeletonLeadRow,
    SkeletonActivityItem,
    SkeletonLeadsPage,
    SkeletonDashboard,
    SkeletonSettingsCard,
};
