/**
 * Token Safety System for AI Lead Discovery
 * 
 * Implements hard limits and circuit breakers to prevent runaway AI costs.
 * All limits are enforced, not just suggested.
 */

import {
    TokenSafetyConfig,
    TokenUsage,
    DailyUsageRecord,
    DEFAULT_TOKEN_SAFETY,
} from '@/types/discovery';

// ========================================
// Token Budget Class (Per-Sweep Tracking)
// ========================================

export class TokenBudget {
    private tokensUsed = 0;
    private apiCalls = 0;
    private costUSD = 0;
    private readonly config: TokenSafetyConfig;
    private readonly sweepId: string;

    constructor(sweepId: string, config: TokenSafetyConfig = DEFAULT_TOKEN_SAFETY) {
        this.sweepId = sweepId;
        this.config = config;
    }

    /**
     * Consume tokens from the budget
     * @throws Error if budget exceeded
     */
    consume(tokens: number, costUSD: number = 0): void {
        // Pre-check before consuming
        if (this.tokensUsed + tokens > this.config.maxTokensPerSweep) {
            throw new TokenBudgetExceededError(
                `Sweep ${this.sweepId} would exceed token budget. ` +
                `Used: ${this.tokensUsed}, Adding: ${tokens}, Limit: ${this.config.maxTokensPerSweep}`
            );
        }

        if (this.apiCalls + 1 > this.config.maxAPICallsPerSweep) {
            throw new TokenBudgetExceededError(
                `Sweep ${this.sweepId} would exceed API call limit. ` +
                `Used: ${this.apiCalls}, Limit: ${this.config.maxAPICallsPerSweep}`
            );
        }

        this.tokensUsed += tokens;
        this.apiCalls += 1;
        this.costUSD += costUSD;

        // Log for monitoring
        console.log(`[TokenBudget:${this.sweepId}] Consumed ${tokens} tokens (${this.apiCalls}/${this.config.maxAPICallsPerSweep} calls). Total: ${this.tokensUsed}/${this.config.maxTokensPerSweep}`);
    }

    /**
     * Check if we can consume more tokens
     */
    canConsume(estimatedTokens: number): boolean {
        return (
            this.tokensUsed + estimatedTokens <= this.config.maxTokensPerSweep &&
            this.apiCalls + 1 <= this.config.maxAPICallsPerSweep
        );
    }

    /**
     * Get remaining token budget
     */
    getRemaining(): number {
        return Math.max(0, this.config.maxTokensPerSweep - this.tokensUsed);
    }

    /**
     * Get remaining API calls
     */
    getRemainingCalls(): number {
        return Math.max(0, this.config.maxAPICallsPerSweep - this.apiCalls);
    }

    /**
     * Get current usage statistics
     */
    getUsage(): TokenUsage {
        return {
            tokensUsed: this.tokensUsed,
            apiCalls: this.apiCalls,
            estimatedCostUSD: this.costUSD,
            timestamp: Date.now(),
        };
    }

    /**
     * Calculate how many items we can process with remaining budget
     */
    calculateBatchSize(tokensPerItem: number, maxItems: number): number {
        const remainingTokens = this.getRemaining();
        const itemsByTokens = Math.floor(remainingTokens / tokensPerItem);
        const itemsByCalls = this.getRemainingCalls();
        return Math.min(itemsByTokens, itemsByCalls, maxItems);
    }
}

// ========================================
// Custom Errors
// ========================================

export class TokenBudgetExceededError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TokenBudgetExceededError';
    }
}

export class DailyLimitExceededError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DailyLimitExceededError';
    }
}

export class CircuitBreakerOpenError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CircuitBreakerOpenError';
    }
}

// ========================================
// Cost Estimation Helpers
// ========================================

