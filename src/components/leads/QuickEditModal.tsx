'use client';

import React, { useState, useEffect } from 'react';
import { Lead, LeadStatus, LeadSource } from '@/types';
import { X, Save } from 'lucide-react';

interface QuickEditModalProps {
    lead: Lead | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (leadId: string, updates: Partial<Lead>) => Promise<void>;
}

const STATUSES: LeadStatus[] = [
    'New',
    'Contacted',
    'Qualified',
    'Proposal',
    'Negotiation',
    'Closed',
    'Lost',
];

const SOURCES: LeadSource[] = [
    'Website',
    'Referral',
    'Cold Call',
    'LinkedIn',
    'Event',
    'Email Campaign',
    'Partner',
    'Other',
];

const INDUSTRIES = [
    'SaaS',
    'Generative AI',
    'FinTech',
    'Healthcare',
    'E-commerce',
    'Logistics',
    'Manufacturing',
    'Real Estate',
    'Education',
    'Other',
];

export function QuickEditModal({ lead, isOpen, onClose, onSave }: QuickEditModalProps) {
    const [formData, setFormData] = useState({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        value: '',
        industry: '',
        source: '',
        status: 'New' as LeadStatus,
        notes: '',
        nextStep: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    // Sync form data when lead changes
    useEffect(() => {
        if (lead) {
            setFormData({
                companyName: lead.companyName,
                contactName: lead.contactName,
                email: lead.email,
                phone: lead.phone || '',
                value: String(lead.value),
                industry: lead.industry || '',
                source: lead.source || '',
                status: lead.status,
                notes: lead.notes || '',
                nextStep: lead.nextStep || '',
            });
        }
    }, [lead]);

    if (!isOpen || !lead) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(lead.id, {
                companyName: formData.companyName,
                contactName: formData.contactName,
                email: formData.email,
                phone: formData.phone,
                value: parseFloat(formData.value) || 0,
                industry: formData.industry || undefined,
                source: formData.source || undefined,
                status: formData.status,
                notes: formData.notes || undefined,
                nextStep: formData.nextStep || undefined,
            });
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onKeyDown={handleKeyDown}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Quick Edit</h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Company & Contact */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Company</label>
                            <input
                                type="text"
                                value={formData.companyName}
                                onChange={(e) =>
                                    setFormData({ ...formData, companyName: e.target.value })
                                }
                                className="glass-input w-full text-sm py-1.5"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Contact</label>
                            <input
                                type="text"
                                value={formData.contactName}
                                onChange={(e) =>
                                    setFormData({ ...formData, contactName: e.target.value })
                                }
                                className="glass-input w-full text-sm py-1.5"
                            />
                        </div>
                    </div>

                    {/* Email & Phone */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({ ...formData, email: e.target.value })
                                }
                                className="glass-input w-full text-sm py-1.5"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Phone</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) =>
                                    setFormData({ ...formData, phone: e.target.value })
                                }
                                className="glass-input w-full text-sm py-1.5"
                            />
                        </div>
                    </div>

                    {/* Value & Status */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Value ($)</label>
                            <input
                                type="number"
                                value={formData.value}
                                onChange={(e) =>
                                    setFormData({ ...formData, value: e.target.value })
                                }
                                className="glass-input w-full text-sm py-1.5"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        status: e.target.value as LeadStatus,
                                    })
                                }
                                className="glass-input w-full bg-slate-900 text-sm py-1.5"
                            >
                                {STATUSES.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Industry & Source */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Industry</label>
                            <select
                                value={formData.industry}
                                onChange={(e) =>
                                    setFormData({ ...formData, industry: e.target.value })
                                }
                                className="glass-input w-full bg-slate-900 text-sm py-1.5"
                            >
                                <option value="">Select...</option>
                                {INDUSTRIES.map((i) => (
                                    <option key={i} value={i}>
                                        {i}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Source</label>
                            <select
                                value={formData.source}
                                onChange={(e) =>
                                    setFormData({ ...formData, source: e.target.value })
                                }
                                className="glass-input w-full bg-slate-900 text-sm py-1.5"
                            >
                                <option value="">Select...</option>
                                {SOURCES.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Next Step */}
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Next Step</label>
                        <input
                            type="text"
                            value={formData.nextStep}
                            onChange={(e) => setFormData({ ...formData, nextStep: e.target.value })}
                            className="glass-input w-full text-sm py-1.5"
                            placeholder="e.g. Schedule demo call"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="glass-input w-full text-sm py-1.5 h-16 resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="glass-button px-4 py-1.5 text-sm flex items-center gap-2"
                        >
                            <Save size={14} />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
