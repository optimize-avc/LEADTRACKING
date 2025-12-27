'use client';

import React, { useState, useEffect } from 'react';
import { X, Trophy, Target, Award, BrainCircuit, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { Question } from '@/types/learning';
import { generateQuizBatch } from '@/lib/ai/courseGenerator';

interface EndlessQuizRunnerProps {
    onClose: () => void;
}

type QuizState = 'setup' | 'playing' | 'checkpoint_summary';

export function EndlessQuizRunner({ onClose }: EndlessQuizRunnerProps) {
    // Game Config & State
    const [gameState, setGameState] = useState<QuizState>('setup');
    const [checkpointSize, setCheckpointSize] = useState(10); // 10-50
    const [loading, setLoading] = useState(false);

    // Session Stats
    const [totalQuestionsAnswered, setTotalQuestionsAnswered] = useState(0);
    const [totalCorrect, setTotalCorrect] = useState(0);
    const [checkpointsPassed, setCheckpointsPassed] = useState(0);

    // Current Batch State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [batchCorrect, setBatchCorrect] = useState(0);
    const [showExplanation, setShowExplanation] = useState(false);

    // Start a new batch
    const startCheckpoint = async () => {
        setLoading(true);
        const batch = await generateQuizBatch(checkpointSize);
        setQuestions(batch);
        setCurrentIndex(0);
        setBatchCorrect(0);
        setSelectedOption(null);
        setShowExplanation(false);
        setLoading(false);
        setGameState('playing');
    };

    // Handle Answer Selection
    const handleAnswer = (optionIndex: number) => {
        if (selectedOption !== null) return; // Prevent double clicking

        setSelectedOption(optionIndex);
        setShowExplanation(true);

        const isCorrect = optionIndex === questions[currentIndex].correctOptionIndex;
        if (isCorrect) {
            setBatchCorrect(prev => prev + 1);
            setTotalCorrect(prev => prev + 1);
        }
        setTotalQuestionsAnswered(prev => prev + 1);
    };

    // Next Question or Checkpoint Summary
    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setShowExplanation(false);
        } else {
            // End of Batch
            setCheckpointsPassed(prev => prev + 1);
            setGameState('checkpoint_summary');
        }
    };

    const overallAccuracy = totalQuestionsAnswered > 0
        ? Math.round((totalCorrect / totalQuestionsAnswered) * 100)
        : 0;

    const batchAccuracy = questions.length > 0
        ? Math.round((batchCorrect / questions.length) * 100)
        : 0;

    // --- SETUP SCREEN ---
    if (gameState === 'setup') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="glass-card w-full max-w-lg relative overflow-hidden p-8">
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>

                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-fuchsia-500 to-indigo-500"></div>

                    <div className="text-center mb-10">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-fuchsia-500/20">
                            <BrainCircuit size={32} className="text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">Endless Mastery</h2>
                        <p className="text-slate-400">
                            Test your sales knowledge against an infinite stream of AI-generated scenarios.
                        </p>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <div className="flex justify-between text-sm font-semibold mb-4">
                                <span className="text-slate-300">Checkpoint Length</span>
                                <span className="text-fuchsia-400">{checkpointSize} Questions</span>
                            </div>
                            <input
                                type="range"
                                min="10"
                                max="50"
                                step="5"
                                value={checkpointSize}
                                onChange={(e) => setCheckpointSize(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                            />
                            <div className="flex justify-between text-xs text-slate-500 mt-2">
                                <span>Quick (10)</span>
                                <span>Marathon (50)</span>
                            </div>
                        </div>

                        <button
                            onClick={startCheckpoint}
                            disabled={loading}
                            className="glass-button w-full py-4 text-lg font-bold flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <span className="animate-pulse">Generating...</span>
                            ) : (
                                <>
                                    Start Session <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- PLAYING SCREEN ---
    if (gameState === 'playing') {
        const currentQ = questions[currentIndex];
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900 bg-opacity-95 backdrop-blur-md">
                <div className="w-full max-w-4xl max-h-[90vh] flex flex-col">
                    {/* Header HUD */}
                    <div className="flex items-center justify-between mb-6 px-4">
                        <div className="flex items-center gap-4">
                            <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 text-sm font-semibold text-slate-300">
                                <Target size={16} className="text-fuchsia-400" />
                                <span>Progress: {currentIndex + 1} / {questions.length}</span>
                            </div>
                            <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 text-sm font-semibold text-slate-300">
                                <Trophy size={16} className="text-amber-400" />
                                <span>Score: {batchCorrect}</span>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Question Card */}
                    <div className="glass-card flex-1 overflow-y-auto custom-scrollbar relative">
                        {/* Progress Bar */}
                        <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-fuchsia-500 to-indigo-500 transition-all duration-300" style={{ width: `${((currentIndex) / questions.length) * 100}%` }}></div>

                        <div className="max-w-3xl mx-auto py-8">
                            <h3 className="text-2xl md:text-3xl font-bold text-white mb-8 leading-tight">
                                {currentQ.question}
                            </h3>

                            <div className="space-y-4">
                                {currentQ.options.map((option, idx) => {
                                    const isSelected = selectedOption === idx;
                                    const isCorrect = idx === currentQ.correctOptionIndex;

                                    let buttonStyle = "border-slate-700 hover:border-slate-500 hover:bg-slate-800/50";
                                    if (showExplanation) {
                                        if (isCorrect) buttonStyle = "border-green-500 bg-green-500/10 text-green-200";
                                        else if (isSelected) buttonStyle = "border-red-500 bg-red-500/10 text-red-200";
                                        else buttonStyle = "border-slate-800 opacity-50";
                                    } else if (isSelected) {
                                        buttonStyle = "border-fuchsia-500 bg-fuchsia-500/10 text-white";
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswer(idx)}
                                            disabled={showExplanation}
                                            className={`w-full text-left p-6 rounded-xl border-2 transition-all duration-200 text-lg ${buttonStyle}`}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={`mt-1 min-w-[24px] h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${showExplanation && isCorrect ? 'border-green-500 bg-green-500 text-black' :
                                                    showExplanation && isSelected ? 'border-red-500 bg-red-500 text-white' :
                                                        'border-slate-600 text-slate-400'
                                                    }`}>
                                                    {["A", "B", "C", "D"][idx]}
                                                </div>
                                                <span>{option}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Explanation & Next */}
                            {showExplanation && (
                                <div className="mt-8 animate-in slide-in-from-bottom-4 fade-in duration-300">
                                    <div className={`p-6 rounded-xl border mb-6 ${selectedOption === currentQ.correctOptionIndex
                                        ? 'bg-green-950/30 border-green-500/30'
                                        : 'bg-red-950/30 border-red-500/30'
                                        }`}>
                                        <div className="flex items-center gap-2 font-bold mb-2">
                                            {selectedOption === currentQ.correctOptionIndex ? (
                                                <><CheckCircle className="text-green-400" size={20} /> <span className="text-green-400">Correct!</span></>
                                            ) : (
                                                <><XCircle className="text-red-400" size={20} /> <span className="text-red-400">Incorrect</span></>
                                            )}
                                        </div>
                                        <p className="text-slate-300 leading-relaxed">
                                            {currentQ.explanation}
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleNext}
                                        className="glass-button w-full py-4 text-lg font-bold flex items-center justify-center gap-2"
                                    >
                                        {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Checkpoint'} <ArrowRight size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- CHECKPOINT SUMMARY ---
    if (gameState === 'checkpoint_summary') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
                <div className="glass-card w-full max-w-lg text-center p-10 animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500 shadow-xl shadow-orange-500/20">
                        <Award size={40} className="text-white" />
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-2">Checkpoint Cleared!</h2>
                    <p className="text-slate-400 mb-8">Great work. Here&apos;s how you performed.</p>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="glass-panel p-4 rounded-xl">
                            <div className="text-slate-400 text-sm mb-1">Accuracy</div>
                            <div className={`text-2xl font-bold ${batchAccuracy >= 80 ? 'text-green-400' : 'text-fuchsia-400'}`}>
                                {batchAccuracy}%
                            </div>
                        </div>
                        <div className="glass-panel p-4 rounded-xl">
                            <div className="text-slate-400 text-sm mb-1">Score</div>
                            <div className="text-2xl font-bold text-white">
                                {batchCorrect} / {questions.length}
                            </div>
                        </div>
                    </div>

                    {/* Overall Session Stats */}
                    <div className="border-t border-white/10 pt-6 mb-8">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Session Total</div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Total Questions</span>
                            <span className="text-white font-mono">{totalQuestionsAnswered}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-2">
                            <span className="text-slate-400">Avg Accuracy</span>
                            <span className="text-white font-mono">{overallAccuracy}%</span>
                        </div>
                        <div className="flex justify-between text-sm mt-2">
                            <span className="text-slate-400">Checkpoints</span>
                            <span className="text-white font-mono">{checkpointsPassed}</span>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-6 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors font-semibold"
                        >
                            End Session
                        </button>
                        <button
                            onClick={() => setGameState('setup')}
                            className="flex-1 glass-button py-3 px-6 font-semibold"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
