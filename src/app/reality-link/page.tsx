'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { ResourcesService } from '@/lib/firebase/resources';
import { Resource } from '@/types';
import { useAuth } from '@/components/providers/AuthProvider';
import {
    Mic, MicOff, Radio, Zap, ExternalLink,
    AlertTriangle, Shield, CheckCircle, Search,
    Terminal, Activity, Sparkles, XCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function RealityLinkPage() {
    const { user } = useAuth();
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [companyResources, setCompanyResources] = useState<Resource[]>([]);
    const [activeCards, setActiveCards] = useState<Resource[]>([]);
    const [aiTactics, setAiTactics] = useState<string[]>([]);
    const [activeLead, setActiveLead] = useState({ name: 'Jordan Smith', company: 'Global Tech Inc.', value: '$45,000', status: 'Negotiation' });
    const [loading, setLoading] = useState(true);

    // Simulating "Live" typing
    const typingInterval = useRef<NodeJS.Timeout | null>(null);

    // Fetch resources on mount
    useEffect(() => {
        async function fetchResources() {
            if (!user) return;
            try {
                // Determine potential "Battle Cards" from shared resources
                const data = await ResourcesService.getCompanyResources();
                setCompanyResources(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchResources();
    }, [user]);

    // Matching Logic
    useEffect(() => {
        if (!transcript) return;

        // Simple fuzzy match: Check if resource title or key words appear in transcript
        const lastSentence = transcript.split('.').pop()?.toLowerCase() || '';

        const matched = companyResources.filter(res => {
            // Match against title
            if (lastSentence.includes(res.title.toLowerCase())) return true;
            // Match against category
            if (lastSentence.includes(res.category.toLowerCase())) return true;

            // Heuristic matches (hardcoded for demo flair)
            if (res.title.toLowerCase().includes('competitor') && lastSentence.includes('competitor')) return true;
            if (res.title.toLowerCase().includes('security') && lastSentence.includes('security')) return true;
            if (res.title.toLowerCase().includes('pricing') && (lastSentence.includes('price') || lastSentence.includes('cost'))) return true;

            return false;
        });

        // Add matches to active cards if not already present
        if (matched.length > 0) {
            setActiveCards(prev => {
                const newCards = matched.filter(m => !prev.find(p => p.id === m.id));
                if (newCards.length > 0) {
                    // Flash effect
                    toast(`${newCards.length} Battle Card${newCards.length > 1 ? 's' : ''} Detected!`);
                }
                return [...newCards, ...prev].slice(0, 5); // Keep top 5
            });

            // Generate "Tactics" based on matches
            const newTactics: string[] = [];
            matched.forEach(res => {
                if (res.title.toLowerCase().includes('competitor')) {
                    newTactics.push("Strategy: Use 'The Differentiator' script to highlight our unique AI moat.");
                }
                if (res.category.toLowerCase().includes('pricing')) {
                    newTactics.push("Tactic: Shift focus to 'Cost of Inaction' rather than Implementation Fee.");
                }
                if (res.title.toLowerCase().includes('security')) {
                    newTactics.push("Advice: Mention our dual-layer encryption and ISO compliance immediately.");
                }
            });
            if (newTactics.length > 0) {
                setAiTactics(prev => [...new Set([...newTactics, ...prev])].slice(0, 3));
            }
        }

    }, [transcript, companyResources]);

    // Simuation Scripts
    const startSimulation = (type: 'competitor' | 'security' | 'pricing') => {
        setIsListening(true);
        setTranscript('');
        setActiveCards([]);

        let script = '';
        if (type === 'competitor') {
            script = "Yeah so we've been looking at Competitor X recently. They seem to have good features. Also I heard their pricing is lower.";
        } else if (type === 'security') {
            script = "My main concern right now is compliance. We have strict ISO 27001 requirements. How do you handle data security?";
        } else if (type === 'pricing') {
            script = "Basically we don't have budget for this. Your implementation costs are just too high compared to what we're paying now.";
        }

        let i = 0;
        if (typingInterval.current) clearInterval(typingInterval.current);

        typingInterval.current = setInterval(() => {
            if (i < script.length) {
                setTranscript(prev => prev + script.charAt(i));
                i++;
            } else {
                if (typingInterval.current) clearInterval(typingInterval.current);
                setIsListening(false);
            }
        }, 50); // Typing speed
    };

    const toggleListening = () => {
        setIsListening(!isListening);
        if (!isListening) {
            setTranscript('');
            setActiveCards([]);
        } else {
            if (typingInterval.current) clearInterval(typingInterval.current);
        }
    };

    return (
        <div className="min-h-screen bg-[#050b14] text-slate-200 font-sans p-6 overflow-hidden flex flex-col relative">

            {/* Background Effects */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
                <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
                <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-blue-500 to-transparent"></div>
                <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-purple-500 to-transparent"></div>
            </div>

            {/* Header HUD */}
            <header className="relative z-10 flex justify-between items-center mb-8 pb-4 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`}></div>
                        {isListening && <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-50"></div>}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-widest uppercase flex items-center gap-2">
                            Reality Link <span className="text-xs bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">V.1.0</span>
                        </h1>
                        <p className="text-xs text-slate-500 font-mono">LIVE AUDIO INTELLIGENCE FEED</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-6 px-4 py-2 bg-slate-900/50 border border-white/5 rounded-full">
                        <div className="text-center">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Latency</div>
                            <div className="text-sm font-mono text-green-400">12ms</div>
                        </div>
                        <div className="w-px h-6 bg-white/10"></div>
                        <div className="text-center">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Resources</div>
                            <div className="text-sm font-mono text-blue-400">{companyResources.length}</div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 min-h-0">

                {/* Visualizer & Transcript (Left) */}
                <div className="lg:col-span-6 flex flex-col gap-6">

                    {/* Visualizer Area */}
                    <div className="h-48 rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur relative overflow-hidden flex items-center justify-center group">
                        {isListening ? (
                            <div className="flex items-center gap-1 h-20">
                                {[...Array(20)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="w-2 bg-blue-500/80 rounded-full animate-wave"
                                        style={{
                                            height: `${Math.random() * 100}%`,
                                            animationDuration: `${0.5 + Math.random() * 0.5}s`
                                        }}
                                    ></div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center">
                                <MicOff className="w-12 h-12 text-slate-700 mx-auto mb-2" />
                                <div className="text-slate-500 font-mono text-sm">AUDIO FEED OFFLINE</div>
                            </div>
                        )}

                        {/* Status Overlay */}
                        <div className="absolute top-4 left-4 flex gap-2">
                            <button
                                onClick={toggleListening}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${isListening
                                    ? 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30'
                                    : 'bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30'}`}
                            >
                                {isListening ? 'Stop Feed' : 'Start Feed'}
                            </button>
                        </div>
                    </div>

                    {/* Simulation Controls (Demo) */}
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        <button onClick={() => startSimulation('competitor')} className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-blue-500 hover:text-blue-400 text-xs font-mono uppercase transition-colors whitespace-nowrap">
                            Simulate: Competitor Mention
                        </button>
                        <button onClick={() => startSimulation('security')} className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-orange-500 hover:text-orange-400 text-xs font-mono uppercase transition-colors whitespace-nowrap">
                            Simulate: Security Audit
                        </button>
                        <button onClick={() => startSimulation('pricing')} className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-green-500 hover:text-green-400 text-xs font-mono uppercase transition-colors whitespace-nowrap">
                            Simulate: Pricing Objection
                        </button>
                    </div>

                    {/* Transcript Log */}
                    <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-4 right-4 text-[10px] font-mono text-slate-600 uppercase tracking-widest flex items-center gap-2">
                            <Terminal size={12} /> Transcript Log
                        </div>
                        <div className="font-mono text-lg text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {transcript || <span className="text-slate-700 animate-pulse">Waiting for audio speech...</span>}
                            {isListening && <span className="inline-block w-2.5 h-5 bg-blue-500 ml-1 animate-blink align-middle"></span>}
                        </div>
                    </div>

                </div>

                {/* AI Strategy Stream & Lead Context (Center/Right) */}
                <div className="lg:col-span-3 flex flex-col gap-6 h-full min-h-0">
                    <h2 className="text-sm font-bold text-slate-400 opacity-50 uppercase tracking-widest flex items-center gap-2">
                        <Activity size={14} className="text-blue-500" />
                        AI Strategy Stream
                    </h2>

                    <div className="flex flex-col gap-4">
                        {aiTactics.length === 0 ? (
                            <div className="p-4 rounded-xl border border-white/5 bg-white/5 text-slate-600 text-xs font-mono italic animate-pulse">
                                ANALYZING DEAL DYNAMICS...
                            </div>
                        ) : (
                            aiTactics.map((tactic, i) => (
                                <div key={i} className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 animate-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Sparkles size={12} className="text-blue-400" />
                                        <span className="text-[10px] font-bold text-blue-400 uppercase">Live Intelligence</span>
                                    </div>
                                    <p className="text-xs text-slate-300 font-medium leading-relaxed">{tactic}</p>
                                </div>
                            ))
                        )}
                    </div>

                    <h2 className="text-sm font-bold text-slate-400 opacity-50 uppercase tracking-widest mt-4">Active Lead Context</h2>
                    <GlassCard className="!p-4 border-l-2 border-l-blue-500">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold">
                                JS
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">{activeLead.name}</div>
                                <div className="text-[10px] text-slate-500">{activeLead.company}</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase">Deal Value</div>
                                <div className="text-sm font-mono text-green-400 font-bold">{activeLead.value}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase">Stage</div>
                                <div className="text-sm text-blue-400 font-bold">{activeLead.status}</div>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Battle Cards (Right) */}
                <div className="lg:col-span-3 flex flex-col h-full min-h-0">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                        <span>Live Battle Cards</span>
                        <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{activeCards.length}</span>
                    </h2>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        {activeCards.length === 0 ? (
                            <div className="h-64 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-6 opacity-50">
                                <Search className="w-12 h-12 text-slate-700 mb-2" />
                                <div className="text-slate-500 font-medium">Scanning for Context...</div>
                                <p className="text-xs text-slate-600 mt-2">AI will surface relevant enablement materials here automatically.</p>
                            </div>
                        ) : (
                            activeCards.map((card, idx) => (
                                <div
                                    key={card.id}
                                    className="animate-in slide-in-from-right-4 fade-in duration-500 fill-mode-forwards"
                                    style={{ animationDelay: `${idx * 100}ms` }}
                                >
                                    <div className="bg-slate-900/80 border border-blue-500/30 rounded-xl p-4 shadow-[0_0_20px_rgba(59,130,246,0.15)] relative overflow-hidden group hover:border-blue-500/60 transition-colors">

                                        {/* Glow Effect */}
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-2xl -translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none"></div>

                                        <div className="flex justify-between items-start mb-2 relative z-10">
                                            <div className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase border border-blue-500/20">
                                                {card.category} Match
                                            </div>
                                            <button
                                                onClick={() => setActiveCards(prev => prev.filter(p => p.id !== card.id))}
                                                className="text-slate-600 hover:text-white transition-colors"
                                            >
                                                <XCircle size={16} />
                                            </button>
                                        </div>

                                        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-300 transition-colors">{card.title}</h3>
                                        <p className="text-xs text-slate-400 mb-4 line-clamp-2">{card.description}</p>

                                        <a
                                            href={card.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase rounded-lg transition-all shadow-lg hover:shadow-blue-500/25"
                                        >
                                            <ExternalLink size={14} /> Open Resource
                                        </a>

                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>

            <style jsx>{`
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
                .animate-blink {
                    animation: blink 1s step-end infinite;
                }
                @keyframes wave {
                    0%, 100% { height: 10%; }
                    50% { height: 100%; }
                }
                .animate-wave {
                    animation-iteration-count: infinite;
                    animation-timing-function: ease-in-out;
                }
            `}</style>
        </div>
    );
}
