'use client';

import { useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function TrainingError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Training page error:', error);
    }, [error]);

    return (
        <div className="p-8 min-h-screen flex items-center justify-center">
            <GlassCard className="max-w-md text-center">
                <div className="flex justify-center mb-4">
                    <div className="p-3 bg-red-500/20 rounded-full">
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                    </div>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Training unavailable</h2>
                <p className="text-slate-400 mb-6">
                    {error.message || 'Unable to load training content. Please try again.'}
                </p>
                <button onClick={reset} className="glass-button inline-flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Retry
                </button>
            </GlassCard>
        </div>
    );
}
