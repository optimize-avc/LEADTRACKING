/**
 * AI Lead Analyzer Service
 *
 * Two-stage AI analysis for cost optimization:
 * 1. Stage 3: Cheap scoring with GPT-4o-mini / Gemini Flash (batch all leads)
 * 2. Stage 4: Smart analysis with GPT-4o / Claude Sonnet (only high-scoring leads)
 *
 * @see SPEC-AI-LEAD-DISCOVERY.md sections 6.1, 8.1-8.3
 */

import { TargetingCriteria, DiscoveredLeadAIAnalysis, TokenUsage } from '@/types/discovery';
import { RawBusinessData } from './types';

// ========================================
// Configuration
// ========================================

/**
 * Cost limits per spec section 8.2
 */
const AI_LIMITS = {
    maxLeadsToScore: 50, // Max leads through cheap scoring
    maxLeadsToAnalyze: 15, // Max leads through deep analysis
    scoreThreshold: 70, // Only analyze leads scoring >= this
    maxTokensPerSweep: 50_000, // Hard cap per sweep
} as const;

/**
 * Model configuration and pricing
 * Prices are per 1M tokens (input/output)
 */
const MODELS = {
    // Cheap models for batch scoring
    scoring: {
        gemini: {
            name: 'gemini-1.5-flash',
            inputPrice: 0.075, // $0.075 per 1M input tokens
            outputPrice: 0.3, // $0.30 per 1M output tokens
        },
        openai: {
            name: 'gpt-4o-mini',
            inputPrice: 0.15, // $0.15 per 1M input tokens
            outputPrice: 0.6, // $0.60 per 1M output tokens
        },
    },
    // Smart models for deep analysis
    analysis: {
        gemini: {
            name: 'gemini-1.5-pro',
            inputPrice: 1.25, // $1.25 per 1M input tokens
            outputPrice: 5.0, // $5.00 per 1M output tokens
        },
        openai: {
            name: 'gpt-4o',
            inputPrice: 2.5, // $2.50 per 1M input tokens
            outputPrice: 10.0, // $10.00 per 1M output tokens
        },
    },
} as const;

// ========================================
// Types
// ========================================

export interface LeadScore {
    leadIndex: number;
    score: number;
    reasoning: string;
}

export interface LeadAnalysis {
    leadIndex: number;
    score: number;
    matchReasons: string[];
    painPointsIdentified: string[];
    buyingSignals: string[];
    summary: string;
}

export interface ScoringResult {
    scores: LeadScore[];
    tokenUsage: TokenUsage;
    model: string;
    warning?: string;
}

export interface AnalysisResult {
    analyses: LeadAnalysis[];
    tokenUsage: TokenUsage;
    model: string;
    warning?: string;
}

export interface FullAnalysisResult {
    /** AI analysis for each lead (indexed by original lead position) */
    leadAnalyses: Map<number, DiscoveredLeadAIAnalysis>;
    /** Combined token usage from both stages */
    totalTokenUsage: TokenUsage;
    /** Any warnings (e.g., no AI key, fallback used) */
    warnings: string[];
}

// ========================================
// API Key Detection
// ========================================

function getAvailableProvider(): 'gemini' | 'openai' | null {
    // Check for Gemini/Google AI key (preferred - cheaper)
    if (process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY) {
        return 'gemini';
    }
    // Check for OpenAI key
    if (process.env.OPENAI_API_KEY) {
        return 'openai';
    }
    return null;
}

function getApiKey(provider: 'gemini' | 'openai'): string {
    if (provider === 'gemini') {
        return process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
    }
    return process.env.OPENAI_API_KEY || '';
}

// ========================================
// Token Estimation
// ========================================

/**
 * Rough token estimation (4 chars ≈ 1 token for English text)
 */
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * Calculate cost from token usage
 */
function calculateCost(
    inputTokens: number,
    outputTokens: number,
    model:
        | typeof MODELS.scoring.gemini
        | typeof MODELS.scoring.openai
        | typeof MODELS.analysis.gemini
        | typeof MODELS.analysis.openai
): number {
    const inputCost = (inputTokens / 1_000_000) * model.inputPrice;
    const outputCost = (outputTokens / 1_000_000) * model.outputPrice;
    return inputCost + outputCost;
}

