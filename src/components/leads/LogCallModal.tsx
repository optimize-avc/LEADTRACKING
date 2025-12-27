'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Lead, ActivityOutcome } from '@/types';
import { ActivitiesService, LeadsService } from '@/lib/firebase/services';
import { toast } from 'sonner';

interface LogCallModalProps {
    lead: Lead;
    userId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const OUTCOMES: { value: ActivityOutcome; label: string; icon: string; statusUpdate?: string }[] = [
    { value: 'connected', label: 'Connected', icon: '✅' },
    { value: 'voicemail', label: 'Left Voicemail', icon: '📞' },
    { value: 'no_answer', label: 'No Answer', icon: '📵' },
    { value: 'wrong_number', label: 'Wrong Number', icon: '❌' },
    { value: 'meeting_set', label: 'Meeting Set!', icon: '🎉', statusUpdate: 'Qualified' },
    { value: 'qualified', label: 'Qualified', icon: '⭐', statusUpdate: 'Qualified' },
];

export function LogCallModal({ lead, userId, isOpen, onClose, onSuccess }: LogCallModalProps) {
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [outcome, setOutcome] = useState<ActivityOutcome>('connected');
    const [notes, setNotes] = useState('');
    const [nextStep, setNextStep] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Timer logic
    useEffect(() => {
        if (isTimerRunning) {
            timerRef.current = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isTimerRunning]);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setElapsedSeconds(0);
            setIsTimerRunning(false);
            setOutcome('connected');
            setNotes('');
            setNextStep('');
        }
    }, [isOpen]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Log the call activity
            await ActivitiesService.logActivity(userId, {
                type: 'call',
                outcome,
                leadId: lead.id,
                duration: elapsedSeconds,
                notes: notes || undefined,
                timestamp: Date.now(),
                repId: userId
            });

            // Update lead if outcome warrants it
            const selectedOutcome = OUTCOMES.find(o => o.value === outcome);
            const updates: Partial<Lead> = {
                lastContact: Date.now()
            };

            if (nextStep) {
                updates.nextStep = nextStep;
            }

            if (selectedOutcome?.statusUpdate && (lead.status === 'New' || lead.status === 'Contacted')) {
                updates.status = selectedOutcome.statusUpdate as Lead['status'];
            }

            await LeadsService.updateLead(userId, lead.id, updates);

            toast.success('Call logged successfully!');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error logging call:', error);
            toast.error('Failed to log call');
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
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-lg">
                            📞
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Log Call</h2>
                            <p className="text-sm text-slate-400">{lead.companyName} • {lead.contactName}</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Timer */}
                    <div className="text-center">
                        <div className="text-5xl font-mono font-bold text-white mb-3">
                            {formatTime(elapsedSeconds)}
                        </div>
                        <button
                            onClick={() => setIsTimerRunning(!isTimerRunning)}
                            className={`px-6 py-2 rounded-lg font-medium transition-all ${isTimerRunning
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                                : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                                }`}
                        >
                            {isTimerRunning ? '⏹ Stop Timer' : '▶️ Start Timer'}
                        </button>
                        <p className="text-xs text-slate-500 mt-2">Or enter duration manually below</p>
                    </div>

                    {/* Manual Duration Input */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Duration (minutes)</label>
                        <input
                            type="number"
                            min="0"
                            value={Math.floor(elapsedSeconds / 60)}
                            onChange={(e) => setElapsedSeconds(parseInt(e.target.value) * 60 || 0)}
                            className="glass-input w-full"
                            placeholder="0"
                        />
                    </div>

                    {/* Outcome */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Outcome</label>
                        <div className="grid grid-cols-2 gap-2">
                            {OUTCOMES.map((o) => (
                                <button
                                    key={o.value}
                                    onClick={() => setOutcome(o.value)}
                                    className={`p-3 rounded-lg border text-left transition-all ${outcome === o.value
                                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'
                                        }`}
                                >
                                    <span className="mr-2">{o.icon}</span>
                                    <span className="text-sm">{o.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="glass-input w-full h-20 resize-none"
                            placeholder="What was discussed?"
                        />
                    </div>

                    {/* Next Step */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Next Step</label>
                        <input
                            type="text"
                            value={nextStep}
                            onChange={(e) => setNextStep(e.target.value)}
                            className="glass-input w-full"
                            placeholder="e.g., Send proposal, Schedule demo"
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
                        disabled={isSaving}
                        className="glass-button px-6 py-2"
                    >
                        {isSaving ? 'Saving...' : 'Save Call Log'}
                    </button>
                </div>
            </div>
        </div>
    );
}
