'use client';

import React, { useState } from 'react';
import { Lead } from '@/types';
import { ActivitiesService, LeadsService } from '@/lib/firebase/services';
import { toast } from 'sonner';

interface LogReplyModalProps {
    lead: Lead;
    userId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function LogReplyModal({ lead, userId, isOpen, onClose, onSuccess }: LogReplyModalProps) {
    const [replyContent, setReplyContent] = useState('');
    const [sentiment, setSentiment] = useState<'positive' | 'neutral' | 'negative'>('positive');
    const [nextStep, setNextStep] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!replyContent.trim()) {
            toast.error('Please enter the reply content');
            return;
        }

        setIsSaving(true);
        try {
            // Log the reply as an email activity
            await ActivitiesService.logActivity(userId, {
                type: 'email',
                outcome:
                    sentiment === 'positive'
                        ? 'connected'
                        : sentiment === 'negative'
                          ? 'none'
                          : 'connected',
                leadId: lead.id,
                notes: `📩 REPLY RECEIVED (${sentiment}): ${replyContent}`,
                timestamp: Date.now(),
                repId: userId,
            });

            // Update lead
            const updates: Partial<Lead> = {
                lastContact: Date.now(),
            };

            if (nextStep) {
                updates.nextStep = nextStep;
            }

            // If positive reply and lead is New/Contacted, move to Contacted/Qualified
            if (sentiment === 'positive') {
                if (lead.status === 'New') {
                    updates.status = 'Contacted';
                } else if (lead.status === 'Contacted') {
                    updates.status = 'Qualified';
                }
            }

            await LeadsService.updateLead(userId, lead.id, updates);

            toast.success('Reply logged! Lead updated.');
            onSuccess();
            onClose();

            // Reset form
            setReplyContent('');
            setSentiment('positive');
            setNextStep('');
        } catch (error: unknown) {
            console.error('Error logging reply:', error);
            toast.error(error instanceof Error ? error.message : 'Error logging reply');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-lg">
                            📩
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Log Email Reply</h2>
                            <p className="text-sm text-slate-400">
                                {lead.companyName} • {lead.contactName}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Sentiment */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Reply Sentiment</label>
                        <div className="flex gap-2">
                            {[
                                {
                                    value: 'positive',
                                    label: 'Positive',
                                    icon: '😊',
                                    color: 'green',
                                },
                                { value: 'neutral', label: 'Neutral', icon: '😐', color: 'slate' },
                                { value: 'negative', label: 'Negative', icon: '😞', color: 'red' },
                            ].map((s) => (
                                <button
                                    key={s.value}
                                    onClick={() =>
                                        setSentiment(s.value as 'positive' | 'neutral' | 'negative')
                                    }
                                    className={`flex-1 p-3 rounded-lg border text-center transition-all ${
                                        sentiment === s.value
                                            ? `bg-${s.color}-500/20 border-${s.color}-500/50 text-${s.color}-300`
                                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700'
                                    }`}
                                    style={{
                                        backgroundColor:
                                            sentiment === s.value
                                                ? s.color === 'green'
                                                    ? 'rgba(34, 197, 94, 0.2)'
                                                    : s.color === 'red'
                                                      ? 'rgba(239, 68, 68, 0.2)'
                                                      : 'rgba(100, 116, 139, 0.2)'
                                                : undefined,
                                        borderColor:
                                            sentiment === s.value
                                                ? s.color === 'green'
                                                    ? 'rgba(34, 197, 94, 0.5)'
                                                    : s.color === 'red'
                                                      ? 'rgba(239, 68, 68, 0.5)'
                                                      : 'rgba(100, 116, 139, 0.5)'
                                                : undefined,
                                    }}
                                >
                                    <div className="text-xl mb-1">{s.icon}</div>
                                    <div className="text-xs">{s.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reply Content */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">
                            Reply Content or Summary
                        </label>
                        <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            className="glass-input w-full h-32 resize-none"
                            placeholder="Paste the reply or write a summary of what they said..."
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Tip: Paste the email reply directly for full context
                        </p>
                    </div>

                    {/* Next Step */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Next Step</label>
                        <input
                            type="text"
                            value={nextStep}
                            onChange={(e) => setNextStep(e.target.value)}
                            className="glass-input w-full"
                            placeholder="e.g., Schedule call, Send pricing"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !replyContent.trim()}
                        className="glass-button px-6 py-2"
                    >
                        {isSaving ? 'Saving...' : 'Log Reply'}
                    </button>
                </div>
            </div>
        </div>
    );
}