// ========================================
// Prompt Builders
// ========================================

/**
 * Build batch scoring prompt
 * All leads in one call for efficiency
 */
function buildScoringPrompt(leads: RawBusinessData[], criteria: TargetingCriteria): string {
    const leadsJson = leads.map((lead, index) => ({
        index,
        name: lead.name,
        industry: lead.industry || 'Unknown',
        location: `${lead.city || ''}, ${lead.state || ''}`.trim() || 'Unknown',
        rating: lead.rating,
        reviewCount: lead.reviewCount,
        website: lead.website ? 'Yes' : 'No',
        description: lead.description?.substring(0, 200) || '',
    }));

    return `You are a B2B lead scoring assistant. Score each business 0-100 based on how well they match the targeting criteria.

TARGETING CRITERIA:
- Target Industries: ${criteria.industries.join(', ') || 'Any'}
- Target Company Size: ${criteria.companySize.min}-${criteria.companySize.max} employees
- Target Geography: ${criteria.geography.cities.join(', ') || criteria.geography.states.join(', ') || 'Any'}
- Pain Points to Look For: ${criteria.painPoints.join(', ') || 'None specified'}
- Buying Signals: ${criteria.buyingSignals.join(', ') || 'None specified'}
- Exclude Keywords: ${criteria.excludeKeywords.join(', ') || 'None'}

BUSINESSES TO SCORE:
${JSON.stringify(leadsJson, null, 2)}

SCORING GUIDE:
- 90-100: Perfect match (right industry, location, shows buying signals)
- 70-89: Strong match (most criteria met)
- 50-69: Moderate match (some criteria met)
- 30-49: Weak match (few criteria met)
- 0-29: Poor match (doesn't fit)

Respond with ONLY valid JSON array, no other text:
[
  {"index": 0, "score": 85, "reasoning": "Brief 1-line reason"},
  ...
]`;
}

/**
 * Build deep analysis prompt for high-scoring leads
 */
function buildAnalysisPrompt(leads: RawBusinessData[], criteria: TargetingCriteria): string {
    const leadsJson = leads.map((lead, index) => ({
        index,
        name: lead.name,
        industry: lead.industry || 'Unknown',
        location: {
            address: lead.address,
            city: lead.city,
            state: lead.state,
        },
        contact: {
            phone: lead.phone,
            email: lead.email,
            website: lead.website,
        },
        metrics: {
            rating: lead.rating,
            reviewCount: lead.reviewCount,
        },
        description: lead.description?.substring(0, 500) || '',
    }));

    return `You are a B2B sales intelligence analyst. Analyze each business and identify opportunities.

IDEAL CUSTOMER PROFILE:
${criteria.idealCustomerProfile || 'Not specified'}

TARGET CRITERIA:
- Industries: ${criteria.industries.join(', ') || 'Any'}
- Company Size: ${criteria.companySize.min}-${criteria.companySize.max} employees
- Geography: ${criteria.geography.cities.join(', ') || criteria.geography.states.join(', ') || 'Any'}
- Pain Points: ${criteria.painPoints.join(', ') || 'None specified'}
- Buying Signals: ${criteria.buyingSignals.join(', ') || 'None specified'}

BUSINESSES TO ANALYZE:
${JSON.stringify(leadsJson, null, 2)}

For each business, provide:
1. matchReasons: 2-4 specific reasons why they match (concrete, not generic)
2. painPointsIdentified: Potential pain points they might have (infer from industry/size)
3. buyingSignals: Any indicators they might be ready to buy
4. summary: 2-3 sentence sales-ready summary

Respond with ONLY valid JSON array, no other text:
[
  {
    "index": 0,
    "matchReasons": ["Reason 1", "Reason 2"],
    "painPointsIdentified": ["Pain point 1"],
    "buyingSignals": ["Signal 1"],
    "summary": "2-3 sentence summary"
  },
  ...
]`;
}

// ========================================
// API Calls
// ========================================

