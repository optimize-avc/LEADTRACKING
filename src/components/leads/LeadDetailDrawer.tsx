'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Lead, Activity } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Building2,
    User,
    Mail,
    Phone,
    DollarSign,
    Sparkles,
    TrendingUp,
    AlertTriangle,
    Lightbulb,
    MessageSquare,
    Clock,
    Activity as ActivityIcon,
    Edit3,
    Check,
    RefreshCw,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils/formatters';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface LeadDetailDrawerProps {
    lead: Lead | null;
    activities: Activity[];
    isOpen: boolean;
    onClose: () => void;
    onSave: (leadId: string, updates: Partial<Lead>) => Promise<void>;
    onReaudit: (lead: Lead) => void;
    isReauditing: boolean;
}

export function LeadDetailDrawer({
    lead,
    activities,
    isOpen,
    onClose,
    onSave,
    onReaudit,
    isReauditing,
}: LeadDetailDrawerProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedLead, setEditedLead] = useState<Partial<Lead>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'intelligence' | 'activity'>(
        'overview'
    );
    
    const { containerRef } = useFocusTrap(isOpen && !!lead);

    // Handle Escape key
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    useEffect(() => {
        if (lead) {
            setEditedLead({
                companyName: lead.companyName,
                contactName: lead.contactName,
                email: lead.email,
                phone: lead.phone,
                value: lead.value,
            });
        }
    }, [lead]);

    if (!lead) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(lead.id, editedLead);
            setIsEditing(false);
        } finally {
            setIsSaving(false);
        }
    };

    const enrichment = lead.enrichmentData;
    const daysAgo = lead.enrichedAt
        ? Math.floor((Date.now() - lead.enrichedAt) / (1000 * 60 * 60 * 24))
        : null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        aria-hidden="true"
                    />

                    {/* Drawer */}
                    <motion.div
                        ref={containerRef}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-2xl bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/50 z-50 overflow-hidden flex flex-col"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="lead-detail-title"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-700/50">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Building2 className="text-blue-400" size={24} aria-hidden="true" />
                                        {isEditing ? (
                                            <>
                                                <label htmlFor="edit-company-name" className="sr-only">Company name</label>
                                                <input
                                                    id="edit-company-name"
                                                    value={editedLead.companyName || ''}
                                                    onChange={(e) =>
                                                        setEditedLead({
                                                            ...editedLead,
                                                            companyName: e.target.value,
                                                        })
                                                    }
                                                    className="text-xl font-bold bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white"
                                                />
                                            </>
                                        ) : (
                                            <h2 id="lead-detail-title" className="text-xl font-bold text-white">
                                                {lead.companyName}
                                            </h2>
                                        )}
                                        <Badge
                                            variant={
                                                lead.status === 'Closed'
                                                    ? 'success'
                                                    : lead.status === 'Qualified'
                                                      ? 'info'
                                                      : 'default'
                                            }
                                        >
                                            {lead.status}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-slate-400">
                                        {lead.industry || 'Unknown Industry'} • Created{' '}
                                        {new Date(lead.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isEditing ? (
                                        <>
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                className="p-2 text-slate-400 hover:text-white transition-colors"
                                                aria-label="Cancel editing"
                                            >
                                                <X size={18} aria-hidden="true" />
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                disabled={isSaving}
                                                className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                                                aria-label="Save changes"
                                            >
                                                <Check size={18} aria-hidden="true" />
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="p-2 text-slate-400 hover:text-white transition-colors"
                                            aria-label="Edit lead details"
                                        >
                                            <Edit3 size={18} aria-hidden="true" />
                                        </button>
                                    )}
                                    <button
                                        onClick={onClose}
                                        className="p-2 text-slate-400 hover:text-white transition-colors"
                                        aria-label="Close lead details"
                                    >
                                        <X size={20} aria-hidden="true" />
                                    </button>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-1 mt-4 bg-slate-800/50 rounded-lg p-1" role="tablist" aria-label="Lead detail sections">
                                {(['overview', 'intelligence', 'activity'] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                                            activeTab === tab
                                                ? 'bg-blue-500/20 text-blue-400'
                                                : 'text-slate-400 hover:text-white'
                                        }`}
                                        role="tab"
                                        aria-selected={activeTab === tab}
                                        aria-controls={`tabpanel-${tab}`}
                                        id={`tab-${tab}`}
                                    >
                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Content */}
                        <div 
                            className="flex-1 overflow-y-auto p-6 space-y-6"
                            role="tabpanel"
                            id={`tabpanel-${activeTab}`}
                            aria-labelledby={`tab-${activeTab}`}
                        >
                            {activeTab === 'overview' && (
                                <>
                                    {/* Contact Info */}
                                    <GlassCard className="p-4">
                                        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                                            <User size={16} className="text-blue-400" />
                                            Contact Information
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <User size={14} className="text-slate-500" />
                                                {isEditing ? (
                                                    <input
                                                        value={editedLead.contactName || ''}
                                                        onChange={(e) =>
                                                            setEditedLead({
                                                                ...editedLead,
                                                                contactName: e.target.value,
                                                            })
                                                        }
                                                        placeholder="Contact name"
                                                        className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                                                    />
                                                ) : (
                                                    <span className="text-sm text-slate-300">
                                                        {lead.contactName || 'No contact name'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Mail size={14} className="text-slate-500" />
                                                {isEditing ? (
                                                    <input
                                                        value={editedLead.email || ''}
                                                        onChange={(e) =>
                                                            setEditedLead({
                                                                ...editedLead,
                                                                email: e.target.value,
                                                            })
                                                        }
                                                        placeholder="Email"
                                                        className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                                                    />
                                                ) : (
                                                    <span className="text-sm text-slate-300">
                                                        {lead.email || 'No email'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Phone size={14} className="text-slate-500" />
                                                {isEditing ? (
                                                    <input
                                                        value={editedLead.phone || ''}
                                                        onChange={(e) =>
                                                            setEditedLead({
                                                                ...editedLead,
                                                                phone: e.target.value,
                                                            })
                                                        }
                                                        placeholder="Phone"
                                                        className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                                                    />
                                                ) : (
                                                    <span className="text-sm text-slate-300">
                                                        {lead.phone || 'No phone'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </GlassCard>

                                    {/* Deal Info */}
                                    <GlassCard className="p-4">
                                        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                                            <DollarSign size={16} className="text-green-400" />
                                            Deal Information
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">
                                                    Deal Value
                                                </p>
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={editedLead.value || 0}
                                                        onChange={(e) =>
                                                            setEditedLead({
                                                                ...editedLead,
                                                                value: Number(e.target.value),
                                                            })
                                                        }
                                                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                                                    />
                                                ) : (
                                                    <p className="text-lg font-bold text-green-400">
                                                        {formatCurrency(lead.value)}
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">
                                                    Probability
                                                </p>
                                                <p className="text-lg font-bold text-blue-400">
                                                    {lead.probability || 0}%
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">
                                                    Last Contact
                                                </p>
                                                <p className="text-sm text-slate-300">
                                                    {lead.lastContact
                                                        ? new Date(
                                                              lead.lastContact
                                                          ).toLocaleDateString()
                                                        : 'Never'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">
                                                    Days in Pipeline
                                                </p>
                                                <p className="text-sm text-slate-300">
                                                    {Math.floor(
                                                        (Date.now() - lead.createdAt) /
                                                            (1000 * 60 * 60 * 24)
                                                    )}{' '}
                                                    days
                                                </p>
                                            </div>
                                        </div>
                                    </GlassCard>
                                </>
                            )}

                            {activeTab === 'intelligence' && (
                                <>
                                    {/* Re-audit button */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-300">
                                                AI Business Intelligence
                                            </h3>
                                            {daysAgo !== null && (
                                                <p className="text-xs text-slate-500">
                                                    Last audited{' '}
                                                    {daysAgo === 0
                                                        ? 'today'
                                                        : `${daysAgo} days ago`}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => onReaudit(lead)}
                                            disabled={isReauditing}
                                            className={`px-3 py-2 text-xs rounded-lg flex items-center gap-2 transition-all ${
                                                isReauditing
                                                    ? 'bg-purple-500/30 text-purple-300 cursor-wait'
                                                    : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400'
                                            }`}
                                        >
                                            <RefreshCw
                                                size={14}
                                                className={isReauditing ? 'animate-spin' : ''}
                                            />
                                            {isReauditing ? 'Auditing...' : 'Re-Audit'}
                                        </button>
                                    </div>

                                    {enrichment ? (
                                        <>
                                            {/* Scores */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <GlassCard className="p-4 text-center">
                                                    <TrendingUp
                                                        className="mx-auto mb-2 text-blue-400"
                                                        size={24}
                                                    />
                                                    <p className="text-2xl font-bold text-blue-400">
                                                        {enrichment.digitalPresence?.score || 0}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        Digital Presence
                                                    </p>
                                                </GlassCard>
                                                <GlassCard className="p-4 text-center">
                                                    <Sparkles
                                                        className="mx-auto mb-2 text-purple-400"
                                                        size={24}
                                                    />
                                                    <p className="text-2xl font-bold text-purple-400">
                                                        {enrichment.aiReadiness?.score || 0}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        AI Readiness
                                                    </p>
                                                </GlassCard>
                                            </div>

                                            {/* Pain Points */}
                                            {enrichment.painPoints &&
                                                enrichment.painPoints.length > 0 && (
                                                    <GlassCard className="p-4">
                                                        <h4 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                                                            <AlertTriangle size={16} />
                                                            Pain Points
                                                        </h4>
                                                        <ul className="space-y-2">
                                                            {enrichment.painPoints.map(
                                                                (point, i) => (
                                                                    <li
                                                                        key={i}
                                                                        className="text-sm text-slate-300 flex gap-2"
                                                                    >
                                                                        <span className="text-amber-500">
                                                                            •
                                                                        </span>
                                                                        <span>{point}</span>
                                                                    </li>
                                                                )
                                                            )}
                                                        </ul>
                                                    </GlassCard>
                                                )}

                                            {/* Opportunities */}
                                            {enrichment.opportunities &&
                                                enrichment.opportunities.length > 0 && (
                                                    <GlassCard className="p-4">
                                                        <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                                                            <Lightbulb size={16} />
                                                            Opportunities
                                                        </h4>
                                                        <ul className="space-y-2">
                                                            {enrichment.opportunities.map(
                                                                (opp, i) => (
                                                                    <li
                                                                        key={i}
                                                                        className="text-sm text-slate-300 flex gap-2"
                                                                    >
                                                                        <span className="text-green-500">
                                                                            •
                                                                        </span>
                                                                        <span>{opp}</span>
                                                                    </li>
                                                                )
                                                            )}
                                                        </ul>
                                                    </GlassCard>
                                                )}

                                            {/* Talking Points */}
                                            {enrichment.talkingPoints &&
                                                enrichment.talkingPoints.length > 0 && (
                                                    <GlassCard className="p-4">
                                                        <h4 className="text-sm font-semibold text-indigo-400 mb-3 flex items-center gap-2">
                                                            <MessageSquare size={16} />
                                                            Talking Points
                                                        </h4>
                                                        <ul className="space-y-3">
                                                            {enrichment.talkingPoints.map(
                                                                (point, i) => (
                                                                    <li
                                                                        key={i}
                                                                        className="text-sm text-slate-300 p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20"
                                                                    >
                                                                        💬 {point}
                                                                    </li>
                                                                )
                                                            )}
                                                        </ul>
                                                    </GlassCard>
                                                )}
                                        </>
                                    ) : (
                                        <GlassCard className="p-8 text-center">
                                            <Sparkles
                                                className="mx-auto mb-4 text-slate-600"
                                                size={48}
                                            />
                                            <p className="text-slate-400 mb-4">
                                                No intelligence data yet
                                            </p>
                                            <button
                                                onClick={() => onReaudit(lead)}
                                                disabled={isReauditing}
                                                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-all"
                                            >
                                                Run Deep Audit
                                            </button>
                                        </GlassCard>
                                    )}
                                </>
                            )}

                            {activeTab === 'activity' && (
                                <>
                                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                        <ActivityIcon size={16} className="text-blue-400" />
                                        Activity Timeline
                                    </h3>
                                    {activities.length > 0 ? (
                                        <div className="space-y-3">
                                            {activities.map((activity, idx) => (
                                                <GlassCard key={activity.id || idx} className="p-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                                            <Clock
                                                                size={14}
                                                                className="text-blue-400"
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="text-sm font-medium text-slate-300 capitalize">
                                                                    {activity.type}
                                                                </span>
                                                                <span className="text-xs text-slate-500">
                                                                    {new Date(
                                                                        activity.timestamp
                                                                    ).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-slate-400">
                                                                {activity.notes}
                                                            </p>
                                                            {activity.outcome && (
                                                                <Badge
                                                                    variant="default"
                                                                    className="mt-2"
                                                                >
                                                                    {activity.outcome}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </GlassCard>
                                            ))}
                                        </div>
                                    ) : (
                                        <GlassCard className="p-8 text-center">
                                            <Clock
                                                className="mx-auto mb-4 text-slate-600"
                                                size={48}
                                            />
                                            <p className="text-slate-400">
                                                No activities recorded yet
                                            </p>
                                        </GlassCard>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
