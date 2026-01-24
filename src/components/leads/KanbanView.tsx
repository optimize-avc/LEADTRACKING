'use client';

import React from 'react';
import { Lead, LeadStatus, Activity } from '@/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils/formatters';
import { Gauge, Sparkles, AlertTriangle } from 'lucide-react';
import { calculateLeadVelocity, calculateAILeadScore, detectStaleLead } from '@/lib/utils/scoring';

interface KanbanViewProps {
    leads: Lead[];
    activities: Record<string, Activity[]>;
    onLeadClick: (leadId: string) => void;
    onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
    selectedLeadIds: Set<string>;
}

const STAGES: { status: LeadStatus; label: string; color: string }[] = [
    { status: 'New', label: 'New', color: 'from-blue-500 to-cyan-500' },
    { status: 'Qualified', label: 'Qualified', color: 'from-emerald-500 to-teal-500' },
    { status: 'Proposal', label: 'Proposal', color: 'from-amber-500 to-orange-500' },
    { status: 'Negotiation', label: 'Negotiation', color: 'from-violet-500 to-purple-500' },
    { status: 'Closed', label: 'Closed Won', color: 'from-green-500 to-emerald-600' },
];

export function KanbanView({
    leads,
    activities,
    onLeadClick,
    onStatusChange,
    selectedLeadIds,
}: KanbanViewProps) {
    const getLeadsByStatus = (status: LeadStatus) => {
        return leads.filter((lead) => lead.status === status);
    };

    const getTotalValue = (status: LeadStatus) => {
        return getLeadsByStatus(status).reduce((sum, lead) => sum + lead.value, 0);
    };

    const handleDragStart = (e: React.DragEvent, leadId: string) => {
        e.dataTransfer.setData('leadId', leadId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, newStatus: LeadStatus) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('leadId');
        if (leadId) {
            onStatusChange(leadId, newStatus);
        }
    };

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
            {STAGES.map((stage) => {
                const stageLeads = getLeadsByStatus(stage.status);
                const totalValue = getTotalValue(stage.status);

                return (
                    <div
                        key={stage.status}
                        className="flex-shrink-0 w-72"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, stage.status)}
                    >
                        {/* Column Header */}
                        <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`w-2 h-2 rounded-full bg-gradient-to-r ${stage.color}`}
                                    />
                                    <h3 className="text-sm font-semibold text-white">
                                        {stage.label}
                                    </h3>
                                    <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                                        {stageLeads.length}
                                    </span>
                                </div>
                            </div>
                            <div className="text-xs text-slate-500">
                                {formatCurrency(totalValue)}
                            </div>
                        </div>

                        {/* Column Body */}
                        <div className="space-y-3 min-h-[400px] bg-slate-800/20 rounded-xl p-2 border border-white/5">
                            {stageLeads.length === 0 ? (
                                <div className="text-center text-slate-600 text-xs py-8 italic">
                                    Drop leads here
                                </div>
                            ) : (
                                stageLeads.map((lead) => {
                                    const velocity = calculateLeadVelocity(
                                        lead,
                                        activities[lead.id]
                                    );

                                    return (
                                        <div
                                            key={lead.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, lead.id)}
                                            onClick={() => onLeadClick(lead.id)}
                                            className={`group bg-slate-900/80 rounded-lg p-3 border cursor-grab active:cursor-grabbing hover:bg-slate-800/80 transition-all ${
                                                selectedLeadIds.has(lead.id)
                                                    ? 'border-blue-500 bg-blue-500/10'
                                                    : 'border-white/5'
                                            }`}
                                        >
                                            {/* AI Score & Stale indicator */}
                                            {(() => {
                                                const aiScore = calculateAILeadScore(
                                                    lead,
                                                    activities[lead.id] || []
                                                );
                                                const staleInfo = detectStaleLead(lead);
                                                const gradeColors: Record<string, string> = {
                                                    A: 'bg-emerald-500/20 text-emerald-400',
                                                    B: 'bg-blue-500/20 text-blue-400',
                                                    C: 'bg-amber-500/20 text-amber-400',
                                                    D: 'bg-orange-500/20 text-orange-400',
                                                    F: 'bg-red-500/20 text-red-400',
                                                };
                                                return (
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-1">
                                                            <span
                                                                className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${gradeColors[aiScore.grade]}`}
                                                            >
                                                                {aiScore.grade} • {aiScore.score}
                                                            </span>
                                                            {staleInfo.isStale && (
                                                                <span
                                                                    className={`text-[8px] px-1 py-0.5 rounded-full flex items-center gap-0.5 ${staleInfo.riskLevel === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}
                                                                >
                                                                    <AlertTriangle size={8} />
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[9px] text-slate-500 truncate max-w-[60px]">
                                                            {lead.industry || ''}
                                                        </span>
                                                    </div>
                                                );
                                            })()}

                                            {/* Company Name */}
                                            <h4 className="text-white font-medium text-sm mb-1 group-hover:text-blue-300 transition-colors line-clamp-1">
                                                {lead.companyName}
                                            </h4>

                                            {/* Contact */}
                                            <p className="text-slate-400 text-xs mb-2 truncate">
                                                {lead.contactName}
                                            </p>

                                            {/* Value */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-emerald-400 font-bold text-sm">
                                                    {formatCurrency(lead.value)}
                                                </span>
                                                {lead.nextStep && (
                                                    <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded truncate max-w-[80px]">
                                                        📌 {lead.nextStep}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