/**
 * Call Gemini API
 */
async function callGemini(
    prompt: string,
    model: string
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
    const apiKey = getApiKey('gemini');

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0, // Deterministic output for consistent scoring
                    topP: 1,
                    topK: 1,
                    maxOutputTokens: 4096,
                },
            }),
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const usageMetadata = data.usageMetadata || {};

    return {
        text,
        inputTokens: usageMetadata.promptTokenCount || estimateTokens(prompt),
        outputTokens: usageMetadata.candidatesTokenCount || estimateTokens(text),
    };
}

/**
 * Call OpenAI API
 */
async function callOpenAI(
    prompt: string,
    model: string
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
    const apiKey = getApiKey('openai');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0, // Deterministic output for consistent scoring
            response_format: { type: 'json_object' },
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const usage = data.usage || {};

    return {
        text,
        inputTokens: usage.prompt_tokens || estimateTokens(prompt),
        outputTokens: usage.completion_tokens || estimateTokens(text),
    };
}

// ========================================
// Parsing Helpers
// ========================================

/**
 * Parse JSON from LLM response (handles markdown code blocks)
 */
function parseJsonResponse<T>(text: string): T {
    // Remove markdown code blocks if present
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    return JSON.parse(cleaned);
}

// ========================================
// Rule-Based Fallback
// ========================================

/**
 * Fallback scoring when no AI is available
 */
function ruleBasedScoring(leads: RawBusinessData[], criteria: TargetingCriteria): ScoringResult {
    const scores: LeadScore[] = leads.map((lead, index) => {
        let score = 50; // Base score
        const reasons: string[] = [];

        // Industry match: +20
        if (criteria.industries.length > 0 && lead.industry) {
            const industryMatch = criteria.industries.some(
                (ind) =>
                    lead.industry!.toLowerCase().includes(ind.toLowerCase()) ||
                    ind.toLowerCase().includes(lead.industry!.toLowerCase())
            );
            if (industryMatch) {
                score += 20;
                reasons.push('Industry match');
            }
        }

        // City match: +15
        if (criteria.geography.cities.length > 0 && lead.city) {
            const cityMatch = criteria.geography.cities.some(
                (city) => city.toLowerCase() === lead.city!.toLowerCase()
            );
            if (cityMatch) {
                score += 15;
                reasons.push('City match');
            }
        }

        // State match: +10
        if (criteria.geography.states.length > 0 && lead.state) {
            const stateMatch = criteria.geography.states.some(
                (state) => state.toLowerCase() === lead.state!.toLowerCase()
            );
            if (stateMatch) {
                score += 10;
                reasons.push('State match');
            }
        }

        // Good rating: +5-10
        if (lead.rating) {
            if (lead.rating >= 4.5) {
                score += 10;
                reasons.push('Excellent rating');
            } else if (lead.rating >= 4.0) {
                score += 5;
                reasons.push('Good rating');
            }
        }

        // Website exists: +5
        if (lead.website) {
            score += 5;
            reasons.push('Has website');
        }

        return {
            leadIndex: index,
            score: Math.min(100, score),
            reasoning: reasons.join(', ') || 'Basic criteria match',
        };
    });

    return {
        scores,
        tokenUsage: {
            tokensUsed: 0,
            apiCalls: 0,
            estimatedCostUSD: 0,
            timestamp: Date.now(),
        },
        model: 'rule-based',
        warning: 'No AI API key configured. Using rule-based scoring.',
    };
}

/**
 * Fallback analysis when no AI is available
 */
