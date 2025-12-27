'use client';

import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { Badge } from '@/components/ui/Badge';
import { CreditCard, ExternalLink, ShieldCheck } from 'lucide-react';
import { isGmailConnected } from '@/lib/gmail/gmail-service';
import { toast } from 'sonner';

async function checkTwilioStatusViaAPI(userId: string): Promise<{ connected: boolean; phoneNumber: string | null }> {
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
    const [isPortalLoading, setIsPortalLoading] = useState(false);
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
            toast.error(error instanceof Error ? error.message : "Cleanup failed");
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

    const handleManageBilling = async () => {
        if (!user) return;
        setIsPortalLoading(true);
        try {
            const response = await fetch('/api/stripe/portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid, customerId: (profile as any)?.stripeCustomerId }),
            });
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error('Could not open billing portal');
            }
        } catch (error) {
            toast.error('Billing portal service unavailable');
            console.error(error);
        } finally {
            setIsPortalLoading(false);
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="p-8 min-h-screen flex items-center justify-center">
                <div className="text-slate-500 italic animate-pulse">Synchronizing configurations...</div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="p-8 min-h-screen">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                    Settings & Account
                </h1>
                <p className="text-slate-500 text-sm mt-1">Configure your professional workspace and commercial integrations</p>
            </header>

            <div className="grid gap-6 max-w-2xl">
                {/* Billing Logic... (Previous cards remain same) */}
                <GlassCard className="border-l-4 border-l-indigo-500">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white">
                                <CreditCard size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Subscription & Billing</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm text-slate-400">Current Plan:</span>
                                    <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 uppercase text-[10px] font-bold tracking-wider">
                                        {profile?.tier || 'Free'}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleManageBilling}
                            disabled={isPortalLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium border border-white/10 transition-all disabled:opacity-50"
                        >
                            {isPortalLoading ? 'Loading...' : 'Manage Billing'}
                            <ExternalLink size={14} />
                        </button>
                    </div>
                </GlassCard>

                <GlassCard>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-2xl">📧</div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Gmail Integration</h3>
                                <p className="text-sm text-slate-400">Sync emails with leads, track replies, and send emails directly</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {gmailConnected ? (
                                <span className="text-sm text-green-400 font-medium">Connected</span>
                            ) : (
                                <button onClick={handleConnectGmail} className="glass-button px-4 py-2 text-xs">Connect Gmail</button>
                            )}
                        </div>
                    </div>
                </GlassCard>

                <GlassCard>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-2xl">📱</div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Twilio Telephony</h3>
                                <p className="text-sm text-slate-400">Omnichannel communication hub for professional outreach</p>
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
