'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Lead, LeadStatus, LeadSource } from '@/types';
import { X, Save } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

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

    const { containerRef } = useFocusTrap(isOpen && !!lead);

    // Handle Escape key
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        },
        [onClose]
    );

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

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-edit-title"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal */}
            <div
                ref={containerRef}
                className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-800 flex-shrink-0">
                    <h2 id="quick-edit-title" className="text-xl font-bold text-white">
                        Quick Edit
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                        aria-label="Close modal"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {/* Company & Contact */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label
                                htmlFor="qe-company"
                                className="block text-xs text-slate-500 mb-1"
                            >
                                Company
                            </label>
                            <input
                                id="qe-company"
                                type="text"
                                value={formData.companyName}
                                onChange={(e) =>
                                    setFormData({ ...formData, companyName: e.target.value })
                                }
                                className="glass-input w-full text-sm py-1.5"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="qe-contact"
                                className="block text-xs text-slate-500 mb-1"
                            >
                                Contact
                            </label>
                            <input
                                id="qe-contact"
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
                            <label htmlFor="qe-email" className="block text-xs text-slate-500 mb-1">
                                Email
                            </label>
                            <input
                                id="qe-email"
                                type="email"
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({ ...formData, email: e.target.value })
                                }
                                className="glass-input w-full text-sm py-1.5"
                            />
                        </div>
                        <div>
                            <label htmlFor="qe-phone" className="block text-xs text-slate-500 mb-1">
                                Phone
                            </label>
                            <input
                                id="qe-phone"
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
                            <label htmlFor="qe-value" className="block text-xs text-slate-500 mb-1">
                                Value ($)
                            </label>
                            <input
                                id="qe-value"
                                type="number"
                                value={formData.value}
                                onChange={(e) =>
                                    setFormData({ ...formData, value: e.target.value })
                                }
                                className="glass-input w-full text-sm py-1.5"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="qe-status"
                                className="block text-xs text-slate-500 mb-1"
                            >
                                Status
                            </label>
                            <select
                                id="qe-status"
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
                            <label
                                htmlFor="qe-industry"
                                className="block text-xs text-slate-500 mb-1"
                            >
                                Industry
                            </label>
                            <select
                                id="qe-industry"
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
                            <label
                                htmlFor="qe-source"
                                className="block text-xs text-slate-500 mb-1"
                            >
                                Source
                            </label>
                            <select
                                id="qe-source"
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
                        <label htmlFor="qe-nextstep" className="block text-xs text-slate-500 mb-1">
                            Next Step
                        </label>
                        <input
                            id="qe-nextstep"
                            type="text"
                            value={formData.nextStep}
                            onChange={(e) => setFormData({ ...formData, nextStep: e.target.value })}
                            className="glass-input w-full text-sm py-1.5"
                            placeholder="e.g. Schedule demo call"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label htmlFor="qe-notes" className="block text-xs text-slate-500 mb-1">
                            Notes
                        </label>
                        <textarea
                            id="qe-notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="glass-input w-full text-sm py-1.5 h-16 resize-none"
                        />
                    </div>
                </div>

                    {/* Actions - Sticky Footer */}
                    <div className="flex justify-end gap-3 p-5 border-t border-slate-800 flex-shrink-0">
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
                            <Save size={14} aria-hidden="true" />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
