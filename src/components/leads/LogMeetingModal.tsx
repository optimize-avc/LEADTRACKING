'use client';

import React, { useState, useEffect } from 'react';
import { Lead, ActivityOutcome } from '@/types';
import { ActivitiesService, LeadsService } from '@/lib/firebase/services';
import { toast } from 'sonner';

interface LogMeetingModalProps {
    lead: Lead;
    userId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const MEETING_TYPES = [
    { value: 'video', label: 'Video Call', icon: '📹' },
    { value: 'phone', label: 'Phone Call', icon: '📞' },
    { value: 'in-person', label: 'In-Person', icon: '🤝' },
];

const MEETING_OUTCOMES: { value: ActivityOutcome; label: string; statusUpdate?: string }[] = [
    { value: 'qualified', label: 'Qualified - Moving Forward', statusUpdate: 'Qualified' },
    { value: 'meeting_set', label: 'Follow-up Meeting Set', statusUpdate: 'Qualified' },
    { value: 'contract_sent', label: 'Proposal/Contract Sent', statusUpdate: 'Proposal' },
    { value: 'closed_won', label: 'Closed Won! 🎉', statusUpdate: 'Closed' },
    { value: 'none', label: 'No Decision Yet' },
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

export function LogMeetingModal({ lead, userId, isOpen, onClose, onSuccess }: LogMeetingModalProps) {
    const [meetingType, setMeetingType] = useState('video');
    const [duration, setDuration] = useState(30);
    const [outcome, setOutcome] = useState<ActivityOutcome>('qualified');
    const [notes, setNotes] = useState('');
    const [meetingDate, setMeetingDate] = useState('');
    const [meetingTime, setMeetingTime] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Set default date/time when modal opens
    useEffect(() => {
        if (isOpen) {
            const now = new Date();
            setMeetingDate(now.toISOString().split('T')[0]);
            setMeetingTime(now.toTimeString().slice(0, 5));
            setMeetingType('video');
            setDuration(30);
            setOutcome('qualified');
            setNotes('');
        }
    }, [isOpen]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Calculate timestamp from date and time
            const dateTime = new Date(`${meetingDate}T${meetingTime}`);
            const timestamp = dateTime.getTime();

            // Log the meeting activity
            await ActivitiesService.logActivity(userId, {
                type: 'meeting',
                outcome,
                leadId: lead.id,
                duration: duration * 60, // Convert to seconds
                notes: `${meetingType.toUpperCase()} meeting. ${notes}`,
                timestamp,
                repId: userId
            });

            // Update lead based on outcome
            const selectedOutcome = MEETING_OUTCOMES.find(o => o.value === outcome);
            const updates: Partial<Lead> = {
                lastContact: Date.now()
            };

            if (selectedOutcome?.statusUpdate) {
                updates.status = selectedOutcome.statusUpdate as Lead['status'];
            }

            await LeadsService.updateLead(userId, lead.id, updates);

            toast.success('Meeting logged successfully!');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error logging meeting:', error);
            toast.error('Failed to log meeting');
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
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-lg">
                            📅
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Log Meeting</h2>
                            <p className="text-sm text-slate-400">{lead.companyName} • {lead.contactName}</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Date</label>
                            <input
                                type="date"
                                value={meetingDate}
                                onChange={(e) => setMeetingDate(e.target.value)}
                                className="glass-input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Time</label>
                            <input
                                type="time"
                                value={meetingTime}
                                onChange={(e) => setMeetingTime(e.target.value)}
                                className="glass-input w-full"
                            />
                        </div>
                    </div>

                    {/* Meeting Type */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Meeting Type</label>
                        <div className="flex gap-2">
                            {MEETING_TYPES.map((type) => (
                                <button
                                    key={type.value}
                                    onClick={() => setMeetingType(type.value)}
                                    className={`flex-1 p-3 rounded-lg border text-center transition-all ${meetingType === type.value
                                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700'
                                        }`}
                                >
                                    <div className="text-xl mb-1">{type.icon}</div>
                                    <div className="text-xs">{type.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Duration</label>
                        <div className="flex flex-wrap gap-2">
                            {DURATION_OPTIONS.map((mins) => (
                                <button
                                    key={mins}
                                    onClick={() => setDuration(mins)}
                                    className={`px-4 py-2 rounded-lg border text-sm transition-all ${duration === mins
                                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700'
                                        }`}
                                >
                                    {mins} min
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Outcome */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Outcome</label>
                        <select
                            value={outcome}
                            onChange={(e) => setOutcome(e.target.value as ActivityOutcome)}
                            className="glass-input w-full bg-slate-900"
                        >
                            {MEETING_OUTCOMES.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="glass-input w-full h-20 resize-none"
                            placeholder="Key discussion points, action items..."
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
                        {isSaving ? 'Saving...' : 'Save Meeting'}
                    </button>
                </div>
            </div>
        </div>
    );
}
