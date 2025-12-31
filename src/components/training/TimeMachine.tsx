'use client';

import React, { useState, useEffect } from 'react';
import { GeminiService } from '@/lib/ai/gemini';
import { useAuth } from '@/components/providers/AuthProvider';
import { AIFutureArtifact, AIBoardroomTranscriptItem } from '@/types/ai';
import {
    X,
    ExternalLink,
    RefreshCw,
    Send,
    AlertTriangle,
    TrendingDown,
    TrendingUp,
    Lock,
} from 'lucide-react';
import Image from 'next/image';

interface TimeMachineProps {
    transcript: AIBoardroomTranscriptItem[];
    outcome: 'win' | 'loss';
    onClose: () => void;
}

export function TimeMachine({ transcript, outcome, onClose }: TimeMachineProps) {
    const { user } = useAuth();
    const [artifact, setArtifact] = useState<AIFutureArtifact | null>(null);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(2025);

    useEffect(() => {
        // Animation to "Travel Forward"
        const interval = setInterval(() => {
            setYear((prev) => {
                if (prev >= 2026) {
                    clearInterval(interval);
                    return 2026;
                }
                return prev + 1;
            });
        }, 500);

        async function fetchArtifact() {
            try {
                const token = await user?.getIdToken();
                const result = await GeminiService.generateFutureArtifact(
                    transcript,
                    outcome,
                    token
                );
                setArtifact(result);
            } catch (e) {
                console.error('Time Machine Failed', e);
            } finally {
                setLoading(false);
            }
        }

        fetchArtifact();
        return () => clearInterval(interval);
    }, [transcript, outcome, user]);

    if (loading) {
        return (
            <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden p-4">
                <div className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 animate-pulse tracking-tighter">
                    {year}
                </div>
                <div className="mt-4 text-slate-500 font-mono text-xs md:text-sm tracking-widest uppercase animate-bounce text-center">
                    Constructing Future Timeline...
                </div>
            </div>
        );
    }

    if (!artifact) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-start md:items-center justify-center p-3 md:p-4 overflow-y-auto modal-scrollable">
            <button
                onClick={onClose}
                className="fixed top-4 right-4 md:top-8 md:right-8 z-10 p-2 min-w-[44px] min-h-[44px] text-slate-500 hover:text-white active:text-white transition-colors flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/10"
            >
                <X size={28} className="md:w-8 md:h-8" />
            </button>
            <div className="max-w-4xl w-full animate-in zoom-in-95 duration-700 my-auto py-12 md:py-4">
                <div className="text-center mb-6 md:mb-8">
                    <h2 className="text-lg md:text-2xl font-light text-slate-300 tracking-widest uppercase">
                        Timeline Status:{' '}
                        <span
                            className={
                                outcome === 'win'
                                    ? 'text-green-400 font-bold'
                                    : 'text-red-500 font-bold'
                            }
                        >
                            {outcome === 'win' ? 'OPTIMAL' : 'CRITICAL FAILURE'}
                        </span>
                    </h2>
                    <p className="text-slate-500 text-xs md:text-sm mt-2">
                        6 Months into the future...
                    </p>
                </div>

                {/* ARTIFACT RENDERING LOGIC */}
                {artifact.type === 'news_article' && <NewsArtifact data={artifact} />}
                {artifact.type === 'email' && <EmailArtifact data={artifact} />}
                {artifact.type === 'slack' && <SlackArtifact data={artifact} />}
                {artifact.type === 'stock' && <StockArtifact data={artifact} />}
            </div>
        </div>
    );
}

// --- ARTIFACT COMPONENTS ---

function NewsArtifact({ data }: { data: AIFutureArtifact }) {
    return (
        <div className="bg-white text-black p-4 md:p-8 rounded-sm shadow-2xl md:skew-y-1 transform transition-all md:hover:skew-y-0">
            <div className="border-b-4 border-black pb-3 md:pb-4 mb-4 md:mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-2">
                <h1 className="text-2xl md:text-4xl font-black tracking-tighter italic font-serif">
                    TechCrunch
                </h1>
                <span className="font-mono text-xs md:text-sm text-gray-500">{data.date}</span>
            </div>
            <h2 className="text-xl md:text-3xl font-bold leading-tight mb-4">{data.headline}</h2>
            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                <div className="w-full md:w-1/3 h-40 md:h-48 bg-gray-200 rounded-sm flex items-center justify-center overflow-hidden grayscale relative">
                    {data.imageUrl && (
                        <Image
                            src={data.imageUrl}
                            alt="News"
                            fill
                            className="object-cover mix-blend-multiply"
                        />
                    )}
                </div>
                <div className="w-full md:w-2/3 font-serif text-base md:text-lg leading-relaxed text-gray-800">
                    <p className="first-letter:text-4xl md:first-letter:text-5xl first-letter:font-bold first-letter:mr-2 first-letter:float-left">
                        {data.body?.charAt(0) || ''}
                    </p>
                    {data.body?.substring(1) || ''}
                </div>
            </div>
        </div>
    );
}

