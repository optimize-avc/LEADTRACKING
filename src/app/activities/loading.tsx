import { GlassCard } from '@/components/ui/GlassCard';

export default function ActivitiesLoading() {
    return (
        <div className="p-8 min-h-screen">
            <header className="mb-8">
                <div className="h-9 w-40 bg-slate-800/50 rounded-lg animate-pulse mb-2" />
                <div className="h-4 w-64 bg-slate-800/30 rounded animate-pulse" />
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form skeleton */}
                <GlassCard className="lg:col-span-1 animate-pulse">
                    <div className="h-6 w-32 bg-slate-700/50 rounded mb-6" />
                    <div className="space-y-4">
                        <div className="h-10 bg-slate-700/30 rounded" />
                        <div className="h-10 bg-slate-700/30 rounded" />
                        <div className="h-24 bg-slate-700/30 rounded" />
                        <div className="h-10 bg-slate-700/50 rounded" />
                    </div>
                </GlassCard>

                {/* Activity list skeleton */}
                <div className="lg:col-span-2 space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <GlassCard key={i} className="animate-pulse">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-slate-700/50 rounded-lg" />
                                <div className="flex-1">
                                    <div className="h-5 w-32 bg-slate-700/50 rounded mb-2" />
                                    <div className="h-4 w-48 bg-slate-700/30 rounded" />
                                </div>
                                <div className="h-6 w-20 bg-slate-700/50 rounded-full" />
                            </div>
                        </GlassCard>
                    ))}
                </div>
            </div>
        </div>
    );
}
