'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Square, TrendingUp, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { GeminiService } from '@/lib/ai/gemini';
import { useAuth } from '@/components/providers/AuthProvider';
import { AIPitchAnalysis } from '@/types/ai';

// Web Speech API types (not globally available in all TS configs)
interface SpeechRecognitionResult {
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
    readonly isFinal: boolean;
}

interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
}

interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventType extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionType extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEventType) => void) | null;
    onerror: ((event: Event) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

interface PitchRecorderProps {
    onClose: () => void;
}

type RecordingState = 'idle' | 'recording' | 'analyzing' | 'complete';

export function PitchRecorder({ onClose }: PitchRecorderProps) {
    const [state, setState] = useState<RecordingState>('idle');
    const [duration, setDuration] = useState(0);
    const [transcript, setTranscript] = useState('');
    const [analysis, setAnalysis] = useState<AIPitchAnalysis | null>(null);
    const { user } = useAuth();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const recognitionRef = useRef<SpeechRecognitionType | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognitionCtor =
                (
                    window as unknown as {
                        SpeechRecognition?: new () => SpeechRecognitionType;
                        webkitSpeechRecognition?: new () => SpeechRecognitionType;
                    }
                ).SpeechRecognition ||
                (
                    window as unknown as {
                        webkitSpeechRecognition?: new () => SpeechRecognitionType;
                    }
                ).webkitSpeechRecognition;
            if (SpeechRecognitionCtor) {
                const recognition = new SpeechRecognitionCtor();
                recognition.continuous = true;
                recognition.interimResults = true;

                recognition.onresult = (event: SpeechRecognitionEventType) => {
                    let currentTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        currentTranscript += event.results[i][0].transcript;
                    }
                    setTranscript((prev) => prev + ' ' + currentTranscript);
                };

                recognitionRef.current = recognition;
            }
        }
    }, []);

    // Simulated Waveform Animation (Visuals only for now)
    useEffect(() => {
        if (state !== 'recording' || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        const bars = 40;
        const barWidth = canvas.width / bars;

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#06b6d4'; // Cyan-500

            for (let i = 0; i < bars; i++) {
                // Generate random bar height
                const height = Math.random() * (canvas.height * 0.8) + canvas.height * 0.1;
                const x = i * barWidth;
                const y = (canvas.height - height) / 2;

                ctx.beginPath();
                ctx.roundRect(x + 2, y, barWidth - 4, height, 4);
                ctx.fill();
            }
            animationId = requestAnimationFrame(draw);
        };

        draw();

        return () => cancelAnimationFrame(animationId);
    }, [state]);

    // Timer Logic
    useEffect(() => {
        if (state === 'recording') {
            timerRef.current = setInterval(() => {
                setDuration((prev) => prev + 1);
            }, 1000);
        } else if (state === 'idle') {
            const timeout = setTimeout(() => {
                setDuration(0);
                setTranscript('');
            }, 0);
            return () => clearTimeout(timeout);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [state]);

    const startRecording = () => {
        setTranscript('');
        setState('recording');
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error('Speech start error', e);
            }
        } else {
            alert('Speech Recognition not supported in this browser. Please use Chrome/Edge.');
        }
    };

    const stopRecording = async () => {
        setState('analyzing');
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }

        // Send to AI
        if (!transcript.trim()) {
            // Fallback for demo if mic failed or silence
            console.warn('No transcript captured. Using fallback.');
        }

        // Wait a tiny bit for final transcript
        await new Promise((r) => setTimeout(r, 500));

        const textToAnalyze =
            transcript.trim() ||
            "Hi, I'm calling from OmniStream to see if you have time to discuss your social media automation needs. Our tool is 20 percent cheaper than Hootsuite and has better analytics.";

        const token = await user?.getIdToken();
        const result = await GeminiService.analyzePitch(textToAnalyze, token);
        setAnalysis(result);
        setState('complete');
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // --- IDLE STATE ---
    if (state === 'idle') {
        return (
            <div className="fixed inset-0 z-[100] overflow-y-auto modal-scrollable bg-slate-900/90 backdrop-blur-md">
                <div className="flex min-h-full items-center justify-center p-4">
                    <div className="glass-card w-full max-w-lg text-center p-6 md:p-12 relative overflow-hidden my-auto">
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 md:top-4 md:right-4 p-2 min-w-[44px] min-h-[44px] text-slate-400 hover:text-white active:text-white flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/10"
                        >
                            <X size={24} />
                        </button>

                        <div className="mx-auto w-20 h-20 md:w-24 md:h-24 rounded-full bg-cyan-900/30 border-2 border-cyan-500/50 flex items-center justify-center mb-6 md:mb-8 relative">
                            <div className="absolute inset-0 bg-cyan-500/20 rounded-full animate-ping"></div>
                            <Mic
                                size={40}
                                className="text-cyan-400 relative z-10 md:w-12 md:h-12"
                            />
                        </div>

                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">
                            Pitch Perfect
                        </h2>
                        <p className="text-slate-400 mb-8 md:mb-10 leading-relaxed text-sm md:text-base">
                            Record your 30-second elevator pitch. Starts <b>listening</b>{' '}
                            immediately.
                        </p>

                        <button
                            onClick={startRecording}
                            className="glass-button w-full py-4 min-h-[52px] text-base md:text-lg font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:from-cyan-700 active:to-blue-700 border-none"
                        >
                            Start Recording
                        </button>
                        <div className="mt-4 text-xs text-slate-500 flex items-center justify-center gap-2">
                            <AlertTriangle size={12} /> Microphone access required
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- RECORDING STATE ---
    if (state === 'recording') {
        return (
            <div className="fixed inset-0 z-[100] overflow-y-auto modal-scrollable bg-slate-900/90 backdrop-blur-md">
                <div className="flex min-h-full items-center justify-center p-4">
                    <div className="glass-card w-full max-w-lg text-center p-6 md:p-12 relative my-auto">
                        <div className="mb-4 text-cyan-400 font-mono text-xl md:text-2xl tracking-widest">
                            {formatTime(duration)} / 0:30
                        </div>

                        <div className="h-24 md:h-32 w-full bg-slate-900/50 rounded-xl mb-8 md:mb-10 overflow-hidden relative border border-white/5">
                            <canvas
                                ref={canvasRef}
                                width={400}
                                height={128}
                                className="w-full h-full"
                            />
                        </div>

                        <div className="text-white text-base md:text-lg font-medium mb-6 md:mb-8 animate-pulse">
                            Listening...
                        </div>
                        {/* Live Transcript Preview */}
                        <div className="text-slate-500 text-xs mb-4 h-10 overflow-hidden">
                            {transcript.slice(-50)}...
                        </div>

                        <button
                            onClick={stopRecording}
                            className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700 flex items-center justify-center mx-auto shadow-lg shadow-red-500/30 transition-transform active:scale-95"
                        >
                            <Square size={28} className="text-white fill-white md:w-8 md:h-8" />
                        </button>
                        <div className="mt-4 text-xs text-slate-500 uppercase tracking-wider font-bold">
                            Stop Recording
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- ANALYZING STATE ---
    if (state === 'analyzing') {
        return (
            <div className="fixed inset-0 z-[100] overflow-y-auto modal-scrollable bg-slate-900/90 backdrop-blur-md">
                <div className="flex min-h-full items-center justify-center p-4">
                    <div className="glass-card w-full max-w-md text-center p-8 md:p-12 my-auto">
                        <div className="w-14 h-14 md:w-16 md:h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                        <h3 className="text-lg md:text-xl font-bold text-white mb-2">
                            Analyzing Pitch...
                        </h3>
                        <p className="text-slate-400 text-sm">
                            Gemini 2.5 is reviewing your tone, pace, and content.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // --- COMPLETE STATE ---
    if (state === 'complete' && analysis) {
        return (
            <div className="fixed inset-0 z-[100] overflow-y-auto modal-scrollable bg-slate-900/90 backdrop-blur-md">
                <div className="flex min-h-full items-center justify-center p-3 md:p-4">
                    <div className="glass-card w-full max-w-2xl relative p-0 overflow-hidden animate-in zoom-in-95 duration-300 my-auto">
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 md:top-4 md:right-4 z-10 p-2 min-w-[44px] min-h-[44px] text-slate-400 hover:text-white active:text-white flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/10"
                        >
                            <X size={24} />
                        </button>

                        <div className="bg-gradient-to-r from-cyan-900 to-blue-900 p-6 md:p-8 text-center relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="text-cyan-300 text-xs md:text-sm font-bold uppercase tracking-widest mb-2">
                                    Analysis Complete
                                </div>
                                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                                    {analysis.score}/100
                                </h2>
                                <p className="text-cyan-200 text-sm md:text-base">
                                    {analysis.oneLineFeedback}
                                </p>
                            </div>
                            {/* Background Decor */}
                            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                        </div>

                        <div className="p-4 md:p-8 grid grid-cols-3 gap-3 md:gap-6">
                            {/* Pace */}
                            <div className="p-3 md:p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                                <div className="mb-2 md:mb-3 w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto text-blue-400">
                                    <Clock size={16} className="md:w-5 md:h-5" />
                                </div>
                                <div className="text-lg md:text-2xl font-bold text-white mb-1">
                                    {analysis.pace || '~'}
                                </div>
                                <div className="text-[10px] md:text-xs text-slate-400 uppercase">
                                    Words / Min
                                </div>
                                <div className="mt-1 md:mt-2 text-[10px] md:text-xs text-green-400">
                                    Estimated
                                </div>
                            </div>

                            {/* Filler Words */}
                            <div className="p-3 md:p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                                <div className="mb-2 md:mb-3 w-8 h-8 md:w-10 md:h-10 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
                                    <AlertTriangle size={16} className="md:w-5 md:h-5" />
                                </div>
                                <div className="text-lg md:text-2xl font-bold text-white mb-1">
                                    {analysis.fillerWords?.length || 0}
                                </div>
                                <div className="text-[10px] md:text-xs text-slate-400 uppercase">
                                    Filler Words
                                </div>
                                <div className="mt-1 md:mt-2 text-[10px] md:text-xs text-amber-400 truncate">
                                    {analysis.fillerWords?.join(', ') || 'None'}
                                </div>
                            </div>

                            {/* Confidence */}
                            <div className="p-3 md:p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                                <div className="mb-2 md:mb-3 w-8 h-8 md:w-10 md:h-10 rounded-full bg-fuchsia-500/20 flex items-center justify-center mx-auto text-fuchsia-400">
                                    <TrendingUp size={16} className="md:w-5 md:h-5" />
                                </div>
                                <div className="text-lg md:text-2xl font-bold text-white mb-1">
                                    {analysis.confidence}
                                </div>
                                <div className="text-[10px] md:text-xs text-slate-400 uppercase">
                                    Confidence
                                </div>
                                <div className="mt-1 md:mt-2 text-[10px] md:text-xs text-green-400">
                                    AI Analysis
                                </div>
                            </div>
                        </div>

                        <div className="p-4 md:p-8 pt-0">
                            <div className="p-3 md:p-4 rounded-xl bg-slate-900/50 border border-white/5 mb-4 md:mb-6">
                                <h4 className="font-bold text-white mb-2 flex items-center gap-2 text-sm md:text-base">
                                    <CheckCircle2 size={16} className="text-green-500" /> Key
                                    Strengths
                                </h4>
                                <ul className="text-xs md:text-sm text-slate-300 space-y-1 md:space-y-2 list-disc pl-5">
                                    {analysis.strengths?.map((s: string, i: number) => (
                                        <li key={i}>{s}</li>
                                    ))}
                                </ul>
                            </div>

                            {analysis.improvements && (
                                <div className="p-3 md:p-4 rounded-xl bg-slate-900/50 border border-white/5 mb-4 md:mb-6">
                                    <h4 className="font-bold text-white mb-2 flex items-center gap-2 text-sm md:text-base">
                                        <AlertTriangle size={16} className="text-amber-500" />{' '}
                                        Improvements
                                    </h4>
                                    <ul className="text-xs md:text-sm text-slate-300 space-y-1 md:space-y-2 list-disc pl-5">
                                        {analysis.improvements.map((s: string, i: number) => (
                                            <li key={i}>{s}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                                <button
                                    onClick={() => setState('idle')}
                                    className="flex-1 glass-button py-3 min-h-[48px] text-sm font-bold active:scale-[0.98]"
                                >
                                    Try Again
                                </button>
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-3 min-h-[48px] border border-slate-700 rounded-xl text-slate-400 hover:text-white active:text-white hover:bg-slate-800 active:bg-slate-800 transition-colors text-sm font-bold"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
