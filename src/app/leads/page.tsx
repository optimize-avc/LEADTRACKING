'use client';

import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Lead, Activity } from '@/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { AddLeadModal } from '@/components/leads/AddLeadModal';
import { LogCallModal } from '@/components/leads/LogCallModal';
import { LogMeetingModal } from '@/components/leads/LogMeetingModal';
import { LogReplyModal } from '@/components/leads/LogReplyModal';
import { AIEmailDraft } from '@/components/ai/AIEmailDraft';
import { LeadsService, ActivitiesService } from '@/lib/firebase/services';
import { formatCurrency } from '@/lib/utils/formatters';
import { toast } from 'sonner';

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
    }
];

export default function LeadsPage() {
    const { user, loading: authLoading } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [activities, setActivities] = useState<Record<string, Activity[]>>({});

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isEmailDraftOpen, setIsEmailDraftOpen] = useState(false);
    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
    const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);

    const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);

    // Load leads
    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            setLeads(MOCK_LEADS);
            setIsLoading(false);
            return;
        }

        loadLeads();
    }, [user, authLoading]);

    const loadLeads = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const data = await LeadsService.getLeads(user.uid);
            setLeads(data.length > 0 ? data : MOCK_LEADS);
        } catch (error) {
            console.error('Error loading leads:', error);
            toast.error('Failed to load leads');
            setLeads(MOCK_LEADS);
        } finally {
            setIsLoading(false);
        }
    };

    const loadLeadActivities = async (leadId: string) => {
        if (!user) return;
        try {
            const data = await ActivitiesService.getLeadActivities(user.uid, leadId);
            setActivities(prev => ({ ...prev, [leadId]: data }));
        } catch (error) {
            console.error('Error loading activities:', error);
        }
    };

    const handleAddLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'assignedTo'>) => {
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
            return;
        }

        try {
            await LeadsService.createLead(user.uid, leadData);
            toast.success('Lead created successfully!');
            loadLeads();
        } catch (error) {
            console.error('Error creating lead:', error);
            toast.error('Failed to create lead');
        }
    };

    const handleExpandLead = (leadId: string) => {
        if (expandedLeadId === leadId) {
            setExpandedLeadId(null);
        } else {
            setExpandedLeadId(leadId);
            if (user && !activities[leadId]) {
                loadLeadActivities(leadId);
            }
        }
    };

    const handleActivitySuccess = () => {
        loadLeads();
        if (selectedLead) {
            loadLeadActivities(selectedLead.id);
        }
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'email': return '📧';
            case 'call': return '📞';
            case 'meeting': return '📅';
            default: return '📝';
        }
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '';
        const mins = Math.floor(seconds / 60);
        return ` (${mins} min)`;
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
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                        Leads Pipeline
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {user ? `${leads.length} leads` : 'Demo Mode - Log in to save data'}
                    </p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="glass-button"
                >
                    + Add New Lead
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {leads.map((lead) => (
                    <GlassCard
                        key={lead.id}
                        className={`cursor-pointer group relative overflow-hidden transition-all ${expandedLeadId === lead.id ? 'md:col-span-2 lg:col-span-2' : ''
                            }`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative z-10">
                            {/* Lead Header */}
                            <div
                                className="flex justify-between items-start mb-3"
                                onClick={() => handleExpandLead(lead.id)}
                            >
                                <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">
                                    {lead.companyName}
                                </h3>
                                <Badge variant={lead.status === 'New' ? 'info' : lead.status === 'Qualified' ? 'success' : lead.status === 'Closed' ? 'success' : 'warning'}>
                                    {lead.status}
                                </Badge>
                            </div>

                            {/* Lead Info */}
                            <div className="mb-4">
                                <p className="text-slate-300 text-sm font-medium">{lead.contactName}</p>
                                <p className="text-slate-500 text-xs">{lead.email}</p>
                                {lead.industry && (
                                    <span className="inline-block mt-2 text-[10px] uppercase tracking-wider text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded">
                                        {lead.industry}
                                    </span>
                                )}
                                {lead.nextStep && (
                                    <p className="text-xs text-amber-400 mt-2">→ {lead.nextStep}</p>
                                )}
                            </div>

                            {/* Value & Date */}
                            <div className="flex justify-between items-center border-t border-slate-700/50 pt-3 mt-2">
                                <span className="text-xl font-bold text-emerald-400">
                                    {formatCurrency(lead.value)}
                                </span>
                                <span className="text-xs text-slate-600">
                                    {lead.lastContact
                                        ? `Last: ${new Date(lead.lastContact).toLocaleDateString()}`
                                        : new Date(lead.updatedAt).toLocaleDateString()
                                    }
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
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!user) { toast.info('Log in to track calls'); return; }
                                        setSelectedLead(lead);
                                        setIsCallModalOpen(true);
                                    }}
                                    className="px-3 py-2 text-xs bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 transition-all"
                                    title="Log Call"
                                >
                                    📞
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!user) { toast.info('Log in to track meetings'); return; }
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
                                        if (!user) { toast.info('Log in to track replies'); return; }
                                        setSelectedLead(lead);
                                        setIsReplyModalOpen(true);
                                    }}
                                    className="px-3 py-2 text-xs bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-400 transition-all"
                                    title="Log Reply Received"
                                >
                                    📩
                                </button>
                            </div>

                            {/* Expanded Activity Timeline */}
                            {expandedLeadId === lead.id && (
                                <div className="mt-4 pt-4 border-t border-slate-700/50">
                                    <h4 className="text-sm font-semibold text-slate-300 mb-3">Activity Timeline</h4>
                                    {activities[lead.id]?.length > 0 ? (
                                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                            {activities[lead.id].map((activity) => (
                                                <div key={activity.id} className="flex items-start gap-3 p-2 bg-slate-800/30 rounded-lg">
                                                    <span className="text-lg mt-0.5">
                                                        {getActivityIcon(activity.type)}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm text-slate-300 font-medium">
                                                                {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                                                                {formatDuration(activity.duration)}
                                                            </p>
                                                            {activity.outcome && activity.outcome !== 'none' && (
                                                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">
                                                                    {activity.outcome}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {activity.notes && (
                                                            <p className="text-xs text-slate-500 mt-1 truncate">{activity.notes}</p>
                                                        )}
                                                        <p className="text-[10px] text-slate-600 mt-1">
                                                            {new Date(activity.timestamp).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 text-xs">No activities yet. Start by making a call or sending an email!</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </GlassCard>
                ))}
            </div>

            {leads.length === 0 && (
                <div className="text-center py-20">
                    <p className="text-slate-500 mb-4">No leads yet. Add your first lead to get started!</p>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="glass-button"
                    >
                        + Add New Lead
                    </button>
                </div>
            )}

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
                                isOpen={isReplyModalOpen}
                                onClose={() => {
                                    setIsReplyModalOpen(false);
                                    setSelectedLead(null);
                                }}
                                onSuccess={handleActivitySuccess}
                            />
                        </>
                    )}
                </>
            )}
        </div>
    );
}
