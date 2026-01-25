'use client';

/**
 * LeadEnrichmentCard Component
 *
 * Displays enriched lead data and triggers enrichment.
 *
 * Best practice 2026: Progressive disclosure of enrichment data
 */

import React, { useState } from 'react';
import {
    Linkedin,
    Building2,
    User,
    RefreshCw,
    ExternalLink,
    MapPin,
    Users,
    Briefcase,
    Globe,
    Sparkles,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { Lead } from '@/types';
import { EnrichedLeadData } from '@/lib/integrations/enrichment';

interface LeadEnrichmentCardProps {
    lead: Lead;
    enrichment?: EnrichedLeadData | null;
    onEnrich?: () => Promise<void>;
    compact?: boolean;
}

export function LeadEnrichmentCard({
    lead,
    enrichment,
    onEnrich,
    compact = false,
}: LeadEnrichmentCardProps) {
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(!compact);
    const [error, setError] = useState<string | null>(null);

    const handleEnrich = async () => {
        if (!onEnrich) return;

        setLoading(true);
        setError(null);

        try {
            await onEnrich();
        } catch (err) {
            setError('Enrichment failed. Try again later.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // No enrichment data
    if (!enrichment) {
        return (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-500/20 rounded-xl">
                            <Sparkles className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <h4 className="font-medium text-white">Enrich Lead Data</h4>
                            <p className="text-sm text-slate-400">
                                Get LinkedIn, company info, and more
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleEnrich}
                        disabled={loading || !onEnrich}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            loading
                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-violet-500 hover:bg-violet-600 text-white'
                        }`}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'Enriching...' : 'Enrich'}
                    </button>
                </div>

                {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            </div>
        );
    }

    // Enriched data display
    const enrichedDate = new Date(enrichment.enrichedAt).toLocaleDateString();

    return (
        <div className="bg-gradient-to-br from-violet-500/10 to-slate-800/50 border border-violet-500/30 rounded-xl overflow-hidden">
            {/* Header */}
            <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    {enrichment.photoUrl ? (
                        <img
                            src={enrichment.photoUrl}
                            alt={`${enrichment.firstName} ${enrichment.lastName}`}
                            className="w-12 h-12 rounded-full object-cover border-2 border-violet-500/50"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center">
                            <User className="w-6 h-6 text-violet-400" />
                        </div>
                    )}
                    <div>
                        <h4 className="font-medium text-white">
                            {enrichment.firstName} {enrichment.lastName}
                        </h4>
                        <p className="text-sm text-violet-300">
                            {enrichment.title || enrichment.headline}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {enrichment.linkedInUrl && (
                        <a
                            href={enrichment.linkedInUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                            title="View LinkedIn"
                        >
                            <Linkedin className="w-5 h-5" />
                        </a>
                    )}
                    {expanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                </div>
            </div>

            {/* Expanded details */}
            {expanded && (
                <div className="px-4 pb-4 border-t border-slate-700/50 pt-4 space-y-4">
                    {/* Person details */}
                    <div className="grid grid-cols-2 gap-3">
                        {enrichment.seniority && (
                            <div className="flex items-center gap-2 text-sm">
                                <Briefcase className="w-4 h-4 text-slate-400" />
                                <span className="text-slate-300 capitalize">
                                    {enrichment.seniority}
                                </span>
                            </div>
                        )}
                        {enrichment.department && (
                            <div className="flex items-center gap-2 text-sm">
                                <Users className="w-4 h-4 text-slate-400" />
                                <span className="text-slate-300">{enrichment.department}</span>
                            </div>
                        )}
                    </div>

                    {/* Company details */}
                    {enrichment.companyName && (
                        <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-3">
                                {enrichment.companyLogoUrl ? (
                                    <img
                                        src={enrichment.companyLogoUrl}
                                        alt={enrichment.companyName}
                                        className="w-10 h-10 rounded-lg object-contain bg-white p-1"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                                        <Building2 className="w-5 h-5 text-slate-400" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <h5 className="font-medium text-white">
                                        {enrichment.companyName}
                                    </h5>
                                    <p className="text-xs text-slate-400">
                                        {enrichment.companyIndustry}
                                    </p>
                                </div>
                                {enrichment.companyLinkedIn && (
                                    <a
                                        href={enrichment.companyLinkedIn}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {enrichment.companySize && (
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                        <Users className="w-3.5 h-3.5" />
                                        {enrichment.companySize} employees
                                    </div>
                                )}
                                {enrichment.companyLocation && (
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                        <MapPin className="w-3.5 h-3.5" />
                                        {enrichment.companyLocation}
                                    </div>
                                )}
                                {enrichment.companyDomain && (
                                    <a
                                        href={`https://${enrichment.companyDomain}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300"
                                    >
                                        <Globe className="w-3.5 h-3.5" />
                                        {enrichment.companyDomain}
                                    </a>
                                )}
                            </div>

                            {enrichment.companyDescription && (
                                <p className="text-xs text-slate-400 line-clamp-2">
                                    {enrichment.companyDescription}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Technologies */}
                    {enrichment.technologies && enrichment.technologies.length > 0 && (
                        <div>
                            <p className="text-xs text-slate-500 mb-2">Tech Stack</p>
                            <div className="flex flex-wrap gap-1.5">
                                {enrichment.technologies.slice(0, 8).map((tech, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-0.5 bg-slate-700/50 text-slate-300 rounded text-xs"
                                    >
                                        {tech}
                                    </span>
                                ))}
                                {enrichment.technologies.length > 8 && (
                                    <span className="px-2 py-0.5 text-slate-500 text-xs">
                                        +{enrichment.technologies.length - 8} more
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                        <span className="text-xs text-slate-500">
                            Enriched {enrichedDate} via {enrichment.sources.join(', ')}
                        </span>
                        <button
                            onClick={handleEnrich}
                            disabled={loading}
                            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                        >
                            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
