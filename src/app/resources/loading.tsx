import { GlassCard } from '@/components/ui/GlassCard';

export default function ResourcesLoading() {
    return (
        <div className="flex h-screen bg-[#0b1121]">
            {/* Category Sidebar skeleton */}
            <aside className="w-64 border-r border-slate-800 p-6 flex-shrink-0">
                <div className="h-6 w-32 bg-slate-800/50 rounded animate-pulse mb-6 mx-2" />
                <div className="space-y-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                        <div key={i} className="h-8 bg-slate-800/30 rounded animate-pulse" />
                    ))}
                </div>
            </aside>

            {/* Main Content skeleton */}
            <main className="flex-1 overflow-y-auto p-8">
                <header className="mb-8">
                    <div className="h-9 w-64 bg-slate-800/50 rounded-lg animate-pulse mb-2" />
                    <div className="h-4 w-96 bg-slate-800/30 rounded animate-pulse mb-6" />
                    <div className="h-12 bg-slate-800/30 rounded animate-pulse" />
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <GlassCard key={i} className="animate-pulse">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 bg-slate-700/50 rounded-lg" />
                                <div className="h-6 w-20 bg-slate-700/50 rounded-full" />
                            </div>
                            <div className="h-5 w-40 bg-slate-700/50 rounded mb-2" />
                            <div className="h-4 w-full bg-slate-700/30 rounded mb-1" />
                            <div className="h-4 w-3/4 bg-slate-700/30 rounded mb-4" />
                            <div className="flex justify-between items-center pt-4 border-t border-slate-700/50">
                                <div className="h-3 w-20 bg-slate-700/30 rounded" />
                                <div className="h-4 w-16 bg-slate-700/50 rounded" />
                            </div>
                        </GlassCard>
                    ))}
                </div>
            </main>
        </div>
    );
}
