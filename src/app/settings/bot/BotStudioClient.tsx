'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { Badge } from '@/components/ui/Badge';
import { Bot, Link2, Unlink, Settings, MessageSquare, Save, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { CompanyService } from '@/lib/firebase/company';
import type { Company, CompanySettings } from '@/types/company';
import Link from 'next/link';

// Discord OAuth2 configuration
const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
const DISCORD_REDIRECT_URI =
    typeof window !== 'undefined' ? `${window.location.origin}/api/discord/callback` : '';

export default function BotStudioClient() {
    const { user, loading: authLoading } = useAuth();
    const [company, setCompany] = useState<Company | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [industry, setIndustry] = useState('');
    const [persona, setPersona] = useState<'professional' | 'friendly' | 'casual'>('professional');
    const [qualificationRules, setQualificationRules] = useState<string[]>([]);
    const [newRule, setNewRule] = useState('');

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
            }
        } catch (error) {
            console.error('Failed to load company:', error);
            toast.error('Failed to load company settings');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

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
                                            {company.discordGuildName || 'Unknown Server'}
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

                {/* Channel Mapping Card - Only show if connected */}
                {company?.discordGuildId && (
                    <GlassCard>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                <MessageSquare size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">
                                    Channel Mapping
                                </h3>
                                <p className="text-sm text-slate-400">
                                    Select which Discord channels receive notifications
                                </p>
                            </div>
                        </div>

                        <div className="text-sm text-slate-500 italic">
                            Channel mapping configuration will be available after connecting your
                            Discord server and granting the bot access to view channels.
                        </div>
                    </GlassCard>
                )}
            </div>
        </div>
    );
}
