'use client';

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { BusinessSearch } from '@/components/discover/BusinessSearch';
import { AuditResultCard } from '@/components/discover/AuditResultCard';
import { BusinessAuditResult } from '@/lib/ai/business-audit';
import { Resource } from '@/types';
import { DiscoveredLead } from '@/types/discovery';
import { useAuth } from '@/components/providers/AuthProvider';
import { ResourcesService } from '@/lib/firebase/resources';
import { toast } from 'sonner';
import {
    Compass,
    Sparkles,
    Search,
    Target,
    TrendingUp,
    FileSearch,
    Loader2,
    Bot,
    Bookmark,
    Building2,
    MapPin,
    ExternalLink,
    Plus,
    X,
    Eye,
    RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type TabType = 'manual' | 'ai-discovered' | 'watchlist';

export default function DiscoverClient() {
    const { user, loading: authLoading } = useAuth();
    const [userToken, setUserToken] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('manual');

    // Manual search state
    const [resources, setResources] = useState<Resource[]>([]);
    const [isLoadingResources, setIsLoadingResources] = useState(false);
    const [auditResult, setAuditResult] = useState<BusinessAuditResult | null>(null);
    const [isAuditing, setIsAuditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // AI Discovered state
    const [discoveredLeads, setDiscoveredLeads] = useState<DiscoveredLead[]>([]);
    const [isLoadingDiscovered, setIsLoadingDiscovered] = useState(false);
    const [discoveredTotal, setDiscoveredTotal] = useState(0);

    // Watchlist state
    const [watchlistLeads, setWatchlistLeads] = useState<DiscoveredLead[]>([]);
    const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(false);

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
                const [userResources, companyResources] = await Promise.all([
                    ResourcesService.getUserResources(user.uid),
                    ResourcesService.getCompanyResources(),
                ]);
                setResources([...userResources, ...companyResources]);
            } catch (error) {
                console.error('Failed to load resources:', error);
            } finally {
                setIsLoadingResources(false);
            }
        }
        loadResources();
    }, [user?.uid]);

    // Load discovered leads when tab changes
    useEffect(() => {
        if (activeTab === 'ai-discovered' && user && userToken) {
            loadDiscoveredLeads();
        } else if (activeTab === 'watchlist' && user && userToken) {
            loadWatchlistLeads();
        }
    }, [activeTab, user, userToken]);

    const loadDiscoveredLeads = async () => {
        if (!userToken) return;
        setIsLoadingDiscovered(true);
        try {
            const response = await fetch('/api/discovery/leads?status=new&limit=50', {
                headers: { Authorization: `Bearer ${userToken}` },
            });
            const data = await response.json();
            if (data.leads) {
                setDiscoveredLeads(data.leads);
                setDiscoveredTotal(data.total);
            }
        } catch (error) {
            console.error('Failed to load discovered leads:', error);
            toast.error('Failed to load discovered leads');
        } finally {
            setIsLoadingDiscovered(false);
        }
    };

    const loadWatchlistLeads = async () => {
        if (!userToken) return;
        setIsLoadingWatchlist(true);
        try {
            const response = await fetch('/api/discovery/leads?status=reviewed&limit=50', {
                headers: { Authorization: `Bearer ${userToken}` },
            });
            const data = await response.json();
            if (data.leads) {
                setWatchlistLeads(data.leads);
            }
        } catch (error) {
            console.error('Failed to load watchlist:', error);
            toast.error('Failed to load watchlist');
        } finally {
            setIsLoadingWatchlist(false);
        }
    };

    const handleAuditStart = () => {
        setIsAuditing(true);
        setAuditResult(null);
    };

    const handleAuditComplete = (result: BusinessAuditResult) => {
        setAuditResult(result);
        setIsAuditing(false);
    };

    const handleSaveToPipeline = async (audit: BusinessAuditResult) => {
        if (!user?.uid || !userToken) {
            toast.error('Please log in to save leads');
            return;
        }

        setIsSaving(true);
        try {
            // Normalize website URL - ensure it has a protocol or skip it
            const normalizeUrl = (url: string | undefined): string | undefined => {
                if (!url) return undefined;
                if (url.startsWith('http://') || url.startsWith('https://')) return url;
                // Skip URLs without protocol to avoid validation errors
                return undefined;
            };

            const response = await fetch('/api/leads', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({
                    businessName: audit.companyName,
                    contactName: audit.overview.keyPeople[0]?.split(' - ')[0] || undefined,
                    website: normalizeUrl(audit.website),
                    industry: audit.overview.industry || undefined,
                    status: 'New',
                    notes: `Enriched via AI audit on ${new Date(audit.auditedAt).toLocaleDateString()}\n\nIndustry: ${audit.overview.industry}\nDescription: ${audit.overview.description}`,
                    enrichmentData: {
                        overview: audit.overview,
                        digitalPresence: audit.digitalPresence,
                        aiReadiness: audit.aiReadiness,
                        reviews: audit.reviews,
                        painPoints: audit.painPoints,
                        opportunities: audit.opportunities,
                        talkingPoints: audit.talkingPoints,
                        relevantResources: audit.relevantResources,
                        auditedAt: audit.auditedAt,
                    },
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.code === 'LIMIT_EXCEEDED') {
                    toast.error(`${data.error}`, {
                        description: data.upgradeMessage,
                    });
                } else if (response.status === 400 && data.error?.includes('company')) {
                    toast.error('Please complete onboarding first', {
                        description: 'Go to Settings to set up your company before adding leads.',
                        action: {
                            label: 'Settings',
                            onClick: () => (window.location.href = '/settings'),
                        },
                    });
                } else {
                    // Log validation issues for debugging
                    if (data.issues) {
                        console.error('Validation issues:', data.issues);
                    }
                    const errorMessage = data.issues
                        ? `Validation failed: ${data.issues.map((i: { path: string; message: string }) => `${i.path}: ${i.message}`).join(', ')}`
                        : data.error || 'Failed to save lead';
                    toast.error(errorMessage);
                }
                return;
            }

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

    const handleDiscoveredLeadAction = async (
        lead: DiscoveredLead,
        action: 'pipeline' | 'watchlist' | 'dismiss'
    ) => {
        if (!userToken) return;

        try {
            let status: string;
            let pipelineLeadId: string | undefined;

            if (action === 'pipeline') {
                // Normalize website URL - ensure it has a protocol or skip it
                const normalizeUrl = (url: string | undefined): string | undefined => {
                    if (!url) return undefined;
                    if (url.startsWith('http://') || url.startsWith('https://')) return url;
                    return undefined;
                };

                // First create the pipeline lead via API
                const response = await fetch('/api/leads', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${userToken}`,
                    },
                    body: JSON.stringify({
                        businessName: lead.businessName,
                        contactName: lead.contacts[0]?.name || undefined,
                        email: lead.contacts[0]?.email || undefined,
                        phone: lead.contacts[0]?.phone || undefined,
                        website: normalizeUrl(lead.website ?? undefined),
                        industry: lead.industry || undefined,
                        status: 'New',
                        notes: lead.aiAnalysis.summary,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    if (data.code === 'LIMIT_EXCEEDED') {
                        toast.error(`${data.error}`, {
                            description: data.upgradeMessage,
                        });
                    } else if (response.status === 400 && data.error?.includes('company')) {
                        toast.error('Please complete onboarding first', {
                            description:
                                'Go to Settings to set up your company before adding leads.',
                            action: {
                                label: 'Settings',
                                onClick: () => (window.location.href = '/settings'),
                            },
                        });
                    } else {
                        toast.error(data.error || 'Failed to add lead');
                    }
                    return;
                }

                pipelineLeadId = data.leadId;
                status = 'added_to_pipeline';
                toast.success(`${lead.businessName} added to pipeline!`);
            } else if (action === 'watchlist') {
                status = 'reviewed';
                toast.success(`${lead.businessName} added to watchlist`);
            } else {
                status = 'dismissed';
                toast.info(`${lead.businessName} dismissed`);
            }

            await fetch('/api/discovery/leads', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({
                    leadId: lead.id,
                    status,
                    pipelineLeadId,
                }),
            });

            // Refresh the lists
            if (activeTab === 'ai-discovered') {
                loadDiscoveredLeads();
            } else {
                loadWatchlistLeads();
            }
        } catch (error) {
            console.error('Failed to update lead:', error);
            toast.error('Failed to update lead');
        }
    };

    const tabs = [
        { id: 'manual' as TabType, label: 'Manual Search', icon: Search },
        {
            id: 'ai-discovered' as TabType,
            label: 'AI Discovered',
            icon: Bot,
            badge: discoveredTotal > 0 ? discoveredTotal : undefined,
        },
        { id: 'watchlist' as TabType, label: 'Watchlist', icon: Bookmark },
    ];

    return (
        <div className="min-h-screen p-8">
            {/* Header */}
            <header className="max-w-5xl mx-auto text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/30 rounded-full text-violet-300 text-sm mb-6">
                    <Sparkles className="w-4 h-4" />
                    AI-Powered Business Intelligence
                </div>

                <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-fuchsia-200 mb-4">
                    Discover & Research
                </h1>

                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                    Find new leads with manual search, automated AI discovery, or track businesses
                    on your watchlist.
                </p>
            </header>

            {/* Tabs */}
            <div className="max-w-5xl mx-auto mb-8">
                <div className="flex gap-2 p-1.5 bg-slate-800/50 rounded-xl border border-slate-700/50 w-fit mx-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                                    isActive
                                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                                {tab.badge && (
                                    <span
                                        className={`px-2 py-0.5 text-xs rounded-full ${
                                            isActive
                                                ? 'bg-white/20'
                                                : 'bg-violet-500/30 text-violet-300'
                                        }`}
                                    >
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                {activeTab === 'manual' && (
                    <motion.div
                        key="manual"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <ManualSearchTab
                            resources={resources}
                            isLoadingResources={isLoadingResources}
                            auditResult={auditResult}
                            isAuditing={isAuditing}
                            isSaving={isSaving}
                            userToken={userToken}
                            user={user}
                            authLoading={authLoading}
                            onAuditStart={handleAuditStart}
                            onAuditComplete={handleAuditComplete}
                            onSaveToPipeline={handleSaveToPipeline}
                        />
                    </motion.div>
                )}

                {activeTab === 'ai-discovered' && (
                    <motion.div
                        key="ai-discovered"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <AIDiscoveredTab
                            leads={discoveredLeads}
                            isLoading={isLoadingDiscovered}
                            total={discoveredTotal}
                            onRefresh={loadDiscoveredLeads}
                            onAction={handleDiscoveredLeadAction}
                            user={user}
                        />
                    </motion.div>
                )}

                {activeTab === 'watchlist' && (
                    <motion.div
                        key="watchlist"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <WatchlistTab
                            leads={watchlistLeads}
                            isLoading={isLoadingWatchlist}
                            onRefresh={loadWatchlistLeads}
                            onAction={handleDiscoveredLeadAction}
                            user={user}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// Manual Search Tab
// ============================================
interface ManualSearchTabProps {
    resources: Resource[];
    isLoadingResources: boolean;
    auditResult: BusinessAuditResult | null;
    isAuditing: boolean;
    isSaving: boolean;
    userToken: string | null;
    user: User | null;
    authLoading: boolean;
    onAuditStart: () => void;
    onAuditComplete: (result: BusinessAuditResult) => void;
    onSaveToPipeline: (audit: BusinessAuditResult) => Promise<void>;
}

function ManualSearchTab({
    resources,
    isLoadingResources,
    auditResult,
    isAuditing,
    isSaving,
    userToken,
    user,
    authLoading,
    onAuditStart,
    onAuditComplete,
    onSaveToPipeline,
}: ManualSearchTabProps) {
    return (
        <>
            {/* Search Section */}
            <section className="max-w-4xl mx-auto mb-12">
                <BusinessSearch
                    onAuditStart={onAuditStart}
                    onAuditComplete={onAuditComplete}
                    resources={resources}
                    userToken={userToken}
                />

                {isLoadingResources && (
                    <div className="mt-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Loading your enablement materials...
                    </div>
                )}

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
                            onSaveToPipeline={onSaveToPipeline}
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
        </>
    );
}

// ============================================
// AI Discovered Tab
// ============================================
interface AIDiscoveredTabProps {
    leads: DiscoveredLead[];
    isLoading: boolean;
    total: number;
    onRefresh: () => void;
    onAction: (lead: DiscoveredLead, action: 'pipeline' | 'watchlist' | 'dismiss') => void;
    user: User | null;
}

function AIDiscoveredTab({
    leads,
    isLoading,
    total,
    onRefresh,
    onAction,
    user,
}: AIDiscoveredTabProps) {
    if (!user) {
        return (
            <div className="max-w-md mx-auto p-8 glass-card text-center">
                <Bot className="w-12 h-12 text-violet-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Sign In Required</h3>
                <p className="text-slate-400 mb-4">
                    Sign in to see AI-discovered leads based on your targeting criteria.
                </p>
                <button onClick={() => (window.location.href = '/login')} className="glass-button">
                    Sign In
                </button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="glass-card p-12 text-center">
                    <Loader2 className="w-12 h-12 text-violet-400 mx-auto mb-4 animate-spin" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                        Loading Discovered Leads
                    </h3>
                    <p className="text-slate-400">Fetching AI-discovered businesses...</p>
                </div>
            </div>
        );
    }

    if (leads.length === 0) {
        return (
            <div className="max-w-lg mx-auto p-8 glass-card text-center">
                <Bot className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Leads Discovered Yet</h3>
                <p className="text-slate-400 mb-6">
                    Configure your targeting criteria and run a sweep to discover new leads
                    automatically.
                </p>
                <a
                    href="/settings/discovery"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                    <Target className="w-4 h-4" />
                    Configure Discovery
                </a>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-white">
                        {total} new lead{total !== 1 ? 's' : ''} discovered
                    </h2>
                    <p className="text-sm text-slate-400">
                        Review and add to your pipeline or watchlist
                    </p>
                </div>
                <button
                    onClick={onRefresh}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Leads Grid */}
            <div className="space-y-4">
                {leads.map((lead) => (
                    <DiscoveredLeadCard key={lead.id} lead={lead} onAction={onAction} />
                ))}
            </div>
        </div>
    );
}

// ============================================
// Watchlist Tab
// ============================================
interface WatchlistTabProps {
    leads: DiscoveredLead[];
    isLoading: boolean;
    onRefresh: () => void;
    onAction: (lead: DiscoveredLead, action: 'pipeline' | 'watchlist' | 'dismiss') => void;
    user: User | null;
}

function WatchlistTab({ leads, isLoading, onRefresh, onAction, user }: WatchlistTabProps) {
    if (!user) {
        return (
            <div className="max-w-md mx-auto p-8 glass-card text-center">
                <Bookmark className="w-12 h-12 text-violet-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Sign In Required</h3>
                <p className="text-slate-400 mb-4">
                    Sign in to view your watchlist of saved businesses.
                </p>
                <button onClick={() => (window.location.href = '/login')} className="glass-button">
                    Sign In
                </button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="glass-card p-12 text-center">
                    <Loader2 className="w-12 h-12 text-violet-400 mx-auto mb-4 animate-spin" />
                    <h3 className="text-xl font-semibold text-white mb-2">Loading Watchlist</h3>
                    <p className="text-slate-400">Fetching your saved businesses...</p>
                </div>
            </div>
        );
    }

    if (leads.length === 0) {
        return (
            <div className="max-w-lg mx-auto p-8 glass-card text-center">
                <Bookmark className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Watchlist Empty</h3>
                <p className="text-slate-400">
                    Save businesses from AI Discovered or Manual Search to track them here before
                    adding to your pipeline.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-white">
                        {leads.length} business{leads.length !== 1 ? 'es' : ''} on watchlist
                    </h2>
                    <p className="text-sm text-slate-400">
                        Businesses you&apos;re tracking before committing to pipeline
                    </p>
                </div>
                <button
                    onClick={onRefresh}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Leads Grid */}
            <div className="space-y-4">
                {leads.map((lead) => (
                    <DiscoveredLeadCard key={lead.id} lead={lead} onAction={onAction} isWatchlist />
                ))}
            </div>
        </div>
    );
}

// ============================================
// Discovered Lead Card
// ============================================
interface DiscoveredLeadCardProps {
    lead: DiscoveredLead;
    onAction: (lead: DiscoveredLead, action: 'pipeline' | 'watchlist' | 'dismiss') => void;
    isWatchlist?: boolean;
}

function DiscoveredLeadCard({ lead, onAction, isWatchlist }: DiscoveredLeadCardProps) {
    const matchColor =
        lead.aiAnalysis.matchScore >= 80
            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
            : lead.aiAnalysis.matchScore >= 60
              ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
              : 'text-slate-400 bg-slate-500/10 border-slate-500/30';

    return (
        <div className="glass-card p-6 hover:bg-slate-800/60 transition-colors">
            <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 w-12 h-12 bg-slate-700/50 rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-violet-400" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-semibold text-white truncate">
                                {lead.businessName}
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                                <span>{lead.industry}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {lead.location.city}, {lead.location.state}
                                </span>
                            </div>
                        </div>

                        {/* Match Score */}
                        <div
                            className={`px-3 py-1.5 rounded-full border ${matchColor} text-sm font-medium`}
                        >
                            {lead.aiAnalysis.matchScore}% match
                        </div>
                    </div>

                    {/* AI Summary */}
                    <p className="text-slate-300 mt-3 line-clamp-2">{lead.aiAnalysis.summary}</p>

                    {/* Match Reasons */}
                    {lead.aiAnalysis.matchReasons.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {lead.aiAnalysis.matchReasons.slice(0, 3).map((reason, i) => (
                                <span
                                    key={i}
                                    className="px-2 py-1 text-xs bg-violet-500/10 text-violet-300 rounded-full"
                                >
                                    {reason}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Contact & Actions */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/50">
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                            {lead.contacts[0] && <span>{lead.contacts[0].name}</span>}
                            {lead.website && (
                                <a
                                    href={lead.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 hover:text-violet-400 transition-colors"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    Website
                                </a>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onAction(lead, 'pipeline')}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Add to Pipeline
                            </button>
                            {!isWatchlist && (
                                <button
                                    onClick={() => onAction(lead, 'watchlist')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                >
                                    <Bookmark className="w-4 h-4" />
                                    Watchlist
                                </button>
                            )}
                            <button
                                onClick={() => onAction(lead, 'dismiss')}
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Dismiss"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================
// Feature Card
// ============================================
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
