'use client';

import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/components/providers/AuthProvider';
import { addActivity, getActivities } from '@/lib/firebase/services';
import { Activity } from '@/types';
import { Phone, Mail, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

export default function ActivitiesPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'call' | 'email' | 'meeting'>('call');
    const [activities, setActivities] = useState<Activity[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        leadName: '',
        outcome: 'connected',
        notes: '',
    });

    // Fetch activities on mount
    useEffect(() => {
        async function fetchActivities() {
            if (user?.uid) {
                try {
                    const data = await getActivities(user.uid);
                    setActivities(data.slice(0, 10)); // Show last 10
                } catch (error) {
                    console.error('Failed to fetch activities:', error);
                }
            }
        }
        fetchActivities();
    }, [user?.uid]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.leadName.trim()) {
            setMessage({ type: 'error', text: 'Please enter a lead/contact name' });
            return;
        }

        setIsSubmitting(true);
        setMessage(null);

        try {
            const userId = user?.uid || 'demo-user';
            const activity: Omit<Activity, 'id'> = {
                type: activeTab,
                outcome: formData.outcome as Activity['outcome'],
                timestamp: Date.now(),
                repId: userId,
                notes: `${formData.leadName}: ${formData.notes}`,
            };

            await addActivity(userId, activity);

            // Refresh activities list
            if (user?.uid) {
                const data = await getActivities(user.uid);
                setActivities(data.slice(0, 10));
            }

            // Reset form
            setFormData({ leadName: '', outcome: 'connected', notes: '' });
            setMessage({ type: 'success', text: 'Activity logged successfully!' });

            // Clear message after 3 seconds
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Failed to log activity:', error);
            setMessage({ type: 'error', text: 'Failed to log activity. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'call': return <Phone className="w-4 h-4" />;
            case 'email': return <Mail className="w-4 h-4" />;
            case 'meeting': return <Calendar className="w-4 h-4" />;
            default: return <Phone className="w-4 h-4" />;
        }
    };

    const getOutcomeBadge = (outcome: string) => {
        switch (outcome) {
            case 'connected': return <Badge variant="success">Connected</Badge>;
            case 'voicemail': return <Badge variant="warning">Voicemail</Badge>;
            case 'no_answer': return <Badge variant="default">No Answer</Badge>;
            case 'meeting_set': return <Badge variant="success">Meeting Set</Badge>;
            default: return <Badge variant="default">{outcome}</Badge>;
        }
    };

    const formatTimeAgo = (timestamp: number) => {
        const minutes = Math.floor((Date.now() - timestamp) / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    return (
        <div className="p-8 min-h-screen">
            <header className="mb-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-400">
                    Activity Center
                </h1>
                <p className="text-slate-500 text-sm mt-1">Log calls, emails, and meetings</p>
            </header>

            <div className="flex gap-6 items-start">
                {/* Helper Panel */}
                <div className="w-1/3 space-y-6">
                    <GlassCard>
                        <h3 className="font-semibold text-white mb-4">Quick Log</h3>

                        {/* Message Display */}
                        {message && (
                            <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                <span className="text-sm">{message.text}</span>
                            </div>
                        )}

                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={() => setActiveTab('call')}
                                className={`flex-1 py-2 text-sm rounded transition-colors ${activeTab === 'call' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                            >
                                Call
                            </button>
                            <button
                                onClick={() => setActiveTab('email')}
                                className={`flex-1 py-2 text-sm rounded transition-colors ${activeTab === 'email' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                            >
                                Email
                            </button>
                            <button
                                onClick={() => setActiveTab('meeting')}
                                className={`flex-1 py-2 text-sm rounded transition-colors ${activeTab === 'meeting' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                            >
                                Meeting
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Lead / Contact *</label>
                                <input
                                    type="text"
                                    placeholder="Enter lead name..."
                                    className="glass-input"
                                    value={formData.leadName}
                                    onChange={(e) => setFormData({ ...formData, leadName: e.target.value })}
                                    required
                                />
                            </div>

                            {activeTab === 'call' && (
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Outcome</label>
                                    <select
                                        className="glass-input bg-slate-800"
                                        value={formData.outcome}
                                        onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                                    >
                                        <option value="connected">Connected</option>
                                        <option value="voicemail">Voicemail</option>
                                        <option value="no_answer">No Answer</option>
                                        <option value="wrong_number">Wrong Number</option>
                                    </select>
                                </div>
                            )}

                            {activeTab === 'meeting' && (
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Outcome</label>
                                    <select
                                        className="glass-input bg-slate-800"
                                        value={formData.outcome}
                                        onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                                    >
                                        <option value="meeting_set">Meeting Scheduled</option>
                                        <option value="qualified">Qualified</option>
                                        <option value="contract_sent">Contract Sent</option>
                                        <option value="closed_won">Closed Won</option>
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Notes</label>
                                <textarea
                                    rows={3}
                                    className="glass-input"
                                    placeholder="Enter notes..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full glass-button disabled:opacity-50"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Logging...' : 'Log Activity'}
                            </button>
                        </form>
                    </GlassCard>

                    <GlassCard>
                        <h3 className="font-semibold text-white mb-2">Daily Targets</h3>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-400">Dials</span>
                                    <span className="text-white">45/50</span>
                                </div>
                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-[90%]"></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-400">Talk Time</span>
                                    <span className="text-white">52m/60m</span>
                                </div>
                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 w-[85%]"></div>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Recent Activity List */}
                <div className="flex-1">
                    <GlassCard>
                        <h3 className="font-semibold text-white mb-4">Recent History</h3>
                        <div className="space-y-0 text-sm">
                            {activities.length === 0 ? (
                                <div className="text-center py-10 text-slate-500">
                                    <p>No activities logged yet.</p>
                                    <p className="text-xs mt-1">Log your first activity using the form.</p>
                                </div>
                            ) : (
                                activities.map((activity) => (
                                    <div key={activity.id} className="flex gap-4 p-4 border-b border-slate-800 hover:bg-white/5 transition-colors last:border-0">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activity.type === 'call' ? 'bg-blue-400/20 text-blue-400' :
                                            activity.type === 'email' ? 'bg-purple-400/20 text-purple-400' :
                                                'bg-amber-400/20 text-amber-400'
                                            }`}>
                                            {getActivityIcon(activity.type)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between">
                                                <span className="font-medium text-white capitalize">{activity.type}</span>
                                                <span className="text-slate-500 text-xs">{formatTimeAgo(activity.timestamp)}</span>
                                            </div>
                                            <p className="text-slate-400 mt-1">{activity.notes || 'No notes'}</p>
                                            <div className="mt-2">
                                                {getOutcomeBadge(activity.outcome)}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}

