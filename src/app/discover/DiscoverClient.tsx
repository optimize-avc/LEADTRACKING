'use client';

import React, { useState, useEffect } from 'react';
import { BusinessSearch } from '@/components/discover/BusinessSearch';
import { AuditResultCard } from '@/components/discover/AuditResultCard';
import { BusinessAuditResult } from '@/lib/ai/business-audit';
import { Resource, Lead } from '@/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { ResourcesService } from '@/lib/firebase/resources';
import { LeadsService } from '@/lib/firebase/services';
import { toast } from 'sonner';
import { Compass, Sparkles, Search, Target, TrendingUp, FileSearch, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DiscoverClient() {
    const { user, loading: authLoading } = useAuth();
    const [userToken, setUserToken] = useState<string | null>(null);
    const [resources, setResources] = useState<Resource[]>([]);
    const [isLoadingResources, setIsLoadingResources] = useState(false);
    const [auditResult, setAuditResult] = useState<BusinessAuditResult | null>(null);
    const [isAuditing, setIsAuditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Get auth token
    useEffect(() => {
        if (user) {
            user.getIdToken().then(setUserToken).catch(console.error);
        }
    }, [user]);

    // Load user's resources for context
    useEffect(() => {
        async function loadResources() {
            if (!user?.uid) return;

            setIsLoadingResources(true);
            try {
                // Load both user's private resources and company resources
                const [userResources, companyResources] = await Promise.all([
                    ResourcesService.getUserResources(user.uid),
                    ResourcesService.getCompanyResources(),
                ]);

                // Combine and dedupe
                const allResources = [...userResources, ...companyResources];
                setResources(allResources);
            } catch (error) {
                console.error('Failed to load resources:', error);
            } finally {
                setIsLoadingResources(false);
            }
        }

        loadResources();
    }, [user?.uid]);

    const handleAuditStart = () => {
        setIsAuditing(true);
        setAuditResult(null);
    };

    const handleAuditComplete = (result: BusinessAuditResult) => {
        setAuditResult(result);
        setIsAuditing(false);
    };

    const handleSaveToPipeline = async (audit: BusinessAuditResult) => {
        if (!user?.uid) {
            toast.error('Please log in to save leads');
            return;
        }

        setIsSaving(true);
        try {
            const leadData = {
                companyName: audit.companyName,
                contactName: audit.overview.keyPeople[0]?.split(' - ')[0] || 'Unknown',
                email: '', // Would need to be enriched separately
                phone: '',
                value: 0, // User can update later
                status: 'New' as const,
                industry: audit.overview.industry,
                source: 'Business Intelligence',
                notes: `Enriched via AI audit on ${new Date(audit.auditedAt).toLocaleDateString()}`,
                tags: ['ai-enriched', audit.overview.industry.toLowerCase().replace(/\s+/g, '-')],
                // Store full enrichment data
                enrichmentData: {
                    overview: audit.overview,
                    digitalPresence: audit.digitalPresence,
                    aiReadiness: audit.aiReadiness,
                    reviews: audit.reviews,
                    painPoints: audit.painPoints,
                    opportunities: audit.opportunities,
                    talkingPoints: audit.talkingPoints,
                    relevantResources: audit.relevantResources,
                },
                enrichedAt: audit.auditedAt,
            };

            await LeadsService.createLead(
                user.uid,
                leadData as Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'assignedTo'>
            );
            toast.success('Lead saved to pipeline!', {
                description: `${audit.companyName} has been added to your leads.`,
            });
        } catch (error) {
            console.error('Failed to save lead:', error);
            toast.error('Failed to save lead');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen p-8">
            {/* Header */}
            <header className="max-w-4xl mx-auto text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/30 rounded-full text-violet-300 text-sm mb-6">
                    <Sparkles className="w-4 h-4" />
                    AI-Powered Business Intelligence
                </div>

                <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-fuchsia-200 mb-4">
                    Discover & Research
                </h1>

                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                    Deep-audit any business in seconds. Get AI-powered insights on their digital
                    presence, pain points, and exactly how you can help them.
                </p>
            </header>

            {/* Search Section */}
            <section className="max-w-4xl mx-auto mb-12">
                <BusinessSearch
                    onAuditStart={handleAuditStart}
                    onAuditComplete={handleAuditComplete}
                    resources={resources}
                    userToken={userToken}
                />

                {/* Loading resources indicator */}
                {isLoadingResources && (
                    <div className="mt-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Loading your enablement materials...
                    </div>
                )}

                {/* Resources loaded indicator */}
                {!isLoadingResources && resources.length > 0 && !auditResult && !isAuditing && (
                    <div className="mt-4 text-center text-xs text-slate-500">
                        <FileSearch className="w-3 h-3 inline mr-1" />
                        {resources.length} enablement document{resources.length !== 1 ? 's' : ''}{' '}
                        will be used for context
                    </div>
                )}
            </section>

            {/* Results Section */}
            <AnimatePresence mode="wait">
                {isAuditing && (
                    <motion.section
                        key="loading"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="max-w-4xl mx-auto"
                    >
                        <div className="glass-card p-12 text-center">
                            <div className="relative w-24 h-24 mx-auto mb-6">
                                <div className="absolute inset-0 border-4 border-violet-500/30 rounded-full" />
                                <div className="absolute inset-0 border-4 border-transparent border-t-violet-500 rounded-full animate-spin" />
                                <div className="absolute inset-4 bg-violet-500/10 rounded-full flex items-center justify-center">
                                    <Search className="w-8 h-8 text-violet-400" />
                                </div>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                Conducting Deep Audit
                            </h3>
                            <p className="text-slate-400">
                                Searching the web, analyzing their digital presence, and generating
                                insights...
                            </p>
                        </div>
                    </motion.section>
                )}

                {auditResult && !isAuditing && (
                    <motion.section
                        key="results"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <AuditResultCard
                            audit={auditResult}
                            onSaveToPipeline={handleSaveToPipeline}
                            isSaving={isSaving}
                        />
                    </motion.section>
                )}
            </AnimatePresence>

            {/* Empty State Features */}
            {!auditResult && !isAuditing && (
                <section className="max-w-4xl mx-auto mt-16">
                    <div className="grid md:grid-cols-3 gap-6">
                        <FeatureCard
                            icon={<Compass className="w-6 h-6 text-blue-400" />}
                            title="Company Overview"
                            description="Industry, size, key people, and business description from multiple sources"
                        />
                        <FeatureCard
                            icon={<Target className="w-6 h-6 text-emerald-400" />}
                            title="Pain Point Analysis"
                            description="AI-identified challenges and opportunities where you can provide value"
                        />
                        <FeatureCard
                            icon={<TrendingUp className="w-6 h-6 text-violet-400" />}
                            title="Digital Presence Score"
                            description="Website quality, SEO strength, and AI readiness assessment"
                        />
                    </div>
                </section>
            )}

            {/* Auth Prompt */}
            {!authLoading && !user && (
                <div className="max-w-md mx-auto mt-12 p-6 glass-card text-center">
                    <p className="text-slate-400 mb-4">
                        Sign in to save leads to your pipeline and use your enablement materials for
                        context.
                    </p>
                    <button
                        onClick={() => (window.location.href = '/login')}
                        className="glass-button"
                    >
                        Sign In
                    </button>
                </div>
            )}
        </div>
    );
}

function FeatureCard({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="glass-card hover:bg-slate-800/40 transition-colors">
            <div className="p-3 bg-slate-800/50 rounded-lg w-fit mb-4">{icon}</div>
            <h3 className="font-semibold text-white mb-2">{title}</h3>
            <p className="text-sm text-slate-400">{description}</p>
        </div>
    );
}
