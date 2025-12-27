'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    X, Mail, ShieldAlert, CheckCircle, Send, Users,
    Briefcase, Activity, Lock, Unlock, AlertTriangle,
    TrendingUp, TrendingDown, Clock, Play, RotateCcw,
    FileText, Phone, MessageSquare, Loader2, Database, ChevronRight
} from 'lucide-react';
import { GeminiService } from '@/lib/ai/gemini';
import { ResourcesService } from '@/lib/firebase/resources';
import { LeadsService } from '@/lib/firebase/services';
import { Resource, Lead } from '@/types';
import { useAuth } from '@/components/providers/AuthProvider';

interface WarRoomRunnerProps {
    onClose: () => void;
    initialContext?: {
        company: string;
        industry: string;
        value: string;
        stage?: string;
        contact?: string;
    };
}

// --- GAME TYPES ---

type Stakeholder = {
    id: string;
    name: string;
    role: string;
    dominance: 'High' | 'Medium' | 'Low';
    sentiment: number; // 0-100
    traits: string[];
    hiddenAgenda: string;
    status: 'unlocked' | 'locked'; // locked until engaged?
};

type ActionCard = {
    id: string;
    label: string;
    icon: React.ReactNode;
    risk: 'Low' | 'Medium' | 'High';
    description: string;
    cost: number; // Political capital cost?
};

type LogEntry = {
    id: string;
    type: 'system' | 'email' | 'event';
    title: string;
    description: string;
    timestamp: string;
    impact?: number;
    agentName?: string;
};

type GameState = {
    status: 'setup' | 'initializing' | 'playing' | 'won' | 'lost';
    dealHealth: number;
    scenario: {
        company: string;
        industry: string;
        dealValue: string;
        description: string;
        difficulty: string;
    } | null;
    stakeholders: Stakeholder[];
    logs: LogEntry[];
    turnCount: number;
    maxTurns: number;
};

// --- ACTION DECK ---
const ACTION_DECK: ActionCard[] = [
    { id: 'whitepaper', label: 'Send Whitepaper', icon: <FileText size={16} />, risk: 'Low', description: 'Safe, standard move. Good for analytical types.', cost: 1 },
    { id: 'demo', label: 'Schedule Demo', icon: <Play size={16} />, risk: 'Low', description: 'Show the product. effective if interest is real.', cost: 2 },
    { id: 'social', label: 'Social Engineering', icon: <MessageSquare size={16} />, risk: 'Medium', description: 'Dig for hidden agendas via backchannels.', cost: 2 },
    { id: 'ciso', label: 'CISO-to-CISO Call', icon: <Lock size={16} />, risk: 'Medium', description: 'High impact for security blockers.', cost: 3 },
    { id: 'executive', label: 'Executive Override', icon: <Briefcase size={16} />, risk: 'High', description: 'Go over their head. Huge risk, huge reward.', cost: 4 },
];

