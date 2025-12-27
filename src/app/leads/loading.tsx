import { GlassCard } from '@/components/ui/GlassCard';

export default function LeadsLoading() {
    return (
        <div className="p-8 min-h-screen">
            <header className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <div className="h-9 w-48 bg-slate-800/50 rounded-lg animate-pulse mb-2" />
                        <div className="h-4 w-72 bg-slate-800/30 rounded animate-pulse" />
                    </div>
                    <div className="h-10 w-32 bg-slate-700/50 rounded-lg animate-pulse" />
                </div>
            </header>

            {/* Lead cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <GlassCard key={i} className="animate-pulse">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="h-5 w-40 bg-slate-700/50 rounded mb-2" />
                                <div className="h-4 w-28 bg-slate-700/30 rounded" />
                            </div>
                            <div className="h-6 w-20 bg-slate-700/50 rounded-full" />
                        </div>
                        <div className="space-y-2 mb-4">
                            <div className="h-3 w-full bg-slate-700/30 rounded" />
                            <div className="h-3 w-3/4 bg-slate-700/30 rounded" />
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-slate-700/50">
                            <div className="h-6 w-24 bg-slate-700/50 rounded" />
                            <div className="flex gap-2">
                                <div className="w-8 h-8 bg-slate-700/50 rounded" />
                                <div className="w-8 h-8 bg-slate-700/50 rounded" />
                            </div>
                        </div>
                    </GlassCard>
                ))}
            </div>
        </div>
    );
}
