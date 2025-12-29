'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    X,
    Mic,
    Send,
    User,
    Bot,
    AlertCircle,
    CheckCircle,
    RefreshCw,
    Loader2,
    Database,
    FileText,
} from 'lucide-react';
import { GeminiService } from '@/lib/ai/gemini';
import { ResourcesService } from '@/lib/firebase/resources';
import { Resource } from '@/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { AIPersona } from '@/types/ai';

interface DojoRunnerProps {
    onClose: () => void;
    config?: {
        industry: string;
        customerType: string;
    };
}

type Message = {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: number;
    score?: {
        empathy: number;
        clarity: number;
        confidence: number;
    };
};

// Default persona if generation fails
const DEFAULT_PERSONA: AIPersona = {
    name: 'Marcus Steele',
    role: 'CFO',
    company: 'Nexus Financial',
    personality: 'Direct, skeptical, focused on bottom-line ROI. Impatient with fluff.',
    painPoints: ['Rising operational costs', 'Vendor sprawl'],
    hiddenAgenda: 'Looking to cut 10% of budget to meet Q4 targets',
    objections: ['Price is too high', "Timing isn't right"],
};

export function DojoRunner({ onClose, config }: DojoRunnerProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [loadingPersona, setLoadingPersona] = useState(false); // Start false, wait for setup
    const [persona, setPersona] = useState<AIPersona | null>(null);
    const [status, setStatus] = useState<'setup' | 'playing'>('setup');
    const [coachingTips, setCoachingTips] = useState<{ tone: string; tips: string[] } | null>(null);

    // Setup State
    const [resources, setResources] = useState<Resource[]>([]);
    const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
    const [loadingResources, setLoadingResources] = useState(false);
    const [contextContent, setContextContent] = useState<string>('');

    const chatEndRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();

    // Fetch resources on mount
    useEffect(() => {
        setLoadingResources(true);
        const fetchData = async () => {
            try {
                const companyData = await ResourcesService.getCompanyResources();
                let userData: Resource[] = [];
                if (user) {
                    userData = await ResourcesService.getUserResources(user.uid);
                }
                const allData = [...companyData, ...userData];

                // Filter for likely text-based files
                const textBased = allData.filter(
                    (r) =>
                        r.type === 'document' ||
                        r.type === 'sheet' ||
                        r.title.endsWith('.txt') ||
                        r.title.endsWith('.md')
                );
                setResources(textBased);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingResources(false);
            }
        };

        fetchData();
    }, [user]);

    const startSession = async () => {
        setStatus('playing');
        setLoadingPersona(true);

        try {
            // 1. Fetch text if selected
            let content = '';
            if (selectedResourceId) {
                const res = resources.find((r) => r.id === selectedResourceId);
                if (res?.url) {
                    try {
                        const response = await fetch(res.url);
                        content = await response.text();
                        setContextContent(content); // Save for replies
                    } catch (e) {
                        console.error(e);
                    }
                }
            }

            // 2. Generate Persona
            const token = await user?.getIdToken();
            const newPersona = await GeminiService.generatePersona(
                'CFO',
                config?.industry || 'SaaS Tech', // Use config industry
                content,
                token
            );
            const activePersona = newPersona || DEFAULT_PERSONA;

            setPersona(activePersona);

            // 3. Greeting
            const greeting = await GeminiService.generateReply(
                activePersona,
                [],
                'Start the conversation by stating your main objection immediately.',
                content,
                token
            );

            setMessages([
                {
                    id: 'welcome',
                    sender: 'ai',
                    text: greeting,
                    timestamp: Date.now(),
                },
            ]);
        } catch (error) {
            console.error('Failed to init Dojo', error);
            setPersona(DEFAULT_PERSONA);
        } finally {
            setLoadingPersona(false);
        }
    };

    // Auto-scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!inputText.trim() || !persona) return;

        const newUserMsg: Message = {
            id: Date.now().toString(),
            sender: 'user',
            text: inputText,
            timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, newUserMsg]);
        setInputText('');
        setIsTyping(true);

        try {
            // Convert current messages to history format
            const history = messages.map((m) => ({
                sender: m.sender,
                text: m.text,
            }));

            // Add user message to history provided to services
            const conversationHistory = [
                ...history,
                { sender: 'user' as const, text: newUserMsg.text },
            ];

            const token = await user?.getIdToken();

            // Parallel: Generate Reply AND Coaching Tips
            const [aiResponseText, coachingData] = await Promise.all([
                GeminiService.generateReply(
                    persona || DEFAULT_PERSONA,
                    conversationHistory.map((h) => ({ role: h.sender, content: h.text })),
                    newUserMsg.text,
                    contextContent,
                    token
                ),
                GeminiService.generateCoachingTips(
                    conversationHistory,
                    persona || DEFAULT_PERSONA,
                    token
                ),
            ]);

            setCoachingTips(coachingData);

            const newAiMsg: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: aiResponseText,
                timestamp: Date.now(),
                // Mock score for now until we add a specific "Evaluate" endpoint
                score: {
                    empathy: Math.floor(Math.random() * 20) + 70,
                    clarity: Math.floor(Math.random() * 20) + 75,
                    confidence: Math.floor(Math.random() * 20) + 80,
                },
            };

            setMessages((prev) => [...prev, newAiMsg]);
        } catch (error) {
            console.error('AI Reply Failed', error);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (status === 'setup') {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4">
                <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-500 hover:text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                            <span className="p-2 bg-indigo-600/20 rounded-lg text-indigo-400">
                                <Bot className="w-6 h-6" />
                            </span>
                            Dojo Setup
                        </h2>
                        <p className="text-slate-400">
                            Configure your sparring partner. Upload enablement docs to practice
                            against real objections.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-3 uppercase tracking-wider">
                                Enablement Context (Optional)
                            </label>

                            {loadingResources ? (
                                <div className="flex items-center gap-2 text-slate-500 p-4 border border-dashed border-slate-800 rounded-lg">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Loading
                                    resources...
                                </div>
                            ) : resources.length === 0 ? (
                                <div className="p-4 border border-dashed border-slate-800 rounded-lg text-slate-500 text-sm text-center">
                                    No text-based resources found. Upload documents in the Resources
                                    tab.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {resources.map((res) => (
                                        <div
                                            key={res.id}
                                            onClick={() =>
                                                setSelectedResourceId(
                                                    selectedResourceId === res.id ? null : res.id
                                                )
                                            }
                                            className={`
                                                p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3
                                                ${
                                                    selectedResourceId === res.id
                                                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-600'
                                                }
                                            `}
                                        >
                                            <FileText
                                                className={`w-5 h-5 ${selectedResourceId === res.id ? 'text-indigo-400' : 'text-slate-500'}`}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate text-sm">
                                                    {res.title}
                                                </div>
                                                <div className="text-xs opacity-60 truncate">
                                                    {res.category}
                                                </div>
                                            </div>
                                            {selectedResourceId === res.id && (
                                                <CheckCircle className="w-4 h-4 text-indigo-400" />
                                            )}
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
                                onClick={startSession}
                                className="px-8 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/20 flex items-center gap-2 transition-all transform hover:scale-[1.02]"
                            >
                                <Bot className="w-5 h-5" />
                                Enter Dojo
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (loadingPersona || !persona) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md">
                <div className="flex flex-col items-center gap-4 text-white">
                    <Loader2 size={48} className="animate-spin text-indigo-500" />
                    <div className="text-xl font-bold animate-pulse">Summoning Prospect...</div>
                    <div className="text-sm text-slate-400">
                        Generative AI is creating a unique persona
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md">
            <div className="w-full max-w-5xl h-[90vh] flex gap-6">
                {/* Main Chat Area */}
                <div className="flex-1 glass-card flex flex-col p-0 overflow-hidden relative">
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-indigo-900/20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center border-2 border-indigo-400/30">
                                <Bot size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white">{persona.name}</h3>
                                <div className="flex items-center gap-1 text-xs text-indigo-300">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                    {persona.role} @ {persona.company}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mb-6">
                            <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2 mb-1">
                                <User size={14} /> Application Context
                            </h4>
                            <p className="text-xs text-slate-300 italic">
                                &ldquo;{persona.personality}&rdquo;
                                <br />
                                <span className="opacity-75">Agenda: {persona.painPoints[0]}</span>
                            </p>
                        </div>

                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex gap-4 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                <div
                                    className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                                        msg.sender === 'user'
                                            ? 'bg-fuchsia-600 text-white'
                                            : 'bg-indigo-600 text-white'
                                    }`}
                                >
                                    {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
                                </div>

                                <div className={`max-w-[70%] space-y-2`}>
                                    <div
                                        className={`p-4 rounded-2xl ${
                                            msg.sender === 'user'
                                                ? 'bg-fuchsia-600/20 border border-fuchsia-500/30 text-white rounded-tr-none'
                                                : 'bg-indigo-600/20 border border-indigo-500/30 text-slate-100 rounded-tl-none'
                                        }`}
                                    >
                                        <p className="leading-relaxed text-sm md:text-base">
                                            {msg.text}
                                        </p>
                                    </div>

                                    {/* Score Feedback */}
                                    {msg.sender === 'ai' && msg.id !== 'welcome' && (
                                        <div className="flex gap-2 text-xs">
                                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                Empathy: {msg.score?.empathy}%
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                Clarity: {msg.score?.clarity}%
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                                    <Bot size={14} className="text-white" />
                                </div>
                                <div className="bg-indigo-600/20 border border-indigo-500/30 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1 items-center">
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></span>
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-slate-900/50 border-t border-white/10">
                        <div className="flex gap-2">
                            <button
                                className={`p-3 rounded-xl border border-slate-700 transition-colors ${
                                    isRecording
                                        ? 'bg-red-500/20 border-red-500/50 text-red-500 animate-pulse'
                                        : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                                onClick={() => setIsRecording(!isRecording)}
                            >
                                <Mic size={20} />
                            </button>
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type your objection handler..."
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600"
                                />
                            </div>
                            <button
                                onClick={handleSend}
                                disabled={!inputText.trim() || isTyping}
                                className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                        <div className="text-center mt-2 text-xs text-slate-500">
                            Tip: Use &ldquo;Tactical Empathy&rdquo; to disarm the prospect.
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: Real-time Analysis */}
                <div className="w-80 glass-card p-6 flex flex-col hidden lg:flex">
                    <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                        <AlertCircle size={18} className="text-indigo-400" />
                        Live Coaching
                    </h3>

                    <div className="space-y-6">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="text-xs font-bold text-slate-400 uppercase mb-2">
                                Detected Tone
                            </div>
                            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                                <CheckCircle size={16} /> {coachingTips?.tone || 'Listening...'}
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-xs text-slate-400 mb-2">
                                <span>Pacing</span>
                                <span>{isRecording ? 'Detecting...' : 'Normal'}</span>
                            </div>
                            <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 w-[60%]"></div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <h4 className="font-bold text-white text-sm mb-3">AI Suggestions</h4>
                            <div className="space-y-2">
                                {!coachingTips ? (
                                    <div className="text-xs text-slate-500 italic">
                                        Waiting for conversation...
                                    </div>
                                ) : (
                                    coachingTips.tips.map((tip, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setInputText(tip)}
                                            className="w-full text-left p-2 rounded hover:bg-white/5 text-xs text-slate-300 border border-transparent hover:border-indigo-500/30 transition-all"
                                        >
                                            &ldquo;{tip}&rdquo;
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
