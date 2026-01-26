'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Sparkles, Building2 } from 'lucide-react';
import { BusinessAuditResult } from '@/lib/ai/business-audit';
import { Resource } from '@/types';

const SEARCH_PHASES = [
    'Searching the web...',
    'Analyzing website...',
    'Gathering reviews...',
    'Building intelligence report...',
    'Generating insights...',
];

interface BusinessSearchProps {
    onAuditComplete: (result: BusinessAuditResult) => void;
    onAuditStart: () => void;
    resources: Resource[];
    userToken: string | null;
}

export function BusinessSearch({
    onAuditComplete,
    onAuditStart,
    resources,
    userToken,
}: BusinessSearchProps) {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchPhase, setSearchPhase] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isSearching) {
            let phaseIndex = 0;
            const interval = setInterval(() => {
                phaseIndex = (phaseIndex + 1) % SEARCH_PHASES.length;
                setSearchPhase(SEARCH_PHASES[phaseIndex]);
            }, 2500);
            return () => clearInterval(interval);
        }
    }, [isSearching]);

    const runAudit = async (searchQuery: string) => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setError(null);
        setSearchPhase(SEARCH_PHASES[0]);
        onAuditStart();

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            if (userToken) {
                headers['Authorization'] = `Bearer ${userToken}`;
            }

            const response = await fetch('/api/audit', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    query: searchQuery.trim(),
                    resources,
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Audit failed');
            }

            const data = await response.json();
            onAuditComplete(data.audit);
        } catch (err) {
            console.error('Audit error:', err);
            setError(err instanceof Error ? err.message : 'Failed to complete audit');
        } finally {
            setIsSearching(false);
            setSearchPhase('');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        runAudit(query);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            runAudit(query);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
                {/* Glowing background effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/20 to-cyan-600/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity" />

                <div className="relative">
                    <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 focus-within:border-violet-500/50 focus-within:shadow-[0_0_30px_rgba(139,92,246,0.2)] transition-all">
                        {isSearching ? (
                            <Loader2 className="w-5 h-5 text-violet-400 animate-spin flex-shrink-0" />
                        ) : (
                            <Building2 className="w-5 h-5 text-slate-500 flex-shrink-0" />
                        )}

                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter company name, website, or domain..."
                            className="flex-1 bg-transparent text-white placeholder:text-slate-500 outline-none text-base"
                            disabled={isSearching}
                        />

                        <button
                            type="submit"
                            disabled={isSearching || !query.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-all"
                        >
                            <Sparkles className="w-4 h-4" />
                            {isSearching ? 'Analyzing' : 'Deep Audit'}
                        </button>
                    </div>
                </div>
            </form>

            {/* Search Phase Indicator */}
            {isSearching && searchPhase && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400">
                    <div className="flex gap-1">
                        <span
                            className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce"
                            style={{ animationDelay: '0ms' }}
                        />
                        <span
                            className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce"
                            style={{ animationDelay: '150ms' }}
                        />
                        <span
                            className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce"
                            style={{ animationDelay: '300ms' }}
                        />
                    </div>
                    <span>{searchPhase}</span>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Example Searches */}
            {!isSearching && !query && (
                <div className="mt-6 text-center">
                    <p className="text-xs text-slate-500 mb-3">Try searching for:</p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {['Stripe', 'HubSpot', 'Notion', 'shopify.com', 'linear.app'].map(
                            (example) => (
                                <button
                                    key={example}
                                    onClick={() => {
                                        setQuery(example);
                                        inputRef.current?.focus();
                                    }}
                                    className="px-3 py-1.5 text-xs bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-slate-600 rounded-full text-slate-400 hover:text-white transition-all"
                                >
                                    {example}
                                </button>
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
