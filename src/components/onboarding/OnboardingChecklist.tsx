'use client';

/**
 * OnboardingChecklist Component
 *
 * Guides new users through initial setup steps.
 * Tracks progress and celebrates completion.
 *
 * Best practice 2026: Gamified onboarding with progress tracking
 */

import React, { useState, useMemo } from 'react';
import {
    CheckCircle,
    Circle,
    ChevronRight,
    User,
    Upload,
    Mail,
    Users,
    Play,
    Trophy,
    X,
    Sparkles,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    path: string;
    isComplete: boolean;
}

interface OnboardingProgress {
    completedSteps: string[];
    dismissed: boolean;
    completedAt?: number;
}

const STORAGE_KEY = 'salestracker_onboarding';

export function OnboardingChecklist() {
    const { profile } = useAuth();

    // Load initial progress from localStorage using lazy initializer
    const [progress, setProgress] = useState<OnboardingProgress>(() => {
        if (typeof window === 'undefined') {
            return { completedSteps: [], dismissed: false };
        }
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                // Invalid JSON, use defaults
            }
        }
        return { completedSteps: [], dismissed: false };
    });
    const [isExpanded, setIsExpanded] = useState(true);

    // Save progress to localStorage
    const saveProgress = (newProgress: OnboardingProgress) => {
        setProgress(newProgress);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
    };

    // Define onboarding steps
    const steps: OnboardingStep[] = useMemo(
        () => [
            {
                id: 'profile',
                title: 'Complete your profile',
                description: 'Add your name and profile details',
                icon: <User className="w-5 h-5" />,
                path: '/settings/account',
                isComplete: progress.completedSteps.includes('profile') || !!profile?.onboarded,
            },
            {
                id: 'leads',
                title: 'Import your first leads',
                description: 'Add at least 5 leads to get started',
                icon: <Upload className="w-5 h-5" />,
                path: '/leads',
                isComplete: progress.completedSteps.includes('leads'),
            },
            {
                id: 'email',
                title: 'Connect email integration',
                description: 'Set up SendGrid for email outreach',
                icon: <Mail className="w-5 h-5" />,
                path: '/settings/email',
                isComplete: progress.completedSteps.includes('email'),
            },
            {
                id: 'team',
                title: 'Invite a team member',
                description: 'Collaborate with your sales team',
                icon: <Users className="w-5 h-5" />,
                path: '/settings/team',
                isComplete: progress.completedSteps.includes('team'),
            },
            {
                id: 'activity',
                title: 'Log your first activity',
                description: 'Record a call, email, or meeting',
                icon: <Play className="w-5 h-5" />,
                path: '/activities',
                isComplete: progress.completedSteps.includes('activity'),
            },
        ],
        [progress.completedSteps, profile?.onboarded]
    );

    const completedCount = steps.filter((s) => s.isComplete).length;
    const totalSteps = steps.length;
    const progressPercent = Math.round((completedCount / totalSteps) * 100);
    const isAllComplete = completedCount === totalSteps;

    // Mark step as complete
    const markComplete = (stepId: string) => {
        if (progress.completedSteps.includes(stepId)) return;

        const newCompleted = [...progress.completedSteps, stepId];
        const allComplete = newCompleted.length === totalSteps;
        const timestamp = allComplete ? new Date().getTime() : undefined;

        saveProgress({
            ...progress,
            completedSteps: newCompleted,
            completedAt: timestamp,
        });
    };

    // Dismiss checklist
    const dismissChecklist = () => {
        saveProgress({
            ...progress,
            dismissed: true,
        });
    };

    // Don't show if dismissed or all complete
    if (progress.dismissed || (isAllComplete && progress.completedAt)) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
            {/* Header */}
            <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500/20 to-violet-500/20 rounded-xl">
                        <Sparkles className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Getting Started</h3>
                        <p className="text-sm text-slate-400">
                            {completedCount} of {totalSteps} steps complete
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Progress ring */}
                    <div className="relative w-12 h-12">
                        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                            <circle
                                cx="18"
                                cy="18"
                                r="16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="text-slate-700"
                            />
                            <circle
                                cx="18"
                                cy="18"
                                r="16"
                                fill="none"
                                stroke="url(#progressGradient)"
                                strokeWidth="2"
                                strokeDasharray={`${progressPercent} 100`}
                                strokeLinecap="round"
                                className="transition-all duration-500"
                            />
                            <defs>
                                <linearGradient
                                    id="progressGradient"
                                    x1="0%"
                                    y1="0%"
                                    x2="100%"
                                    y2="0%"
                                >
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#8b5cf6" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold text-white">{progressPercent}%</span>
                        </div>
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            dismissChecklist();
                        }}
                        className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                        title="Dismiss"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Steps */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-700/50"
                    >
                        {isAllComplete ? (
                            <div className="p-6 text-center">
                                <div className="inline-flex p-4 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-full mb-4">
                                    <Trophy className="w-8 h-8 text-emerald-400" />
                                </div>
                                <h4 className="text-lg font-bold text-white mb-2">
                                    You&apos;re all set! 🎉
                                </h4>
                                <p className="text-slate-400 text-sm mb-4">
                                    You&apos;ve completed the onboarding checklist. Start selling!
                                </p>
                                <button
                                    onClick={dismissChecklist}
                                    className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-colors"
                                >
                                    Dismiss
                                </button>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-700/50">
                                {steps.map((step) => (
                                    <a
                                        key={step.id}
                                        href={step.path}
                                        onClick={() => markComplete(step.id)}
                                        className={`flex items-center gap-4 p-4 hover:bg-white/5 transition-colors ${
                                            step.isComplete ? 'opacity-60' : ''
                                        }`}
                                    >
                                        <div
                                            className={`p-2 rounded-xl ${
                                                step.isComplete
                                                    ? 'bg-emerald-500/20'
                                                    : 'bg-slate-700/50'
                                            }`}
                                        >
                                            {step.isComplete ? (
                                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                                            ) : (
                                                <Circle className="w-5 h-5 text-slate-500" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p
                                                className={`font-medium ${
                                                    step.isComplete
                                                        ? 'text-slate-400 line-through'
                                                        : 'text-white'
                                                }`}
                                            >
                                                {step.title}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                {step.description}
                                            </p>
                                        </div>
                                        {!step.isComplete && (
                                            <ChevronRight className="w-5 h-5 text-slate-500" />
                                        )}
                                    </a>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
