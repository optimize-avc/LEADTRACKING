'use client';

import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { Bell, Mail, MessageSquare, Smartphone, Save } from 'lucide-react';
import { toast } from 'sonner';
import { getFirebaseDb } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface NotificationPreferences {
    email: {
        newLeadAssigned: boolean;
        leadStatusChange: boolean;
        dailyDigest: boolean;
        weeklyReport: boolean;
    };
    discord: {
        newLead: boolean;
        staleLeadAlert: boolean;
        closeNotification: boolean;
        teamActivity: boolean;
    };
    inApp: {
        allActivity: boolean;
        mentionsOnly: boolean;
    };
}

const DEFAULT_PREFS: NotificationPreferences = {
    email: {
        newLeadAssigned: true,
        leadStatusChange: false,
        dailyDigest: true,
        weeklyReport: true,
    },
    discord: {
        newLead: true,
        staleLeadAlert: true,
        closeNotification: true,
        teamActivity: false,
    },
    inApp: {
        allActivity: true,
        mentionsOnly: false,
    },
};

export default function NotificationSettings() {
    const { user } = useAuth();
    const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Load preferences from Firestore
    useEffect(() => {
        if (!user) return;

        const loadPrefs = async () => {
            try {
                const db = getFirebaseDb();
                const prefsRef = doc(db, 'users', user.uid);
                const snapshot = await getDoc(prefsRef);

                if (snapshot.exists() && snapshot.data()?.notificationPrefs) {
                    setPrefs(snapshot.data().notificationPrefs);
                }
            } catch (error) {
                // Silently handle permission errors - user prefs may not exist yet
                const err = error as { code?: string; message?: string };
                if (err?.code !== 'permission-denied' && !err?.message?.includes('permission')) {
                    console.error('Failed to load notification preferences:', error);
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadPrefs();
    }, [user]);

    const handleToggle = (
        category: keyof NotificationPreferences,
        setting: string,
        value: boolean
    ) => {
        setPrefs((prev) => ({
            ...prev,
            [category]: {
                ...prev[category],
                [setting]: value,
            },
        }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!user) return;

        setIsSaving(true);
        try {
            const db = getFirebaseDb();
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, { notificationPrefs: prefs }, { merge: true });
            setHasChanges(false);
            toast.success('Notification preferences saved');
        } catch (error) {
            console.error('Failed to save preferences:', error);
            toast.error('Failed to save preferences');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-32 bg-slate-800/50 rounded-lg"></div>
                <div className="h-32 bg-slate-800/50 rounded-lg"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Bell className="w-5 h-5 text-violet-400" />
                        Notification Preferences
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                        Control how and when you receive notifications
                    </p>
                </div>
                {hasChanges && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {isSaving ? (
                            'Saving...'
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Email Notifications */}
            <GlassCard>
                <h4 className="text-white font-medium flex items-center gap-2 mb-4">
                    <Mail className="w-4 h-4 text-red-400" />
                    Email Notifications
                </h4>
                <div className="space-y-3">
                    <ToggleRow
                        label="New lead assigned to me"
                        description="Get notified when a lead is assigned to you"
                        checked={prefs.email.newLeadAssigned}
                        onChange={(v) => handleToggle('email', 'newLeadAssigned', v)}
                    />
                    <ToggleRow
                        label="Lead status changes"
                        description="Updates when leads move through the pipeline"
                        checked={prefs.email.leadStatusChange}
                        onChange={(v) => handleToggle('email', 'leadStatusChange', v)}
                    />
                    <ToggleRow
                        label="Daily digest"
                        description="Summary of your daily activity and tasks"
                        checked={prefs.email.dailyDigest}
                        onChange={(v) => handleToggle('email', 'dailyDigest', v)}
                    />
                    <ToggleRow
                        label="Weekly performance report"
                        description="Weekly summary with analytics and insights"
                        checked={prefs.email.weeklyReport}
                        onChange={(v) => handleToggle('email', 'weeklyReport', v)}
                    />
                </div>
            </GlassCard>

            {/* Discord Notifications */}
            <GlassCard>
                <h4 className="text-white font-medium flex items-center gap-2 mb-4">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    Discord Notifications
                </h4>
                <div className="space-y-3">
                    <ToggleRow
                        label="New lead alerts"
                        description="Post to Discord when new leads are created"
                        checked={prefs.discord.newLead}
                        onChange={(v) => handleToggle('discord', 'newLead', v)}
                    />
                    <ToggleRow
                        label="Stale lead alerts"
                        description="Get pinged when leads need attention"
                        checked={prefs.discord.staleLeadAlert}
                        onChange={(v) => handleToggle('discord', 'staleLeadAlert', v)}
                    />
                    <ToggleRow
                        label="Close notifications"
                        description="Celebrate wins in the team channel"
                        checked={prefs.discord.closeNotification}
                        onChange={(v) => handleToggle('discord', 'closeNotification', v)}
                    />
                    <ToggleRow
                        label="Team activity feed"
                        description="All team activity posted to Discord"
                        checked={prefs.discord.teamActivity}
                        onChange={(v) => handleToggle('discord', 'teamActivity', v)}
                    />
                </div>
            </GlassCard>

            {/* In-App Notifications */}
            <GlassCard>
                <h4 className="text-white font-medium flex items-center gap-2 mb-4">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    In-App Notifications
                </h4>
                <div className="space-y-3">
                    <ToggleRow
                        label="All activity"
                        description="Show notifications for all team activity"
                        checked={prefs.inApp.allActivity}
                        onChange={(v) => handleToggle('inApp', 'allActivity', v)}
                    />
                    <ToggleRow
                        label="Mentions only"
                        description="Only notify when directly mentioned"
                        checked={prefs.inApp.mentionsOnly}
                        onChange={(v) => handleToggle('inApp', 'mentionsOnly', v)}
                    />
                </div>
            </GlassCard>
        </div>
    );
}

function ToggleRow({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between py-2">
            <div>
                <div className="text-sm text-white">{label}</div>
                <div className="text-xs text-slate-500">{description}</div>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                    checked ? 'bg-violet-600' : 'bg-slate-700'
                }`}
            >
                <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        checked ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
            </button>
        </div>
    );
}
