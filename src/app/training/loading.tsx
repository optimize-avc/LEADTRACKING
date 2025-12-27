import { GlassCard } from '@/components/ui/GlassCard';

export default function TrainingLoading() {
    return (
        <div className="p-8 min-h-screen">
            <header className="mb-8">
                <div className="h-9 w-48 bg-slate-800/50 rounded-lg animate-pulse mb-2" />
                <div className="h-4 w-72 bg-slate-800/30 rounded animate-pulse" />
            </header>

            {/* Progress summary skeleton */}
            <GlassCard className="mb-8 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                    <div className="h-5 w-40 bg-slate-700/50 rounded" />
                    <div className="h-6 w-24 bg-slate-700/50 rounded-full" />
                </div>
                <div className="h-3 w-full bg-slate-700/30 rounded-full mb-2" />
                <div className="h-4 w-32 bg-slate-700/30 rounded" />
            </GlassCard>

            {/* Course cards skeleton */}
            <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                    <GlassCard key={i} className="animate-pulse">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 bg-slate-700/50 rounded-lg" />
                            <div className="flex-1">
                                <div className="h-5 w-48 bg-slate-700/50 rounded mb-2" />
                                <div className="h-4 w-32 bg-slate-700/30 rounded" />
                            </div>
                            <div className="h-6 w-20 bg-slate-700/50 rounded-full" />
                        </div>
                        <div className="space-y-3 pl-16">
                            {[1, 2, 3, 4].map((j) => (
                                <div key={j} className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-slate-700/50 rounded" />
                                    <div className="h-4 w-64 bg-slate-700/30 rounded" />
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                ))}
            </div>
        </div>
    );
}
