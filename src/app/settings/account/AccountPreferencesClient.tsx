'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { Badge } from '@/components/ui/Badge';
import { User, Bell, Download, Trash2, Globe, ChevronLeft, Save, Check } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';

// Timezone options
const TIMEZONES = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
    { value: 'Europe/London', label: 'GMT (London)' },
    { value: 'Europe/Paris', label: 'CET (Paris)' },
    { value: 'Asia/Tokyo', label: 'JST (Tokyo)' },
    { value: 'Asia/Shanghai', label: 'CST (Shanghai)' },
    { value: 'Australia/Sydney', label: 'AEST (Sydney)' },
];

interface UserPreferences {
    timezone: string;
    emailNotifications: boolean;
    leadAlerts: boolean;
    weeklyDigest: boolean;
    marketingEmails: boolean;
}

export default function AccountPreferencesClient() {
    const { user, loading: authLoading } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Preferences state
    const [preferences, setPreferences] = useState<UserPreferences>({
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        emailNotifications: true,
        leadAlerts: true,
        weeklyDigest: true,
        marketingEmails: false,
    });

    // Load preferences from localStorage/Firebase on mount
    const loadPreferences = useCallback(() => {
        if (!user) return;
        const saved = localStorage.getItem(`prefs_${user.uid}`);
        if (saved) {
            setPreferences(JSON.parse(saved));
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && user) {
            loadPreferences();
        }
    }, [user, authLoading, loadPreferences]);

    // Save preferences
    const handleSavePreferences = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            // Save to localStorage (in production, save to Firebase)
            localStorage.setItem(`prefs_${user.uid}`, JSON.stringify(preferences));
            toast.success('Preferences saved successfully');
        } catch (error) {
            console.error('Failed to save preferences:', error);
            toast.error('Failed to save preferences');
        } finally {
            setIsSaving(false);
        }
    };

    // Export user data
    const handleExportData = async (format: 'json' | 'csv' | 'pdf') => {
        if (!user) return;
        setIsExporting(true);
        try {
            // Collect user data
            const userData = {
                profile: {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    createdAt: user.metadata?.creationTime,
                },
                preferences,
                exportedAt: new Date().toISOString(),
            };

            let blob: Blob;
            let filename: string;

            if (format === 'json') {
                blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
                filename = `salestracker-data-${user.uid.slice(0, 8)}.json`;
            } else if (format === 'csv') {
                // Convert to CSV format
                const csvContent = [
                    'Field,Value',
                    `Email,${user.email}`,
                    `Display Name,${user.displayName}`,
                    `Timezone,${preferences.timezone}`,
                    `Email Notifications,${preferences.emailNotifications}`,
                    `Lead Alerts,${preferences.leadAlerts}`,
                    `Weekly Digest,${preferences.weeklyDigest}`,
                    `Marketing Emails,${preferences.marketingEmails}`,
                    `Exported At,${new Date().toISOString()}`,
                ].join('\n');
                blob = new Blob([csvContent], { type: 'text/csv' });
                filename = `salestracker-data-${user.uid.slice(0, 8)}.csv`;
            } else {
                // For PDF, generate a simple text file (real PDF would need a library)
                const pdfContent = `
SalesTracker Data Export
========================
Email: ${user.email}
Display Name: ${user.displayName}
Timezone: ${preferences.timezone}

Notification Preferences:
- Email Notifications: ${preferences.emailNotifications ? 'Enabled' : 'Disabled'}
- Lead Alerts: ${preferences.leadAlerts ? 'Enabled' : 'Disabled'}
- Weekly Digest: ${preferences.weeklyDigest ? 'Enabled' : 'Disabled'}
- Marketing Emails: ${preferences.marketingEmails ? 'Enabled' : 'Disabled'}

Exported: ${new Date().toLocaleString()}
                `.trim();
                blob = new Blob([pdfContent], { type: 'text/plain' });
                filename = `salestracker-data-${user.uid.slice(0, 8)}.txt`;
                toast.info('PDF export generated as text file');
            }

            // Download the file
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success(`Data exported as ${format.toUpperCase()}`);
        } catch (error) {
            console.error('Failed to export data:', error);
            toast.error('Failed to export data');
        } finally {
            setIsExporting(false);
        }
    };

    // Delete account
    const handleDeleteAccount = async () => {
        if (!user) return;
        toast.error('Account deletion requires contacting support');
        setShowDeleteConfirm(false);
    };

    if (authLoading) {
        return (
            <div className="p-8 min-h-screen flex items-center justify-center">
                <div className="text-slate-500 animate-pulse">Loading account...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="p-8 min-h-screen flex items-center justify-center">
                <div className="text-slate-400">Please sign in to view account settings.</div>
            </div>
        );
    }

    return (
        <div className="p-8 min-h-screen">
            {/* Header with back button */}
            <header className="mb-8">
                <Link
                    href="/settings"
                    className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Settings
                </Link>
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                    Account Preferences
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                    Manage your profile, notifications, and data
                </p>
            </header>

            <div className="grid gap-6 max-w-2xl">
                {/* Profile Card */}
                <GlassCard className="border-l-4 border-l-blue-500">
                    <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16">
                            {user.photoURL ? (
                                <Image
                                    src={user.photoURL}
                                    alt="Profile"
                                    fill
                                    className="rounded-full border-2 border-white/10 object-cover"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center">
                                    <User className="w-8 h-8 text-white" />
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">
                                {user.displayName || 'User'}
                            </h3>
                            <p className="text-sm text-slate-400">{user.email}</p>
                            <Badge className="mt-1 bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                                Google Account
                            </Badge>
                        </div>
                    </div>
                </GlassCard>

                {/* Timezone Settings */}
                <GlassCard>
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                            <Globe size={20} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-1">Timezone</h3>
                            <p className="text-sm text-slate-400 mb-4">
                                Set your local timezone for accurate scheduling
                            </p>
                            <select
                                value={preferences.timezone}
                                onChange={(e) =>
                                    setPreferences({ ...preferences, timezone: e.target.value })
                                }
                                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                            >
                                {TIMEZONES.map((tz) => (
                                    <option key={tz.value} value={tz.value}>
                                        {tz.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </GlassCard>

                {/* Notification Preferences */}
                <GlassCard>
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
                            <Bell size={20} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-1">
                                Notification Preferences
                            </h3>
                            <p className="text-sm text-slate-400 mb-4">
                                Control how and when you receive notifications
                            </p>

                            <div className="space-y-4">
                                {[
                                    {
                                        key: 'emailNotifications' as const,
                                        label: 'Email Notifications',
                                        desc: 'Receive important updates via email',
                                    },
                                    {
                                        key: 'leadAlerts' as const,
                                        label: 'Lead Alerts',
                                        desc: 'Get notified when leads require attention',
                                    },
                                    {
                                        key: 'weeklyDigest' as const,
                                        label: 'Weekly Digest',
                                        desc: 'Receive a weekly summary of your activity',
                                    },
                                    {
                                        key: 'marketingEmails' as const,
                                        label: 'Marketing Emails',
                                        desc: 'Receive product updates and tips',
                                    },
                                ].map((item) => (
                                    <div
                                        key={item.key}
                                        className="flex items-center justify-between py-2"
                                    >
                                        <div>
                                            <div className="text-white text-sm font-medium">
                                                {item.label}
                                            </div>
                                            <div className="text-slate-500 text-xs">
                                                {item.desc}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() =>
                                                setPreferences({
                                                    ...preferences,
                                                    [item.key]: !preferences[item.key],
                                                })
                                            }
                                            className={`w-12 h-6 rounded-full transition-colors ${
                                                preferences[item.key]
                                                    ? 'bg-violet-500'
                                                    : 'bg-slate-700'
                                            } relative`}
                                        >
                                            <span
                                                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                                    preferences[item.key]
                                                        ? 'translate-x-7'
                                                        : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* Save Button */}
                <button
                    onClick={handleSavePreferences}
                    disabled={isSaving}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                >
                    {isSaving ? (
                        <>Saving...</>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Save Preferences
                        </>
                    )}
                </button>

                {/* Data Export */}
                <GlassCard>
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white">
                            <Download size={20} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-1">
                                Export Your Data
                            </h3>
                            <p className="text-sm text-slate-400 mb-4">
                                Download a copy of your personal data (GDPR compliant)
                            </p>

                            <div className="flex flex-wrap gap-2">
                                {['json', 'csv', 'pdf'].map((format) => (
                                    <button
                                        key={format}
                                        onClick={() =>
                                            handleExportData(format as 'json' | 'csv' | 'pdf')
                                        }
                                        disabled={isExporting}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white transition-colors disabled:opacity-50"
                                    >
                                        <Download className="w-4 h-4" />
                                        {format.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* Danger Zone - Delete Account */}
                <GlassCard className="border border-red-500/30">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white">
                            <Trash2 size={20} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-red-400 mb-1">
                                Delete Account
                            </h3>
                            <p className="text-sm text-slate-400 mb-4">
                                Permanently delete your account and all associated data. This action
                                cannot be undone.
                            </p>

                            {!showDeleteConfirm ? (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-sm transition-colors"
                                >
                                    Delete My Account
                                </button>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleDeleteAccount}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                                    >
                                        Confirm Delete
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
