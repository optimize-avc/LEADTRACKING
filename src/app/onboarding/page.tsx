/**
 * Onboarding Wizard Page
 *
 * Multi-step wizard for new users to:
 * 1. Create their company/workspace
 * 2. Set industry and preferences
 * 3. Optionally invite team members
 *
 * Best practice 2026: Guided onboarding reduces churn and time-to-value
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2,
    Users,
    Sparkles,
    ChevronRight,
    ChevronLeft,
    Check,
    Loader2,
    Rocket,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { CompanyService } from '@/lib/firebase/company';
import { toast } from 'sonner';

const INDUSTRIES = [
    'Software & Technology',
    'E-commerce & Retail',
    'Healthcare & Medical',
    'Financial Services',
    'Real Estate',
    'Professional Services',
    'Manufacturing',
    'Education',
    'Marketing & Advertising',
    'Other',
];

const TEAM_SIZES = [
    { value: '1', label: 'Just me', description: 'Solo operator' },
    { value: '2-5', label: '2-5 people', description: 'Small team' },
    { value: '6-20', label: '6-20 people', description: 'Growing team' },
    { value: '21+', label: '21+ people', description: 'Large organization' },
];

interface OnboardingData {
    companyName: string;
    industry: string;
    teamSize: string;
    inviteEmails: string[];
}

export default function OnboardingPage() {
    const router = useRouter();
    const { user, profile, refreshProfile, loading: authLoading } = useAuth();

    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [data, setData] = useState<OnboardingData>({
        companyName: '',
        industry: '',
        teamSize: '1',
        inviteEmails: [],
    });
    const [inviteInput, setInviteInput] = useState('');

    // Redirect if not logged in
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login?redirect=/onboarding');
        }
    }, [user, authLoading, router]);

    // Redirect if already has company
    useEffect(() => {
        if (!authLoading && profile?.companyId) {
            router.push('/');
        }
    }, [profile, authLoading, router]);

    const totalSteps = 3;

    const handleNext = () => {
        if (step < totalSteps) {
            setStep(step + 1);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const canProceed = () => {
        switch (step) {
            case 1:
                return data.companyName.trim().length >= 2;
            case 2:
                return data.industry !== '';
            case 3:
                return true; // Team invites are optional
            default:
                return false;
        }
    };

    const handleAddInvite = () => {
        const email = inviteInput.trim().toLowerCase();
        if (email && email.includes('@') && !data.inviteEmails.includes(email)) {
            setData({ ...data, inviteEmails: [...data.inviteEmails, email] });
            setInviteInput('');
        }
    };

    const handleRemoveInvite = (email: string) => {
        setData({ ...data, inviteEmails: data.inviteEmails.filter((e) => e !== email) });
    };

    const handleSubmit = async () => {
        if (!user) return;

        setIsSubmitting(true);
        try {
            // Create company via API
            const token = await user.getIdToken();
            const companyId = await CompanyService.createCompany(
                user.uid,
                {
                    name: data.companyName,
                    settings: {
                        industry: data.industry,
                        persona: 'professional',
                        qualificationRules: [],
                        prompts: {},
                        channelMapping: {},
                    },
                },
                token
            );

            // TODO: Send team invites if any
            if (data.inviteEmails.length > 0) {
                // Will implement in team invite phase
                console.log('Would invite:', data.inviteEmails);
            }

            // Refresh profile to get companyId
            await refreshProfile();

            toast.success('Welcome to SalesTracker! Your workspace is ready.');
            router.push('/');
        } catch (error) {
            console.error('Onboarding error:', error);
            toast.error('Failed to create workspace. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-xl">
                {/* Progress Indicator */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className={`flex items-center ${s < 3 ? 'flex-1' : ''}`}>
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                                    s < step
                                        ? 'bg-emerald-500 text-white'
                                        : s === step
                                          ? 'bg-indigo-500 text-white'
                                          : 'bg-slate-700 text-slate-400'
                                }`}
                            >
                                {s < step ? <Check className="w-5 h-5" /> : s}
                            </div>
                            {s < 3 && (
                                <div
                                    className={`flex-1 h-1 mx-2 rounded transition-all ${
                                        s < step ? 'bg-emerald-500' : 'bg-slate-700'
                                    }`}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <GlassCard className="p-8">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="text-center mb-8">
                                    <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Building2 className="w-8 h-8 text-indigo-400" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-2">
                                        Create Your Workspace
                                    </h2>
                                    <p className="text-slate-400">
                                        What&apos;s the name of your company or team?
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-2">
                                            Company / Team Name
                                        </label>
                                        <input
                                            type="text"
                                            value={data.companyName}
                                            onChange={(e) =>
                                                setData({ ...data, companyName: e.target.value })
                                            }
                                            placeholder="Acme Sales Inc."
                                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="text-center mb-8">
                                    <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Sparkles className="w-8 h-8 text-violet-400" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-2">
                                        Tell Us About Your Business
                                    </h2>
                                    <p className="text-slate-400">
                                        This helps us customize your experience
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-2">
                                            Industry
                                        </label>
                                        <select
                                            value={data.industry}
                                            onChange={(e) =>
                                                setData({ ...data, industry: e.target.value })
                                            }
                                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                                        >
                                            <option value="">Select your industry...</option>
                                            {INDUSTRIES.map((ind) => (
                                                <option key={ind} value={ind}>
                                                    {ind}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-slate-400 mb-2">
                                            Team Size
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {TEAM_SIZES.map((size) => (
                                                <button
                                                    key={size.value}
                                                    onClick={() =>
                                                        setData({ ...data, teamSize: size.value })
                                                    }
                                                    className={`p-3 rounded-lg border text-left transition-all ${
                                                        data.teamSize === size.value
                                                            ? 'border-indigo-500 bg-indigo-500/10'
                                                            : 'border-slate-700 hover:border-slate-600'
                                                    }`}
                                                >
                                                    <div className="text-sm font-medium text-white">
                                                        {size.label}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {size.description}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="text-center mb-8">
                                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Users className="w-8 h-8 text-emerald-400" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-2">
                                        Invite Your Team
                                    </h2>
                                    <p className="text-slate-400">
                                        Add team members to collaborate (you can skip this)
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            value={inviteInput}
                                            onChange={(e) => setInviteInput(e.target.value)}
                                            onKeyDown={(e) =>
                                                e.key === 'Enter' && handleAddInvite()
                                            }
                                            placeholder="colleague@company.com"
                                            className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                        />
                                        <button
                                            onClick={handleAddInvite}
                                            className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                        >
                                            Add
                                        </button>
                                    </div>

                                    {data.inviteEmails.length > 0 && (
                                        <div className="space-y-2">
                                            {data.inviteEmails.map((email) => (
                                                <div
                                                    key={email}
                                                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                                                >
                                                    <span className="text-sm text-slate-300">
                                                        {email}
                                                    </span>
                                                    <button
                                                        onClick={() => handleRemoveInvite(email)}
                                                        className="text-slate-500 hover:text-red-400 transition-colors"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <p className="text-xs text-slate-500 text-center">
                                        Invites will be sent after you complete setup
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between mt-8 pt-6 border-t border-slate-700">
                        <button
                            onClick={handleBack}
                            disabled={step === 1}
                            className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Back
                        </button>

                        {step < totalSteps ? (
                            <button
                                onClick={handleNext}
                                disabled={!canProceed()}
                                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Continue
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 text-white rounded-lg font-medium disabled:opacity-50 transition-all"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Rocket className="w-4 h-4" />
                                        Launch Workspace
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </GlassCard>

                {/* Skip Link */}
                {step === 3 && (
                    <div className="text-center mt-4">
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="text-sm text-slate-500 hover:text-slate-400 transition-colors"
                        >
                            Skip invites and start now
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