// Model pricing (per 1M tokens) - Updated Jan 2026
const MODEL_PRICING = {
    // OpenAI
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    
    // Anthropic
    'claude-3-5-sonnet': { input: 3.00, output: 15.00 },
    'claude-3-haiku': { input: 0.25, output: 1.25 },
    
    // Google
    'gemini-2.0-flash': { input: 0.075, output: 0.30 },
    'gemini-1.5-pro': { input: 1.25, output: 5.00 },
} as const;

type ModelName = keyof typeof MODEL_PRICING;

/**
 * Estimate cost for a given number of tokens
 */
export function estimateCost(
    inputTokens: number,
    outputTokens: number,
    model: ModelName = 'gpt-4o-mini'
): number {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o-mini'];
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
}

/**
 * Estimate token count from text (rough approximation)
 * GPT models: ~4 characters per token for English
 */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * Estimate tokens for a structured prompt
 */
export function estimatePromptTokens(parts: {
    systemPrompt?: string;
    userPrompt: string;
    context?: string;
}): number {
    let total = 0;
    if (parts.systemPrompt) total += estimateTokens(parts.systemPrompt);
    total += estimateTokens(parts.userPrompt);
    if (parts.context) total += estimateTokens(parts.context);
    // Add overhead for message formatting
    return Math.ceil(total * 1.1);
}

// ========================================
// Usage Tracking (In-Memory + Firestore)
// ========================================

// In-memory cache for fast checks (refreshed from Firestore periodically)
let dailyUsageCache: DailyUsageRecord | null = null;
let cacheDate: string = '';

function getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get or create today's usage record
 */
export async function getDailyUsage(): Promise<DailyUsageRecord> {
    const today = getTodayDate();
    
    // Return cache if still valid
    if (dailyUsageCache && cacheDate === today) {
        return dailyUsageCache;
    }

    // In production, this would fetch from Firestore
    // For now, return a fresh record
    dailyUsageCache = {
        date: today,
        totalTokens: 0,
        totalCostUSD: 0,
        sweepCount: 0,
        byCompany: {},
    };
    cacheDate = today;
    
    return dailyUsageCache;
}

/**
 * Update daily usage (in-memory and Firestore)
 */
export async function updateDailyUsage(
    companyId: string,
    usage: TokenUsage,
    incrementSweep: boolean = false
): Promise<void> {
    const today = getTodayDate();
    const record = await getDailyUsage();
    
    // Update totals
    record.totalTokens += usage.tokensUsed;
    record.totalCostUSD += usage.estimatedCostUSD;
    if (incrementSweep) {
        record.sweepCount += 1;
    }
    
    // Update company-specific usage
    if (!record.byCompany[companyId]) {
        record.byCompany[companyId] = { tokens: 0, sweeps: 0, costUSD: 0 };
    }
    record.byCompany[companyId].tokens += usage.tokensUsed;
    record.byCompany[companyId].costUSD += usage.estimatedCostUSD;
    if (incrementSweep) {
        record.byCompany[companyId].sweeps += 1;
    }
    
    // In production, persist to Firestore
    // await saveUsageToFirestore(record);
    
    console.log(`[UsageTracking] Updated daily usage: $${record.totalCostUSD.toFixed(4)} total, ${record.sweepCount} sweeps`);
}

/**
 * Get company's usage for today
 */
export async function getCompanyDailyUsage(companyId: string): Promise<{
    tokens: number;
    sweeps: number;
    costUSD: number;
}> {
    const record = await getDailyUsage();
    return record.byCompany[companyId] || { tokens: 0, sweeps: 0, costUSD: 0 };
}

// ========================================
// Pre-Sweep Validation
// ========================================

/**
 * Check if a sweep can run (all limits checked)
 * @throws Error if any limit exceeded
 */
