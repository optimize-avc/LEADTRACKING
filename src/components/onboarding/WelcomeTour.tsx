'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { ShieldAlert, Target, Zap, Rocket, Check, ChevronRight, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ProfileService } from '@/lib/firebase/services';
import { useAuth } from '@/components/providers/AuthProvider';

interface TourStep {
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
}

const TOUR_STEPS: TourStep[] = [
    {
        title: "Welcome to SalesTracker AI",
        description: "Your new command center for high-stakes sales. We've built this to help you master every interaction using advanced enterprise telemetry.",
        icon: <Rocket className="w-8 h-8 text-blue-400" />,
        color: "blue"
    },
    {
        title: "The Intelligence Pipeline",
        description: "Track your leads with sub-millisecond precision. Use the new Export feature to keep your data portable and secure.",
        icon: <Zap className="w-8 h-8 text-amber-400" />,
        color: "amber"
    },
    {
        title: "The Simulation Lab",
        description: "Go beyond tracking. Enter the War Room or the Objection Dojo to wargame deals with aggressive AI buying committees.",
        icon: < ShieldAlert className="w-8 h-8 text-red-400" />,
        color: "red"
    },
    {
        title: "You're Ready to Scale",
        description: "All enterprise guardrails are active. Your journey to venture-scale performance starts now.",
        icon: <Check className="w-8 h-8 text-green-400" />,
        color: "green"
    }
];

export function WelcomeTour() {
    const { user, profile, refreshProfile } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [isOpen, setIsOpen] = useState(true);

    if (!profile || profile.onboarded || !isOpen) return null;

    const handleNext = async () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            // Final step
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#6366f1', '#a855f7', '#ec4899']
            });

            if (user) {
                await ProfileService.setOnboarded(user.uid);
                await refreshProfile();
            }
            setIsOpen(false);
        }
    };

    const handleSkip = async () => {
        if (user) {
            await ProfileService.setOnboarded(user.uid);
            await refreshProfile();
        }
        setIsOpen(false);
    };

    const step = TOUR_STEPS[currentStep];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-lg"
            >
                <GlassCard className="relative overflow-hidden border border-white/10 shadow-2xl">
                    {/* Background Glow */}
                    <div className={`absolute -top-24 -right-24 w-48 h-48 bg-${step.color}-500/10 blur-[80px] rounded-full`} />

                    <button
                        onClick={handleSkip}
                        className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors p-2"
                    >
                        <X size={20} />
                    </button>

                    <div className="p-8">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="text-center"
                            >
                                <div className={`w-16 h-16 bg-${step.color}-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl`}>
                                    {step.icon}
                                </div>

                                <h2 className="text-2xl font-bold text-white mb-4">
                                    {step.title}
                                </h2>

                                <p className="text-slate-400 leading-relaxed mb-8 min-h-[80px]">
                                    {step.description}
                                </p>
                            </motion.div>
                        </AnimatePresence>

                        <div className="flex items-center justify-between">
                            {/* Progress Dots */}
                            <div className="flex gap-2">
                                {TOUR_STEPS.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-indigo-500' : 'w-2 bg-slate-700'
                                            }`}
                                    />
                                ))}
                            </div>

                            <button
                                onClick={handleNext}
                                className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-semibold transition-all shadow-lg active:scale-95"
                            >
                                {currentStep === TOUR_STEPS.length - 1 ? "Get Started" : "Continue"}
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </GlassCard>
            </motion.div>
        </div>
    );
}
