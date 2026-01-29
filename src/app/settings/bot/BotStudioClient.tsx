'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { Badge } from '@/components/ui/Badge';
import { Bot, Link2, Unlink, Settings, MessageSquare, Save, ChevronLeft, RefreshCw, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { CompanyService } from '@/lib/firebase/company';
import type { Company, CompanySettings, ChannelMapping, DiscordChannel } from '@/types/company';
import Link from 'next/link';

// Discord OAuth2 configuration
const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
const DISCORD_REDIRECT_URI =
    typeof window !== 'undefined' ? `${window.location.origin}/api/discord/callback` : '';

// Channel mapping configuration
const CHANNEL_MAPPING_OPTIONS: { key: keyof ChannelMapping; label: string; description: string }[] = [
    { key: 'newLeads', label: 'New Leads', description: 'Notifications when new leads are discovered' },
    { key: 'wins', label: 'Closed Won', description: 'Celebrate when deals are closed' },
    { key: 'triage', label: 'Lead Triage', description: 'Leads needing review or assignment' },
    { key: 'digest', label: 'Daily Digest', description: 'Daily summary of pipeline activity' },
];

export default function BotStudioClient() {
    const { user, loading: authLoading } = useAuth();
    const searchParams = useSearchParams();
    const [company, setCompany] = useState<Company | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [industry, setIndustry] = useState('');
    const [persona, setPersona] = useState<'professional' | 'friendly' | 'casual'>('professional');
    const [qualificationRules, setQualificationRules] = useState<string[]>([]);
    const [newRule, setNewRule] = useState('');

    // Channel mapping state
    const [discordChannels, setDiscordChannels] = useState<DiscordChannel[]>([]);
    const [channelMapping, setChannelMapping] = useState<ChannelMapping>({});
    const [isLoadingChannels, setIsLoadingChannels] = useState(false);
    const [isSavingChannels, setIsSavingChannels] = useState(false);

    // Handle OAuth callback messages
    useEffect(() => {
        const success = searchParams.get('success');
        const error = searchParams.get('error');
        
        if (success === 'connected') {
            toast.success('🎉 Discord server connected successfully!');
            // Clean URL and reload to fetch channels
            window.history.replaceState({}, '', '/settings/bot');
            loadCompany();
        } else if (error) {
            const errorMessages: Record<string, string> = {
                cancelled: 'Discord connection was cancelled',
                missing_state: 'Invalid request - please try again',
                database_error: 'Failed to save connection - please try again',
                no_guild: 'No Discord server was selected',
                auth_error: 'Discord authentication failed',
            };
            toast.error(errorMessages[error] || 'Failed to connect Discord');
            window.history.replaceState({}, '', '/settings/bot');
        }
    }, [searchParams]);

    // Load company data
    const loadCompany = useCallback(async () => {
        if (!user) return;

        try {
            let companyData = await CompanyService.getCompanyByUser(user.uid);

            // Auto-create company if doesn't exist
            if (!companyData) {
                const companyId = await CompanyService.createCompany(user.uid, {
                    name: user.email?.split('@')[0] || 'My Company',
                });
                companyData = await CompanyService.getCompany(companyId);
            }

            if (companyData) {
                setCompany(companyData);
                setIndustry(companyData.settings.industry || '');
                setPersona(companyData.settings.persona || 'professional');
                setQualificationRules(companyData.settings.qualificationRules || []);
                setChannelMapping(companyData.settings.channelMapping || {});

                // Load Discord channels if connected
                if (companyData.discordGuildId) {
                    loadDiscordChannels();
                }
            }
        } catch (error) {
            console.error('Failed to load company:', error);
            toast.error('Failed to load company settings');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    // Load Discord channels
    const loadDiscordChannels = async () => {
        setIsLoadingChannels(true);
        try {
            const token = await user?.getIdToken();
            const response = await fetch('/api/discord/channels', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setDiscordChannels(data.channels || []);
            } else {
                const error = await response.json();
                console.error('Failed to load channels:', error);
                if (response.status !== 400) { // Don't show error for "not connected"
                    toast.error('Failed to load Discord channels');
                }
            }
        } catch (error) {
            console.error('Error loading Discord channels:', error);
        } finally {
            setIsLoadingChannels(false);
        }
    };

    useEffect(() => {
        if (!authLoading && user) {
            loadCompany();
        } else if (!authLoading && !user) {
            setIsLoading(false);
        }
    }, [user, authLoading, loadCompany]);

    // Handle Discord connection
    const handleConnectDiscord = () => {
        if (!company || !DISCORD_CLIENT_ID) {
            toast.error('Discord integration not configured');
            return;
        }

        // Build OAuth2 URL with bot scope
        const params = new URLSearchParams({
            client_id: DISCORD_CLIENT_ID,
            redirect_uri: DISCORD_REDIRECT_URI,
            response_type: 'code',
            scope: 'bot guilds applications.commands',
            permissions: '2147485696', // Manage Channels, Send Messages, Embed Links, Read Message History
            state: company.id, // Pass companyId to callback
        });

        window.location.href = `https://discord.com/oauth2/authorize?${params.toString()}`;
    };

    // Handle Discord disconnection
    const handleDisconnectDiscord = async () => {
        if (!company) return;

        try {
            await CompanyService.unlinkDiscord(company.id);
            setCompany({ ...company, discordGuildId: undefined, discordGuildName: undefined });
            setDiscordChannels([]);
            setChannelMapping({});
            toast.success('Discord server disconnected');
        } catch (error) {
            console.error('Failed to disconnect Discord:', error);
            toast.error('Failed to disconnect Discord');
        }
    };

    // Save brain settings
    const handleSaveSettings = async () => {
        if (!company) return;

        setIsSaving(true);
        try {
            await CompanyService.updateSettings(company.id, {
                industry,
                persona,
                qualificationRules,
            });

            setCompany({
                ...company,
                settings: {
                    ...company.settings,
                    industry,
                    persona,
                    qualificationRules,
                },
            });

            toast.success('Settings saved successfully');
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    // Save channel mapping
    const handleSaveChannelMapping = async () => {
        if (!company) return;

        setIsSavingChannels(true);
        try {
            await CompanyService.updateChannelMapping(company.id, channelMapping as Record<string, string>);

            setCompany({
                ...company,
                settings: {
                    ...company.settings,
                    channelMapping,
                },
            });

            toast.success('Channel mapping saved!');
        } catch (error) {
            console.error('Failed to save channel mapping:', error);
            toast.error('Failed to save channel mapping');
        } finally {
            setIsSavingChannels(false);
        }
    };

    // Update channel mapping
    const handleChannelChange = (key: keyof ChannelMapping, channelId: string) => {
        setChannelMapping((prev) => ({
            ...prev,
            [key]: channelId || undefined, // Remove key if empty
        }));
    };

    // Add qualification rule
    const handleAddRule = () => {
        if (!newRule.trim()) return;
        setQualificationRules([...qualificationRules, newRule.trim()]);
        setNewRule('');
    };

    // Remove qualification rule
    const handleRemoveRule = (index: number) => {
        setQualificationRules(qualificationRules.filter((_, i) => i !== index));
    };

    if (authLoading || isLoading) {
        return (
            <div className="p-8 min-h-screen flex items-center justify-center">
                <div className="text-slate-500 italic animate-pulse">
                    Initializing Bot Studio...
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="p-8 min-h-screen flex items-center justify-center">
                <div className="text-slate-500">Please log in to access Bot Studio.</div>
            </div>
        );
    }

    return (
        <div className="p-8 min-h-screen">
            {/* Header */}
            <header className="mb-8">
                <Link
                    href="/settings"
                    className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-4 transition-colors"
                >
                    <ChevronLeft size={16} />
                    Back to Settings
                </Link>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Bot size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                            Bot Studio
                        </h1>
                        <p className="text-slate-500 text-sm">
                            Configure your AI-powered Discord bot integration
                        </p>
                    </div>
                </div>
            </header>

            <div className="grid gap-6 max-w-2xl">
                {/* Discord Connection Card */}
                <GlassCard className="border-l-4 border-l-indigo-500">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#5865F2] to-[#7289DA] flex items-center justify-center text-white text-xl">
                                🎮
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">
                                    Discord Connection
                                </h3>
                                {company?.discordGuildId ? (
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                                            Connected
                                        </Badge>
                                        <span className="text-sm text-slate-400">
                                            {company.discordGuildName || 'Server Connected'}
                                        </span>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400">
                                        Connect your Discord server to enable the AI bot
                                    </p>
                                )}
                            </div>
                        </div>
                        <div>
                            {company?.discordGuildId ? (
                                <button
                                    onClick={handleDisconnectDiscord}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium border border-red-500/20 transition-all"
                                >
                                    <Unlink size={14} />
                                    Disconnect
                                </button>
                            ) : (
                                <button
                                    onClick={handleConnectDiscord}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg text-sm font-medium transition-all"
                                >
                                    <Link2 size={14} />
                                    Connect Discord
                                </button>
                            )}
                        </div>
                    </div>
                </GlassCard>

                {/* Channel Mapping Card - Only show if connected */}
                {company?.discordGuildId && (
                    <GlassCard>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                    <MessageSquare size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">
                                        Channel Mapping
                                    </h3>
                                    <p className="text-sm text-slate-400">
                                        Select which channels receive notifications
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={loadDiscordChannels}
                                disabled={isLoadingChannels}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                            >
                                <RefreshCw size={12} className={isLoadingChannels ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                        </div>

                        {isLoadingChannels ? (
                            <div className="text-sm text-slate-500 italic py-4 text-center">
                                Loading channels...
                            </div>
                        ) : discordChannels.length === 0 ? (
                            <div className="text-sm text-slate-500 py-4 text-center">
                                <p>No channels found. Make sure the bot has permission to view channels.</p>
                                <button
                                    onClick={loadDiscordChannels}
                                    className="mt-2 text-indigo-400 hover:text-indigo-300"
                                >
                                    Try again
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {CHANNEL_MAPPING_OPTIONS.map((option) => (
                                    <div key={option.key} className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-slate-300">
                                                {option.label}
                                            </label>
                                            <p className="text-xs text-slate-500">{option.description}</p>
                                        </div>
                                        <div className="w-48">
                                            <select
                                                value={channelMapping[option.key] || ''}
                                                onChange={(e) => handleChannelChange(option.key, e.target.value)}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                            >
                                                <option value="">None</option>
                                                {discordChannels.map((ch) => (
                                                    <option key={ch.id} value={ch.id}>
                                                        # {ch.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))}

                                {/* Save Channel Mapping Button */}
                                <div className="pt-4 border-t border-white/10">
                                    <button
                                        onClick={handleSaveChannelMapping}
                                        disabled={isSavingChannels}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                                    >
                                        <Save size={14} />
                                        {isSavingChannels ? 'Saving...' : 'Save Channel Mapping'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </GlassCard>
                )}

                {/* Brain Configuration Card */}
                <GlassCard>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                            <Settings size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">
                                Brain Configuration
                            </h3>
                            <p className="text-sm text-slate-400">
                                Customize how the AI bot behaves for your business
                            </p>
                        </div>
                    </div>

                    <div className="space-y-5">
                        {/* Industry */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Industry & Niche
                            </label>
                            <input
                                type="text"
                                value={industry}
                                onChange={(e) => setIndustry(e.target.value)}
                                placeholder="e.g., Commercial HVAC in Texas"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                This helps the AI generate relevant leads and research
                            </p>
                        </div>

                        {/* Persona */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Bot Persona
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {(['professional', 'friendly', 'casual'] as const).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPersona(p)}
                                        className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                                            persona === p
                                                ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                                                : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                                        }`}
                                    >
                                        {p.charAt(0).toUpperCase() + p.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Qualification Rules */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Qualification Rules
                            </label>
                            <div className="space-y-2 mb-3">
                                {qualificationRules.map((rule, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg border border-white/10"
                                    >
                                        <span className="text-sm text-slate-300">{rule}</span>
                                        <button
                                            onClick={() => handleRemoveRule(idx)}
                                            className="text-slate-500 hover:text-red-400 transition-colors"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newRule}
                                    onChange={(e) => setNewRule(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddRule()}
                                    placeholder="e.g., Must have phone number"
                                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                                />
                                <button
                                    onClick={handleAddRule}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-sm font-medium transition-all"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <button
                            onClick={handleSaveSettings}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                        >
                            <Save size={16} />
                            {isSaving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                </GlassCard>

                {/* Bot Commands Reference */}
                {company?.discordGuildId && (
                    <GlassCard>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                                <Hash size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">
                                    Bot Commands
                                </h3>
                                <p className="text-sm text-slate-400">
                                    Available slash commands in your Discord server
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                                <code className="text-indigo-400 font-mono">/lead create</code>
                                <span className="text-slate-400">Create a new lead with auto-assignment</span>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                                <code className="text-indigo-400 font-mono">/lead update</code>
                                <span className="text-slate-400">Update lead stage, value, or assignee</span>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                                <code className="text-indigo-400 font-mono">/pipeline view</code>
                                <span className="text-slate-400">View your current pipeline by stage</span>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                                <code className="text-indigo-400 font-mono">/genleads</code>
                                <span className="text-slate-400">AI-generate leads based on your industry</span>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                                <code className="text-indigo-400 font-mono">/remind set</code>
                                <span className="text-slate-400">Set follow-up reminders for leads</span>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                                <code className="text-indigo-400 font-mono">/team list</code>
                                <span className="text-slate-400">View team members and their capacity</span>
                            </div>
                        </div>
                    </GlassCard>
                )}
            </div>
        </div>
    );
}
