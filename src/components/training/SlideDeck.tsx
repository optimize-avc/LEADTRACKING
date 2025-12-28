'use client';

import React, { useState } from 'react';
import { Slide } from '@/types/learning';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface SlideDeckProps {
    slides: Slide[];
    onComplete: () => void;
}

export function SlideDeck({ slides, onComplete }: SlideDeckProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(0);

    const currentSlide = slides[currentIndex];
    const isLastSlide = currentIndex === slides.length - 1;

    const paginate = (newDirection: number) => {
        setDirection(newDirection);
        const nextIndex = currentIndex + newDirection;

        if (nextIndex >= 0 && nextIndex < slides.length) {
            setCurrentIndex(nextIndex);
        } else if (nextIndex >= slides.length) {
            // Completed
            onComplete();
        }
    };

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0,
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0,
        }),
    };

    return (
        <div className="flex flex-col h-full">
            {/* Progress Bar */}
            <div className="h-1 bg-slate-800 w-full mb-6 rounded-full overflow-hidden">
                <div
                    className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                    style={{ width: `${((currentIndex + 1) / slides.length) * 100}%` }}
                />
            </div>

            {/* Slide Content Area */}
            <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center p-4">
                <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div
                        key={currentIndex}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: 'spring', stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 },
                        }}
                        className="w-full max-w-3xl glass-card border-none bg-slate-800/30 p-8 md:p-12 min-h-[400px] flex flex-col"
                    >
                        {/* Slide Header */}
                        <h2 className="text-3xl font-bold text-white mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-indigo-400">
                            {currentSlide.title}
                        </h2>

                        {/* Layout: Image + Text or Text Only */}
                        <div
                            className={`flex flex-col md:flex-row gap-8 items-center ${currentSlide.imageUrl ? 'justify-between' : 'justify-center'}`}
                        >
                            {/* Text Content */}
                            <div className="flex-1 space-y-6">
                                <div className="prose prose-invert prose-lg text-slate-300">
                                    <p className="whitespace-pre-line leading-relaxed">
                                        {currentSlide.body}
                                    </p>
                                </div>

                                {currentSlide.bullets && (
                                    <ul className="space-y-3">
                                        {currentSlide.bullets.map((bullet, idx) => (
                                            <motion.li
                                                key={idx}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.3 + idx * 0.1 }}
                                                className="flex items-start gap-3 text-slate-300"
                                            >
                                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                                                <span>{bullet}</span>
                                            </motion.li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* Optional Image */}
                            {currentSlide.imageUrl && (
                                <div className="w-full md:w-1/3 flex-shrink-0">
                                    <div className="relative rounded-xl shadow-2xl border border-white/10 w-full overflow-hidden aspect-video md:aspect-square">
                                        <Image
                                            src={currentSlide.imageUrl}
                                            alt={currentSlide.title}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between mt-8 max-w-3xl mx-auto w-full px-4">
                <button
                    onClick={() => paginate(-1)}
                    disabled={currentIndex === 0}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl border border-white/5 transition-colors font-medium
                        ${currentIndex === 0 ? 'opacity-0 pointer-events-none' : 'hover:bg-white/5 text-slate-300'}`}
                >
                    <ChevronLeft size={20} /> Previous
                </button>

                <div className="text-sm font-medium text-slate-500">
                    Slide {currentIndex + 1} of {slides.length}
                </div>

                <button
                    onClick={() => paginate(1)}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
                >
                    {isLastSlide ? 'Complete Lesson' : 'Next'}{' '}
                    {isLastSlide ? <CheckCircle size={20} /> : <ChevronRight size={20} />}
                </button>
            </div>
        </div>
    );
}
