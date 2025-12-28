'use client';

import React, { useState, useEffect } from 'react';
import { Lead } from '@/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { generateEmail, enhanceEmail, EnhancementAction } from '@/lib/firebase/ai-service';
import { ActivitiesService, EmailThreadsService } from '@/lib/firebase/services';
import { toast } from 'sonner';

interface AIEmailDraftProps {
    lead: Lead;
    isOpen: boolean;
    onClose: () => void;
}

const ENHANCEMENT_ACTIONS: { action: EnhancementAction; icon: string; label: string }[] = [
    { action: 'shorter', icon: '✂️', label: 'Shorter' },
    { action: 'professional', icon: '💼', label: 'Professional' },
    { action: 'friendly', icon: '😊', label: 'Friendly' },
    { action: 'urgency', icon: '⚡', label: 'Add Urgency' },
    { action: 'social-proof', icon: '⭐', label: 'Add Proof' },
];

export function AIEmailDraft({ lead, isOpen, onClose }: AIEmailDraftProps) {
    const { user } = useAuth();
    const [subject, setSubject] = useState('');
    const [email, setEmail] = useState('');
    const [customPrompt, setCustomPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState<EnhancementAction | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCustomPrompt, setShowCustomPrompt] = useState(false);

    const senderName = user?.displayName || 'Sales Team';
    const senderEmail = user?.email || '';

    useEffect(() => {
        if (isOpen && !email) {
            handleGenerate();
        }
    }, [isOpen]);

    const handleGenerate = async (prompt?: string) => {
        setIsGenerating(true);
        setError(null);
        try {
            const result = await generateEmail(lead, senderName, prompt);
            setSubject(result.subject);
            setEmail(result.body);
        } catch (err) {
            setError('Failed to generate email. Using template instead.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEnhance = async (action: EnhancementAction) => {
        if (!email) return;
        setIsEnhancing(action);
        setError(null);
        try {
            const enhanced = await enhanceEmail(email, action, lead);
            setEmail(enhanced);
            toast.success(`Email made ${action}`);
        } catch (err) {
            setError('Enhancement failed. Please try again.');
        } finally {
            setIsEnhancing(null);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(`Subject: ${subject}\n\n${email}`);
        setCopied(true);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSendEmail = async () => {
        // Log the email activity if user is logged in
        if (user) {
            try {
                // Create email thread record
                await EmailThreadsService.createThread(user.uid, {
                    leadId: lead.id,
                    subject,
                    body: email,
                    status: 'sent',
                    sentAt: Date.now(),
                    aiGenerated: true,
                });

                // Log activity
                await ActivitiesService.logEmail(
                    user.uid,
                    lead.id,
                    subject,
                    email.substring(0, 200)
                );
                toast.success('Email logged to activity history');
            } catch (error) {
                console.error('Failed to log email:', error);
            }
        }

        // Open email client
        const mailtoUrl = `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(email)}`;
        window.open(mailtoUrl, '_blank');
    };

    const handleCustomGenerate = () => {
        if (customPrompt.trim()) {
            handleGenerate(customPrompt);
            setShowCustomPrompt(false);
            setCustomPrompt('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                                <span className="text-lg">✨</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">AI Email Draft</h2>
                                <p className="text-sm text-slate-400">
                                    For {lead.companyName} • {lead.status}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white transition-colors text-2xl"
                        >
                            ×
                        </button>
                    </div>

                    {/* Sender/Recipient Info */}
                    <div className="mt-4 flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">From:</span>
                            <span className="text-slate-300">{senderEmail || 'Not logged in'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">To:</span>
                            <span className="text-slate-300">{lead.email}</span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isGenerating ? (
                        <div className="h-64 flex items-center justify-center">
                            <div className="text-center">
                                <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-slate-400">AI is crafting your email...</p>
                                <p className="text-xs text-slate-600 mt-1">
                                    Using company playbooks & lead context
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Custom Prompt Input */}
                            {showCustomPrompt && (
                                <div className="mb-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                                    <label className="block text-sm text-slate-400 mb-2">
                                        What should the email focus on?
                                    </label>
                                    <textarea
                                        value={customPrompt}
                                        onChange={(e) => setCustomPrompt(e.target.value)}
                                        placeholder="E.g., 'Focus on cost savings and mention their Q1 budget planning'"
                                        className="glass-input w-full h-20 resize-none text-sm"
                                    />
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={handleCustomGenerate}
                                            className="glass-button px-4 py-1.5 text-xs"
                                        >
                                            Generate
                                        </button>
                                        <button
                                            onClick={() => setShowCustomPrompt(false)}
                                            className="text-slate-400 hover:text-white text-xs"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Subject Line */}
                            <div className="mb-4">
                                <label className="block text-sm text-slate-400 mb-2">
                                    Subject Line
                                </label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="glass-input w-full"
                                />
                            </div>

                            {/* AI Enhancement Buttons */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm text-slate-400">
                                        AI Enhancements
                                    </label>
                                    <button
                                        onClick={() => setShowCustomPrompt(true)}
                                        className="text-xs text-violet-400 hover:text-violet-300"
                                    >
                                        + Custom prompt
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {ENHANCEMENT_ACTIONS.map(({ action, icon, label }) => (
                                        <button
                                            key={action}
                                            onClick={() => handleEnhance(action)}
                                            disabled={isEnhancing !== null}
                                            className={`px-3 py-1.5 text-xs rounded-lg border transition-all flex items-center gap-1.5
                                                ${
                                                    isEnhancing === action
                                                        ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                                                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white hover:border-slate-600'
                                                }
                                                ${isEnhancing !== null && isEnhancing !== action ? 'opacity-50 cursor-not-allowed' : ''}
                                            `}
                                        >
                                            {isEnhancing === action ? (
                                                <div className="w-3 h-3 border border-violet-300 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <span>{icon}</span>
                                            )}
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Email Body */}
                            <div className="mb-4">
                                <label className="block text-sm text-slate-400 mb-2">
                                    Email Body
                                </label>
                                <textarea
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="glass-input w-full h-56 resize-none font-mono text-sm leading-relaxed"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Actions Footer */}
                {!isGenerating && (
                    <div className="p-6 border-t border-slate-800 bg-slate-900/80">
                        <div className="flex justify-between items-center">
                            <button
                                onClick={() => handleGenerate()}
                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                            >
                                <span>🔄</span> Regenerate
                            </button>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCopy}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                                >
                                    {copied ? '✓ Copied!' : '📋 Copy'}
                                </button>
                                <button
                                    onClick={handleSendEmail}
                                    disabled={!lead.email}
                                    className="glass-button px-6 py-2 flex items-center gap-2"
                                >
                                    📧 Send & Log
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-slate-600 mt-3 text-center">
                            {user
                                ? "Email will be logged to this lead's activity timeline"
                                : 'Log in to track email activity'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
