'use client';

import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { Badge } from '@/components/ui/Badge';
import { Bot, CreditCard, ChevronRight, User, Users, Mail, Search } from 'lucide-react';
import Link from 'next/link';
import { isGmailConnected } from '@/lib/gmail/gmail-service';
import { toast } from 'sonner';

async function checkTwilioStatusViaAPI(
    userId: string
): Promise<{ connected: boolean; phoneNumber: string | null }> {
    try {
        const response = await fetch(`/api/twilio/status?userId=${userId}`);
        if (!response.ok) {
            return { connected: false, phoneNumber: null };
        }
        return await response.json();
    } catch {
        return { connected: false, phoneNumber: null };
    }
}

export default function SettingsClient() {
    const { user, profile, loading: authLoading } = useAuth();
    const [gmailConnected, setGmailConnected] = useState(false);
    const [twilioConnected, setTwilioConnected] = useState(false);
    const [twilioPhone, setTwilioPhone] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setIsLoading(false);
            return;
        }
        checkConnections();
    }, [user, authLoading]);

    const checkConnections = async () => {
        if (!user) return;
        try {
            const [gmailStatus, twilioStatus] = await Promise.all([
                isGmailConnected(user.uid),
                checkTwilioStatusViaAPI(user.uid),
            ]);
            setGmailConnected(gmailStatus);
            setTwilioConnected(twilioStatus?.connected ?? false);
            setTwilioPhone(twilioStatus?.phoneNumber ?? null);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Cleanup failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnectGmail = () => {
        if (!user) {
            toast.error('Please log in first');
            return;
        }
        window.location.href = `/api/auth/gmail?userId=${user.uid}`;
    };

    if (authLoading || isLoading) {
        return (
            <div className="p-8 min-h-screen flex items-center justify-center">
                <div className="text-slate-500 italic animate-pulse">
                    Synchronizing configurations...
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="p-8 min-h-screen flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <User className="w-10 h-10 text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Sign In Required</h1>
                    <p className="text-slate-400 mb-6">
                        Please sign in to access your workspace settings, integrations, and billing
                        preferences.
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                        Sign In to Continue
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                    <div className="mt-8 pt-6 border-t border-slate-700">
                        <p className="text-slate-500 text-sm mb-3">What you can configure:</p>
                        <div className="grid grid-cols-2 gap-2 text-sm text-slate-400">
                            <div className="flex items-center gap-2">
                                <Bot className="w-4 h-4 text-violet-400" />
                                <span>Bot Studio</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-rose-400" />
                                <span>Email Integration</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-400" />
                                <span>Team Management</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-indigo-400" />
                                <span>Billing & Plans</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 min-h-screen">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                    Settings & Account
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                    Configure your professional workspace and commercial integrations
                </p>
            </header>

            <div className="grid gap-6 max-w-2xl">
                {/* Bot Studio / Discord Integration Card - Most Prominent */}
                <Link href="/settings/bot" className="block group">
                    <GlassCard className="border-l-4 border-l-violet-500 hover:bg-white/5 transition-all cursor-pointer">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                    <Bot size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white group-hover:text-violet-300 transition-colors">
                                        Bot Studio
                                    </h3>
                                    <p className="text-sm text-slate-400">
                                        Configure your Discord bot, AI brain settings, and lead
                                        notifications
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>
                    </GlassCard>
                </Link>

                {/* AI Lead Discovery Card - NEW */}
                <Link href="/settings/discovery" className="block group">
                    <GlassCard className="border-l-4 border-l-emerald-500 hover:bg-white/5 transition-all cursor-pointer">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                    <Search size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white group-hover:text-emerald-300 transition-colors">
                                        AI Lead Discovery
                                    </h3>
                                    <p className="text-sm text-slate-400">
                                        Configure automated prospecting and targeting criteria
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                                    NEW
                                </Badge>
                                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>
                    </GlassCard>
                </Link>

                {/* Account Preferences Card */}
                <Link href="/settings/account" className="block group">
                    <GlassCard className="border-l-4 border-l-blue-500 hover:bg-white/5 transition-all cursor-pointer">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">
                                        Account Preferences
                                    </h3>
                                    <p className="text-sm text-slate-400">
                                        Profile, timezone, notifications, and data export
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>
                    </GlassCard>
                </Link>

                {/* Team Management Card */}
                <Link href="/settings/team" className="block group">
                    <GlassCard className="border-l-4 border-l-cyan-500 hover:bg-white/5 transition-all cursor-pointer">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                    <Users size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors">
                                        Team Management
                                    </h3>
                                    <p className="text-sm text-slate-400">
                                        Invite members and manage access roles
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>
                    </GlassCard>
                </Link>

                {/* Email Integration Card */}
                <Link href="/settings/email" className="block group">
                    <GlassCard className="border-l-4 border-l-rose-500 hover:bg-white/5 transition-all cursor-pointer">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                    <Mail size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white group-hover:text-rose-300 transition-colors">
                                        Email Integration
                                    </h3>
                                    <p className="text-sm text-slate-400">
                                        Connect your SendGrid for branded team invitations
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-rose-400 group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>
                    </GlassCard>
                </Link>

                {/* Billing Card */}
                <Link href="/settings/billing" className="block group">
                    <GlassCard className="border-l-4 border-l-indigo-500 hover:bg-white/5 transition-all cursor-pointer">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                    <CreditCard size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">
                                        Subscription & Billing
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-sm text-slate-400">Current Plan:</span>
                                        <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 uppercase text-[10px] font-bold tracking-wider">
                                            {profile?.tier || 'Free'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>
                    </GlassCard>
                </Link>

                <GlassCard>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-2xl">
                                📧
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">
                                    Gmail Integration
                                </h3>
                                <p className="text-sm text-slate-400">
                                    Sync emails with leads, track replies, and send emails directly
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {gmailConnected ? (
                                <span className="text-sm text-green-400 font-medium">
                                    Connected
                                </span>
                            ) : (
                                <button
                                    onClick={handleConnectGmail}
                                    className="glass-button px-4 py-2 text-xs"
                                >
                                    Connect Gmail
                                </button>
                            )}
                        </div>
                    </div>
                </GlassCard>

                <GlassCard>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-2xl">
                                📱
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">
                                    Twilio Telephony
                                </h3>
                                <p className="text-sm text-slate-400">
                                    Omnichannel communication hub for professional outreach
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {twilioConnected ? (
                                <Badge variant="success">Active: {twilioPhone}</Badge>
                            ) : (
                                <Badge variant="warning">Setup Required</Badge>
                            )}
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
