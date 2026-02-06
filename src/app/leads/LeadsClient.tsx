'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Lead, Activity, LeadStatus } from '@/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { AddLeadModal } from '@/components/leads/AddLeadModal';
import { LogCallModal } from '@/components/leads/LogCallModal';
import { LogMeetingModal } from '@/components/leads/LogMeetingModal';
import { LogReplyModal } from '@/components/leads/LogReplyModal';
import { SMSModal } from '@/components/leads/SMSModal';
import { KanbanView } from '@/components/leads/KanbanView';
import { AILeadInsights } from '@/components/leads/AILeadInsights';
import { QuickEditModal } from '@/components/leads/QuickEditModal';
import { ImportCSVModal } from '@/components/leads/ImportCSVModal';
import { AIEmailDraft } from '@/components/ai/AIEmailDraft';
import { LeadDetailDrawer } from '@/components/leads/LeadDetailDrawer';
import { LeadsService, ActivitiesService } from '@/lib/firebase/services';
import { EnhancedActivitiesService } from '@/lib/firebase/enhancedActivities';
import { formatCurrency } from '@/lib/utils/formatters';
import { toast } from 'sonner';
import { analytics } from '@/lib/analytics';
import {
    Gauge,
    Sparkles,
    TrendingUp as VelocityUp,
    Minus,
    TrendingDown as VelocityDown,
    Activity as PulseIcon,
    Download,
    CheckSquare,
    Square,
    Trash2,
    Pencil,
    Mail as MailIcon,
    Search,
    Filter,
    ArrowUpDown,
    LayoutGrid,
    Columns,
    X,
    Upload,
    RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateLeadVelocity } from '@/lib/utils/scoring';
import { analyzeLeadIntelligence } from '@/lib/firebase/ai-service';
import { getLeadEmails, EmailRecord, isGmailConnected } from '@/lib/gmail/gmail-service';

// Fallback mock data when not logged in
const MOCK_LEADS: Lead[] = [
    {
        id: '1',
        companyName: 'Tech Corp Global',
        contactName: 'John Doe',
        email: 'john@techcorp.com',
        phone: '555-0123',
        value: 5000,
        status: 'New',
        assignedTo: 'demo',
        industry: 'SaaS',
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        id: '2',
        companyName: 'AI Solutions Inc',
        contactName: 'Jane Smith',
        email: 'jane@aisolutions.io',
        phone: '555-9876',
        value: 12000,
        status: 'Qualified',
        assignedTo: 'demo',
        industry: 'Generative AI',
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now(),
    },
    {
        id: '3',
        companyName: 'Enterprise Logistics',
        contactName: 'Bob Wilson',
        email: 'bob@logisticsco.com',
        phone: '555-4567',
        value: 35000,
        status: 'Negotiation',
        assignedTo: 'demo',
        industry: 'Logistics',
        createdAt: Date.now() - 172800000,
        updatedAt: Date.now(),
    },
];

