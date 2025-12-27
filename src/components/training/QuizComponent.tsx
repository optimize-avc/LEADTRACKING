'use client';

import React, { useState } from 'react';
import { QuizContent } from '@/types/learning';
import { CheckCircle, XCircle, AlertCircle, RotateCcw, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface QuizComponentProps {
    content: QuizContent;
    onComplete: (score: number) => void;
}

export function QuizComponent({ content, onComplete }: QuizComponentProps) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [showResults, setShowResults] = useState(false);

    const question = content.questions[currentQuestionIndex];
    const isCorrect = selectedOption === question.correctOptionIndex;

    const handleSelectOption = (index: number) => {
        if (isAnswered) return;
        setSelectedOption(index);
        setIsAnswered(true);

        if (index === question.correctOptionIndex) {
            setScore(s => s + 1);
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < content.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedOption(null);
            setIsAnswered(false);
        } else {
            finishQuiz();
        }
    };

    const finishQuiz = () => {
        setShowResults(true);
        const finalScore = Math.round(((score + (isCorrect ? 0 : 0)) / content.questions.length) * 100); // Wait, score is already updated? No, state update allows reading reliable next step.
        // Actually, let's recalculate based on current state knowing we passed previous step
        const calculateScore = Math.round((score / content.questions.length) * 100);

        if (calculateScore >= content.passingScore) {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
        onComplete(calculateScore);
    };

    if (showResults) {
        const percentage = Math.round((score / content.questions.length) * 100);
        const passed = percentage >= content.passingScore;

        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fade-in-up">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-2xl ${passed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
                    {passed ? <Trophy size={48} /> : <AlertCircle size={48} />}
                </div>

                <h2 className="text-3xl font-bold text-white mb-2">{passed ? 'Quiz Passed!' : 'Needs Improvement'}</h2>
                <p className="text-slate-400 mb-8 max-w-md">
                    {passed
                        ? 'Great job demonstrating your knowledge. You have officially completed this module.'
                        : 'You did not meet the passing score for this quiz. Review the material and try again to earn your XP.'}
                </p>

                <div className="text-6xl font-black text-white mb-2 tracking-tighter">{percentage}%</div>
                <div className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-10">Final Score</div>

                <div className="flex gap-4">
                    {!passed && (
                        <button
                            onClick={() => {
                                setCurrentQuestionIndex(0);
                                setScore(0);
                                setSelectedOption(null);
                                setIsAnswered(false);
                                setShowResults(false);
                            }}
                            className="glass-button flex items-center gap-2 px-6 py-3"
                        >
                            <RotateCcw size={18} /> Retry Quiz
                        </button>
                    )}
                    <button
                        onClick={() => onComplete(percentage)} // Just close/finish
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
                    >
                        Success
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto w-full py-10 px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                    Question {currentQuestionIndex + 1} / {content.questions.length}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-indigo-400 font-bold">{score}</span>
                    <span className="text-slate-600">points</span>
                </div>
            </div>

            {/* Question Card */}
            <div className="glass-card bg-slate-800/40 p-0 overflow-hidden border-none shadow-xl">
                <div className="p-8 border-b border-white/5 bg-slate-900/50">
                    <h3 className="text-xl md:text-2xl font-bold text-white leading-snug">
                        {question.question}
                    </h3>
                </div>

                <div className="p-4 space-y-3">
                    {question.options.map((option, index) => {
                        let statusClass = "border-white/5 hover:bg-white/5 hover:border-white/20 text-slate-300"; // Default

                        if (isAnswered) {
                            if (index === question.correctOptionIndex) {
                                statusClass = "bg-emerald-500/20 border-emerald-500/50 text-emerald-100 ring-1 ring-emerald-500/50";
                            } else if (index === selectedOption) {
                                statusClass = "bg-red-500/20 border-red-500/50 text-red-100";
                            } else {
                                statusClass = "opacity-50 border-transparent";
                            }
                        }

                        return (
                            <button
                                key={index}
                                onClick={() => handleSelectOption(index)}
                                disabled={isAnswered}
                                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between group ${statusClass} ${selectedOption === index ? 'ring-2 ring-indigo-500/50' : ''}`}
                            >
                                <span className="font-medium text-lg">{option}</span>
                                {isAnswered && index === question.correctOptionIndex && (
                                    <CheckCircle className="text-emerald-400" size={20} />
                                )}
                                {isAnswered && index === selectedOption && index !== question.correctOptionIndex && (
                                    <XCircle className="text-red-400" size={20} />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Feedback & Continue */}
                <AnimatePresence>
                    {isAnswered && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className={`p-6 border-t ${isCorrect ? 'bg-emerald-900/20 border-emerald-500/20' : 'bg-red-900/20 border-red-500/20'}`}
                        >
                            <div className="flex items-start gap-4 mb-6">
                                <div className={`mt-1 p-2 rounded-full ${isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {isCorrect ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                                </div>
                                <div>
                                    <h4 className={`font-bold mb-1 ${isCorrect ? 'text-emerald-300' : 'text-red-300'}`}>
                                        {isCorrect ? 'Correct!' : 'Incorrect'}
                                    </h4>
                                    <p className="text-slate-300 leading-relaxed text-sm">
                                        {question.explanation}
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={handleNext}
                                    className="px-8 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-200 transition-colors shadow-lg shadow-white/10"
                                >
                                    {currentQuestionIndex === content.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
