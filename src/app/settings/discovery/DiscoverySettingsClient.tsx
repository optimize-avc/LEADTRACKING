'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { Badge } from '@/components/ui/Badge';
import {
    Search,
    Sparkles,
    Calendar,
    Bell,
    Save,
    Play,
    ChevronLeft,
    Plus,
    X,
    Clock,
    Target,
    Building2,
    MapPin,
    AlertCircle,
    CheckCircle2,
    Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { DiscoveryProfile, TargetingCriteria } from '@/types/discovery';

export default function DiscoverySettingsClient() {
    const { user, loading: authLoading } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [isRunningSwep, setIsRunningSweep] = useState(false);
    const [profile, setProfile] = useState<DiscoveryProfile | null>(null);
    const [isNew, setIsNew] = useState(true);

    // Form state
    const [businessDescription, setBusinessDescription] = useState('');
    const [targetingCriteria, setTargetingCriteria] = useState<TargetingCriteria>({
        industries: [],
        companySize: { min: 10, max: 500 },
        geography: { countries: ['US'], states: [], cities: [] },
        painPoints: [],
        buyingSignals: [],
        excludeKeywords: [],
        idealCustomerProfile: '',
    });
    const [scheduleEnabled, setScheduleEnabled] = useState(false);
    const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>(
        'weekly'
    );
    const [preferredTime, setPreferredTime] = useState('09:00');
    const [discordEnabled, setDiscordEnabled] = useState(false);
    const [discordChannelId, setDiscordChannelId] = useState<string | null>(null);

    // Tag input state
    const [newIndustry, setNewIndustry] = useState('');
    const [newState, setNewState] = useState('');
    const [newCity, setNewCity] = useState('');
    const [newPainPoint, setNewPainPoint] = useState('');
    const [newBuyingSignal, setNewBuyingSignal] = useState('');

    // Get auth token
    const getAuthToken = useCallback(async () => {
        if (!user) return null;
        try {
            return await user.getIdToken();
        } catch {
            return null;
        }
    }, [user]);

    // Load profile
    const loadProfile = useCallback(async () => {
        const token = await getAuthToken();
        if (!token) {
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/discovery/profile', {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error('Failed to load profile');

            const data = await res.json();
            setProfile(data.profile);
            setIsNew(data.isNew);

            // Populate form
            if (data.profile) {
                setBusinessDescription(data.profile.businessDescription || '');
                setTargetingCriteria(data.profile.targetingCriteria || targetingCriteria);
                setScheduleEnabled(data.profile.schedule?.enabled || false);
                setFrequency(data.profile.schedule?.frequency || 'weekly');
                setPreferredTime(data.profile.schedule?.preferredTime || '09:00');
                setDiscordEnabled(data.profile.notifications?.discord?.enabled || false);
                setDiscordChannelId(data.profile.notifications?.discord?.channelId || null);
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
            toast.error('Failed to load discovery settings');
        } finally {
            setIsLoading(false);
        }
    }, [getAuthToken]);

    useEffect(() => {
        if (!authLoading && user) {
            loadProfile();
        } else if (!authLoading && !user) {
            setIsLoading(false);
        }
    }, [user, authLoading, loadProfile]);

    // Parse business description with AI
    const handleParseDescription = async () => {
        if (!businessDescription.trim() || businessDescription.length < 20) {
            toast.error('Please enter a more detailed business description');
            return;
        }

        const token = await getAuthToken();
        if (!token) return;

        setIsParsing(true);
        try {
            const res = await fetch('/api/discovery/parse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ description: businessDescription }),
            });

            if (!res.ok) throw new Error('Failed to parse description');

            const data = await res.json();
            setTargetingCriteria(data.targetingCriteria);
            toast.success('✨ Business description parsed successfully!');
        } catch (error) {
            console.error('Parse error:', error);
            toast.error('Failed to parse business description');
        } finally {
            setIsParsing(false);
        }
    };

    // Save profile
    const handleSave = async () => {
        const token = await getAuthToken();
        if (!token) return;

        setIsSaving(true);
        try {
            const res = await fetch('/api/discovery/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    businessDescription,
                    targetingCriteria,
                    schedule: {
                        enabled: scheduleEnabled,
                        frequency,
                        preferredTime,
                    },
                    notifications: {
                        discord: {
                            enabled: discordEnabled,
                            channelId: discordChannelId,
                        },
                    },
                }),
            });

            if (!res.ok) throw new Error('Failed to save');

            const data = await res.json();
            setProfile(data.profile);
            setIsNew(false);
            toast.success('Settings saved successfully!');
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    // Run sweep now
    const handleRunSweep = async () => {
        const token = await getAuthToken();
        if (!token) return;

        if (!businessDescription || targetingCriteria.industries.length === 0) {
            toast.error('Please configure your business description and targeting criteria first');
            return;
        }

        setIsRunningSweep(true);
        try {
            const res = await fetch('/api/discovery/sweep', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to run sweep');
            }

            toast.success(`🎉 ${data.message}`);
            // Reload profile to get updated stats
            loadProfile();
        } catch (error) {
            console.error('Sweep error:', error);
            toast.error((error as Error).message || 'Failed to run discovery sweep');
        } finally {
            setIsRunningSweep(false);
        }
    };

    // Tag helpers
    const addTag = (
        list: string[],
        setList: (v: string[]) => void,
        value: string,
        setValue: (v: string) => void
    ) => {
        const trimmed = value.trim();
        if (trimmed && !list.includes(trimmed)) {
            setList([...list, trimmed]);
        }
        setValue('');
    };

    const removeTag = (list: string[], setList: (v: string[]) => void, index: number) => {
        setList(list.filter((_, i) => i !== index));
    };

    if (authLoading || isLoading) {
        return (
            <div className="p-8 min-h-screen flex items-center justify-center">
                <div className="flex items-center gap-3 text-slate-500">
                    <Loader2 className="animate-spin" size={20} />
                    <span>Loading discovery settings...</span>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="p-8 min-h-screen flex items-center justify-center">
                <div className="text-slate-500">Please log in to access Discovery settings.</div>
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
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <Search size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                            AI Lead Discovery
                        </h1>
                        <p className="text-slate-500 text-sm">
                            Configure automated prospecting for your business
                        </p>
                    </div>
                </div>
            </header>

            <div className="grid gap-6 max-w-3xl">
                {/* Stats Bar (if not new) */}
                {!isNew && profile?.stats && (
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div className="text-2xl font-bold text-white">
                                {profile.stats.totalLeadsFound}
                            </div>
                            <div className="text-xs text-slate-500">Total Found</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div className="text-2xl font-bold text-green-400">
                                {profile.stats.leadsAddedToPipeline}
                            </div>
                            <div className="text-xs text-slate-500">Added to Pipeline</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div className="text-2xl font-bold text-slate-400">
                                {profile.stats.leadsDismissed}
                            </div>
                            <div className="text-xs text-slate-500">Dismissed</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div className="text-2xl font-bold text-blue-400">
                                {profile.stats.lastSweepLeadsCount}
                            </div>
                            <div className="text-xs text-slate-500">Last Sweep</div>
                        </div>
                    </div>
                )}

                {/* Business Description Card */}
                <GlassCard className="border-l-4 border-l-emerald-500">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <Building2 size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">
                                Describe Your Business
                            </h3>
                            <p className="text-sm text-slate-400">
                                Tell us about your ideal customers in plain English
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <textarea
                            value={businessDescription}
                            onChange={(e) => setBusinessDescription(e.target.value)}
                            placeholder="e.g., We're a commercial HVAC company in Texas. We help businesses with 50-500 employees reduce energy costs through modern HVAC systems. Our ideal customers are warehouses, manufacturing plants, and office buildings that have equipment over 10 years old..."
                            rows={5}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={handleParseDescription}
                                disabled={isParsing || businessDescription.length < 20}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                            >
                                {isParsing ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Sparkles size={16} />
                                )}
                                {isParsing ? 'Parsing...' : 'Parse with AI'}
                            </button>
                        </div>
                    </div>
                </GlassCard>

                {/* Targeting Criteria Card */}
                <GlassCard>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                            <Target size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Targeting Criteria</h3>
                            <p className="text-sm text-slate-400">
                                Review and refine your AI-parsed criteria
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Industries */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Target Industries
                            </label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {targetingCriteria.industries.map((ind, idx) => (
                                    <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm border border-purple-500/30"
                                    >
                                        {ind}
                                        <button
                                            onClick={() => {
                                                const newList = [...targetingCriteria.industries];
                                                newList.splice(idx, 1);
                                                setTargetingCriteria({
                                                    ...targetingCriteria,
                                                    industries: newList,
                                                });
                                            }}
                                            className="hover:text-red-400"
                                        >
                                            <X size={14} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newIndustry}
                                    onChange={(e) => setNewIndustry(e.target.value)}
                                    onKeyDown={(e) =>
                                        e.key === 'Enter' &&
                                        addTag(
                                            targetingCriteria.industries,
                                            (v) =>
                                                setTargetingCriteria({
                                                    ...targetingCriteria,
                                                    industries: v,
                                                }),
                                            newIndustry,
                                            setNewIndustry
                                        )
                                    }
                                    placeholder="Add industry..."
                                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm"
                                />
                                <button
                                    onClick={() =>
                                        addTag(
                                            targetingCriteria.industries,
                                            (v) =>
                                                setTargetingCriteria({
                                                    ...targetingCriteria,
                                                    industries: v,
                                                }),
                                            newIndustry,
                                            setNewIndustry
                                        )
                                    }
                                    className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-sm"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Company Size */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Company Size (employees)
                            </label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="number"
                                    value={targetingCriteria.companySize.min}
                                    onChange={(e) =>
                                        setTargetingCriteria({
                                            ...targetingCriteria,
                                            companySize: {
                                                ...targetingCriteria.companySize,
                                                min: parseInt(e.target.value) || 0,
                                            },
                                        })
                                    }
                                    className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-center focus:outline-none focus:border-purple-500"
                                />
                                <span className="text-slate-500">to</span>
                                <input
                                    type="number"
                                    value={targetingCriteria.companySize.max}
                                    onChange={(e) =>
                                        setTargetingCriteria({
                                            ...targetingCriteria,
                                            companySize: {
                                                ...targetingCriteria.companySize,
                                                max: parseInt(e.target.value) || 0,
                                            },
                                        })
                                    }
                                    className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-center focus:outline-none focus:border-purple-500"
                                />
                                <span className="text-slate-500">employees</span>
                            </div>
                        </div>

                        {/* Geography */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                <MapPin size={14} className="inline mr-1" />
                                Geography
                            </label>
                            <div className="space-y-3">
                                {/* States */}
                                <div>
                                    <div className="text-xs text-slate-500 mb-1">States</div>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {targetingCriteria.geography.states.map((state, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs border border-blue-500/30"
                                            >
                                                {state}
                                                <button
                                                    onClick={() => {
                                                        const newList = [
                                                            ...targetingCriteria.geography.states,
                                                        ];
                                                        newList.splice(idx, 1);
                                                        setTargetingCriteria({
                                                            ...targetingCriteria,
                                                            geography: {
                                                                ...targetingCriteria.geography,
                                                                states: newList,
                                                            },
                                                        });
                                                    }}
                                                    className="hover:text-red-400"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newState}
                                            onChange={(e) =>
                                                setNewState(e.target.value.toUpperCase())
                                            }
                                            onKeyDown={(e) =>
                                                e.key === 'Enter' &&
                                                addTag(
                                                    targetingCriteria.geography.states,
                                                    (v) =>
                                                        setTargetingCriteria({
                                                            ...targetingCriteria,
                                                            geography: {
                                                                ...targetingCriteria.geography,
                                                                states: v,
                                                            },
                                                        }),
                                                    newState,
                                                    setNewState
                                                )
                                            }
                                            placeholder="Add state (e.g., TX)"
                                            maxLength={2}
                                            className="w-32 px-3 py-1 bg-white/5 border border-white/10 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                                        />
                                        <button
                                            onClick={() =>
                                                addTag(
                                                    targetingCriteria.geography.states,
                                                    (v) =>
                                                        setTargetingCriteria({
                                                            ...targetingCriteria,
                                                            geography: {
                                                                ...targetingCriteria.geography,
                                                                states: v,
                                                            },
                                                        }),
                                                    newState,
                                                    setNewState
                                                )
                                            }
                                            className="px-2 py-1 bg-white/10 hover:bg-white/15 text-white rounded text-sm"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Cities */}
                                <div>
                                    <div className="text-xs text-slate-500 mb-1">Cities</div>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {targetingCriteria.geography.cities.map((city, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-teal-500/20 text-teal-300 rounded text-xs border border-teal-500/30"
                                            >
                                                {city}
                                                <button
                                                    onClick={() => {
                                                        const newList = [
                                                            ...targetingCriteria.geography.cities,
                                                        ];
                                                        newList.splice(idx, 1);
                                                        setTargetingCriteria({
                                                            ...targetingCriteria,
                                                            geography: {
                                                                ...targetingCriteria.geography,
                                                                cities: newList,
                                                            },
                                                        });
                                                    }}
                                                    className="hover:text-red-400"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newCity}
                                            onChange={(e) => setNewCity(e.target.value)}
                                            onKeyDown={(e) =>
                                                e.key === 'Enter' &&
                                                addTag(
                                                    targetingCriteria.geography.cities,
                                                    (v) =>
                                                        setTargetingCriteria({
                                                            ...targetingCriteria,
                                                            geography: {
                                                                ...targetingCriteria.geography,
                                                                cities: v,
                                                            },
                                                        }),
                                                    newCity,
                                                    setNewCity
                                                )
                                            }
                                            placeholder="Add city..."
                                            className="flex-1 px-3 py-1 bg-white/5 border border-white/10 rounded text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm"
                                        />
                                        <button
                                            onClick={() =>
                                                addTag(
                                                    targetingCriteria.geography.cities,
                                                    (v) =>
                                                        setTargetingCriteria({
                                                            ...targetingCriteria,
                                                            geography: {
                                                                ...targetingCriteria.geography,
                                                                cities: v,
                                                            },
                                                        }),
                                                    newCity,
                                                    setNewCity
                                                )
                                            }
                                            className="px-2 py-1 bg-white/10 hover:bg-white/15 text-white rounded text-sm"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pain Points */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Pain Points to Look For
                            </label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {targetingCriteria.painPoints.map((pp, idx) => (
                                    <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs border border-red-500/30"
                                    >
                                        {pp}
                                        <button
                                            onClick={() => {
                                                const newList = [...targetingCriteria.painPoints];
                                                newList.splice(idx, 1);
                                                setTargetingCriteria({
                                                    ...targetingCriteria,
                                                    painPoints: newList,
                                                });
                                            }}
                                            className="hover:text-red-400"
                                        >
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newPainPoint}
                                    onChange={(e) => setNewPainPoint(e.target.value)}
                                    onKeyDown={(e) =>
                                        e.key === 'Enter' &&
                                        addTag(
                                            targetingCriteria.painPoints,
                                            (v) =>
                                                setTargetingCriteria({
                                                    ...targetingCriteria,
                                                    painPoints: v,
                                                }),
                                            newPainPoint,
                                            setNewPainPoint
                                        )
                                    }
                                    placeholder="e.g., high energy costs"
                                    className="flex-1 px-3 py-1 bg-white/5 border border-white/10 rounded text-white placeholder-slate-500 focus:outline-none focus:border-red-500 text-sm"
                                />
                                <button
                                    onClick={() =>
                                        addTag(
                                            targetingCriteria.painPoints,
                                            (v) =>
                                                setTargetingCriteria({
                                                    ...targetingCriteria,
                                                    painPoints: v,
                                                }),
                                            newPainPoint,
                                            setNewPainPoint
                                        )
                                    }
                                    className="px-2 py-1 bg-white/10 hover:bg-white/15 text-white rounded text-sm"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Buying Signals */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Buying Signals
                            </label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {targetingCriteria.buyingSignals.map((bs, idx) => (
                                    <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs border border-green-500/30"
                                    >
                                        {bs}
                                        <button
                                            onClick={() => {
                                                const newList = [
                                                    ...targetingCriteria.buyingSignals,
                                                ];
                                                newList.splice(idx, 1);
                                                setTargetingCriteria({
                                                    ...targetingCriteria,
                                                    buyingSignals: newList,
                                                });
                                            }}
                                            className="hover:text-red-400"
                                        >
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newBuyingSignal}
                                    onChange={(e) => setNewBuyingSignal(e.target.value)}
                                    onKeyDown={(e) =>
                                        e.key === 'Enter' &&
                                        addTag(
                                            targetingCriteria.buyingSignals,
                                            (v) =>
                                                setTargetingCriteria({
                                                    ...targetingCriteria,
                                                    buyingSignals: v,
                                                }),
                                            newBuyingSignal,
                                            setNewBuyingSignal
                                        )
                                    }
                                    placeholder="e.g., hiring, expanding"
                                    className="flex-1 px-3 py-1 bg-white/5 border border-white/10 rounded text-white placeholder-slate-500 focus:outline-none focus:border-green-500 text-sm"
                                />
                                <button
                                    onClick={() =>
                                        addTag(
                                            targetingCriteria.buyingSignals,
                                            (v) =>
                                                setTargetingCriteria({
                                                    ...targetingCriteria,
                                                    buyingSignals: v,
                                                }),
                                            newBuyingSignal,
                                            setNewBuyingSignal
                                        )
                                    }
                                    className="px-2 py-1 bg-white/10 hover:bg-white/15 text-white rounded text-sm"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* Schedule Card */}
                <GlassCard>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                            <Calendar size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Schedule</h3>
                            <p className="text-sm text-slate-400">
                                Configure automated discovery sweeps
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Enable/Disable */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-300">Enable scheduled sweeps</span>
                            <button
                                onClick={() => setScheduleEnabled(!scheduleEnabled)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${
                                    scheduleEnabled ? 'bg-emerald-500' : 'bg-white/20'
                                }`}
                            >
                                <span
                                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                        scheduleEnabled ? 'translate-x-6' : ''
                                    }`}
                                />
                            </button>
                        </div>

                        {scheduleEnabled && (
                            <div className="space-y-4 pt-4 border-t border-white/10">
                                {/* Frequency */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Run every
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {(['daily', 'weekly', 'biweekly', 'monthly'] as const).map(
                                            (f) => (
                                                <button
                                                    key={f}
                                                    onClick={() => setFrequency(f)}
                                                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                                                        frequency === f
                                                            ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                                                            : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                                                    }`}
                                                >
                                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* Preferred Time */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        <Clock size={14} className="inline mr-1" />
                                        Preferred time (UTC)
                                    </label>
                                    <input
                                        type="time"
                                        value={preferredTime}
                                        onChange={(e) => setPreferredTime(e.target.value)}
                                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                {profile?.schedule?.nextRunAt && (
                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                        <CheckCircle2 size={14} className="text-green-400" />
                                        Next sweep:{' '}
                                        {new Date(profile.schedule.nextRunAt).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </GlassCard>

                {/* Notifications Card */}
                <GlassCard>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                            <Bell size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Notifications</h3>
                            <p className="text-sm text-slate-400">
                                How should we notify you of new leads?
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Discord */}
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🎮</span>
                                <div>
                                    <div className="text-sm font-medium text-white">Discord</div>
                                    <div className="text-xs text-slate-500">
                                        Post to your Discord server
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setDiscordEnabled(!discordEnabled)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${
                                    discordEnabled ? 'bg-[#5865F2]' : 'bg-white/20'
                                }`}
                            >
                                <span
                                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                        discordEnabled ? 'translate-x-6' : ''
                                    }`}
                                />
                            </button>
                        </div>

                        {/* In-App (always on) */}
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">📱</span>
                                <div>
                                    <div className="text-sm font-medium text-white">In-App</div>
                                    <div className="text-xs text-slate-500">
                                        View in Discover page
                                    </div>
                                </div>
                            </div>
                            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                                Always On
                            </Badge>
                        </div>
                    </div>
                </GlassCard>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4">
                    <button
                        onClick={handleRunSweep}
                        disabled={
                            isRunningSwep ||
                            !businessDescription ||
                            targetingCriteria.industries.length === 0
                        }
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isRunningSwep ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Play size={16} />
                        )}
                        {isRunningSwep ? 'Running...' : 'Run Sweep Now'}
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                    >
                        {isSaving ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Save size={16} />
                        )}
                        {isSaving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>

                {/* Info Note */}
                <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <AlertCircle size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-green-200">
                        <strong>Google Places Active:</strong> Discovery sweeps now pull real
                        business data from Google Places API. Configure your targeting criteria
                        above and run a sweep to find leads matching your ideal customer profile.
                    </div>
                </div>
            </div>
        </div>
    );
}
