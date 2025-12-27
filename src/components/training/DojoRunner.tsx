'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Send, User, Bot, AlertCircle, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';
import { GeminiService } from '@/lib/ai/gemini';

interface DojoRunnerProps {
    onClose: () => void;
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
const DEFAULT_PERSONA = {
    name: "Marcus Steele",
    role: "CFO",
    company: "Nexus Financial",
    personality: "Direct, skeptical, focused on bottom-line ROI. Impatient with fluff.",
    painPoints: ["Rising operational costs", "Vendor sprawl"],
    hiddenAgenda: "Looking to cut 10% of budget to meet Q4 targets"
};

export function DojoRunner({ onClose }: DojoRunnerProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [loadingPersona, setLoadingPersona] = useState(true);
    const [persona, setPersona] = useState<any>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Initialize Persona and Greeting
    useEffect(() => {
        const initSession = async () => {
            setLoadingPersona(true);
            try {
                // In a future update, we can let the user pick the role/industry
                const newPersona = await GeminiService.generatePersona("CFO", "SaaS Tech");
                const activePersona = newPersona || DEFAULT_PERSONA;

                setPersona(activePersona);

                // Initial AI Greeting
                const greeting = await GeminiService.generateReply(activePersona, [], "Start the conversation by stating your main objection immediately.");

                setMessages([{
                    id: 'welcome',
                    sender: 'ai',
                    text: greeting,
                    timestamp: Date.now()
                }]);
            } catch (error) {
                console.error("Failed to init Dojo", error);
                setPersona(DEFAULT_PERSONA);
            } finally {
                setLoadingPersona(false);
            }
        };

        if (!persona) {
            initSession();
        }
    }, []);

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

        setMessages(prev => [...prev, newUserMsg]);
        setInputText('');
        setIsTyping(true);

        try {
            // Convert current messages to history format
            const history = messages.map(m => ({
                role: m.sender,
                content: m.text
            }));

            // Add latest user message to context implicitly or explicitly
            const aiResponseText = await GeminiService.generateReply(persona, history, newUserMsg.text);

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
                }
            };

            setMessages(prev => [...prev, newAiMsg]);
        } catch (error) {
            console.error("AI Reply Failed", error);
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

    if (loadingPersona || !persona) {
        return (
            <div className="fixed inset-0 left-64 z-50 flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md">
                <div className="flex flex-col items-center gap-4 text-white">
                    <Loader2 size={48} className="animate-spin text-indigo-500" />
                    <div className="text-xl font-bold animate-pulse">Summoning Prospect...</div>
                    <div className="text-sm text-slate-400">Generative AI is creating a unique persona</div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 left-64 z-50 flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md">
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
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
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
                                "{persona.personality}"
                                <br />
                                <span className="opacity-75">Agenda: {persona.painPoints[0]}</span>
                            </p>
                        </div>

                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-4 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.sender === 'user'
                                    ? 'bg-fuchsia-600 text-white'
                                    : 'bg-indigo-600 text-white'
                                    }`}>
                                    {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
                                </div>

                                <div className={`max-w-[70%] space-y-2`}>
                                    <div className={`p-4 rounded-2xl ${msg.sender === 'user'
                                        ? 'bg-fuchsia-600/20 border border-fuchsia-500/30 text-white rounded-tr-none'
                                        : 'bg-indigo-600/20 border border-indigo-500/30 text-slate-100 rounded-tl-none'
                                        }`}>
                                        <p className="leading-relaxed text-sm md:text-base">{msg.text}</p>
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
                                className={`p-3 rounded-xl border border-slate-700 transition-colors ${isRecording
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
                            Tip: Use "Tactical Empathy" to disarm the prospect.
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
                            <div className="text-xs font-bold text-slate-400 uppercase mb-2">Current Tone</div>
                            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                                <CheckCircle size={16} /> Calm & Assertive
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-xs text-slate-400 mb-2">
                                <span>Pacing</span>
                                <span>120 wpm</span>
                            </div>
                            <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 w-[60%]"></div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-xs text-slate-400 mb-2">
                                <span>Sentiment</span>
                                <span>Positive</span>
                            </div>
                            <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-fuchsia-500 w-[75%]"></div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <h4 className="font-bold text-white text-sm mb-3">AI Suggestions</h4>
                            <div className="space-y-2">
                                <button onClick={() => setInputText("It sounds like budget is a major concern specifically for Q4.")} className="w-full text-left p-2 rounded hover:bg-white/5 text-xs text-slate-300 border border-transparent hover:border-indigo-500/30 transition-all">
                                    "It sounds like budget is a major concern..."
                                </button>
                                <button onClick={() => setInputText("What if we structured this to start billing in January?")} className="w-full text-left p-2 rounded hover:bg-white/5 text-xs text-slate-300 border border-transparent hover:border-indigo-500/30 transition-all">
                                    "What if we structured this to start billing in Jan?"
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