function ruleBasedAnalysis(
    leads: RawBusinessData[],
    scores: LeadScore[],
    criteria: TargetingCriteria
): AnalysisResult {
    const analyses: LeadAnalysis[] = leads.map((lead, index) => {
        const scoreData = scores.find((s) => s.leadIndex === index);
        const score = scoreData?.score || 50;

        // Generate match reasons
        const matchReasons: string[] = [];
        if (
            lead.industry &&
            criteria.industries.some((ind) =>
                lead.industry!.toLowerCase().includes(ind.toLowerCase())
            )
        ) {
            matchReasons.push(`In target industry (${lead.industry})`);
        }
        if (
            lead.city &&
            criteria.geography.cities.some(
                (city) => city.toLowerCase() === lead.city!.toLowerCase()
            )
        ) {
            matchReasons.push(`Located in target city (${lead.city})`);
        }
        if (lead.rating && lead.rating >= 4.0) {
            matchReasons.push(`High customer satisfaction (${lead.rating}★)`);
        }
        if (lead.reviewCount && lead.reviewCount >= 50) {
            matchReasons.push(`Established market presence`);
        }
        if (matchReasons.length === 0) {
            matchReasons.push('Meets basic targeting criteria');
        }

        // Infer pain points from industry
        const painPointsIdentified: string[] = [];
        if (criteria.painPoints.length > 0) {
            painPointsIdentified.push(...criteria.painPoints.slice(0, 2));
        }

        // Infer buying signals
        const buyingSignals: string[] = [];
        if (lead.rating && lead.rating >= 4.5 && lead.reviewCount && lead.reviewCount >= 100) {
            buyingSignals.push('Strong market presence indicates growth');
        }

        // Generate summary
        const location = [lead.city, lead.state].filter(Boolean).join(', ');
        const summary = `${lead.name} is a${lead.industry ? ` ${lead.industry}` : ''} business in ${location || 'the target area'}. ${
            lead.rating
                ? `They have ${lead.rating}★ rating`
                : 'They have an active business presence'
        }${lead.reviewCount ? ` from ${lead.reviewCount} reviews` : ''}. Shows alignment with your targeting criteria.`;

        return {
            leadIndex: index,
            score,
            matchReasons,
            painPointsIdentified,
            buyingSignals,
            summary,
        };
    });

    return {
        analyses,
        tokenUsage: {
            tokensUsed: 0,
            apiCalls: 0,
            estimatedCostUSD: 0,
            timestamp: Date.now(),
        },
        model: 'rule-based',
        warning: 'No AI API key configured. Using rule-based analysis.',
    };
}

// ========================================
// Main Functions
// ========================================

/**
 * Stage 3: Batch score all leads with cheap AI model
 *
 * @param leads Raw business data to score
 * @param criteria Targeting criteria to match against
 * @returns Scores for each lead with token usage
 */
export async function scoreBatch(
    leads: RawBusinessData[],
    criteria: TargetingCriteria
): Promise<ScoringResult> {
    // Enforce max leads limit
    const leadsToScore = leads.slice(0, AI_LIMITS.maxLeadsToScore);

    if (leadsToScore.length === 0) {
        return {
            scores: [],
            tokenUsage: {
                tokensUsed: 0,
                apiCalls: 0,
                estimatedCostUSD: 0,
                timestamp: Date.now(),
            },
            model: 'none',
        };
    }

    // Check for available AI provider
    const provider = getAvailableProvider();
    if (!provider) {
        console.warn('[AI Analyzer] No AI API key found, using rule-based scoring');
        return ruleBasedScoring(leadsToScore, criteria);
    }

    try {
        const prompt = buildScoringPrompt(leadsToScore, criteria);
        const modelConfig = MODELS.scoring[provider];

        console.log(`[AI Analyzer] Scoring ${leadsToScore.length} leads with ${modelConfig.name}`);

        const { text, inputTokens, outputTokens } =
            provider === 'gemini'
                ? await callGemini(prompt, modelConfig.name)
                : await callOpenAI(prompt, modelConfig.name);

        const scores =
            parseJsonResponse<Array<{ index: number; score: number; reasoning: string }>>(text);

        const cost = calculateCost(inputTokens, outputTokens, modelConfig);

        return {
            scores: scores.map((s) => ({
                leadIndex: s.index,
                score: Math.min(100, Math.max(0, s.score)),
                reasoning: s.reasoning,
            })),
            tokenUsage: {
                tokensUsed: inputTokens + outputTokens,
                apiCalls: 1,
                estimatedCostUSD: cost,
                timestamp: Date.now(),
            },
            model: modelConfig.name,
        };
    } catch (error) {
        console.error('[AI Analyzer] Scoring error:', error);
        // Fallback to rule-based scoring on error
        const result = ruleBasedScoring(leadsToScore, criteria);
        result.warning = `AI scoring failed: ${error instanceof Error ? error.message : 'Unknown error'}. Using rule-based fallback.`;
        return result;
    }
}