export function WarRoomRunner({ onClose, initialContext }: WarRoomRunnerProps) {
    const [gameState, setGameState] = useState<GameState>({
        status: 'setup',
        dealHealth: 50,
        scenario: null,
        stakeholders: [],
        logs: [],
        turnCount: 1,
        maxTurns: 8
    });

    const [selectedStakeholderId, setSelectedStakeholderId] = useState<string | null>(null);
    const [isProcessingTurn, setIsProcessingTurn] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();

    // Setup State
    const [resources, setResources] = useState<Resource[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
    const [loadingResources, setLoadingResources] = useState(false);

    // Fetch resources and leads on mount
    useEffect(() => {
        setLoadingResources(true);
        const fetchData = async () => {
            try {
                // Resources
                const companyData = await ResourcesService.getCompanyResources();
                let userData: Resource[] = [];
                let userLeads: Lead[] = [];

                if (user) {
                    userData = await ResourcesService.getUserResources(user.uid);
                    userLeads = await LeadsService.getLeads(user.uid);
                }
                const allData = [...companyData, ...userData];

                // Filter for likely text-based files
                const textBased = allData.filter(r => r.type === 'document' || r.type === 'sheet' || r.title.endsWith('.txt') || r.title.endsWith('.md'));
                setResources(textBased);
                setLeads(userLeads);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingResources(false);
            }
        };

        fetchData();
    }, [user]);

    // --- GAME START ---
    const startGame = async () => {
        setGameState(prev => ({ ...prev, status: 'initializing' }));

        try {
            // 1. Fetch Context Content if selected
            let contextContent = "";
            if (selectedResourceId) {
                const res = resources.find(r => r.id === selectedResourceId);
                if (res?.url) {
                    try {
                        const response = await fetch(res.url);
                        contextContent = await response.text();
                    } catch (e) {
                        console.error("Failed to read resource text", e);
                    }
                }
            }

            // 2. Generate Scenario
            const level = Math.random() > 0.5 ? 'Hard' : 'Extreme';
            const token = await user?.getIdToken();

            // Crisis Ops: Use Selected Lead Data if available
            let leadContext = initialContext;
            if (selectedLeadId) {
                const lead = leads.find(l => l.id === selectedLeadId);
                if (lead) {
                    leadContext = {
                        company: lead.companyName,
                        industry: lead.industry || 'Tech',
                        value: lead.value.toString(),
                        // Additional context for the AI
                        stage: lead.status,
                        contact: lead.contactName
                    };
                }
            }

            const scenario = await GeminiService.generateDealScenario(level, leadContext, contextContent, token);

            if (scenario) {
                setGameState(prev => ({
                    ...prev,
                    status: 'playing',
                    scenario: {
                        company: scenario.company,
                        industry: scenario.industry,
                        dealValue: scenario.dealValue,
                        description: scenario.description,
                        difficulty: scenario.difficulty
                    },
                    stakeholders: scenario.stakeholders || [],
                    dealHealth: 50, // Start neutral
                    logs: [{
                        id: 'init',
                        type: 'system',
                        title: 'MISSION START',
                        description: `Target: ${scenario.company} (${scenario.industry}). Value: ${scenario.dealValue}. Mode: ${selectedLeadId ? 'CRISIS OPS (Real Deal)' : 'Standard Sim'}. Context: ${selectedResourceId ? 'Custom Data' : 'None'}.`,
                        timestamp: 'Day 1'
                    }]
                }));
                // Auto-select first stakeholder
                if (scenario.stakeholders && scenario.stakeholders.length > 0) {
                    setSelectedStakeholderId(scenario.stakeholders[0].id);
                }
            } else {
                // Handle failure
                setGameState(prev => ({ ...prev, status: 'setup' })); // Go back to setup?
            }
        } catch (error) {
            console.error("Failed to init game", error);
            setGameState(prev => ({ ...prev, status: 'setup' }));
        }
    };

    // --- SCROLL TO BOTTOM OF LOGS ---
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [gameState.logs]);

    // Re-run init when user is available and we haven't started (optional protection)
    useEffect(() => {
        if (user && gameState.status === 'initializing' && !gameState.scenario && gameState.turnCount === 1) {
            // We relying on the initial effect, but user might be null initially.
            // However, initGame is called on mount. If user is null then, token is undefined.
            // Service handles undefined token by not sending header (for now).
            // But server WILL require it.
            // We should reload initGame if user becomes available? 
            // Actually, let's just assume user is loaded or useAuth handles loading state.
        }
    }, [user]);

    // --- GAME LOGIC ---

    const handleAction = async (actionId: string) => {
        if (!selectedStakeholderId || isProcessingTurn) return;

        const actionCard = ACTION_DECK.find(a => a.id === actionId);
        if (!actionCard) return;

        setIsProcessingTurn(true);

        // Optimistic UI Log
        const turnId = Date.now().toString();
        const target = gameState.stakeholders.find(s => s.id === selectedStakeholderId);

        setGameState(prev => ({
            ...prev,
            logs: [...prev.logs, {
                id: `cmd-${turnId}`,
                type: 'system',
                title: 'EXECUTING STRATEGY...',
                description: `Action: ${actionCard.label} targeting ${target?.name}...`,
                timestamp: `Day ${prev.turnCount}`
            }]
        }));

        try {
            // AI Evaluation
            const result = await GeminiService.evaluateTurn(
                {
                    company: gameState.scenario?.company,
                    stakeholders: gameState.stakeholders
                },
                actionCard.label,
                selectedStakeholderId,
                await user?.getIdToken()
            );

            if (result) {
                // Update State
                setGameState(prev => {
                    const newHealth = Math.max(0, Math.min(100, prev.dealHealth + (result.dealHealthDelta || 0)));
                    const newStatus = newHealth <= 0 ? 'lost' : newHealth >= 100 ? 'won' : prev.turnCount >= prev.maxTurns ? 'lost' : 'playing';

                    // Update specific stakeholder sentiment
                    const updatedStakeholders = prev.stakeholders.map(s =>
                        s.id === selectedStakeholderId
                            ? { ...s, sentiment: Math.max(0, Math.min(100, s.sentiment + (result.sentimentDelta || 0))) }
                            : s
                    );

                    return {
                        ...prev,
                        status: newStatus,
                        dealHealth: newHealth,
                        stakeholders: updatedStakeholders,
                        turnCount: prev.turnCount + 1,
                        logs: [...prev.logs, {
                            id: `res-${turnId}`,
                            type: 'email',
                            title: result.outcomeTitle,
                            description: result.outcomeDescription,
                            timestamp: `Day ${prev.turnCount}`,
                            impact: result.dealHealthDelta,
                            agentName: result.emailResponse?.from
                        }]
                    };
                });
            }

        } catch (error) {
            console.error("Turn Error", error);
        } finally {
            setIsProcessingTurn(false);
        }
    };

    // --- RENDERING ---

    // --- RENDERING ---

    if (gameState.status === 'setup') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4">
                <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl relative overflow-hidden">
                    {/* Decorative Background */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>

                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                            <span className="p-2 bg-blue-600/20 rounded-lg text-blue-400"><Database className="w-6 h-6" /></span>
                            Mission Parameters
                        </h2>
                        <p className="text-slate-400">Configure your simulation environment. Run "Crisis Ops" on live deals or standard training.</p>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-3 uppercase tracking-wider">Enablement Context (Optional)</label>

                            {loadingResources ? (
                                <div className="flex items-center gap-2 text-slate-500 p-4 border border-dashed border-slate-800 rounded-lg">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Loading resources...
                                </div>
                            ) : resources.length === 0 ? (
                                <div className="p-4 border border-dashed border-slate-800 rounded-lg text-slate-500 text-sm text-center">
                                    No text-based resources found. Upload documents in the Resources tab to use them here.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {resources.map(res => (
                                        <div
                                            key={res.id}
                                            onClick={() => setSelectedResourceId(selectedResourceId === res.id ? null : res.id)}
                                            className={`
                                                p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3
                                                ${selectedResourceId === res.id
                                                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                                                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-600'}
                                            `}
                                        >
                                            <FileText className={`w-5 h-5 ${selectedResourceId === res.id ? 'text-blue-400' : 'text-slate-500'}`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate text-sm">{res.title}</div>
                                                <div className="text-xs opacity-60 truncate">{res.category}</div>
                                            </div>
                                            {selectedResourceId === res.id && <CheckCircle className="w-4 h-4 text-blue-400" />}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Crisis Ops Section */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-3 uppercase tracking-wider">
                                Crisis Ops (Wargame a Live Deal)
                            </label>

                            {leads.length === 0 ? (
                                <div className="p-4 border border-dashed border-slate-800 rounded-lg text-slate-500 text-sm text-center">
                                    No active leads found in CRM.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                    {leads.map(lead => (
                                        <div
                                            key={lead.id}
                                            onClick={() => setSelectedLeadId(selectedLeadId === lead.id ? null : lead.id)}
                                            className={`
                                                p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3
                                                ${selectedLeadId === lead.id
                                                    ? 'bg-red-900/40 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                                                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-600'}
                                            `}
                                        >
                                            <ShieldAlert className={`w-5 h-5 ${selectedLeadId === lead.id ? 'text-red-500' : 'text-slate-600'}`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate text-sm">{lead.companyName}</div>
                                                <div className="text-xs opacity-60 truncate">${lead.value?.toLocaleString()} • {lead.status}</div>
                                            </div>
                                            {selectedLeadId === lead.id && <CheckCircle className="w-4 h-4 text-red-500" />}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="pt-6 border-t border-slate-800 flex justify-end gap-3">
                            <button
                                onClick={onClose}
                                className="px-6 py-3 rounded-lg text-slate-400 font-medium hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={startGame}
                                className="px-8 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-900/20 flex items-center gap-2 group transition-all transform hover:scale-[1.02]"
                            >
                                <Play className="w-5 h-5 fill-current" />
                                Start Simulation
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (gameState.status === 'initializing') {
        return (
            <div className="fixed inset-0 left-64 z-50 flex items-center justify-center bg-slate-950">
                <div className="text-center space-y-4">
                    <div className="relative w-24 h-24 mx-auto">
                        <div className="absolute inset-0 border-4 border-orange-500/30 rounded-full animate-ping"></div>
                        <div className="absolute inset-0 border-4 border-t-orange-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Activity className="text-orange-500 animate-pulse" size={32} />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-widest uppercase">Initializing War Room</h2>
                    <p className="text-orange-400 font-mono text-sm">Generating Procedural Scenario via Gemini 2.5 Flash...</p>
                </div>
            </div>
        );
    }

    const activeStakeholder = gameState.stakeholders.find(s => s.id === selectedStakeholderId);

    return (
        <div className="fixed inset-0 left-64 z-50 bg-slate-950 text-slate-200 font-sans overflow-hidden flex flex-col">

            {/* --- HEADER HUD --- */}
            <div className="h-16 border-b border-orange-500/20 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0 relative z-20">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-orange-500/10 rounded border border-orange-500/20">
                        <ShieldAlert className="text-orange-500" size={20} />
                    </div>
                    <div>
                        <h1 className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            {gameState.scenario?.company}
                            <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-orange-400 border border-orange-500/20">{gameState.scenario?.difficulty}</span>
                        </h1>
                        <div className="text-xs text-slate-500 font-mono">VAL: {gameState.scenario?.dealValue} • IND: {gameState.scenario?.industry}</div>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    {/* Deal Health Bar */}
                    <div className="flex flex-col items-end w-64">
                        <div className="flex justify-between w-full text-xs font-bold uppercase mb-1">
                            <span className="text-slate-500">Deal Probability</span>
                            <span className={gameState.dealHealth > 50 ? 'text-green-500' : 'text-red-500'}>{gameState.dealHealth}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden relative">
                            <div
                                className={`h-full transition-all duration-700 ease-out ${gameState.dealHealth > 66 ? 'bg-green-500' : gameState.dealHealth > 33 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${gameState.dealHealth}%` }}
                            />
                        </div>
                    </div>

                    {/* Turn Counter */}
                    <div className="text-center">
                        <div className="text-2xl font-bold text-white font-mono">{gameState.turnCount} <span className="text-slate-600 text-sm">/ {gameState.maxTurns}</span></div>
                        <div className="text-[10px] uppercase text-slate-500 tracking-widest">Days Elapsed</div>
                    </div>

                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} className="text-slate-400 hover:text-white" />
                    </button>
                </div>
            </div>

            {/* --- MAIN CONTENT GRID --- */}
            <div className="flex-1 overflow-hidden flex relative">

                {/* LEFT: STAKEHOLDERS (The Board) */}
                <div className="w-1/3 border-r border-orange-500/10 bg-slate-900/30 flex flex-col p-6 overflow-y-auto">
                    <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
                        <Users size={14} /> Key Stakeholders
                    </h3>

                    <div className="space-y-4">
                        {gameState.stakeholders.map(stakeholder => (
                            <div
                                key={stakeholder.id}
                                onClick={() => setSelectedStakeholderId(stakeholder.id)}
                                className={`
                                    relative p-4 rounded-xl border cursor-pointer transition-all duration-300 group
                                    ${selectedStakeholderId === stakeholder.id
                                        ? 'bg-orange-500/10 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.15)]'
                                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="font-bold text-slate-100">{stakeholder.name}</div>
                                        <div className="text-xs text-orange-400 font-mono">{stakeholder.role}</div>
                                    </div>
                                    <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs
                                        ${stakeholder.sentiment >= 70 ? 'bg-green-500/20 text-green-400' : stakeholder.sentiment <= 40 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}
                                    `}>
                                        {stakeholder.sentiment}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {stakeholder.traits.map(trait => (
                                        <span key={trait} className="px-2 py-0.5 rounded text-[10px] uppercase bg-black/30 text-slate-400 border border-white/5">
                                            {trait}
                                        </span>
                                    ))}
                                </div>

                                {selectedStakeholderId === stakeholder.id && (
                                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-12 bg-orange-500 rounded-l-full blur-[2px]"></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* MIDDLE: ACTION CENTER */}
                <div className="flex-1 flex flex-col bg-slate-950 relative">

                    {/* Background Grid */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-transparent to-slate-950"></div>

                    {/* Active Target Info */}
                    <div className="relative z-10 p-8 text-center border-b border-white/5 bg-slate-900/40 backdrop-blur-sm h-48 flex flex-col justify-center">
                        {activeStakeholder ? (
                            <div className="animate-in fade-in zoom-in-95 duration-300">
                                <div className="text-sm text-orange-400 font-mono uppercase tracking-widest mb-2">Target Locked</div>
                                <h2 className="text-3xl font-bold text-white mb-2">{activeStakeholder.name}</h2>
                                <p className="text-slate-400 max-w-md mx-auto">{gameState.status === 'playing' ? "Select a strategic action below to influence this stakeholder." : "Simulation Ended."}</p>
                            </div>
                        ) : (
                            <div className="text-slate-500 italic">Select a stakeholder to target...</div>
                        )}
                    </div>

                    {/* Action Deck */}
                    <div className="flex-1 p-8 grid grid-cols-2 md:grid-cols-3 gap-4 content-start overflow-y-auto z-10">
                        {gameState.status === 'playing' && ACTION_DECK.map(card => (
                            <button
                                key={card.id}
                                disabled={!selectedStakeholderId || isProcessingTurn}
                                onClick={() => handleAction(card.id)}
                                className={`
                                    relative group p-4 rounded-xl border text-left transition-all duration-300
                                    flex flex-col gap-3 overflow-hidden
                                    ${!selectedStakeholderId
                                        ? 'opacity-50 border-white/5 cursor-not-allowed grayscale'
                                        : 'bg-slate-900/80 border-white/10 hover:border-orange-500/50 hover:bg-slate-800 hover:shadow-lg hover:-translate-y-1'
                                    }
                                `}
                            >
                                <div className="flex justify-between items-start w-full">
                                    <div className="p-2 rounded bg-white/5 text-orange-400 group-hover:text-white group-hover:bg-orange-500 transition-colors">
                                        {card.icon}
                                    </div>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${card.risk === 'Low' ? 'border-green-500/30 text-green-400' :
                                        card.risk === 'Medium' ? 'border-amber-500/30 text-amber-400' :
                                            'border-red-500/30 text-red-400'
                                        }`}>
                                        {card.risk} Risk
                                    </span>
                                </div>
                                <div>
                                    <div className="font-bold text-slate-200 group-hover:text-orange-100">{card.label}</div>
                                    <div className="text-xs text-slate-500 mt-1 leading-relaxed">{card.description}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* RIGHT: LIVE LOG (The "Wire") */}
                <div className="w-80 border-l border-orange-500/10 bg-black/40 flex flex-col">
                    <div className="p-4 border-b border-white/10 bg-slate-900/50 backdrop-blur">
                        <h3 className="text-xs font-bold uppercase text-orange-500 flex items-center gap-2">
                            <Activity size={14} /> Mission Log
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm relative">
                        {gameState.logs.map((log) => (
                            <div key={log.id} className="animate-in slide-in-from-right-4 fade-in duration-300">
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-1">
                                    <span>{log.timestamp}</span>
                                    <div className="h-px bg-white/10 flex-1"></div>
                                </div>
                                <div className={`p-3 rounded border border-l-2 ${log.type === 'system' ? 'border-slate-800 border-l-slate-500 bg-slate-900/50' :
                                    (log.impact || 0) > 0 ? 'border-green-900/30 border-l-green-500 bg-green-950/10' :
                                        'border-red-900/30 border-l-red-500 bg-red-950/10'
                                    }`}>
                                    <div className="font-bold text-slate-300 mb-1 flex justify-between">
                                        {log.title}
                                        {log.impact && (
                                            <span className={log.impact > 0 ? "text-green-400" : "text-red-400"}>
                                                {log.impact > 0 ? '+' : ''}{log.impact}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-slate-400 text-xs leading-relaxed">
                                        {log.description}
                                    </div>
                                    {log.type === 'email' && (
                                        <div className="mt-2 text-[10px] text-orange-400 flex items-center gap-1">
                                            <Mail size={10} /> From: {log.agentName}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={logsEndRef} />

                        {isProcessingTurn && (
                            <div className="flex items-center gap-2 text-xs text-orange-400 animate-pulse mt-4">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                Awaiting response...
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* GAME OVER MODAL */}
            {(gameState.status === 'won' || gameState.status === 'lost') && (
                <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center animate-in fade-in duration-500">
                    <div className="max-w-md w-full glass-card p-8 text-center border-orange-500/30">
                        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 border-4 ${gameState.status === 'won' ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-red-500/30 bg-red-500/10 text-red-500'}`}>
                            {gameState.status === 'won' ? <CheckCircle size={40} /> : <AlertTriangle size={40} />}
                        </div>
                        <h2 className="text-4xl font-bold text-white mb-2">{gameState.status === 'won' ? 'DEAL CLOSED' : 'DEAL LOST'}</h2>
                        <p className="text-slate-400 mb-8">
                            {gameState.status === 'won'
                                ? "Excellent work. You successfully aligned the stakeholders."
                                : "The deal fell through. Review the logs to identify the breaking point."}
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full py-4 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold transition-all"
                        >
                            Debrief & Exit
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

