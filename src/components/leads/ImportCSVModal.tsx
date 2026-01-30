'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Lead, LeadStatus, LeadSource } from '@/types';
import { Upload, X, FileSpreadsheet, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface ImportCSVModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (
        leads: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'assignedTo'>[]
    ) => Promise<void>;
}

type ColumnMapping = {
    companyName: string | null;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    value: string | null;
    industry: string | null;
    source: string | null;
    status: string | null;
    notes: string | null;
};

const LEAD_FIELDS: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
    { key: 'companyName', label: 'Company Name', required: true },
    { key: 'contactName', label: 'Contact Name', required: true },
    { key: 'email', label: 'Email', required: true },
    { key: 'phone', label: 'Phone', required: false },
    { key: 'value', label: 'Value ($)', required: false },
    { key: 'industry', label: 'Industry', required: false },
    { key: 'source', label: 'Lead Source', required: false },
    { key: 'status', label: 'Status', required: false },
    { key: 'notes', label: 'Notes', required: false },
];

export function ImportCSVModal({ isOpen, onClose, onImport }: ImportCSVModalProps) {
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
    const [csvData, setCsvData] = useState<string[][]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
        companyName: null,
        contactName: null,
        email: null,
        phone: null,
        value: null,
        industry: null,
        source: null,
        status: null,
        notes: null,
    });
    const [error, setError] = useState<string | null>(null);

    const { containerRef } = useFocusTrap(isOpen);

    // Reset state helper - defined before use
    const resetState = useCallback(() => {
        setStep('upload');
        setCsvData([]);
        setHeaders([]);
        setColumnMapping({
            companyName: null,
            contactName: null,
            email: null,
            phone: null,
            value: null,
            industry: null,
            source: null,
            status: null,
            notes: null,
        });
        setError(null);
    }, []);

    // Handle Escape key
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
                resetState();
            }
        },
        [onClose, resetState]
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

    const parseCSV = (text: string): string[][] => {
        const lines = text.split('\n').filter((line) => line.trim());
        return lines.map((line) => {
            const result: string[] = [];
            let current = '';
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        });
    };

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            setError('Please upload a CSV file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const parsed = parseCSV(text);

                if (parsed.length < 2) {
                    setError('CSV must have a header row and at least one data row');
                    return;
                }

                setHeaders(parsed[0]);
                setCsvData(parsed.slice(1));
                setError(null);

                // Auto-map columns
                const autoMapping: ColumnMapping = {
                    companyName: null,
                    contactName: null,
                    email: null,
                    phone: null,
                    value: null,
                    industry: null,
                    source: null,
                    status: null,
                    notes: null,
                };
                parsed[0].forEach((header) => {
                    const lower = header.toLowerCase();
                    if (lower.includes('company')) autoMapping.companyName = header;
                    else if (lower.includes('contact') || lower.includes('name'))
                        autoMapping.contactName = header;
                    else if (lower.includes('email')) autoMapping.email = header;
                    else if (lower.includes('phone')) autoMapping.phone = header;
                    else if (lower.includes('value') || lower.includes('amount'))
                        autoMapping.value = header;
                    else if (lower.includes('industry')) autoMapping.industry = header;
                    else if (lower.includes('source')) autoMapping.source = header;
                    else if (lower.includes('status')) autoMapping.status = header;
                    else if (lower.includes('note')) autoMapping.notes = header;
                });
                setColumnMapping(autoMapping);
                setStep('mapping');
            } catch {
                setError('Failed to parse CSV file');
            }
        };
        reader.readAsText(file);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) {
                const fakeEvent = {
                    target: { files: [file] },
                } as unknown as React.ChangeEvent<HTMLInputElement>;
                handleFileUpload(fakeEvent);
            }
        },
        [handleFileUpload]
    );

    const buildLeads = (): Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'assignedTo'>[] => {
        return csvData
            .map((row) => {
                const getValue = (field: keyof ColumnMapping): string => {
                    const header = columnMapping[field];
                    if (!header) return '';
                    const idx = headers.indexOf(header);
                    return idx >= 0 ? row[idx] || '' : '';
                };

                const companyName = getValue('companyName');
                const contactName = getValue('contactName');
                const email = getValue('email');

                // Skip rows missing required fields
                if (!companyName || !contactName || !email) return null;

                return {
                    companyName,
                    contactName,
                    email,
                    phone: getValue('phone'),
                    value: parseFloat(getValue('value')) || 0,
                    industry: getValue('industry') || undefined,
                    source: (getValue('source') as LeadSource) || undefined,
                    status: (getValue('status') as LeadStatus) || 'New',
                    notes: getValue('notes') || undefined,
                };
            })
            .filter(Boolean) as Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'assignedTo'>[];
    };

    const handleImport = async () => {
        const leads = buildLeads();
        if (leads.length === 0) {
            setError('No valid leads to import');
            return;
        }
        setStep('importing');
        await onImport(leads);
        onClose();
        resetState();
    };

    if (!isOpen) return null;

    const previewLeads = buildLeads().slice(0, 5);
    const requiredMapped =
        columnMapping.companyName && columnMapping.contactName && columnMapping.email;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-csv-title"
        >
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            <div
                ref={containerRef}
                className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[80vh] overflow-auto"
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <FileSpreadsheet
                            className="text-emerald-400"
                            size={24}
                            aria-hidden="true"
                        />
                        <h2 id="import-csv-title" className="text-xl font-bold text-white">
                            Import Leads from CSV
                        </h2>
                    </div>
                    <button
                        onClick={() => {
                            onClose();
                            resetState();
                        }}
                        className="p-1 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                        aria-label="Close import modal"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                {error && (
                    <div
                        className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm"
                        role="alert"
                    >
                        <AlertCircle size={16} aria-hidden="true" />
                        {error}
                    </div>
                )}

                {/* Step 1: Upload */}
                {step === 'upload' && (
                    <div
                        className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-emerald-500/50 transition-colors"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        role="region"
                        aria-label="File upload area"
                    >
                        <Upload
                            className="mx-auto mb-4 text-slate-500"
                            size={48}
                            aria-hidden="true"
                        />
                        <p className="text-slate-300 mb-2">Drag & drop your CSV file here</p>
                        <p className="text-slate-500 text-sm mb-4">or</p>
                        <label className="glass-button cursor-pointer inline-block">
                            <span>Browse Files</span>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="sr-only"
                                aria-label="Choose CSV file to upload"
                            />
                        </label>
                        <p className="text-slate-600 text-xs mt-4">
                            Supported: CSV with headers (Company, Contact, Email, etc.)
                        </p>
                    </div>
                )}

                {/* Step 2: Column Mapping */}
                {step === 'mapping' && (
                    <div>
                        <p className="text-slate-400 text-sm mb-4" id="mapping-description">
                            Map your CSV columns to lead fields. Required fields marked with *.
                        </p>
                        <div
                            className="space-y-3 max-h-[300px] overflow-auto"
                            role="group"
                            aria-describedby="mapping-description"
                        >
                            {LEAD_FIELDS.map((field) => (
                                <div key={field.key} className="flex items-center gap-3">
                                    <label
                                        htmlFor={`mapping-${field.key}`}
                                        className="text-slate-300 text-sm w-32 flex-shrink-0"
                                    >
                                        {field.label}
                                        {field.required && (
                                            <>
                                                <span
                                                    className="text-red-400 ml-0.5"
                                                    aria-hidden="true"
                                                >
                                                    *
                                                </span>
                                                <span className="sr-only">(required)</span>
                                            </>
                                        )}
                                    </label>
                                    <ArrowRight
                                        size={14}
                                        className="text-slate-600"
                                        aria-hidden="true"
                                    />
                                    <select
                                        id={`mapping-${field.key}`}
                                        value={columnMapping[field.key] || ''}
                                        onChange={(e) =>
                                            setColumnMapping({
                                                ...columnMapping,
                                                [field.key]: e.target.value || null,
                                            })
                                        }
                                        className="flex-1 glass-input bg-slate-900 text-sm py-1.5"
                                        aria-required={field.required}
                                    >
                                        <option value="">-- Skip --</option>
                                        {headers.map((h) => (
                                            <option key={h} value={h}>
                                                {h}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between mt-6 pt-4 border-t border-slate-700">
                            <button
                                onClick={() => {
                                    setStep('upload');
                                    setCsvData([]);
                                    setHeaders([]);
                                }}
                                className="text-sm text-slate-400 hover:text-white"
                            >
                                ← Back
                            </button>
                            <button
                                onClick={() => setStep('preview')}
                                disabled={!requiredMapped}
                                className="glass-button text-sm disabled:opacity-50"
                            >
                                Preview Import →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Preview */}
                {step === 'preview' && (
                    <div>
                        <p className="text-slate-400 text-sm mb-4">
                            Preview of {buildLeads().length} leads to import:
                        </p>
                        <div className="overflow-auto max-h-[250px] rounded-lg border border-slate-700">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-800 sticky top-0">
                                    <tr>
                                        <th className="text-left text-slate-400 px-3 py-2">
                                            Company
                                        </th>
                                        <th className="text-left text-slate-400 px-3 py-2">
                                            Contact
                                        </th>
                                        <th className="text-left text-slate-400 px-3 py-2">
                                            Email
                                        </th>
                                        <th className="text-left text-slate-400 px-3 py-2">
                                            Value
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewLeads.map((lead, idx) => (
                                        <tr key={idx} className="border-t border-slate-700/50">
                                            <td className="px-3 py-2 text-white">
                                                {lead.companyName}
                                            </td>
                                            <td className="px-3 py-2 text-slate-300">
                                                {lead.contactName}
                                            </td>
                                            <td className="px-3 py-2 text-slate-400">
                                                {lead.email}
                                            </td>
                                            <td className="px-3 py-2 text-emerald-400">
                                                ${lead.value}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {buildLeads().length > 5 && (
                            <p className="text-slate-500 text-xs mt-2">
                                ...and {buildLeads().length - 5} more
                            </p>
                        )}

                        <div className="flex justify-between mt-6 pt-4 border-t border-slate-700">
                            <button
                                onClick={() => setStep('mapping')}
                                className="text-sm text-slate-400 hover:text-white"
                            >
                                ← Back
                            </button>
                            <button
                                onClick={handleImport}
                                className="glass-button text-sm flex items-center gap-2"
                            >
                                <Check size={14} />
                                Import {buildLeads().length} Leads
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Importing */}
                {step === 'importing' && (
                    <div className="text-center py-8">
                        <div className="animate-spin w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-slate-300">Importing leads...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