export async function canRunSweep(
    companyId: string,
    config: TokenSafetyConfig = DEFAULT_TOKEN_SAFETY
): Promise<{ allowed: boolean; reason?: string }> {
    const companyUsage = await getCompanyDailyUsage(companyId);
    const dailyUsage = await getDailyUsage();
    
    // Check company daily sweep limit
    if (companyUsage.sweeps >= config.maxSweepsPerCompanyPerDay) {
        return {
            allowed: false,
            reason: `Daily sweep limit reached (${companyUsage.sweeps}/${config.maxSweepsPerCompanyPerDay}). Try again tomorrow.`,
        };
    }
    
    // Check company daily token limit
    if (companyUsage.tokens >= config.maxTokensPerCompanyPerDay) {
        return {
            allowed: false,
            reason: `Daily token limit reached for your company. Try again tomorrow.`,
        };
    }
    
    // Check platform-wide cost limit (circuit breaker)
    if (dailyUsage.totalCostUSD >= config.maxDailyCostUSD) {
        console.error(`[CIRCUIT_BREAKER] Platform daily cost limit reached: $${dailyUsage.totalCostUSD}`);
        return {
            allowed: false,
            reason: `Platform-wide daily limit reached. Please try again tomorrow.`,
        };
    }
    
    // Check platform-wide token limit
    if (dailyUsage.totalTokens >= config.maxTokensPerHour) {
        return {
            allowed: false,
            reason: `Platform is experiencing high usage. Please try again in a few minutes.`,
        };
    }
    
    // Check if approaching alert threshold
    if (dailyUsage.totalCostUSD >= config.alertThresholdUSD) {
        console.warn(`[COST_ALERT] Platform cost at $${dailyUsage.totalCostUSD}, threshold: $${config.alertThresholdUSD}`);
        // In production, would trigger admin alert
    }
    
    return { allowed: true };
}

// ========================================
// Circuit Breaker
// ========================================

interface CircuitBreakerState {
    isOpen: boolean;
    failureCount: number;
    lastFailure: number;
    cooldownUntil: number;
}

const circuitBreaker: CircuitBreakerState = {
    isOpen: false,
    failureCount: 0,
    lastFailure: 0,
    cooldownUntil: 0,
};

const CIRCUIT_BREAKER_THRESHOLD = 5; // failures before opening
const CIRCUIT_BREAKER_COOLDOWN = 5 * 60 * 1000; // 5 minutes

/**
 * Record a failure (e.g., API error, rate limit hit)
 */
export function recordFailure(): void {
    circuitBreaker.failureCount += 1;
    circuitBreaker.lastFailure = Date.now();
    
    if (circuitBreaker.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
        circuitBreaker.isOpen = true;
        circuitBreaker.cooldownUntil = Date.now() + CIRCUIT_BREAKER_COOLDOWN;
        console.error(`[CIRCUIT_BREAKER] Opened due to ${circuitBreaker.failureCount} failures. Cooldown until ${new Date(circuitBreaker.cooldownUntil).toISOString()}`);
    }
}

/**
 * Record a success (resets failure count)
 */
export function recordSuccess(): void {
    circuitBreaker.failureCount = 0;
    circuitBreaker.isOpen = false;
}

/**
 * Check if circuit breaker allows requests
 */
export function isCircuitClosed(): boolean {
    if (!circuitBreaker.isOpen) return true;
    
    // Check if cooldown has passed
    if (Date.now() >= circuitBreaker.cooldownUntil) {
        console.log('[CIRCUIT_BREAKER] Cooldown passed, resetting');
        circuitBreaker.isOpen = false;
        circuitBreaker.failureCount = 0;
        return true;
    }
    
    return false;
}

/**
 * Ensure circuit is closed before making requests
 * @throws CircuitBreakerOpenError if circuit is open
 */
export function ensureCircuitClosed(): void {
    if (!isCircuitClosed()) {
        const waitMs = circuitBreaker.cooldownUntil - Date.now();
        throw new CircuitBreakerOpenError(
            `Circuit breaker is open. Please wait ${Math.ceil(waitMs / 1000)} seconds.`
        );
    }
}

// ========================================
// Exports
// ========================================

export {
    DEFAULT_TOKEN_SAFETY,
    MODEL_PRICING,
    type ModelName,
};