/**
 * Stage 4: Deep analysis for high-scoring leads only
 *
 * @param leads Raw business data (already filtered to high scorers)
 * @param scores Scores from scoreBatch (to include in results)
 * @param criteria Targeting criteria for context
 * @returns Detailed analysis for each lead
 */
export async function analyzeLeads(
    leads: RawBusinessData[],
    scores: LeadScore[],
    criteria: TargetingCriteria
): Promise<AnalysisResult> {
    // Enforce max leads limit
    const leadsToAnalyze = leads.slice(0, AI_LIMITS.maxLeadsToAnalyze);

    if (leadsToAnalyze.length === 0) {
        return {
            analyses: [],
            tokenUsage: {
                tokensUsed: 0,
                apiCalls: 0,
                estimatedCostUSD: 0,
                timestamp: Date.now(),
            },
            model: 'none',
        };
    }

    // Check for available AI provider
    const provider = getAvailableProvider();
    if (!provider) {
        console.warn('[AI Analyzer] No AI API key found, using rule-based analysis');
        return ruleBasedAnalysis(leadsToAnalyze, scores, criteria);
    }

    try {
        const prompt = buildAnalysisPrompt(leadsToAnalyze, criteria);
        const modelConfig = MODELS.analysis[provider];

        console.log(
            `[AI Analyzer] Analyzing ${leadsToAnalyze.length} leads with ${modelConfig.name}`
        );

        const { text, inputTokens, outputTokens } =
            provider === 'gemini'
                ? await callGemini(prompt, modelConfig.name)
                : await callOpenAI(prompt, modelConfig.name);

        const analyses = parseJsonResponse<
            Array<{
                index: number;
                matchReasons: string[];
                painPointsIdentified: string[];
                buyingSignals: string[];
                summary: string;
            }>
        >(text);

        const cost = calculateCost(inputTokens, outputTokens, modelConfig);

        // Merge with scores
        return {
            analyses: analyses.map((a) => {
                const scoreData = scores.find((s) => s.leadIndex === a.index);
                return {
                    leadIndex: a.index,
                    score: scoreData?.score || 50,
                    matchReasons: a.matchReasons || [],
                    painPointsIdentified: a.painPointsIdentified || [],
                    buyingSignals: a.buyingSignals || [],
                    summary: a.summary || '',
                };
            }),
            tokenUsage: {
                tokensUsed: inputTokens + outputTokens,
                apiCalls: 1,
                estimatedCostUSD: cost,
                timestamp: Date.now(),
            },
            model: modelConfig.name,
        };
    } catch (error) {
        console.error('[AI Analyzer] Analysis error:', error);
        // Fallback to rule-based analysis on error
        const result = ruleBasedAnalysis(leadsToAnalyze, scores, criteria);
        result.warning = `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}. Using rule-based fallback.`;
        return result;
    }
}

/**
 * Full AI analysis pipeline (both stages)
 *
 * This is the main entry point for the sweep route.
 *
 * @param leads All raw business data from collectors
 * @param criteria Targeting criteria
 * @returns AI analysis for each lead plus combined token usage
 */
