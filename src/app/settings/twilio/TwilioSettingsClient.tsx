'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { GlassCard } from '@/components/ui/GlassCard';
import Link from 'next/link';
import {
    ArrowLeft,
    Phone,
    Save,
    Trash2,
    ExternalLink,
    CheckCircle,
    AlertCircle,
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/config';
import type { TwilioConfig } from '@/types/company';

export default function TwilioSettingsClient() {
    const { user, profile } = useAuth();

    const [twilioConfig, setTwilioConfig] = useState<TwilioConfig | null>(null);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [accountSid, setAccountSid] = useState('');
    const [authToken, setAuthToken] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Load existing config from company
    useEffect(() => {
        const loadConfig = async () => {
            if (!profile?.companyId) {
                setLoading(false);
                return;
            }

            try {
                setCompanyId(profile.companyId);
                const db = getFirebaseDb();
                const companyDoc = await getDoc(doc(db, 'companies', profile.companyId));

                if (companyDoc.exists()) {
                    const data = companyDoc.data();
                    const config = data?.settings?.twilioConfig as TwilioConfig | undefined;
                    if (config) {
                        setTwilioConfig(config);
                        setAccountSid(config.accountSid || '');
                        setAuthToken(config.authToken || '');
                        setPhoneNumber(config.phoneNumber || '');
                    }
                }
            } catch (err) {
                console.error('Failed to load Twilio config:', err);
            } finally {
                setLoading(false);
            }
        };

        loadConfig();
    }, [profile?.companyId]);

    const handleSave = async () => {
        if (!user || !companyId) return;

        // Basic validation
        if (!accountSid || !authToken || !phoneNumber) {
            setError('All fields are required');
            return;
        }

        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch('/api/settings/twilio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.uid,
                    companyId,
                    accountSid,
                    authToken,
                    phoneNumber,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save');
            }

            setTwilioConfig({
                accountSid,
                authToken,
                phoneNumber,
                connected: true,
                connectedAt: Date.now(),
            });
            setSuccess('Twilio configuration saved successfully!');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const handleDisconnect = async () => {
        if (!user || !companyId) return;

        if (
            !confirm(
                'Are you sure you want to disconnect Twilio? This will disable calling and SMS features.'
            )
        ) {
            return;
        }

        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch(
                `/api/settings/twilio?userId=${user.uid}&companyId=${companyId}`,
                { method: 'DELETE' }
            );

            if (!response.ok) {
                throw new Error('Failed to disconnect');
            }

            setAccountSid('');
            setAuthToken('');
            setPhoneNumber('');
            setTwilioConfig(null);
            setSuccess('Twilio disconnected successfully');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to disconnect');
        } finally {
            setSaving(false);
        }
    };

    const isConnected = twilioConfig?.connected;

    if (loading) {
        return (
            <div className="p-8 animate-pulse">
                <div className="h-8 bg-white/10 rounded w-48 mb-4" />
                <div className="h-64 bg-white/10 rounded" />
            </div>
        );
    }

    if (!companyId) {
        return (
            <div className="p-8 max-w-3xl mx-auto">
                <GlassCard className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">No Company Found</h2>
                    <p className="text-gray-400">
                        You need to be part of a company to configure Twilio settings.
                    </p>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-3xl mx-auto">
            <div className="mb-8">
                <Link
                    href="/settings"
                    className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Settings
                </Link>

                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20">
                        <Phone className="w-8 h-8 text-green-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Twilio Integration</h1>
                        <p className="text-gray-400">
                            Connect your Twilio account for calling and SMS features
                        </p>
                    </div>
                </div>
            </div>

            {/* Status Banner */}
            {isConnected && (
                <GlassCard className="mb-6 border-green-500/30 bg-green-500/10">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <div>
                            <p className="font-medium text-green-400">Twilio Connected</p>
                            <p className="text-sm text-gray-400">
                                Phone: {twilioConfig?.phoneNumber}
                            </p>
                        </div>
                    </div>
                </GlassCard>
            )}

            {/* Error/Success Messages */}
            {error && (
                <GlassCard className="mb-6 border-red-500/30 bg-red-500/10">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <p className="text-red-400">{error}</p>
                    </div>
                </GlassCard>
            )}

            {success && (
                <GlassCard className="mb-6 border-green-500/30 bg-green-500/10">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <p className="text-green-400">{success}</p>
                    </div>
                </GlassCard>
            )}

            {/* Configuration Form */}
            <GlassCard className="space-y-6">
                <div>
                    <h2 className="text-xl font-semibold mb-4">Twilio Credentials</h2>
                    <p className="text-gray-400 text-sm mb-6">
                        Find these in your{' '}
                        <a
                            href="https://console.twilio.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
                        >
                            Twilio Console <ExternalLink className="w-3 h-3" />
                        </a>
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Account SID</label>
                            <input
                                type="text"
                                value={accountSid}
                                onChange={(e) => setAccountSid(e.target.value)}
                                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 font-mono text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Auth Token</label>
                            <input
                                type="password"
                                value={authToken}
                                onChange={(e) => setAuthToken(e.target.value)}
                                placeholder="••••••••••••••••••••••••••••••••"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 font-mono text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Phone Number</label>
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="+1234567890"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                The Twilio phone number to use for outbound calls and SMS
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 border-t border-white/10">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </button>

                    {isConnected && (
                        <button
                            onClick={handleDisconnect}
                            disabled={saving}
                            className="px-6 py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Disconnect
                        </button>
                    )}
                </div>
            </GlassCard>

            {/* Help Section */}
            <GlassCard className="mt-6">
                <h3 className="font-semibold mb-3">How to get your Twilio credentials</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400 text-sm">
                    <li>
                        Create a Twilio account at{' '}
                        <a
                            href="https://www.twilio.com/try-twilio"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300"
                        >
                            twilio.com
                        </a>
                    </li>
                    <li>Go to the Twilio Console dashboard</li>
                    <li>Copy your Account SID and Auth Token from the account info section</li>
                    <li>Purchase a phone number in the Phone Numbers section</li>
                    <li>Paste all three values above</li>
                </ol>
            </GlassCard>
        </div>
    );
}
