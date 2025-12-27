'use client';

import React, { useState, useEffect } from 'react';
import { Lead } from '@/types';
import { EmailRecord, getLeadEmails, syncEmailsForLead } from '@/lib/gmail/gmail-service';
import { analyzeEmail, analyzeEmailThread, EmailAnalysis } from '@/lib/gmail/email-analyzer';
import { toast } from 'sonner';

interface EmailThreadsPanelProps {
    lead: Lead;
    userId: string;
    isOpen: boolean;
    onClose: () => void;
    onDraftReply: (subject: string, body: string) => void;
}

export function EmailThreadsPanel({ lead, userId, isOpen, onClose, onDraftReply }: EmailThreadsPanelProps) {
    const [emails, setEmails] = useState<EmailRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [threadAnalysis, setThreadAnalysis] = useState<{
        threadSummary: string;
        overallSentiment: 'positive' | 'neutral' | 'negative';
        engagementLevel: 'high' | 'medium' | 'low';
        nextBestAction: string;
        dealHealth: 'healthy' | 'at-risk' | 'stalled';
    } | null>(null);
    const [emailAnalyses, setEmailAnalyses] = useState<Record<string, EmailAnalysis>>({});
    const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && lead.email) {
            loadEmails();
        }
    }, [isOpen, lead.email]);

    const loadEmails = async () => {
        setIsLoading(true);
        try {
            const data = await getLeadEmails(userId, lead.id);
            setEmails(data);

            // Analyze thread if we have emails
            if (data.length > 0) {
                const analysis = await analyzeEmailThread(data);
                setThreadAnalysis(analysis);
            }
        } catch (error) {
            console.error('Error loading emails:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const synced = await syncEmailsForLead(userId, lead.email, lead.id);
            setEmails(synced.sort((a, b) => b.timestamp - a.timestamp));
            toast.success(`Synced ${synced.length} emails`);

            // Re-analyze thread
            if (synced.length > 0) {
                const analysis = await analyzeEmailThread(synced);
                setThreadAnalysis(analysis);
            }
        } catch (error: unknown) {
            if (error instanceof Error && error.message === 'Gmail not connected') {
                toast.error('Please connect Gmail in Settings first');
            } else {
                toast.error('Failed to sync emails');
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const handleAnalyzeEmail = async (email: EmailRecord) => {
        if (emailAnalyses[email.id]) return;

        try {
            const analysis = await analyzeEmail(email);
            setEmailAnalyses(prev => ({ ...prev, [email.id]: analysis }));
        } catch (error) {
            toast.error('Failed to analyze email');
        }
    };

    const getSentimentColor = (sentiment: string) => {
        switch (sentiment) {
            case 'positive': return 'text-green-400 bg-green-500/10 border-green-500/30';
            case 'negative': return 'text-red-400 bg-red-500/10 border-red-500/30';
            default: return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
        }
    };

    const getDealHealthColor = (health: string) => {
        switch (health) {
            case 'healthy': return 'text-green-400';
            case 'at-risk': return 'text-amber-400';
            default: return 'text-red-400';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-lg">
                                📧
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Email History</h2>
                                <p className="text-sm text-slate-400">{lead.companyName} • {lead.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors flex items-center gap-2"
                            >
                                {isSyncing ? (
                                    <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <span>🔄</span>
                                )}
                                Sync Gmail
                            </button>
                            <button
                                onClick={onClose}
                                className="text-slate-400 hover:text-white text-2xl px-2"
                            >
                                ×
                            </button>
                        </div>
                    </div>

                    {/* Thread Analysis Summary */}
                    {threadAnalysis && (
                        <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-400">AI Thread Analysis</span>
                                <span className={`text-xs font-medium ${getDealHealthColor(threadAnalysis.dealHealth)}`}>
                                    {threadAnalysis.dealHealth.toUpperCase()}
                                </span>
                            </div>
                            <p className="text-sm text-slate-300 mb-2">{threadAnalysis.threadSummary}</p>
                            <div className="flex items-center gap-4 text-xs">
                                <span className={`px-2 py-1 rounded border ${getSentimentColor(threadAnalysis.overallSentiment)}`}>
                                    {threadAnalysis.overallSentiment}
                                </span>
                                <span className="text-slate-500">
                                    Engagement: {threadAnalysis.engagementLevel}
                                </span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                                <span className="text-amber-400">💡</span>
                                <span className="text-sm text-amber-300">{threadAnalysis.nextBestAction}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Email List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : emails.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-slate-500 mb-4">No emails found for this lead</p>
                            <button
                                onClick={handleSync}
                                className="glass-button px-4 py-2"
                            >
                                🔄 Sync from Gmail
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {emails.map((email) => (
                                <div
                                    key={email.id}
                                    className={`p-4 rounded-lg border transition-all cursor-pointer ${email.direction === 'sent'
                                        ? 'bg-blue-500/5 border-blue-500/20 ml-8'
                                        : 'bg-slate-800/50 border-slate-700 mr-8'
                                        }`}
                                    onClick={() => {
                                        setExpandedEmailId(expandedEmailId === email.id ? null : email.id);
                                        if (!emailAnalyses[email.id]) {
                                            handleAnalyzeEmail(email);
                                        }
                                    }}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">
                                                {email.direction === 'sent' ? '📤' : '📥'}
                                            </span>
                                            <span className="text-sm font-medium text-slate-300">
                                                {email.direction === 'sent' ? 'You' : lead.contactName}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-500">
                                            {new Date(email.timestamp).toLocaleString()}
                                        </span>
                                    </div>

                                    <p className="text-sm font-medium text-white mb-1">{email.subject}</p>
                                    <p className="text-sm text-slate-400">
                                        {expandedEmailId === email.id ? email.body : email.snippet}
                                    </p>

                                    {/* AI Analysis */}
                                    {expandedEmailId === email.id && emailAnalyses[email.id] && (
                                        <div className="mt-3 pt-3 border-t border-slate-700">
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                <span className={`text-xs px-2 py-1 rounded border ${getSentimentColor(emailAnalyses[email.id].sentiment)}`}>
                                                    {emailAnalyses[email.id].sentiment}
                                                </span>
                                                <span className="text-xs px-2 py-1 rounded border border-slate-600 text-slate-400">
                                                    {emailAnalyses[email.id].intent}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mb-2">{emailAnalyses[email.id].summary}</p>
                                            {emailAnalyses[email.id].dealSignals.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {emailAnalyses[email.id].dealSignals.map((signal, i) => (
                                                        <span key={i} className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded">
                                                            🎯 {signal}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800">
                    <button
                        onClick={() => {
                            const lastEmail = emails[0];
                            onDraftReply(
                                'Re: ' + (lastEmail?.subject || ''),
                                ''
                            );
                            onClose();
                        }}
                        className="glass-button w-full py-2"
                    >
                        ✨ Draft AI Reply
                    </button>
                </div>
            </div>
        </div>
    );
}
