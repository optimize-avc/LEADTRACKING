import { GlassCard } from '@/components/ui/GlassCard';

export default function Loading() {
    return (
        <div className="p-8 min-h-screen">
            <header className="mb-8">
                {/* Title skeleton */}
                <div className="h-9 w-64 bg-slate-800/50 rounded-lg animate-pulse mb-2" />
                <div className="h-4 w-96 bg-slate-800/30 rounded animate-pulse" />
            </header>

            {/* Metrics skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map((i) => (
                    <GlassCard key={i} className="animate-pulse">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-4 w-20 bg-slate-700/50 rounded" />
                            <div className="w-10 h-10 bg-slate-700/50 rounded-lg" />
                        </div>
                        <div className="h-8 w-24 bg-slate-700/50 rounded mb-2" />
                        <div className="h-3 w-16 bg-slate-700/30 rounded" />
                    </GlassCard>
                ))}
            </div>

            {/* Content skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GlassCard className="animate-pulse">
                    <div className="h-5 w-32 bg-slate-700/50 rounded mb-4" />
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-4 bg-slate-700/30 rounded" />
                        ))}
                    </div>
                </GlassCard>
                <GlassCard className="animate-pulse">
                    <div className="h-5 w-40 bg-slate-700/50 rounded mb-4" />
                    <div className="h-48 bg-slate-700/30 rounded" />
                </GlassCard>
            </div>
        </div>
    );
}
