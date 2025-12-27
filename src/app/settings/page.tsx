'use client';

import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { isGmailConnected } from '@/lib/gmail/gmail-service';
import { toast } from 'sonner';

// Helper to check Twilio status via API (avoids importing server-only twilio SDK)
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

export default function SettingsPage() {
    const { user, loading: authLoading } = useAuth();
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

        // Check URL params for OAuth callback status
        const params = new URLSearchParams(window.location.search);
        if (params.get('gmail') === 'connected') {
            toast.success('Gmail connected successfully!');
            window.history.replaceState({}, '', '/settings');
        } else if (params.get('error')) {
            toast.error(`Connection failed: ${params.get('error')}`);
            window.history.replaceState({}, '', '/settings');
        }
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
        } catch (error) {
            console.error('Error checking connections:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnectGmail = () => {
        if (!user) {
            toast.error('Please log in first');
            return;
        }
        // Redirect to Gmail OAuth
        window.location.href = `/api/auth/gmail?userId=${user.uid}`;
    };

    if (authLoading || isLoading) {
        return (
            <div className="p-8 min-h-screen flex items-center justify-center">
                <div className="text-slate-500">Loading...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="p-8 min-h-screen">
                <div className="text-center py-20">
                    <h1 className="text-2xl font-bold text-white mb-4">Settings</h1>
                    <p className="text-slate-500">Please log in to access settings</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 min-h-screen">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                    Settings
                </h1>
                <p className="text-slate-500 text-sm mt-1">Manage your integrations and preferences</p>
            </header>

            <div className="grid gap-6 max-w-2xl">
                {/* Gmail Integration */}
                <GlassCard>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-2xl">
                                📧
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Gmail Integration</h3>
                                <p className="text-sm text-slate-400">
                                    Sync emails with leads, track replies, and send emails directly
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {gmailConnected ? (
                                <>
                                    <span className="text-sm text-green-400 flex items-center gap-1">
                                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                        Connected
                                    </span>
                                    <button
                                        onClick={handleConnectGmail}
                                        className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300"
                                    >
                                        Reconnect
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleConnectGmail}
                                    className="glass-button px-4 py-2"
                                >
                                    Connect Gmail
                                </button>
                            )}
                        </div>
                    </div>

                    {gmailConnected && (
                        <div className="mt-4 pt-4 border-t border-slate-700">
                            <h4 className="text-sm font-medium text-slate-300 mb-2">Features Enabled:</h4>
                            <ul className="text-sm text-slate-400 space-y-1">
                                <li>✅ Sync emails to/from leads</li>
                                <li>✅ AI analysis of email sentiment and intent</li>
                                <li>✅ Send emails directly from the app</li>
                                <li>✅ Track email threads per lead</li>
                            </ul>
                        </div>
                    )}
                </GlassCard>

                {/* Twilio Integration */}
                <GlassCard>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-2xl">
                                📱
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Twilio Integration</h3>
                                <p className="text-sm text-slate-400">
                                    Send SMS and make calls to leads directly from the platform
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {twilioConnected ? (
                                <>
                                    <span className="text-sm text-green-400 flex items-center gap-1">
                                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                        Connected
                                    </span>
                                    {twilioPhone && (
                                        <span className="text-xs text-slate-500 font-mono">
                                            {twilioPhone}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <span className="text-sm text-amber-400 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                                    Not Configured
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-700">
                        {twilioConnected ? (
                            <>
                                <h4 className="text-sm font-medium text-slate-300 mb-2">Features Enabled:</h4>
                                <ul className="text-sm text-slate-400 space-y-1">
                                    <li>✅ Send SMS to leads</li>
                                    <li>✅ Initiate outbound calls</li>
                                    <li>✅ Activity logging for calls & SMS</li>
                                    <li>✅ E.164 phone number formatting</li>
                                </ul>
                            </>
                        ) : (
                            <>
                                <h4 className="text-sm font-medium text-slate-300 mb-2">Setup Required:</h4>
                                <p className="text-sm text-slate-400 mb-2">
                                    Add Twilio credentials to your <code className="text-xs bg-slate-800 px-1 py-0.5 rounded">.env.local</code> file:
                                </p>
                                <pre className="p-2 bg-slate-800 rounded text-xs overflow-x-auto text-slate-300">
                                    {`TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890`}
                                </pre>
                            </>
                        )}
                    </div>
                </GlassCard>

                {/* Profile */}
                <GlassCard>
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-2xl">
                            👤
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white">Profile</h3>
                            <div className="mt-3 space-y-2">
                                <div>
                                    <span className="text-sm text-slate-500">Email:</span>
                                    <span className="text-sm text-slate-300 ml-2">{user.email}</span>
                                </div>
                                <div>
                                    <span className="text-sm text-slate-500">User ID:</span>
                                    <span className="text-sm text-slate-300 ml-2 font-mono text-xs">{user.uid}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* Environment Setup */}
                <GlassCard>
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl">
                            ⚙️
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white">Integration Setup</h3>
                            <p className="text-sm text-slate-400 mt-1">Configuration instructions:</p>

                            <div className="mt-4 space-y-4">
                                <div>
                                    <h5 className="text-sm font-medium text-slate-300 mb-2">Gmail Setup:</h5>
                                    <ol className="text-sm text-slate-400 space-y-1 list-decimal list-inside">
                                        <li>Go to <a href="https://console.cloud.google.com" target="_blank" className="text-blue-400 hover:underline">Google Cloud Console</a></li>
                                        <li>Create OAuth 2.0 credentials & enable Gmail API</li>
                                        <li>Add redirect URI: <code className="text-xs bg-slate-800 px-1 py-0.5 rounded">http://localhost:3000/api/auth/gmail/callback</code></li>
                                    </ol>
                                </div>

                                <div>
                                    <h5 className="text-sm font-medium text-slate-300 mb-2">Twilio Setup:</h5>
                                    <ol className="text-sm text-slate-400 space-y-1 list-decimal list-inside">
                                        <li>Go to <a href="https://console.twilio.com" target="_blank" className="text-blue-400 hover:underline">Twilio Console</a></li>
                                        <li>Copy Account SID and Auth Token from dashboard</li>
                                        <li>Get or buy a phone number</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}

