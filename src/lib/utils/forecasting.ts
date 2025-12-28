import { Lead, LeadStatus } from '@/types';

/**
 * Probability-weighted revenue forecasting utility.
 * Aligned with 2025 enterprise sales management standards.
 */

const WIN_PROBABILITIES: Record<LeadStatus, number> = {
    New: 0.05,
    Contacted: 0.1,
    Qualified: 0.25,
    Proposal: 0.5,
    Negotiation: 0.75,
    Closed: 1.0,
    Lost: 0.0,
};

export interface ForecastResult {
    totalPipeline: number;
    weightedForecast: number;
    dealCount: number;
    confidence: 'high' | 'medium' | 'low';
}

export function calculateRevenueForecast(leads: Lead[]): ForecastResult {
    let totalPipeline = 0;
    let weightedForecast = 0;

    leads.forEach((lead) => {
        const prob = WIN_PROBABILITIES[lead.status] || 0;
        totalPipeline += lead.value;
        weightedForecast += lead.value * prob;
    });

    // Determine confidence based on deal volume and data density
    const confidence = leads.length > 20 ? 'high' : leads.length > 5 ? 'medium' : 'low';

    return {
        totalPipeline: Math.round(totalPipeline),
        weightedForecast: Math.round(weightedForecast),
        dealCount: leads.length,
        confidence,
    };
}
