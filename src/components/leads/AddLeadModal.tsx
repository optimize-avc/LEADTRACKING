'use client';

import React, { useState } from 'react';
import { Lead, LeadStatus, LeadSource } from '@/types';

interface AddLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'assignedTo'>) => void;
}

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

export function AddLeadModal({ isOpen, onClose, onSave }: AddLeadModalProps) {
    const [formData, setFormData] = useState({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        value: '',
        industry: '',
        source: 'Other' as LeadSource,
        status: 'New' as LeadStatus,
        notes: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    if (!isOpen) return null;

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
        if (!formData.contactName.trim()) newErrors.contactName = 'Contact name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
            newErrors.email = 'Invalid email format';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        onSave({
            companyName: formData.companyName,
            contactName: formData.contactName,
            email: formData.email,
            phone: formData.phone,
            value: parseFloat(formData.value) || 0,
            industry: formData.industry || 'Other',
            source: formData.source || 'Other',
            status: formData.status,
            notes: formData.notes,
        });

        // Reset form
        setFormData({
            companyName: '',
            contactName: '',
            email: '',
            phone: '',
            value: '',
            industry: '',
            source: 'Other',
            status: 'New',
            notes: '',
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-6">Add New Lead</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Company & Contact */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">
                                Company Name *
                            </label>
                            <input
                                type="text"
                                value={formData.companyName}
                                onChange={(e) =>
                                    setFormData({ ...formData, companyName: e.target.value })
                                }
                                className="glass-input w-full"
                                placeholder="Acme Corp"
                            />
                            {errors.companyName && (
                                <p className="text-red-400 text-xs mt-1">{errors.companyName}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">
                                Contact Name *
                            </label>
                            <input
                                type="text"
                                value={formData.contactName}
                                onChange={(e) =>
                                    setFormData({ ...formData, contactName: e.target.value })
                                }
                                className="glass-input w-full"
                                placeholder="John Doe"
                            />
                            {errors.contactName && (
                                <p className="text-red-400 text-xs mt-1">{errors.contactName}</p>
                            )}
                        </div>
                    </div>

                    {/* Email & Phone */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Email *</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({ ...formData, email: e.target.value })
                                }
                                className="glass-input w-full"
                                placeholder="john@acme.com"
                            />
                            {errors.email && (
                                <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Phone</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) =>
                                    setFormData({ ...formData, phone: e.target.value })
                                }
                                className="glass-input w-full"
                                placeholder="555-0123"
                            />
                        </div>
                    </div>

                    {/* Value & Industry */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">
                                Est. Value ($)
                            </label>
                            <input
                                type="number"
                                value={formData.value}
                                onChange={(e) =>
                                    setFormData({ ...formData, value: e.target.value })
                                }
                                className="glass-input w-full"
                                placeholder="5000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Industry</label>
                            <select
                                value={formData.industry}
                                onChange={(e) =>
                                    setFormData({ ...formData, industry: e.target.value })
                                }
                                className="glass-input w-full bg-slate-900"
                            >
                                <option value="">Select industry...</option>
                                {INDUSTRIES.map((ind) => (
                                    <option key={ind} value={ind}>
                                        {ind}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Status & Source */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        status: e.target.value as LeadStatus,
                                    })
                                }
                                className="glass-input w-full bg-slate-900"
                            >
                                {STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Lead Source</label>
                            <select
                                value={formData.source}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        source: (e.target.value as LeadSource) || 'Other',
                                    })
                                }
                                className="glass-input w-full bg-slate-900"
                            >
                                {SOURCES.map((source) => (
                                    <option key={source} value={source}>
                                        {source}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="glass-input w-full h-20 resize-none"
                            placeholder="Any additional notes..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button type="submit" className="glass-button px-6 py-2">
                            Create Lead
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
