'use client';

/**
 * MeetingScheduler Component
 *
 * Embeds Calendly scheduling widget or displays booking links.
 * Supports prefilling lead information.
 *
 * Best practice 2026: Seamless embedded scheduling
 */

import React, { useState, useEffect } from 'react';
import { Calendar, ExternalLink, Copy, Check, Loader2, Settings } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import {
    getCalendlyConfig,
    CalendlyConfig,
    CalendlyEventType,
    CalendlyService,
} from '@/lib/integrations/calendly';

interface MeetingSchedulerProps {
    leadEmail?: string;
    leadName?: string;
    companyName?: string;
    onMeetingScheduled?: (eventUri: string) => void;
    compact?: boolean;
}

export function MeetingScheduler({
    leadEmail,
    leadName,
    companyName,
    onMeetingScheduled,
    compact = false,
}: MeetingSchedulerProps) {
    const { profile } = useAuth();
    const [config, setConfig] = useState<CalendlyConfig | null>(null);
    const [eventTypes, setEventTypes] = useState<CalendlyEventType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [selectedEventType, setSelectedEventType] = useState<CalendlyEventType | null>(null);
    const [showEmbed, setShowEmbed] = useState(false);

    useEffect(() => {
        async function loadConfig() {
            if (!profile?.companyId) {
                setLoading(false);
                return;
            }

            try {
                const calendlyConfig = await getCalendlyConfig(profile.companyId);
                setConfig(calendlyConfig);

                if (calendlyConfig?.accessToken) {
                    const service = new CalendlyService(
                        calendlyConfig.accessToken,
                        calendlyConfig.userUri
                    );
                    const types = await service.getEventTypes();
                    setEventTypes(types.filter((t) => t.active));
                }
            } catch (err) {
                setError('Failed to load calendar integration');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        loadConfig();
    }, [profile?.companyId]);

    const getSchedulingUrl = (eventType: CalendlyEventType): string => {
        const url = new URL(eventType.schedulingUrl);
        if (leadEmail) url.searchParams.set('email', leadEmail);
        if (leadName) url.searchParams.set('name', leadName);
        if (companyName) url.searchParams.set('a1', companyName); // Custom question
        return url.toString();
    };

    const copyLink = (url: string, eventTypeUri: string) => {
        navigator.clipboard.writeText(url);
        setCopied(eventTypeUri);
        setTimeout(() => setCopied(null), 2000);
    };

    const openScheduler = (eventType: CalendlyEventType) => {
        if (compact) {
            // Open in new tab for compact mode
            window.open(getSchedulingUrl(eventType), '_blank');
        } else {
            // Show embed
            setSelectedEventType(eventType);
            setShowEmbed(true);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
        );
    }

    if (!config?.accessToken) {
        return (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center">
                <Calendar className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                <h3 className="font-semibold text-white mb-2">Calendar Not Connected</h3>
                <p className="text-slate-400 text-sm mb-4">
                    Connect Calendly to schedule meetings with leads
                </p>
                <a
                    href="/settings/integrations"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    <Settings className="w-4 h-4" />
                    Configure Integration
                </a>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
                {error}
            </div>
        );
    }

    if (eventTypes.length === 0) {
        return (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center">
                <Calendar className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                <h3 className="font-semibold text-white mb-2">No Event Types</h3>
                <p className="text-slate-400 text-sm">
                    Create event types in Calendly to enable scheduling
                </p>
            </div>
        );
    }

    // Compact mode - just show a button
    if (compact) {
        const primaryEvent = eventTypes[0];
        return (
            <button
                onClick={() => openScheduler(primaryEvent)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-sm font-medium transition-colors"
            >
                <Calendar className="w-4 h-4" />
                Schedule Meeting
            </button>
        );
    }

    // Full embed mode
    if (showEmbed && selectedEventType) {
        return (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h3 className="font-semibold text-white">Schedule: {selectedEventType.name}</h3>
                    <button
                        onClick={() => setShowEmbed(false)}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>
                <div className="relative w-full" style={{ height: '650px' }}>
                    <iframe
                        src={getSchedulingUrl(selectedEventType)}
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        title={`Schedule ${selectedEventType.name}`}
                    />
                </div>
            </div>
        );
    }

    // Event type list
    return (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Schedule a Meeting
            </h3>

            {eventTypes.map((eventType) => (
                <div
                    key={eventType.uri}
                    className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:bg-slate-800/70 transition-colors"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: eventType.color }}
                            />
                            <div>
                                <h4 className="font-medium text-white">{eventType.name}</h4>
                                <p className="text-sm text-slate-400">{eventType.duration} min</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => copyLink(getSchedulingUrl(eventType), eventType.uri)}
                                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                title="Copy link"
                            >
                                {copied === eventType.uri ? (
                                    <Check className="w-4 h-4 text-green-400" />
                                ) : (
                                    <Copy className="w-4 h-4" />
                                )}
                            </button>
                            <button
                                onClick={() => openScheduler(eventType)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <Calendar className="w-4 h-4" />
                                Book
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            {leadName && (
                <p className="text-xs text-slate-500 text-center mt-4">
                    Scheduling for: {leadName} {leadEmail && `(${leadEmail})`}
                </p>
            )}
        </div>
    );
}