export async function analyzeAllLeads(
    leads: RawBusinessData[],
    criteria: TargetingCriteria
): Promise<FullAnalysisResult> {
    const warnings: string[] = [];
    const leadAnalyses = new Map<number, DiscoveredLeadAIAnalysis>();

    // Initialize token tracking
    let totalTokens = 0;
    let totalCost = 0;
    let totalApiCalls = 0;

    console.log(`[AI Analyzer] Starting analysis of ${leads.length} leads`);

    // Stage 3: Batch scoring
    const scoringResult = await scoreBatch(leads, criteria);

    totalTokens += scoringResult.tokenUsage.tokensUsed;
    totalCost += scoringResult.tokenUsage.estimatedCostUSD;
    totalApiCalls += scoringResult.tokenUsage.apiCalls;

    if (scoringResult.warning) {
        warnings.push(scoringResult.warning);
    }

    console.log(
        `[AI Analyzer] Scoring complete. Model: ${scoringResult.model}, Tokens: ${scoringResult.tokenUsage.tokensUsed}`
    );

    // Find high-scoring leads for deep analysis
    const highScorers = scoringResult.scores.filter((s) => s.score >= AI_LIMITS.scoreThreshold);
    const highScoringLeads = highScorers.map((s) => leads[s.leadIndex]);
    const highScoringScores = highScorers;

    console.log(
        `[AI Analyzer] ${highScorers.length} leads scored >= ${AI_LIMITS.scoreThreshold} for deep analysis`
    );

    // Stage 4: Deep analysis (only for high scorers)
    let analysisResult: AnalysisResult;
    if (highScoringLeads.length > 0) {
        analysisResult = await analyzeLeads(highScoringLeads, highScoringScores, criteria);

        totalTokens += analysisResult.tokenUsage.tokensUsed;
        totalCost += analysisResult.tokenUsage.estimatedCostUSD;
        totalApiCalls += analysisResult.tokenUsage.apiCalls;

        if (analysisResult.warning) {
            warnings.push(analysisResult.warning);
        }

        console.log(
            `[AI Analyzer] Analysis complete. Model: ${analysisResult.model}, Tokens: ${analysisResult.tokenUsage.tokensUsed}`
        );
    } else {
        analysisResult = {
            analyses: [],
            tokenUsage: { tokensUsed: 0, apiCalls: 0, estimatedCostUSD: 0, timestamp: Date.now() },
            model: 'none',
        };
    }

    // Build analysis map for all leads
    for (let i = 0; i < leads.length; i++) {
        const scoreData = scoringResult.scores.find((s) => s.leadIndex === i);
        const score = scoreData?.score || 50;

        // Check if this lead got deep analysis
        // Need to find the analysis by mapping back through the high scorer index
        const highScorerIndex = highScorers.findIndex((hs) => hs.leadIndex === i);
        const analysis =
            highScorerIndex >= 0
                ? analysisResult.analyses.find((a) => a.leadIndex === highScorerIndex)
                : null;

        if (analysis) {
            // Use deep analysis results
            leadAnalyses.set(i, {
                matchScore: score,
                matchReasons: analysis.matchReasons,
                painPointsIdentified: analysis.painPointsIdentified,
                buyingSignals: analysis.buyingSignals,
                summary: analysis.summary,
            });
        } else {
            // Use basic scoring results for lower-scoring leads
            const lead = leads[i];
            leadAnalyses.set(i, {
                matchScore: score,
                matchReasons: [scoreData?.reasoning || 'Basic criteria match'],
                painPointsIdentified: [],
                buyingSignals: [],
                summary: generateBasicSummary(lead, score),
            });
        }
    }

    console.log(
        `[AI Analyzer] Complete. Total tokens: ${totalTokens}, Cost: $${totalCost.toFixed(4)}`
    );

    return {
        leadAnalyses,
        totalTokenUsage: {
            tokensUsed: totalTokens,
            apiCalls: totalApiCalls,
            estimatedCostUSD: totalCost,
            timestamp: Date.now(),
        },
        warnings,
    };
}

/**
 * Generate a basic summary for low-scoring leads (no AI call)
 */
function generateBasicSummary(lead: RawBusinessData, score: number): string {
    const strength = score >= 70 ? 'strong' : score >= 50 ? 'moderate' : 'weak';
    const location = [lead.city, lead.state].filter(Boolean).join(', ');

    let summary = `${lead.name} is a${lead.industry ? ` ${lead.industry}` : ''} business`;
    if (location) summary += ` in ${location}`;

    if (lead.rating && lead.reviewCount) {
        summary += ` with ${lead.rating}★ rating from ${lead.reviewCount} reviews`;
    }

    summary += `. Shows ${strength} alignment with targeting criteria.`;

    return summary;
}

// ========================================
// Utility Exports
// ========================================

export { AI_LIMITS, getAvailableProvider };
