'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    X,
    Users,
    MessageSquare,
    Mic,
    MicOff,
    BrainCircuit,
    AlertCircle,
    Play,
    Send,
} from 'lucide-react';
import Image from 'next/image';
import { GeminiService } from '@/lib/ai/gemini';
import { useAuth } from '@/components/providers/AuthProvider';
import { AIBoardroomAgent, AIBoardroomTranscriptItem } from '@/types/ai';
import { TimeMachine } from '@/components/training/TimeMachine';

interface BoardroomRunnerProps {
    onClose: () => void;
}

type Agent = AIBoardroomAgent;

type TranscriptItem = AIBoardroomTranscriptItem;

export function BoardroomRunner({ onClose }: BoardroomRunnerProps) {
    const { user } = useAuth();
    const [status, setStatus] = useState<'init' | 'playing' | 'loading_turn' | 'time_machine'>(
        'init'
    );
    const [agents, setAgents] = useState<Agent[]>([]);
    const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [outcome, setOutcome] = useState<'win' | 'loss'>('loss'); // Default to loss for drama
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    // --- INITIALIZATION ---
    useEffect(() => {
        async function init() {
            try {
                const token = await user?.getIdToken();
                const scenario = await GeminiService.generateBoardroomScenario(token);
                if (scenario && scenario.stakeholders) {
                    setAgents(scenario.stakeholders);
                    setStatus('playing');
                    // Initial welcome message from the Champion
                    const champion =
                        scenario.stakeholders.find(
                            (s: AIBoardroomAgent) => s.archetype === 'Champion'
                        ) || scenario.stakeholders[0];
                    setTranscript([
                        {
                            id: 'init',
                            speaker: champion.name,
                            speakerId: champion.id,
                            message:
                                'Thanks for coming in. We&apos;re all here. Why don&apos;t you kick us off?',
                            type: 'speech',
                        },
                    ]);
                }
            } catch (e) {
                console.error('Failed to init boardroom', e);
            }
        }
        init();
    }, [user]);

    // --- SCROLL TO BOTTOM ---
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    // --- GAME LOOP ---
    const handleTurn = async () => {
        if (!inputValue.trim() || status === 'loading_turn') return;

        const userMsg = inputValue;
        setInputValue('');
        setStatus('loading_turn');

        // 1. Add User Message
        const newTranscript = [
            ...transcript,
            {
                id: Date.now().toString(),
                speaker: 'You',
                speakerId: 'user',
                message: userMsg,
                type: 'speech' as const,
            },
        ];
        setTranscript(newTranscript);

        try {
            const token = await user?.getIdToken();
            const result = await GeminiService.evaluateBoardroomTurn(
                agents,
                userMsg,
                newTranscript,
                token
            );

            if (result) {
                const turnId = Date.now().toString();

                // Add AI Responses to transcript
                const updates: TranscriptItem[] = [];

                // 2. Main Response
                if (result.response) {
                    const speaker = agents.find((a) => a.id === result.mainSpeakerId);
                    updates.push({
                        id: `resp-${turnId}`,
                        speaker: speaker?.name || 'Unknown',
                        speakerId: result.mainSpeakerId,
                        message: result.response,
                        type: 'speech',
                    });
                }

                // 3. Whispers (Thoughts)
                if (result.whispers) {
                    result.whispers.forEach(
                        (w: { agentId: string; thought: string }, idx: number) => {
                            const agent = agents.find((a) => a.id === w.agentId);
                            updates.push({
                                id: `whisp-${turnId}-${idx}`,
                                speaker: agent?.name || 'Unknown',
                                speakerId: w.agentId,
                                message: w.thought,
                                type: 'whisper',
                            });
                        }
                    );
                }

                // 4. Sidebar
                if (result.sidebar) {
                    const from = agents.find((a) => a.id === result.sidebar!.fromId);
                    const to = agents.find((a) => a.id === result.sidebar!.toId);
                    updates.push({
                        id: `side-${turnId}`,
                        speaker: from?.name || 'Unknown',
                        speakerId: result.sidebar.fromId,
                        targetId: result.sidebar.toId,
                        message: `(to ${to?.name?.split(' ')[0]}): ${result.sidebar.message}`,
                        type: 'sidebar',
                    });
                }

                setTranscript((prev) => [...prev, ...updates]);
            }
        } catch (e) {
            console.error('Turn failed', e);
        } finally {
            setStatus('playing');
        }
    };

    const handleEndMeeting = () => {
        // Simple heuristic: If average patience > 50, it's a win.
        // In reality, this should be an AI evaluation.
        const avgPatience = agents.reduce((acc, curr) => acc + curr.patience, 0) / agents.length;
        setOutcome(avgPatience > 50 ? 'win' : 'loss');
        setStatus('time_machine');
    };

    if (status === 'time_machine') {
        return <TimeMachine transcript={transcript} outcome={outcome} onClose={onClose} />;
    }

    if (status === 'init') {
        return (
            <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-4">
                <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                <h2 className="text-xl font-bold text-white tracking-widest uppercase">
                    Assembling The Board...
                </h2>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 text-slate-200 font-sans flex flex-col">
            {/* HEADER */}
            <div className="h-16 border-b border-white/10 bg-slate-900 flex items-center justify-between px-6 shrink-0 relative z-20">
                <h1 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Users className="text-blue-500" /> The Boardroom
                </h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleEndMeeting}
                        className="px-3 py-1 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-full text-xs font-bold uppercase tracking-wider border border-red-500/20 transition-all"
                    >
                        End Meeting
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* MAIN STAGE (Isometric View Simulation) */}
            <div className="flex-1 overflow-hidden relative bg-[#0f172a] perspective-1000">
                {/* Table Surface */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-indigo-950/20 rounded-[100px] border border-indigo-500/20 shadow-[0_0_100px_rgba(79,70,229,0.1)] transform rotate-x-60"></div>

                {/* Agents */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {/* Left Agent (Champion) */}
                    <div className="absolute left-[15%] top-[40%] text-center transform hover:scale-105 transition-transform duration-500 pointer-events-auto">
                        <AgentAvatar agent={agents[1]} isSpeaking={false} />
                    </div>

                    {/* Middle Agent (Decision Maker) */}
                    <div className="absolute top-[20%] text-center transform hover:scale-105 transition-transform duration-500 pointer-events-auto">
                        <AgentAvatar agent={agents[2]} isSpeaking={false} />
                    </div>

                    {/* Right Agent (Blocker) */}
                    <div className="absolute right-[15%] top-[40%] text-center transform hover:scale-105 transition-transform duration-500 pointer-events-auto">
                        <AgentAvatar agent={agents[0]} isSpeaking={false} />
                    </div>
                </div>

                {/* Transcript Overlay (Floating HUD) */}
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[300px] pointer-events-auto">
                    <div className="h-full overflow-y-auto px-4 space-y-4 custom-scrollbar mask-image-linear-to-t">
                        {transcript.map((item) => (
                            <ChatBubble key={item.id} item={item} />
                        ))}
                        {status === 'loading_turn' && (
                            <div className="flex justify-start">
                                <div className="bg-slate-800/50 rounded-lg px-4 py-2 text-xs text-slate-400 italic flex items-center gap-2">
                                    <BrainCircuit size={12} className="animate-pulse" /> The Board
                                    is deliberating...
                                </div>
                            </div>
                        )}
                        <div ref={transcriptEndRef} />
                    </div>
                </div>
            </div>

            {/* INPUT AREA */}
            <div className="h-20 bg-slate-900 border-t border-white/5 p-4 flex items-center justify-center gap-4 relative z-20">
                <div className="w-full max-w-3xl relative">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleTurn()}
                        placeholder="Make your pitch..."
                        className="w-full bg-slate-950/50 border border-slate-700 rounded-full px-6 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                        autoFocus
                    />
                    <button
                        onClick={handleTurn}
                        disabled={status === 'loading_turn' || !inputValue.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- SUBCOMPONENTS ---

function AgentAvatar({ agent, isSpeaking }: { agent: Agent; isSpeaking: boolean }) {
    if (!agent) return null;
    return (
        <div className="flex flex-col items-center group">
            <div
                className={`
                w-24 h-24 rounded-full border-4 overflow-hidden bg-slate-800 shadow-2xl relative transition-all duration-300
                ${
                    agent.archetype === 'Blocker'
                        ? 'border-red-500/30 group-hover:border-red-500'
                        : agent.archetype === 'Champion'
                          ? 'border-green-500/30 group-hover:border-green-500'
                          : 'border-blue-500/30 group-hover:border-blue-500'
                }
                ${isSpeaking ? 'scale-110 shadow-[0_0_30px_rgba(255,255,255,0.2)]' : ''}
            `}
            >
                <Image src={agent.avatar} alt={agent.name} fill className="object-cover" />
            </div>

            {/* Nameplate */}
            <div className="mt-4 bg-slate-900/80 backdrop-blur border border-white/10 px-4 py-2 rounded-lg text-center transform transition-transform group-hover:-translate-y-1">
                <div className="font-bold text-white text-sm">{agent.name}</div>
                <div className="text-[10px] uppercase tracking-wider font-mono text-slate-400">
                    {agent.role}
                </div>
            </div>

            {/* Hover Info */}
            <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-black/60 px-2 py-1 rounded text-slate-300">
                {agent.archetype} • Dom: {agent.dominance}%
            </div>
        </div>
    );
}

function ChatBubble({ item }: { item: TranscriptItem }) {
    if (item.type === 'whisper') {
        return (
            <div className="flex justify-center my-2">
                <div className="bg-slate-900/40 border border-slate-700/50 rounded-full px-4 py-1.5 flex items-center gap-2 max-w-lg backdrop-blur-sm animate-in fade-in zoom-in-95">
                    <BrainCircuit size={12} className="text-purple-400" />
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                        {item.speaker}&apos;s Thought:
                    </span>
                    <span className="text-xs text-slate-300 italic">
                        &ldquo;{item.message}&rdquo;
                    </span>
                </div>
            </div>
        );
    }

    if (item.type === 'sidebar') {
        return (
            <div className="flex justify-center my-2">
                <div className="bg-amber-900/20 border border-amber-500/30 rounded-full px-4 py-1.5 flex items-center gap-2 max-w-lg backdrop-blur-sm animate-in fade-in zoom-in-95">
                    <MessageSquare size={12} className="text-amber-500" />
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                        Sidebar ({item.speaker}):
                    </span>
                    <span className="text-xs text-amber-200/80 italic">
                        &ldquo;{item.message}&rdquo;
                    </span>
                </div>
            </div>
        );
    }

    // Standard Speech
    const isUser = item.speakerId === 'user';
    return (
        <div
            className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
        >
            <div
                className={`max-w-md p-4 rounded-2xl shadow-lg border ${
                    isUser
                        ? 'bg-blue-600 text-white rounded-br-none border-blue-500'
                        : 'bg-slate-800 text-slate-200 rounded-bl-none border-slate-700'
                }`}
            >
                {!isUser && (
                    <div className="text-xs font-bold text-slate-400 mb-1">{item.speaker}</div>
                )}
                <div className="text-sm leading-relaxed">{item.message}</div>
            </div>
        </div>
    );
}
