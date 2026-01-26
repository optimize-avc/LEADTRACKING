'use client';

import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { BusinessAuditResult } from '@/lib/ai/business-audit';
import {
    Building2,
    Globe,
    Users,
    TrendingUp,
    MessageSquare,
    Target,
    Lightbulb,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Star,
    AlertTriangle,
    CheckCircle2,
    Sparkles,
    BookOpen,
    Loader2,
    PlusCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuditResultCardProps {
    audit: BusinessAuditResult;
    onSaveToPipeline: (audit: BusinessAuditResult) => Promise<void>;
    isSaving?: boolean;
}

interface CollapsibleSectionProps {
    title: string;
    icon: React.ReactNode;
    defaultOpen?: boolean;
    children: React.ReactNode;
    badge?: React.ReactNode;
}

function CollapsibleSection({
    title,
    icon,
    defaultOpen = false,
    children,
    badge,
}: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border border-slate-700/50 rounded-xl overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-slate-800/30 hover:bg-slate-800/50 transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-700/50 rounded-lg">{icon}</div>
                    <span className="font-semibold text-white">{title}</span>
                    {badge}
                </div>
                {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 bg-slate-900/30">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ScoreRing({
    score,
    label,
    size = 'md',
}: {
    score: number;
    label: string;
    size?: 'sm' | 'md';
}) {
    const radius = size === 'sm' ? 24 : 36;
    const strokeWidth = size === 'sm' ? 4 : 6;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;

    const getColor = (score: number) => {
        if (score >= 70) return 'text-emerald-400';
        if (score >= 40) return 'text-amber-400';
        return 'text-red-400';
    };

    const getStrokeColor = (score: number) => {
        if (score >= 70) return '#34d399';
        if (score >= 40) return '#fbbf24';
        return '#f87171';
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative">
                <svg
                    className={size === 'sm' ? 'w-14 h-14' : 'w-20 h-20'}
                    viewBox={`0 0 ${(radius + strokeWidth) * 2} ${(radius + strokeWidth) * 2}`}
                >
                    <circle
                        cx={radius + strokeWidth}
                        cy={radius + strokeWidth}
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        className="text-slate-700"
                    />
                    <circle
                        cx={radius + strokeWidth}
                        cy={radius + strokeWidth}
                        r={radius}
                        fill="none"
                        stroke={getStrokeColor(score)}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - progress}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${radius + strokeWidth} ${radius + strokeWidth})`}
                        className="transition-all duration-1000"
                    />
                </svg>
                <div
                    className={`absolute inset-0 flex items-center justify-center ${getColor(score)}`}
                >
                    <span className={`font-bold ${size === 'sm' ? 'text-sm' : 'text-lg'}`}>
                        {score}
                    </span>
                </div>
            </div>
            <span className={`text-slate-400 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
                {label}
            </span>
        </div>
    );
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
    const config = {
        positive: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: '😊' },
        negative: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: '😟' },
        neutral: { color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: '😐' },
        mixed: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: '🤔' },
    }[sentiment] || { color: 'bg-slate-500/20 text-slate-400', icon: '❓' };

    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}
        >
            <span>{config.icon}</span>
            <span className="capitalize">{sentiment}</span>
        </span>
    );
}