function EmailArtifact({ data }: { data: AIFutureArtifact }) {
    return (
        <div className="bg-white text-gray-900 rounded-lg shadow-2xl overflow-hidden border border-gray-200">
            <div className="bg-gray-100 p-2 border-b flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
            <div className="p-4 md:p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 md:mb-8 gap-4">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg md:text-xl shrink-0">
                            {data.from?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0">
                            <div className="font-bold text-base md:text-lg truncate">
                                {data.from || 'Unknown Sender'}
                            </div>
                            <div className="text-gray-500 text-xs md:text-sm truncate">
                                to {data.to || 'User'}
                            </div>
                        </div>
                    </div>
                    <div className="text-gray-400 text-xs md:text-sm">{data.date}</div>
                </div>
                <div className="text-lg md:text-2xl font-bold mb-4 md:mb-6">{data.subject}</div>
                <div className="text-base md:text-lg leading-relaxed whitespace-pre-wrap font-sans text-gray-700">
                    {data.body}
                </div>
                <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-gray-100 text-gray-400 text-xs md:text-sm italic">
                    Sent from my iPhone
                </div>
            </div>
        </div>
    );
}

function SlackArtifact({ data }: { data: AIFutureArtifact }) {
    return (
        <div className="bg-[#1a1d21] text-white rounded-lg shadow-2xl overflow-hidden border border-gray-800 w-full max-w-2xl mx-auto">
            <div className="bg-[#111315] p-4 border-b border-gray-800 flex items-center gap-3">
                <span className="text-gray-400 text-lg">#</span>
                <span className="font-bold">{data.channel}</span>
            </div>
            <div className="p-6 space-y-6">
                {data.messages?.map((msg, idx) => (
                    <div key={idx} className="flex gap-4 group">
                        <div className="w-10 h-10 rounded bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center font-bold text-sm">
                            {msg.user.charAt(0)}
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2">
                                <span className="font-bold text-sm">{msg.user}</span>
                                <span className="text-xs text-gray-500">10:4{idx} AM</span>
                            </div>
                            <p className="text-gray-300">{msg.text}</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="p-4 bg-[#222529] border-t border-gray-800">
                <div className="bg-[#1a1d21] border border-gray-600 rounded p-2 text-gray-500 text-sm">
                    Message #{data.channel}
                </div>
            </div>
        </div>
    );
}

function StockArtifact({ data }: { data: AIFutureArtifact }) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-red-500/10 blur-[100px] rounded-full"></div>

            <div className="flex flex-col md:flex-row justify-between items-start mb-8 md:mb-12 relative z-10 gap-4">
                <div>
                    <h1 className="text-4xl md:text-6xl font-black text-white">{data.ticker}</h1>
                    <p className="text-slate-400 uppercase tracking-widest mt-1 md:mt-2 text-sm md:text-base">
                        {data.ticker} Corp.
                    </p>
                </div>
                <div className="text-left md:text-right">
                    <h2 className="text-3xl md:text-6xl font-bold text-red-500 flex items-center md:justify-end gap-2">
                        <TrendingDown size={32} className="md:w-12 md:h-12" /> {data.price}
                    </h2>
                    <p className="text-red-400 font-mono text-base md:text-xl mt-1 md:mt-2">
                        {data.change} Today
                    </p>
                </div>
            </div>

            {/* Chart Line */}
            <div className="h-24 md:h-32 w-full flex items-end gap-1 mb-6 md:mb-8">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="flex-1 bg-red-500/20 active:bg-red-500/50 transition-colors"
                        style={{ height: `${((i * 13) % 60) + 20}%` }}
                    ></div>
                ))}
            </div>

            <div className="bg-red-500/10 border-l-4 border-red-500 p-4 md:p-6 rounded-r-lg relative z-10">
                <div className="flex items-center gap-2 md:gap-3 mb-2">
                    <AlertTriangle className="text-red-500 w-5 h-5 md:w-6 md:h-6" />
                    <span className="text-red-500 font-bold uppercase text-xs md:text-sm tracking-widest">
                        Market Alert
                    </span>
                </div>
                <p className="text-white text-base md:text-xl font-bold leading-relaxed">
                    {data.news}
                </p>
            </div>
        </div>
    );
}
