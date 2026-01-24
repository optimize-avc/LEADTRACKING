'use client';

import React, { useMemo } from 'react';
import { Lead, Activity } from '@/types';
import {
    calculateAILeadScore,
    getNextBestAction,
    calculateWinProbability,
    detectStaleLead,
    AILeadScore,
    NextBestAction,
    WinProbability,
    StaleLeadInfo,
} from '@/lib/utils/scoring';
import { Sparkles, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

interface AILeadInsightsProps {
    lead: Lead;
    activities: Activity[];
    compact?: boolean;
}

function getGradeColor(grade: AILeadScore['grade']) {
    switch (grade) {
        case 'A':
            return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
        case 'B':
            return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
        case 'C':
            return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
        case 'D':
            return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
        case 'F':
            return 'text-red-400 bg-red-500/20 border-red-500/30';
    }
}

function getUrgencyColor(urgency: NextBestAction['urgency']) {
    switch (urgency) {
        case 'high':
            return 'bg-red-500/20 text-red-400 border-red-500/30';
        case 'medium':
            return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        case 'low':
            return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
}

export function AILeadInsights({ lead, activities, compact = false }: AILeadInsightsProps) {
    const aiScore = useMemo(() => calculateAILeadScore(lead, activities), [lead, activities]);
    const nextAction = useMemo(() => getNextBestAction(lead, activities), [lead, activities]);
    const winProb = useMemo(() => calculateWinProbability(lead, activities), [lead, activities]);
    const staleInfo = useMemo(() => detectStaleLead(lead), [lead]);

    if (compact) {
        // Compact view - just score badge and next action
        return (
            <div className="flex items-center gap-2 flex-wrap">
                {/* AI Score Badge */}
                <div
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${getGradeColor(aiScore.grade)}`}
                    title={`AI Score: ${aiScore.score}/100`}
                >
                    <Sparkles size={10} />
                    {aiScore.grade} • {aiScore.score}
                </div>

                {/* Win Probability */}
                <div
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${
                        winProb.probability >= 50
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                    }`}
                    title="Win Probability"
                >
                    {winProb.probability}%{winProb.trend === 'up' && <TrendingUp size={10} />}
                    {winProb.trend === 'down' && <TrendingDown size={10} />}
                </div>

                {/* Stale Warning */}
                {staleInfo.isStale && (
                    <div
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${
                            staleInfo.riskLevel === 'critical'
                                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}
                        title={staleInfo.message}
                    >
                        <AlertTriangle size={10} />
                        {staleInfo.daysSinceContact}d
                    </div>
                )}
            </div>
        );
    }

    // Full view with all insights
    return (
        <div className="mt-3 p-3 rounded-xl bg-gradient-to-br from-violet-500/5 to-blue-500/5 border border-white/5 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-violet-400" />
                <span className="text-[11px] font-bold text-violet-400 uppercase tracking-wider">
                    AI Insights
                </span>
            </div>

            {/* Score + Win Probability Row */}
            <div className="flex gap-3">
                {/* AI Score */}
                <div className="flex-1 p-2 bg-slate-800/30 rounded-lg">
                    <div className="text-[9px] text-slate-500 uppercase mb-1">Lead Score</div>
                    <div className="flex items-center gap-2">
                        <span
                            className={`text-lg font-bold px-2 py-0.5 rounded ${getGradeColor(aiScore.grade)}`}
                        >
                            {aiScore.grade}
                        </span>
                        <span className="text-white font-semibold">{aiScore.score}</span>
                        <span className="text-slate-500 text-xs">/ 100</span>
                    </div>
                </div>

                {/* Win Probability */}
                <div className="flex-1 p-2 bg-slate-800/30 rounded-lg">
                    <div className="text-[9px] text-slate-500 uppercase mb-1">Win Probability</div>
                    <div className="flex items-center gap-2">
                        <span
                            className={`text-lg font-bold ${winProb.probability >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}
                        >
                            {winProb.probability}%
                        </span>
                        {winProb.trend === 'up' && (
                            <TrendingUp size={14} className="text-emerald-400" />
                        )}
                        {winProb.trend === 'down' && (
                            <TrendingDown size={14} className="text-red-400" />
                        )}
                        {winProb.trend === 'stable' && (
                            <Minus size={14} className="text-slate-400" />
                        )}
                    </div>
                </div>
            </div>

            {/* Next Best Action */}
            <div className="p-2 bg-slate-800/30 rounded-lg">
                <div className="text-[9px] text-slate-500 uppercase mb-1">Next Best Action</div>
                <div className="flex items-center gap-2">
                    <span className="text-lg">{nextAction.emoji}</span>
                    <div className="flex-1">
                        <span className="text-white font-medium text-sm">{nextAction.label}</span>
                        <p className="text-[10px] text-slate-400">{nextAction.reason}</p>
                    </div>
                    <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${getUrgencyColor(nextAction.urgency)}`}
                    >
                        {nextAction.urgency}
                    </span>
                </div>
            </div>

            {/* Stale Warning */}
            {staleInfo.isStale && (
                <div
                    className={`p-2 rounded-lg flex items-center gap-2 ${
                        staleInfo.riskLevel === 'critical'
                            ? 'bg-red-500/10 border border-red-500/20'
                            : 'bg-amber-500/10 border border-amber-500/20'
                    }`}
                >
                    <AlertTriangle
                        size={14}
                        className={
                            staleInfo.riskLevel === 'critical' ? 'text-red-400' : 'text-amber-400'
                        }
                    />
                    <span
                        className={`text-[11px] font-medium ${staleInfo.riskLevel === 'critical' ? 'text-red-300' : 'text-amber-300'}`}
                    >
                        {staleInfo.message}
                    </span>
                </div>
            )}
        </div>
    );
}