export function AuditResultCard({ audit, onSaveToPipeline, isSaving }: AuditResultCardProps) {
    return (
        <GlassCard className="w-full max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6 pb-6 border-b border-slate-700/50">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 rounded-xl">
                        <Building2 className="w-8 h-8 text-violet-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">{audit.companyName}</h2>
                        {audit.website && (
                            <a
                                href={
                                    audit.website.startsWith('http')
                                        ? audit.website
                                        : `https://${audit.website}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                <Globe className="w-4 h-4" />
                                {audit.website}
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="default">{audit.overview.industry}</Badge>
                            <Badge variant="info">{audit.overview.estimatedSize}</Badge>
                            {audit.overview.headquarters && (
                                <span className="text-xs text-slate-500">
                                    📍 {audit.overview.headquarters}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Score Overview */}
                <div className="flex gap-4">
                    <ScoreRing score={audit.digitalPresence.score} label="Digital" />
                    <ScoreRing score={audit.aiReadiness.score} label="AI Ready" />
                </div>
            </div>

            {/* Company Overview */}
            <div className="mb-6">
                <p className="text-slate-300 leading-relaxed">{audit.overview.description}</p>
                {audit.overview.keyPeople.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Users className="w-4 h-4 text-slate-500 mt-1" />
                        {audit.overview.keyPeople.map((person, idx) => (
                            <span
                                key={idx}
                                className="text-sm text-slate-400 bg-slate-800/50 px-2 py-1 rounded"
                            >
                                {person}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Collapsible Sections */}
            <div className="space-y-4">
                {/* Digital Presence */}
                <CollapsibleSection
                    title="Digital Presence"
                    icon={<Globe className="w-5 h-5 text-blue-400" />}
                    defaultOpen={true}
                    badge={<ScoreRing score={audit.digitalPresence.score} label="" size="sm" />}
                >
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-sm font-medium text-slate-400 mb-1">
                                Website Quality
                            </h4>
                            <p className="text-white">{audit.digitalPresence.websiteQuality}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                {audit.digitalPresence.mobileOptimized ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                ) : (
                                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                                )}
                                <span className="text-sm text-slate-300">
                                    Mobile{' '}
                                    {audit.digitalPresence.mobileOptimized
                                        ? 'Optimized'
                                        : 'Needs Work'}
                                </span>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-slate-400 mb-1">
                                SEO Strength
                            </h4>
                            <p className="text-white">{audit.digitalPresence.seoStrength}</p>
                        </div>
                        {audit.digitalPresence.socialProfiles.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {audit.digitalPresence.socialProfiles.map((profile, idx) => (
                                    <span
                                        key={idx}
                                        className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded"
                                    >
                                        {profile}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </CollapsibleSection>

                {/* AI Readiness */}
                <CollapsibleSection
                    title="AI Readiness"
                    icon={<Sparkles className="w-5 h-5 text-violet-400" />}
                    badge={<ScoreRing score={audit.aiReadiness.score} label="" size="sm" />}
                >
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-sm font-medium text-slate-400 mb-1">
                                Current AI Usage
                            </h4>
                            <p className="text-white">{audit.aiReadiness.currentAIUsage}</p>
                        </div>
                        {audit.aiReadiness.opportunities.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-slate-400 mb-2">
                                    AI Opportunities
                                </h4>
                                <ul className="space-y-2">
                                    {audit.aiReadiness.opportunities.map((opp, idx) => (
                                        <li
                                            key={idx}
                                            className="flex items-start gap-2 text-sm text-slate-300"
                                        >
                                            <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                                            {opp}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </CollapsibleSection>

                {/* Reviews & Sentiment */}
                <CollapsibleSection
                    title="Reviews & Sentiment"
                    icon={<MessageSquare className="w-5 h-5 text-emerald-400" />}
                    badge={<SentimentBadge sentiment={audit.reviews.sentiment} />}
                >
                    <div className="space-y-4">
                        {audit.reviews.averageRating && (
                            <div className="flex items-center gap-2">
                                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                                <span className="text-lg font-bold text-white">
                                    {audit.reviews.averageRating}
                                </span>
                                <span className="text-sm text-slate-400">average rating</span>
                            </div>
                        )}
                        {audit.reviews.keyThemes.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-slate-400 mb-2">
                                    Key Themes
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {audit.reviews.keyThemes.map((theme, idx) => (
                                        <span
                                            key={idx}
                                            className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded"
                                        >
                                            {theme}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {audit.reviews.sources.length > 0 && (
                            <div className="text-xs text-slate-500">
                                Sources: {audit.reviews.sources.join(', ')}
                            </div>
                        )}
                    </div>
                </CollapsibleSection>

                {/* Pain Points */}
                {audit.painPoints.length > 0 && (
                    <CollapsibleSection
                        title="Identified Pain Points"
                        icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
                        defaultOpen={true}
                    >
                        <ul className="space-y-3">
                            {audit.painPoints.map((pain, idx) => (
                                <li key={idx} className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-xs text-amber-400 font-bold">
                                            {idx + 1}
                                        </span>
                                    </div>
                                    <span className="text-slate-300">{pain}</span>
                                </li>
                            ))}
                        </ul>
                    </CollapsibleSection>
                )}

                {/* Opportunities */}
                {audit.opportunities.length > 0 && (
                    <CollapsibleSection
                        title="How You Can Help"
                        icon={<Target className="w-5 h-5 text-emerald-400" />}
                        defaultOpen={true}
                    >
                        <ul className="space-y-3">
                            {audit.opportunities.map((opp, idx) => (
                                <li key={idx} className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                    <span className="text-slate-300">{opp}</span>
                                </li>
                            ))}
                        </ul>
                    </CollapsibleSection>
                )}

                {/* Talking Points */}
                {audit.talkingPoints.length > 0 && (
                    <CollapsibleSection
                        title="Recommended Talking Points"
                        icon={<TrendingUp className="w-5 h-5 text-blue-400" />}
                        defaultOpen={true}
                    >
                        <div className="space-y-3">
                            {audit.talkingPoints.map((point, idx) => (
                                <div
                                    key={idx}
                                    className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg"
                                >
                                    <p className="text-blue-200 text-sm">
                                        💬 &ldquo;{point}&rdquo;
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CollapsibleSection>
                )}

                {/* Relevant Resources */}
                {audit.relevantResources && audit.relevantResources.length > 0 && (
                    <CollapsibleSection
                        title="Relevant Enablement Materials"
                        icon={<BookOpen className="w-5 h-5 text-fuchsia-400" />}
                    >
                        <ul className="space-y-3">
                            {audit.relevantResources.map((resource, idx) => (
                                <li
                                    key={idx}
                                    className="p-3 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg"
                                >
                                    <div className="font-medium text-fuchsia-300 mb-1">
                                        {resource.title}
                                    </div>
                                    <p className="text-sm text-slate-400">{resource.relevance}</p>
                                </li>
                            ))}
                        </ul>
                    </CollapsibleSection>
                )}
            </div>

            {/* Action Bar */}
            <div className="mt-8 pt-6 border-t border-slate-700/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="text-xs text-slate-500">
                    Audited {new Date(audit.auditedAt).toLocaleString()}
                </div>
                <button
                    onClick={() => onSaveToPipeline(audit)}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-xl text-white font-semibold shadow-lg shadow-emerald-500/20 transition-all"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <PlusCircle className="w-5 h-5" />
                            Save to Pipeline
                        </>
                    )}
                </button>
            </div>
        </GlassCard>
    );
}
