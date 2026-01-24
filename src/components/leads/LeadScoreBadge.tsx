'use client';

/**
 * LeadScoreBadge Component
 *
 * Displays lead score with category indicator.
 */

import React from 'react';
import {
    LeadScoreBreakdown,
    getScoreCategoryColor,
    getScoreCategoryEmoji,
} from '@/lib/utils/leadScoring';

interface LeadScoreBadgeProps {
    score: LeadScoreBreakdown | null;
    size?: 'sm' | 'md' | 'lg';
    showDetails?: boolean;
}

export function LeadScoreBadge({ score, size = 'md', showDetails = false }: LeadScoreBadgeProps) {
    if (!score) return null;

    const sizeClasses = {
        sm: 'text-xs px-1.5 py-0.5',
        md: 'text-sm px-2 py-1',
        lg: 'text-base px-3 py-1.5',
    };

    const colorClass = getScoreCategoryColor(score.category);
    const emoji = getScoreCategoryEmoji(score.category);

    return (
        <div className="inline-flex items-center gap-1">
            <span
                className={`inline-flex items-center gap-1 rounded-full font-semibold ${colorClass} ${sizeClasses[size]}`}
            >
                <span>{emoji}</span>
                <span>{score.total}</span>
            </span>

            {showDetails && (
                <div className="flex gap-1 ml-2 text-xs text-slate-400">
                    <span title="Engagement">E:{score.engagement}</span>
                    <span title="Profile">P:{score.profile}</span>
                    <span title="Behavior">B:{score.behavior}</span>
                    <span title="Readiness">R:{score.readiness}</span>
                </div>
            )}
        </div>
    );
}
