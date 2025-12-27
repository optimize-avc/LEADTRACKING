'use client';

import { Activity } from '@/types';

interface ActivityPerformanceChartProps {
    data: Activity[];
}

export function ActivityPerformanceChart({ data }: ActivityPerformanceChartProps) {
    return (
        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-800/50 rounded-2xl bg-slate-900/20">
            <div className="text-center">
                <div className="text-slate-600 mb-2">Chart Visualization Area</div>
                <div className="text-xs text-slate-700">Integrate Recharts here</div>
                <div className="text-[10px] text-slate-800 mt-2">{data.length} activities loaded</div>
            </div>
        </div>
    );
}
