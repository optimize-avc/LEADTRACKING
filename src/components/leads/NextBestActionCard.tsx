'use client';

/**
 * NextBestActionCard Component
 *
 * Displays AI-recommended actions for a lead with priority styling.
 */

import React from 'react';
import { Phone, Mail, Calendar, FileText, ArrowRight, MessageCircle } from 'lucide-react';
import { NextBestAction, ActionType, getPriorityStyles } from '@/lib/utils/nextBestAction';

interface NextBestActionCardProps {
    actions: NextBestAction[];
    onActionClick?: (action: NextBestAction) => void;
    maxActions?: number;
}

const ActionIcons: Record<ActionType, React.ReactNode> = {
    call: <Phone className="w-4 h-4" />,
    email: <Mail className="w-4 h-4" />,
    meeting: <Calendar className="w-4 h-4" />,
    social: <MessageCircle className="w-4 h-4" />,
    demo: <Calendar className="w-4 h-4" />,
    note: <FileText className="w-4 h-4" />,
};

export function NextBestActionCard({
    actions,
    onActionClick,
    maxActions = 3,
}: NextBestActionCardProps) {
    if (actions.length === 0) return null;

    const displayActions = actions.slice(0, maxActions);

    return (
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                🤖 AI Suggested Actions
            </h4>

            <div className="space-y-2">
                {displayActions.map((action) => (
                    <button
                        key={action.id}
                        onClick={() => onActionClick?.(action)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all hover:scale-[1.01] active:scale-[0.99] ${getPriorityStyles(action.priority)}`}
                    >
                        <div className="flex-shrink-0">
                            {ActionIcons[action.type] || <FileText className="w-4 h-4" />}
                        </div>

                        <div className="flex-1 text-left">
                            <p className="font-medium text-sm">{action.action}</p>
                            <p className="text-xs opacity-70">{action.description}</p>
                        </div>

                        <div className="flex-shrink-0">
                            <span
                                className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityStyles(action.priority)}`}
                            >
                                {action.priority}
                            </span>
                        </div>

                        <ArrowRight className="w-4 h-4 opacity-50" />
                    </button>
                ))}
            </div>

            {actions.length > maxActions && (
                <p className="text-xs text-slate-500 mt-2 text-center">
                    +{actions.length - maxActions} more suggestions
                </p>
            )}
        </div>
    );
}

/**
 * Compact version for lead cards
 */
export function NextBestActionBadge({
    action,
    onClick,
}: {
    action: NextBestAction;
    onClick?: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${getPriorityStyles(action.priority)}`}
        >
            {ActionIcons[action.type]}
            <span>{action.action}</span>
        </button>
    );
}