export default function LeadsClient() {
    const { user, profile, loading: authLoading } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [activities, setActivities] = useState<Record<string, Activity[]>>({});
    const [leadIntel, setLeadIntel] = useState<
        Record<string, { score: number; signal: string; justification: string }>
    >({});
    const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
    const [gmailHistory, setGmailHistory] = useState<Record<string, EmailRecord[]>>({});
    const [gmailConnected, setGmailConnected] = useState(false);

    // Search, Filter, Sort state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
    const [industryFilter, setIndustryFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<
        'value-desc' | 'value-asc' | 'newest' | 'oldest' | 'velocity'
    >('newest');
    const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');
    const [_showFilters, _setShowFilters] = useState(false);

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isEmailDraftOpen, setIsEmailDraftOpen] = useState(false);
    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
    const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
    const [isSMSModalOpen, setIsSMSModalOpen] = useState(false);
    const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
    const [reauditingLeads, setReauditingLeads] = useState<Set<string>>(new Set());
    const [detailDrawerLead, setDetailDrawerLead] = useState<Lead | null>(null);

    useEffect(() => {
        if (user) {
            isGmailConnected(user.uid).then(setGmailConnected);
        }
    }, [user]);

    const loadLeads = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // Pass companyId for multi-tenant filtering
            const data = await LeadsService.getLeads(user.uid, profile?.companyId);
            // Don't fall back to mock data - show empty state instead
            setLeads(data);
        } catch (error) {
            console.error('Error loading leads:', error);
            toast.error('Failed to load leads');
            setLeads([]);
        } finally {
            setIsLoading(false);
        }
    }, [user, profile?.companyId]);

    const loadLeadActivities = useCallback(
        async (leadId: string) => {
            if (!user) return;
            try {
                const data = await ActivitiesService.getLeadActivities(user.uid, leadId);
                setActivities((prev) => ({ ...prev, [leadId]: data }));
            } catch (error) {
                console.error('Error loading activities:', error);
            }
        },
        [user]
    );

    // Load leads
    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            setLeads(MOCK_LEADS);
            setIsLoading(false);
            return;
        }

        loadLeads();
    }, [user, authLoading, loadLeads]);

    // Get unique industries for filter dropdown
    const uniqueIndustries = useMemo(() => {
        const industries = leads.map((l) => l.industry).filter(Boolean) as string[];
        return [...new Set(industries)];
    }, [leads]);

    // Filter, search, and sort leads
    const filteredLeads = useMemo(() => {
        let result = [...leads];

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (lead) =>
                    (lead.companyName?.toLowerCase() || '').includes(query) ||
                    (lead.contactName?.toLowerCase() || '').includes(query) ||
                    (lead.email?.toLowerCase() || '').includes(query)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            result = result.filter((lead) => lead.status === statusFilter);
        }

        // Industry filter
        if (industryFilter !== 'all') {
            result = result.filter((lead) => lead.industry === industryFilter);
        }

        // Sort
        switch (sortBy) {
            case 'value-desc':
                result.sort((a, b) => b.value - a.value);
                break;
            case 'value-asc':
                result.sort((a, b) => a.value - b.value);
                break;
            case 'newest':
                result.sort((a, b) => b.createdAt - a.createdAt);
                break;
            case 'oldest':
                result.sort((a, b) => a.createdAt - b.createdAt);
                break;
            case 'velocity':
                result.sort((a, b) => {
                    const velA = calculateLeadVelocity(a, activities[a.id]);
                    const velB = calculateLeadVelocity(b, activities[b.id]);
                    return velB.score - velA.score;
                });
                break;
        }

        return result;
    }, [leads, searchQuery, statusFilter, industryFilter, sortBy, activities]);

    const handleAddLead = async (
        leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'assignedTo'>
    ) => {
        if (!user) {
            const newLead: Lead = {
                ...leadData,
                id: `lead_${Date.now()}`,
                assignedTo: 'demo',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            setLeads([newLead, ...leads]);
            toast.success('Lead added (demo mode)');
            analytics.track('lead_added', { mode: 'demo', industry: leadData.industry });
            return;
        }

        try {
            const leadId = await LeadsService.createLead(user.uid, leadData, profile?.companyId);

            // Record lead creation in analytics metrics
            if (profile?.companyId) {
                await EnhancedActivitiesService.recordLeadCreated(
                    profile.companyId,
                    user.uid,
                    leadData.value || 0
                );

                // Fire-and-forget Discord notification
                fetch('/api/notifications/discord', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'newLead',
                        companyId: profile.companyId,
                        lead: {
                            id: leadId,
                            companyName: leadData.companyName,
                            contactName: leadData.contactName,
                            email: leadData.email,
                            value: leadData.value,
                            industry: leadData.industry,
                            status: leadData.status || 'New',
                        },
                    }),
                }).catch((err) => console.error('Discord notification failed:', err));
            }

            toast.success('Lead created successfully!');
            analytics.track('lead_added', { mode: 'prod', industry: leadData.industry });
            loadLeads();
        } catch (error) {
            console.error('Error creating lead:', error);
            toast.error('Failed to create lead');
        }
    };

    const handleExpandLead = (leadId: string) => {
        // Only expand if NOT in selection mode or clicking the same expanded lead
        if (selectedLeadIds.size > 0 && !selectedLeadIds.has(leadId)) return;

        if (expandedLeadId === leadId) {
            setExpandedLeadId(null);
        } else {
            setExpandedLeadId(leadId);
            if (leadId && !activities[leadId]) {
                loadLeadActivities(leadId);
            }

            if (leadId && gmailConnected && !gmailHistory[leadId]) {
                loadGmailHistory(leadId);
            }
        }
    };

    const loadGmailHistory = async (leadId: string) => {
        if (!user) return;
        try {
            const emails = await getLeadEmails(user.uid, leadId);
            setGmailHistory((prev) => ({ ...prev, [leadId]: emails }));
        } catch (error) {
            console.error('Gmail history load failed', error);
        }
    };

    const handleActivitySuccess = () => {
        loadLeads();
        if (selectedLead) {
            loadLeadActivities(selectedLead.id);
            // Re-run AI intel on activity update
            handleIntelRequest(selectedLead);
        }
    };

    const handleIntelRequest = async (lead: Lead) => {
        if (!user) return;
        try {
            const leadActivities =
                activities[lead.id] ||
                (await ActivitiesService.getLeadActivities(user.uid, lead.id));
            const intel = await analyzeLeadIntelligence(lead, leadActivities);
            setLeadIntel((prev) => ({ ...prev, [lead.id]: intel }));
        } catch (error) {
            console.error('Intelligence analysis failed', error);
        }
    };

    const handleExportCSV = () => {
        if (leads.length === 0) {
            toast.error('No leads to export');
            return;
        }

        const headers = [
            'Company',
            'Contact',
            'Email',
            'Phone',
            'Value',
            'Status',
            'Industry',
            'Created At',
        ];
        const csvContent = [
            headers.join(','),
            ...leads.map((lead) =>
                [
                    `"${lead.companyName}"`,
                    `"${lead.contactName}"`,
                    `"${lead.email}"`,
                    `"${lead.phone || ''}"`,
                    lead.value,
                    `"${lead.status}"`,
                    `"${lead.industry || ''}"`,
                    new Date(lead.createdAt).toLocaleDateString(),
                ].join(',')
            ),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Leads exported successfully');
        analytics.track('leads_exported', { count: leads.length });
    };

    const toggleSelectLead = (leadId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSelected = new Set(selectedLeadIds);
        if (newSelected.has(leadId)) {
            newSelected.delete(leadId);
        } else {
            newSelected.add(leadId);
        }
        setSelectedLeadIds(newSelected);
    };

    const handleBulkDelete = async () => {
        if (!user) {
            setLeads(leads.filter((l) => !selectedLeadIds.has(l.id)));
            setSelectedLeadIds(new Set());
            toast.success('Leads removed (demo mode)');
            return;
        }

        const confirm = window.confirm(
            `Are you sure you want to delete ${selectedLeadIds.size} leads?`
        );
        if (!confirm) return;

        try {
            await Promise.all(
                Array.from(selectedLeadIds).map((id) => LeadsService.deleteLead(user.uid, id))
            );
            toast.success('Leads deleted successfully');
            setSelectedLeadIds(new Set());
            loadLeads();
        } catch (error: unknown) {
            console.error('Bulk delete failed', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (errorMessage.includes('permission') || errorMessage.includes('PERMISSION_DENIED')) {
                toast.error('Permission denied. You can only delete leads you created.');
            } else {
                toast.error('Failed to delete some leads. Check console for details.');
            }
        }
    };

    const handleBulkStatusUpdate = async (newStatus: LeadStatus) => {
        if (!user) {
            setLeads(
                leads.map((l) => (selectedLeadIds.has(l.id) ? { ...l, status: newStatus } : l))
            );
            setSelectedLeadIds(new Set());
            toast.success('Status updated (demo mode)');
            return;
        }

        try {
            await Promise.all(
                Array.from(selectedLeadIds).map((id) =>
                    LeadsService.updateLead(user.uid, id, { status: newStatus })
                )
            );
            toast.success(`Leads moved to ${newStatus}`);
            setSelectedLeadIds(new Set());
            loadLeads();
        } catch (error) {
            console.error('Bulk update failed', error);
        }
    };

    // Bulk enrich selected leads
    const [bulkEnriching, setBulkEnriching] = useState(false);
    const handleBulkEnrich = async () => {
        if (!user) {
            toast.info('Log in to enrich leads');
            return;
        }

        const selectedLeads = leads.filter((l) => selectedLeadIds.has(l.id));
        if (selectedLeads.length === 0) return;

        setBulkEnriching(true);
        toast.info(`Starting enrichment for ${selectedLeads.length} leads...`);

        let enriched = 0;
        let failed = 0;

        for (const lead of selectedLeads) {
            try {
                setReauditingLeads((prev) => new Set(prev).add(lead.id));

                const token = await user.getIdToken();
                const response = await fetch('/api/audit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ query: lead.companyName }),
                });

                if (!response.ok) {
                    throw new Error('Audit failed');
                }

                const data = await response.json();
                const auditResult = data.audit;

                const enrichmentData = {
                    overview: {
                        description: auditResult.overview?.description || '',
                        industry: auditResult.overview?.industry || lead.industry || '',
                        estimatedSize: auditResult.overview?.estimatedSize || '',
                        keyPeople: auditResult.overview?.keyPeople || [],
                        founded: auditResult.overview?.founded,
                        headquarters: auditResult.overview?.headquarters,
                    },
                    digitalPresence: auditResult.digitalPresence,
                    aiReadiness: auditResult.aiReadiness,
                    painPoints: auditResult.painPoints || [],
                    opportunities: auditResult.opportunities || [],
                    talkingPoints: auditResult.talkingPoints || [],
                    competitorAnalysis: auditResult.competitorAnalysis,
                };

                await LeadsService.updateLead(user.uid, lead.id, {
                    enrichmentData,
                    enrichedAt: Date.now(),
                });

                enriched++;
                toast.success(`Enriched ${lead.companyName} (${enriched}/${selectedLeads.length})`);
            } catch (error) {
                console.error(`Failed to enrich ${lead.companyName}:`, error);
                failed++;
            } finally {
                setReauditingLeads((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(lead.id);
                    return newSet;
                });
            }

            // Small delay between requests to avoid rate limiting
            if (selectedLeads.indexOf(lead) < selectedLeads.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }

        setBulkEnriching(false);
        setSelectedLeadIds(new Set());
        loadLeads();
        toast.success(`Bulk enrichment complete: ${enriched} enriched, ${failed} failed`);
    };

    // Re-audit a lead to refresh enrichment data
    const handleReaudit = async (lead: Lead) => {
        if (!user) {
            toast.info('Log in to re-audit leads');
            return;
        }

        setReauditingLeads((prev) => new Set(prev).add(lead.id));
        toast.info(`Re-auditing ${lead.companyName}...`);

        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/audit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ query: lead.companyName }),
            });

            if (!response.ok) {
                throw new Error('Audit failed');
            }

            const data = await response.json();
            const auditResult = data.audit;

            // Update the lead with new enrichment data
            const enrichmentData = {
                overview: {
                    description: auditResult.overview?.description || '',
                    industry: auditResult.overview?.industry || lead.industry || '',
                    estimatedSize: auditResult.overview?.estimatedSize || '',
                    keyPeople: auditResult.overview?.keyPeople || [],
                    founded: auditResult.overview?.founded,
                    headquarters: auditResult.overview?.headquarters,
                },
                digitalPresence: auditResult.digitalPresence,
                aiReadiness: auditResult.aiReadiness,
                painPoints: auditResult.painPoints || [],
                opportunities: auditResult.opportunities || [],
                talkingPoints: auditResult.talkingPoints || [],
                competitorAnalysis: auditResult.competitorAnalysis,
            };

            await LeadsService.updateLead(user.uid, lead.id, {
                enrichmentData,
                enrichedAt: Date.now(),
            });

            toast.success(`${lead.companyName} re-audited successfully!`);
            loadLeads();
        } catch (error) {
            console.error('Re-audit failed:', error);
            toast.error(`Failed to re-audit ${lead.companyName}`);
        } finally {
            setReauditingLeads((prev) => {
                const newSet = new Set(prev);
                newSet.delete(lead.id);
                return newSet;
            });
        }
    };

    // Single lead status change (for Kanban drag-drop)
    const handleLeadStatusChange = async (leadId: string, newStatus: LeadStatus) => {
        if (!user) {
            setLeads(leads.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
            toast.success('Lead moved (demo mode)');
            return;
        }

        try {
            await LeadsService.updateLead(user.uid, leadId, { status: newStatus });
            toast.success(`Lead moved to ${newStatus}`);
            loadLeads();
        } catch (error) {
            console.error('Status update failed', error);
            toast.error('Failed to update lead status');
        }
    };

    // Quick edit handler
    const handleQuickEditSave = async (leadId: string, updates: Partial<Lead>) => {
        if (!user) {
            setLeads(leads.map((l) => (l.id === leadId ? { ...l, ...updates } : l)));
            toast.success('Lead updated (demo mode)');
            return;
        }

        await LeadsService.updateLead(user.uid, leadId, updates);
        toast.success('Lead updated');
        loadLeads();
    };

    // CSV import handler
    const handleCSVImport = async (
        newLeads: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'assignedTo'>[]
    ) => {
        if (!user) {
            toast.error('Please log in to import leads');
            return;
        }

        let imported = 0;
        for (const lead of newLeads) {
            try {
                await LeadsService.createLead(user.uid, lead, profile?.companyId);

                // Record lead creation in analytics metrics
                if (profile?.companyId) {
                    await EnhancedActivitiesService.recordLeadCreated(
                        profile.companyId,
                        user.uid,
                        lead.value || 0
                    );
                }

                imported++;
            } catch (error) {
                console.error('Failed to import lead:', lead.companyName, error);
            }
        }
        toast.success(`Imported ${imported} of ${newLeads.length} leads`);
        loadLeads();
    };

    if (isLoading) {
        return (
            <div className="p-8 min-h-screen flex items-center justify-center">
                <div className="text-slate-500">Loading leads...</div>
            </div>
        );
    }

    return (
        <div className="p-8 min-h-screen">
            {/* Header */}
            <header className="mb-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                            Leads Pipeline
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            {user
                                ? `${filteredLeads.length} of ${leads.length} leads`
                                : 'Demo Mode - Log in to save data'}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                        <button
                            onClick={handleExportCSV}
                            className="glass-button flex items-center gap-2 border-slate-700 text-slate-400 hover:text-white text-sm px-3 py-2"
                            title="Export leads to CSV"
                        >
                            <Download size={16} /> <span className="hidden xs:inline">Export</span>
                        </button>
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="glass-button flex items-center gap-2 border-slate-700 text-slate-400 hover:text-white text-sm px-3 py-2"
                            title="Import leads from CSV"
                        >
                            <Upload size={16} /> <span className="hidden xs:inline">Import</span>
                        </button>
                        <button onClick={() => setIsAddModalOpen(true)} className="glass-button text-sm px-3 py-2">
                            + <span className="hidden xs:inline">Add New</span> Lead
                        </button>
                    </div>
                </div>

                {/* Search, Filter, Sort Bar */}
                <div className="flex flex-wrap gap-3 items-center">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                            size={16}
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search company, contact, email..."
                            className="w-full pl-10 pr-8 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as LeadStatus | 'all')}
                        className="px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                        <option value="all">All Status</option>
                        <option value="New">New</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Proposal">Proposal</option>
                        <option value="Negotiation">Negotiation</option>
                        <option value="Closed">Closed</option>
                        <option value="Lost">Lost</option>
                    </select>

                    {/* Industry Filter */}
                    {uniqueIndustries.length > 0 && (
                        <select
                            value={industryFilter}
                            onChange={(e) => setIndustryFilter(e.target.value)}
                            className="px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                            <option value="all">All Industries</option>
                            {uniqueIndustries.map((ind) => (
                                <option key={ind} value={ind}>
                                    {ind}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={(e) =>
                            setSortBy(
                                e.target.value as
                                    | 'value-desc'
                                    | 'value-asc'
                                    | 'newest'
                                    | 'oldest'
                                    | 'velocity'
                            )
                        }
                        className="px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="value-desc">Value (High→Low)</option>
                        <option value="value-asc">Value (Low→High)</option>
                        <option value="velocity">Velocity</option>
                    </select>

                    {/* View Toggle */}
                    <div className="flex border border-white/10 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 ${
                                viewMode === 'grid'
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-slate-800/50 text-slate-400 hover:text-white'
                            } transition-colors`}
                            title="Grid View"
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`p-2 ${
                                viewMode === 'kanban'
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-slate-800/50 text-slate-400 hover:text-white'
                            } transition-colors`}
                            title="Kanban View"
                        >
                            <Columns size={16} />
                        </button>
                    </div>

                    {/* Clear Filters */}
                    {(searchQuery || statusFilter !== 'all' || industryFilter !== 'all') && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setStatusFilter('all');
                                setIndustryFilter('all');
                            }}
                            className="px-3 py-2 text-xs text-slate-400 hover:text-white border border-slate-700 rounded-lg hover:bg-white/5 transition-colors"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </header>

            {/* Kanban View */}
            {viewMode === 'kanban' ? (
                <KanbanView
                    leads={filteredLeads}
                    activities={activities}
                    onLeadClick={handleExpandLead}
                    onStatusChange={handleLeadStatusChange}
                    selectedLeadIds={selectedLeadIds}
                />
            ) : (
                /* Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLeads.map((lead) => (
                        <GlassCard
                            key={lead.id}
                            onClick={() => expandedLeadId !== lead.id && handleExpandLead(lead.id)}
                            className={`cursor-pointer group relative overflow-hidden transition-all border-l-4 ${
                                selectedLeadIds.has(lead.id)
                                    ? 'border-l-blue-500 bg-blue-500/5'
                                    : 'border-l-transparent'
                            } ${expandedLeadId === lead.id ? 'md:col-span-2 lg:col-span-2' : ''}`}
                        >
                            {/* Multi-select checkbox */}
                            <div
                                onClick={(e) => toggleSelectLead(lead.id, e)}
                                className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                {selectedLeadIds.has(lead.id) ? (
                                    <CheckSquare size={16} className="text-blue-400" />
                                ) : (
                                    <Square
                                        size={16}
                                        className="text-slate-600 hover:text-blue-400"
                                    />
                                )}
                            </div>

                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                            {/* Velocity Gauge Overlay */}
                            {(() => {
                                const velocity = calculateLeadVelocity(lead, activities[lead.id]);
                                return (
                                    <div className="absolute top-0 right-0 p-2 opacity-30 group-hover:opacity-100 transition-all">
                                        <div
                                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold border flex items-center gap-1 ${
                                                velocity.status === 'hot'
                                                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                                    : velocity.status === 'warm'
                                                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                                      : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                                            }`}
                                        >
                                            <Gauge size={10} />
                                            Velocity: {velocity.score}%
                                            {velocity.momentum === 'rising' ? (
                                                <VelocityUp size={10} />
                                            ) : velocity.momentum === 'dropping' ? (
                                                <VelocityDown size={10} />
                                            ) : (
                                                <Minus size={10} />
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="relative z-10">
                                {/* Lead Header */}
                                <div
                                    className="flex justify-between items-start mb-3"
                                    onClick={() => handleExpandLead(lead.id)}
                                >
                                    <h3
                                        className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors cursor-pointer hover:underline"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDetailDrawerLead(lead);
                                            if (!activities[lead.id]) {
                                                loadLeadActivities(lead.id);
                                            }
                                        }}
                                    >
                                        {lead.companyName}
                                    </h3>
                                    <Badge
                                        variant={
                                            lead.status === 'New'
                                                ? 'info'
                                                : lead.status === 'Qualified'
                                                  ? 'success'
                                                  : lead.status === 'Closed'
                                                    ? 'success'
                                                    : 'warning'
                                        }
                                    >
                                        {lead.status}
                                    </Badge>
                                </div>

                                {/* Lead Info */}
                                <div className="mb-4">
                                    <p className="text-slate-300 text-sm font-medium">
                                        {lead.contactName}
                                    </p>
                                    <p className="text-slate-500 text-xs">{lead.email}</p>
                                    {lead.industry && (
                                        <span className="inline-block mt-2 text-[10px] uppercase tracking-wider text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded">
                                            {lead.industry}
                                        </span>
                                    )}
                                    {lead.nextStep && (
                                        <p className="text-xs text-amber-400 mt-2 font-medium flex items-center gap-1">
                                            <PulseIcon size={12} /> {lead.nextStep}
                                        </p>
                                    )}

                                    {/* AI Insights - Always visible */}
                                    <AILeadInsights
                                        lead={lead}
                                        activities={activities[lead.id] || []}
                                        compact
                                    />
                                </div>

                                {/* Value & Date */}
                                <div className="flex justify-between items-center border-t border-slate-700/50 pt-3 mt-2">
                                    <span className="text-xl font-bold text-emerald-400">
                                        {formatCurrency(lead.value)}
                                    </span>
                                    <span className="text-xs text-slate-600">
                                        {lead.lastContact
                                            ? `Last: ${new Date(lead.lastContact).toLocaleDateString()}`
                                            : new Date(lead.updatedAt).toLocaleDateString()}
                                    </span>
                                </div>

                                {/* Action Buttons */}
                                <div className="mt-3 flex gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedLead(lead);
                                            setIsEmailDraftOpen(true);
                                        }}
                                        className="flex-1 py-2 text-xs bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 hover:from-violet-600/40 hover:to-fuchsia-600/40 border border-violet-500/30 rounded-lg text-violet-300 transition-all flex items-center justify-center gap-1"
                                    >
                                        ✨ Email
                                    </button>
                                    {lead.phone && (
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (!user) {
                                                    toast.info('Log in to make calls');
                                                    return;
                                                }
                                                // Initiate Twilio click-to-call
                                                toast.loading('Connecting call...', { id: 'call-' + lead.id });
                                                try {
                                                    const token = await user.getIdToken();
                                                    const res = await fetch('/api/twilio/call', {
                                                        method: 'POST',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            Authorization: `Bearer ${token}`,
                                                        },
                                                        body: JSON.stringify({
                                                            userId: user.uid,
                                                            leadId: lead.id,
                                                            to: lead.phone,
                                                        }),
                                                    });
                                                    const data = await res.json();
                                                    if (res.ok) {
                                                        toast.success(`Calling ${lead.contactName}...`, { id: 'call-' + lead.id });
                                                    } else {
                                                        toast.error(data.error || 'Failed to initiate call', { id: 'call-' + lead.id });
                                                    }
                                                } catch {
                                                    toast.error('Failed to connect call', { id: 'call-' + lead.id });
                                                }
                                            }}
                                            className="px-3 py-2 text-xs bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 transition-all"
                                            title={`Call ${lead.phone}`}
                                        >
                                            📞
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!user) {
                                                toast.info('Log in to log calls');
                                                return;
                                            }
                                            setSelectedLead(lead);
                                            setIsCallModalOpen(true);
                                        }}
                                        className="px-3 py-2 text-xs bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/30 rounded-lg text-slate-400 transition-all"
                                        title="Log Call"
                                    >
                                        📝
                                    </button>
                                    {lead.phone && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (!user) {
                                                    toast.info('Log in to send SMS');
                                                    return;
                                                }
                                                setSelectedLead(lead);
                                                setIsSMSModalOpen(true);
                                            }}
                                            className="px-3 py-2 text-xs bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-lg text-teal-400 transition-all"
                                            title="Send SMS"
                                        >
                                            💬
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!user) {
                                                toast.info('Log in to track meetings');
                                                return;
                                            }
                                            setSelectedLead(lead);
                                            setIsMeetingModalOpen(true);
                                        }}
                                        className="px-3 py-2 text-xs bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 transition-all"
                                        title="Log Meeting"
                                    >
                                        📅
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!user) {
                                                toast.info('Log in to track replies');
                                                return;
                                            }
                                            setSelectedLead(lead);
                                            setIsReplyModalOpen(true);
                                        }}
                                        className="px-3 py-2 text-xs bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-400 transition-all"
                                        title="Log Reply Received"
                                    >
                                        📩
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleReaudit(lead);
                                        }}
                                        disabled={reauditingLeads.has(lead.id)}
                                        className={`px-3 py-2 text-xs border rounded-lg transition-all flex items-center gap-1 ${
                                            reauditingLeads.has(lead.id)
                                                ? 'bg-purple-500/30 border-purple-500/50 text-purple-300 cursor-wait'
                                                : 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-purple-400'
                                        }`}
                                        title={
                                            lead.enrichedAt
                                                ? `Last audited ${new Date(lead.enrichedAt).toLocaleDateString()}`
                                                : 'Run Deep Audit'
                                        }
                                    >
                                        <RefreshCw
                                            size={12}
                                            className={
                                                reauditingLeads.has(lead.id) ? 'animate-spin' : ''
                                            }
                                        />
                                        {reauditingLeads.has(lead.id) ? '' : '🔍'}
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!user) {
                                                toast.info('Log in to edit leads');
                                                return;
                                            }
                                            setSelectedLead(lead);
                                            setIsQuickEditOpen(true);
                                        }}
                                        className="px-3 py-2 text-xs bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/30 rounded-lg text-slate-400 transition-all"
                                        title="Edit Lead"
                                    >
                                        <Pencil size={12} />
                                    </button>
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            if (!user) {
                                                toast.info('Log in to delete leads');
                                                return;
                                            }
                                            const confirm = window.confirm(
                                                `Delete ${lead.companyName}? This cannot be undone.`
                                            );
                                            if (!confirm) return;
                                            try {
                                                await LeadsService.deleteLead(user.uid, lead.id);
                                                toast.success('Lead deleted');
                                                loadLeads();
                                            } catch (error) {
                                                console.error('Delete failed', error);
                                                toast.error('Failed to delete lead');
                                            }
                                        }}
                                        className="px-3 py-2 text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 transition-all"
                                        title="Delete Lead"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>

                                {/* Expanded Activity Timeline */}
                                {expandedLeadId === lead.id && (
                                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                                        {/* Enrichment Data Section */}
                                        {lead.enrichmentData && (
                                            <div className="mb-6">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Sparkles
                                                        size={14}
                                                        className="text-purple-400"
                                                    />
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                        AI Business Intelligence
                                                    </h4>
                                                    {lead.enrichedAt && (
                                                        <span className="text-[9px] text-slate-600 ml-auto">
                                                            Enriched{' '}
                                                            {new Date(
                                                                lead.enrichedAt
                                                            ).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Scores */}
                                                <div className="flex gap-4 mb-4">
                                                    {lead.enrichmentData.digitalPresence && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                                                <span className="text-xs font-bold text-blue-400">
                                                                    {
                                                                        lead.enrichmentData
                                                                            .digitalPresence.score
                                                                    }
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-slate-500">
                                                                Digital
                                                            </span>
                                                        </div>
                                                    )}
                                                    {lead.enrichmentData.aiReadiness && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                                                <span className="text-xs font-bold text-purple-400">
                                                                    {
                                                                        lead.enrichmentData
                                                                            .aiReadiness.score
                                                                    }
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-slate-500">
                                                                AI Ready
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Pain Points */}
                                                {lead.enrichmentData.painPoints &&
                                                    lead.enrichmentData.painPoints.length > 0 && (
                                                        <div className="mb-3">
                                                            <h5 className="text-[10px] font-semibold text-amber-400 mb-2">
                                                                Pain Points
                                                            </h5>
                                                            <ul className="space-y-1">
                                                                {lead.enrichmentData.painPoints
                                                                    .slice(0, 2)
                                                                    .map((point, i) => (
                                                                        <li
                                                                            key={i}
                                                                            className="text-[10px] text-slate-400 flex gap-2"
                                                                        >
                                                                            <span className="text-amber-500">
                                                                                •
                                                                            </span>
                                                                            <span className="line-clamp-2">
                                                                                {point}
                                                                            </span>
                                                                        </li>
                                                                    ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                {/* Opportunities */}
                                                {lead.enrichmentData.opportunities &&
                                                    lead.enrichmentData.opportunities.length >
                                                        0 && (
                                                        <div className="mb-3">
                                                            <h5 className="text-[10px] font-semibold text-green-400 mb-2">
                                                                Opportunities
                                                            </h5>
                                                            <ul className="space-y-1">
                                                                {lead.enrichmentData.opportunities
                                                                    .slice(0, 2)
                                                                    .map((opp, i) => (
                                                                        <li
                                                                            key={i}
                                                                            className="text-[10px] text-slate-400 flex gap-2"
                                                                        >
                                                                            <span className="text-green-500">
                                                                                •
                                                                            </span>
                                                                            <span className="line-clamp-2">
                                                                                {opp}
                                                                            </span>
                                                                        </li>
                                                                    ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                {/* Talking Points */}
                                                {lead.enrichmentData.talkingPoints &&
                                                    lead.enrichmentData.talkingPoints.length >
                                                        0 && (
                                                        <div className="p-2 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
                                                            <h5 className="text-[10px] font-semibold text-indigo-400 mb-1">
                                                                💬 Talking Point
                                                            </h5>
                                                            <p className="text-[10px] text-slate-400 italic line-clamp-2">
                                                                {
                                                                    lead.enrichmentData
                                                                        .talkingPoints[0]
                                                                }
                                                            </p>
                                                        </div>
                                                    )}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 mb-4">
                                            <PulseIcon size={14} className="text-blue-400" />
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                Unified Engagement History
                                            </h4>
                                        </div>

                                        <div className="space-y-3">
                                            {/* Combined Timeline: Activities + Gmail */}
                                            {(() => {
                                                const leadActivities = activities[lead.id] || [];
                                                const leadEmails = gmailHistory[lead.id] || [];

                                                const timeline = [
                                                    ...leadActivities.map((a) => ({
                                                        ...a,
                                                        sortKey: a.timestamp,
                                                        timelineType: 'activity' as const,
                                                    })),
                                                    ...leadEmails.map((e) => ({
                                                        ...e,
                                                        sortKey: e.timestamp,
                                                        timelineType: 'email' as const,
                                                    })),
                                                ].sort((a, b) => b.sortKey - a.sortKey);

                                                if (timeline.length === 0) {
                                                    return (
                                                        <p className="text-xs text-slate-600 italic py-4">
                                                            No recent engagement recorded.
                                                        </p>
                                                    );
                                                }

                                                return timeline.map((item, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex gap-3 group/item"
                                                    >
                                                        <div className="flex flex-col items-center">
                                                            <div
                                                                className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                                                                    item.timelineType === 'email'
                                                                        ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                                                                        : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                                                }`}
                                                            >
                                                                {item.timelineType === 'email' ? (
                                                                    <MailIcon size={12} />
                                                                ) : (
                                                                    <PulseIcon size={12} />
                                                                )}
                                                            </div>
                                                            {idx < timeline.length - 1 && (
                                                                <div className="w-px flex-1 bg-slate-800 my-1" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 pb-4">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">
                                                                    {item.timelineType === 'email'
                                                                        ? (item as EmailRecord)
                                                                              .subject
                                                                        : (
                                                                              item as unknown as Activity
                                                                          ).type}
                                                                </span>
                                                                <span className="text-[9px] text-slate-500">
                                                                    {new Date(
                                                                        item.sortKey
                                                                    ).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 italic">
                                                                {item.timelineType === 'email'
                                                                    ? (item as EmailRecord).snippet
                                                                    : (item as unknown as Activity)
                                                                          .notes}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ));
                                            })()}
                                        </div>

                                        {!gmailConnected && (
                                            <div className="mt-4 p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-purple-400">
                                                    <MailIcon size={14} />
                                                    <span className="text-[10px] font-medium">
                                                        Connect Gmail for live thread sync
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        (window.location.href = `/api/auth/gmail?userId=${user?.uid}`)
                                                    }
                                                    className="px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[10px] rounded-lg transition-all"
                                                >
                                                    Connect
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}

            {filteredLeads.length === 0 && (
                <div className="text-center py-20">
                    <p className="text-slate-500 mb-4">
                        No leads yet. Add your first lead to get started!
                    </p>
                    <button onClick={() => setIsAddModalOpen(true)} className="glass-button">
                        + Add New Lead
                    </button>
                </div>
            )}

            {/* Bulk Action Bar */}
            <AnimatePresence>
                {selectedLeadIds.size > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-slate-900/90 backdrop-blur-xl border border-blue-500/30 rounded-full shadow-2xl flex items-center gap-6"
                    >
                        <div className="flex items-center gap-2 border-r border-slate-700 pr-6">
                            <span className="text-blue-400 font-bold">{selectedLeadIds.size}</span>
                            <span className="text-slate-300 text-xs uppercase tracking-widest font-medium">
                                Selected
                            </span>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 uppercase font-bold">
                                    Move to:
                                </span>
                                <div className="flex gap-1">
                                    {(['Qualified', 'Proposal', 'Negotiation'] as LeadStatus[]).map(
                                        (status) => (
                                            <button
                                                key={status}
                                                onClick={() => handleBulkStatusUpdate(status)}
                                                className="px-2 py-1 text-[10px] bg-slate-800 hover:bg-blue-600/20 border border-slate-700 hover:border-blue-500/40 rounded-md text-slate-300 hover:text-blue-300 transition-all font-medium"
                                            >
                                                {status}
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleBulkEnrich}
                                disabled={bulkEnriching}
                                className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-2 transition-all ${
                                    bulkEnriching
                                        ? 'bg-purple-500/30 text-purple-300 cursor-wait'
                                        : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30'
                                }`}
                                title="Enrich selected leads with AI"
                            >
                                <Sparkles
                                    size={14}
                                    className={bulkEnriching ? 'animate-pulse' : ''}
                                />
                                {bulkEnriching ? 'Enriching...' : 'Enrich'}
                            </button>

                            <button
                                onClick={handleBulkDelete}
                                className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                                title="Bulk Delete"
                            >
                                <Trash2 size={18} />
                            </button>

                            <button
                                onClick={() => setSelectedLeadIds(new Set())}
                                className="text-xs text-slate-500 hover:text-white transition-colors ml-2"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modals */}
            <AddLeadModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleAddLead}
            />

            {selectedLead && (
                <>
                    <AIEmailDraft
                        lead={selectedLead}
                        isOpen={isEmailDraftOpen}
                        onClose={() => {
                            setIsEmailDraftOpen(false);
                            setSelectedLead(null);
                        }}
                    />

                    {user && (
                        <>
                            <LogCallModal
                                lead={selectedLead}
                                userId={user.uid}
                                companyId={profile?.companyId}
                                isOpen={isCallModalOpen}
                                onClose={() => {
                                    setIsCallModalOpen(false);
                                    setSelectedLead(null);
                                }}
                                onSuccess={handleActivitySuccess}
                            />

                            <LogMeetingModal
                                lead={selectedLead}
                                userId={user.uid}
                                companyId={profile?.companyId}
                                isOpen={isMeetingModalOpen}
                                onClose={() => {
                                    setIsMeetingModalOpen(false);
                                    setSelectedLead(null);
                                }}
                                onSuccess={handleActivitySuccess}
                            />

                            <LogReplyModal
                                lead={selectedLead}
                                userId={user.uid}
                                companyId={profile?.companyId}
                                isOpen={isReplyModalOpen}
                                onClose={() => {
                                    setIsReplyModalOpen(false);
                                    setSelectedLead(null);
                                }}
                                onSuccess={handleActivitySuccess}
                            />

                            <SMSModal
                                isOpen={isSMSModalOpen}
                                onClose={() => {
                                    setIsSMSModalOpen(false);
                                    setSelectedLead(null);
                                }}
                                leadId={selectedLead.id}
                                leadName={selectedLead.contactName || selectedLead.companyName}
                                leadPhone={selectedLead.phone || ''}
                            />
                        </>
                    )}
                </>
            )}

            {/* Quick Edit Modal */}
            <QuickEditModal
                lead={selectedLead}
                isOpen={isQuickEditOpen}
                onClose={() => {
                    setIsQuickEditOpen(false);
                    setSelectedLead(null);
                }}
                onSave={handleQuickEditSave}
            />

            {/* Import CSV Modal */}
            <ImportCSVModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleCSVImport}
            />

            {/* Lead Detail Drawer */}
            <LeadDetailDrawer
                lead={detailDrawerLead}
                activities={detailDrawerLead ? activities[detailDrawerLead.id] || [] : []}
                isOpen={detailDrawerLead !== null}
                onClose={() => setDetailDrawerLead(null)}
                onSave={handleQuickEditSave}
                onReaudit={handleReaudit}
                isReauditing={detailDrawerLead ? reauditingLeads.has(detailDrawerLead.id) : false}
            />
        </div>
    );
}
