import { GlassCard } from '@/components/ui/GlassCard';

export default function SettingsLoading() {
    return (
        <div className="p-8 min-h-screen">
            <header className="mb-8">
                <div className="h-9 w-32 bg-slate-800/50 rounded-lg animate-pulse mb-2" />
                <div className="h-4 w-64 bg-slate-800/30 rounded animate-pulse" />
            </header>

            <div className="grid gap-6 max-w-2xl">
                {/* Integration cards skeleton */}
                {[1, 2, 3, 4].map((i) => (
                    <GlassCard key={i} className="animate-pulse">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-700/50 rounded-xl" />
                                <div>
                                    <div className="h-5 w-40 bg-slate-700/50 rounded mb-2" />
                                    <div className="h-4 w-64 bg-slate-700/30 rounded" />
                                </div>
                            </div>
                            <div className="h-8 w-24 bg-slate-700/50 rounded-lg" />
                        </div>
                    </GlassCard>
                ))}
            </div>
        </div>
    );
}
