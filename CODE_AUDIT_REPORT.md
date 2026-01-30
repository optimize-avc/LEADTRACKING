# Lead Tracking App - Code Quality Audit Report

**Audit Date:** January 2025  
**Auditor:** Automated Code Analysis  
**Framework Versions:** Next.js 16.0.10, React 19.2.1, TypeScript 5.9.3, TailwindCSS 4.1.18

---

## Executive Summary

This audit evaluates the LEADTRACKING codebase against 2026 best practices. Overall, the codebase demonstrates **solid architecture** with good separation of concerns, proper type definitions, and comprehensive validation schemas. However, several areas require attention, particularly around:

1. **Zod Schema Nullable Handling** - Critical issue causing runtime errors
2. **Type Safety Gaps** - Several `any` types and missing return types
3. **Error Handling Inconsistencies** - Unhandled promise rejections in components
4. **Security Hardening** - Some API routes missing rate limiting
5. **Performance Optimizations** - Missing memoization in key components

### Priority Summary

| Priority    | Count | Description                   |
| ----------- | ----- | ----------------------------- |
| 🔴 Critical | 4     | Runtime-breaking issues       |
| 🟠 High     | 12    | Security/reliability concerns |
| 🟡 Medium   | 18    | Code quality improvements     |
| 🟢 Low      | 8     | Minor optimizations           |

---

## 🔴 Critical Issues

### 1. Zod Schema Nullable vs Optional Handling

**Files Affected:**

- `src/lib/validation.ts` (lines 20-75)
- `src/lib/discovery/aiAnalyzer.ts`
- `src/lib/ai/business-audit.ts`

**Issue:** The `enrichmentDataSchema` uses `.nullable().optional()` pattern but AI responses may return actual `null` values where the schema expects objects with nullable properties inside.

```typescript
// Current (problematic):
overview: z.object({
    description: z.string().nullable().optional(),
    // ...
}).passthrough().nullable().optional(),
```

**Problem:** When AI returns `{ "overview": null }`, Zod validates it. But when AI returns `{ "overview": { "description": null, "industry": null } }`, nested validation works. However, partial objects like `{ "overview": { "description": "text" } }` without all expected keys can fail.

**Fix (Recommended):**

```typescript
// Use .default() for nested objects to provide fallbacks
overview: z.object({
    description: z.string().nullable().default(null),
    industry: z.string().nullable().default(null),
    estimatedSize: z.string().nullable().default(null),
    keyPeople: z.array(z.string()).nullable().default(null),
    founded: z.string().nullable().default(null),
    headquarters: z.string().nullable().default(null),
}).passthrough().nullable().optional().default(null),
```

Or use `.catch()` for more resilient parsing:

```typescript
overview: z.object({...}).passthrough().nullable().catch(null),
```

---

### 2. Type Safety in AI Response Parsing

**File:** `src/lib/ai/gemini.ts` (lines 50-70, 150-200)

**Issue:** JSON.parse of AI responses without type guards or validation.

````typescript
// Current (unsafe):
const cleanText = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
return JSON.parse(cleanText); // ❌ Returns `any`
````

**Fix:**

````typescript
import { z } from 'zod';

const PersonaSchema = z.object({
    name: z.string(),
    role: z.string(),
    company: z.string(),
    personality: z.string(),
    painPoints: z.array(z.string()),
    objections: z.array(z.string()),
    hiddenAgenda: z.string(),
});

function parseAIPersona(text: string): AIPersona | null {
    try {
        const cleanText = text
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
        const parsed = JSON.parse(cleanText);
        return PersonaSchema.parse(parsed);
    } catch (e) {
        console.error('Failed to parse AI persona:', e);
        return null;
    }
}
````

---

### 3. Missing Error Boundary in Critical Flows

**File:** `src/app/leads/LeadsClient.tsx` (line 1)

**Issue:** The main leads component has no error boundary wrapping AI enrichment operations, which can crash the entire page.

**Fix:** Wrap AI-dependent sections with ErrorBoundary:

```typescript
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// In render:
<ErrorBoundary fallback={<AIEnrichmentError />}>
    <AILeadInsights lead={lead} activities={activities[lead.id] || []} compact />
</ErrorBoundary>
```

---

### 4. Unhandled Promise Rejection in Auth Provider

**File:** `src/components/providers/AuthProvider.tsx` (lines 70-80)

**Issue:** Welcome email fetch uses `.catch()` but doesn't handle network failures gracefully.

```typescript
// Current:
fetch('/api/email/welcome', {...})
    .catch((err) => console.warn('Failed to send welcome email:', err));
```

**Issue:** If the promise rejects before `.catch()` is attached (synchronous error), it may become unhandled.

**Fix:**

```typescript
// Use async/await with try-catch
(async () => {
    try {
        await fetch('/api/email/welcome', {...});
    } catch (err) {
        console.warn('Failed to send welcome email:', err);
    }
})();
```

---

## 🟠 High Priority Issues

### 5. API Routes Missing Rate Limiting

**Files Affected:**

- `src/app/api/leads/[id]/enrich/route.ts` - No rate limiting
- `src/app/api/audit/route.ts` - No rate limiting (expensive AI operation)
- `src/app/api/discovery/parse/route.ts` - No rate limiting
- `src/app/api/email/send/route.ts` - No rate limiting

**Fix:** Add rate limiting to all API routes:

```typescript
import { rateLimit, RATE_LIMITS } from '@/lib/api-middleware';

export async function POST(request: NextRequest) {
    const rateLimitResult = rateLimit(request, undefined, RATE_LIMITS.heavy);
    if (rateLimitResult) return rateLimitResult;
    // ... rest of handler
}
```

---

### 6. Missing Authentication in Enrich Route

**File:** `src/app/api/leads/[id]/enrich/route.ts` (lines 1-50)

**Issue:** Neither POST nor GET handlers verify user authentication.

```typescript
// Current (no auth check):
export async function POST(request: NextRequest, { params }: RouteParams) {
    const { id } = await params;
    // ❌ Proceeds without auth
```

**Fix:**

```typescript
import { withAuth } from '@/lib/auth/middleware';

export const POST = withAuth(async (request, userId) => {
    // userId is verified
});
```

---

### 7. Sensitive Data in Console Logs

**Files Affected:**

- `src/app/api/leads/route.ts` (line 98): `console.log('[Leads API] Received body:', JSON.stringify(body, null, 2));`
- `src/app/api/ai/generate/route.ts` (line 65): `console.log('[AI Route] User authenticated:', decodedToken.uid);`

**Fix:** Remove or redact sensitive data in production:

```typescript
if (process.env.NODE_ENV === 'development') {
    console.log('[Leads API] Received body:', JSON.stringify(body, null, 2));
}
```

---

### 8. Firebase Client Config Exposed

**File:** `src/lib/firebase/config.ts` (lines 50-53)

**Issue:** Legacy exports can cause build-time errors in SSR contexts.

```typescript
// Current (problematic):
export const app =
    typeof window !== 'undefined' ? getFirebaseApp() : (null as unknown as FirebaseApp); // ❌ Type assertion hides issues
```

**Fix:** Remove legacy exports or add deprecation warnings:

```typescript
/** @deprecated Use getFirebaseApp() instead */
export function getLegacyApp(): FirebaseApp {
    if (typeof window === 'undefined') {
        throw new Error('Firebase client cannot be used on server');
    }
    return getFirebaseApp();
}
```

---

### 9. Webhook Signature Verification Fallback

**File:** `src/app/api/stripe/webhook/route.ts` (line 20)

**Issue:** Fallback to `'whsec_mock'` is dangerous in production.

```typescript
// Current:
event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock' // ❌ Dangerous fallback
);
```

**Fix:**

```typescript
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured');
    return new NextResponse('Server configuration error', { status: 500 });
}
event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
```

---

### 10. CSP Policy Allows unsafe-eval

**File:** `src/middleware.ts` (line 14)

**Issue:** `'unsafe-eval'` in CSP is a security risk.

```typescript
script-src 'self' 'unsafe-eval' 'unsafe-inline' ...
```

**Fix:** Remove `'unsafe-eval'` if not strictly required:

```typescript
script-src 'self' 'unsafe-inline' https://apis.google.com ...
```

If needed for dev tools, use environment-specific CSP:

```typescript
const isDev = process.env.NODE_ENV === 'development';
const scriptSrc = isDev ? "'self' 'unsafe-eval' 'unsafe-inline'" : "'self' 'unsafe-inline'";
```

---

### 11. Missing Input Sanitization in SMS Route

**File:** `src/app/api/twilio/sms/route.ts` (lines 25-30)

**Issue:** Phone number and message body not validated.

```typescript
const { to, body: messageBody, leadId } = body;
if (!to || !messageBody || !leadId) {  // ❌ Only checks presence, not format
```

**Fix:**

```typescript
import { z } from 'zod';

const smsSchema = z.object({
    to: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
    body: z.string().min(1).max(1600, 'Message too long'),
    leadId: z.string().min(1),
});

const validated = smsSchema.parse(body);
```

---

### 12. Hard-coded Admin Emails

**Files Affected:**

- `src/app/api/admin/impersonate/route.ts` (line 15)
- `src/components/providers/AuthProvider.tsx` (line 12)

**Issue:** Admin emails are hard-coded in source.

```typescript
const SUPER_ADMIN_EMAILS = ['admin@avcpp.com', 'blazehaze4201980@gmail.com', 'optimize@avcpp.com'];
```

**Fix:** Move to environment variables or Firestore config:

```typescript
const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || '').split(',').filter(Boolean);
```

---

### 13. Race Condition in Auth State

**File:** `src/components/providers/AuthProvider.tsx` (lines 45-90)

**Issue:** Multiple rapid auth state changes can cause race conditions.

**Fix:** Add abort controller:

```typescript
useEffect(() => {
    const abortController = new AbortController();

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (currentUser) => {
        if (abortController.signal.aborted) return;
        // ... rest of logic
    });

    return () => {
        abortController.abort();
        unsubscribe();
    };
}, []);
```

---

### 14. Missing Team Member Authorization

**File:** `src/app/api/team/invite/route.ts`

**Issue:** Any authenticated user can send invites without verifying they belong to the company.

**Fix:** Add company membership verification before creating invite.

---

### 15. Discovery Sweep Token Limit Bypass

**File:** `src/app/api/discovery/sweep/route.ts` (line 90)

**Issue:** `maxLeads` is set to 10 but doesn't use the token safety config properly.

```typescript
const maxLeads = Math.min(10, AI_LIMITS.maxLeadsToScore);
```

**Fix:** Use config from token safety:

```typescript
import { DEFAULT_TOKEN_SAFETY } from '@/types/discovery';
const maxLeads = Math.min(DEFAULT_TOKEN_SAFETY.maxLeadsToAnalyze, AI_LIMITS.maxLeadsToScore);
```

---

### 16. Unvalidated URL Redirect

**File:** `src/lib/sendgrid.ts` (line 310)

**Issue:** `APP_URL` used in email links could be manipulated if env var is compromised.

**Fix:** Validate URL format:

```typescript
const APP_URL = (() => {
    const url = process.env.NEXT_PUBLIC_APP_URL || 'https://default.app';
    try {
        new URL(url);
        return url;
    } catch {
        console.error('Invalid APP_URL configured');
        return 'https://default.app';
    }
})();
```

---

## 🟡 Medium Priority Issues

### 17. Missing `useCallback` for Event Handlers

**File:** `src/app/leads/LeadsClient.tsx`

**Issue:** Many handlers recreated on every render:

- `handleExpandLead` (line 180)
- `handleActivitySuccess` (line 195)
- `toggleSelectLead` (line 240)

**Fix:** Wrap with `useCallback`:

```typescript
const handleExpandLead = useCallback(
    (leadId: string) => {
        // ...
    },
    [selectedLeadIds, activities, gmailConnected, gmailHistory]
);
```

---

### 18. Missing `useMemo` for Expensive Computations

**File:** `src/app/leads/LeadsClient.tsx` (line 150)

**Issue:** `filteredLeads` computation is memoized but `calculateLeadVelocity` inside sort is called repeatedly.

**Fix:** Pre-compute velocities:

```typescript
const velocityCache = useMemo(() => {
    return new Map(leads.map((l) => [l.id, calculateLeadVelocity(l, activities[l.id])]));
}, [leads, activities]);

// Then in sort:
result.sort(
    (a, b) => (velocityCache.get(b.id)?.score || 0) - (velocityCache.get(a.id)?.score || 0)
);
```

---

### 19. Inconsistent Error Response Format

**Files Affected:** Multiple API routes

**Issue:** Some routes return `{ error: string }`, others return `{ error: string, details: unknown }`.

**Fix:** Standardize error responses:

```typescript
interface APIError {
    error: string;
    code?: string;
    details?: Record<string, unknown>;
}

function errorResponse(
    message: string,
    status: number,
    code?: string,
    details?: Record<string, unknown>
) {
    return NextResponse.json({ error: message, code, details }, { status });
}
```

---

### 20. Type Assertions Instead of Type Guards

**File:** `src/lib/firebase/services.ts` (line 55)

**Issue:** Type assertion `as Lead[]` without validation.

```typescript
return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
})) as Lead[]; // ❌ No validation
```

**Fix:** Add runtime validation or type guard:

```typescript
function isLead(data: unknown): data is Lead {
    return typeof data === 'object' && data !== null && 'companyName' in data;
}

return snapshot.docs
    .map((doc) => {
        const data = { id: doc.id, ...doc.data() };
        if (!isLead(data)) {
            console.warn('Invalid lead data:', doc.id);
            return null;
        }
        return data;
    })
    .filter((l): l is Lead => l !== null);
```

---

### 21. Missing Suspense Boundaries

**File:** `src/app/leads/page.tsx`

**Issue:** No Suspense boundary for data loading states.

**Fix:**

```typescript
import { Suspense } from 'react';
import LeadsClient from './LeadsClient';
import LeadsSkeleton from './loading';

export default function LeadsPage() {
    return (
        <Suspense fallback={<LeadsSkeleton />}>
            <LeadsClient />
        </Suspense>
    );
}
```

---

### 22. Deprecated `headers()` Usage

**File:** `src/app/api/leads/route.ts` (line 36)

**Issue:** Async `headers()` requires `await` in Next.js 15+.

```typescript
const headersList = await headers();
```

**Status:** Already correct, but ensure consistency across all routes.

---

### 23. Missing Zod Schema for Activities

**File:** `src/lib/validation.ts`

**Issue:** `createActivitySchema` exists but is never used in API routes.

**Fix:** Apply validation in activity endpoints.

---

### 24. Duplicate Code in Lead Processing

**Files Affected:**

- `src/app/leads/LeadsClient.tsx` (handleReaudit)
- `src/app/leads/LeadsClient.tsx` (handleBulkEnrich)

**Issue:** Almost identical enrichment logic duplicated.

**Fix:** Extract to shared utility:

```typescript
async function enrichSingleLead(user: User, lead: Lead): Promise<EnrichmentResult> {
    const token = await user.getIdToken();
    const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: lead.companyName }),
    });
    // ... common logic
}
```

---

### 25. Missing Retry Logic for AI Calls

**File:** `src/lib/discovery/aiAnalyzer.ts`

**Issue:** AI API calls have no retry mechanism for transient failures.

**Fix:**

```typescript
async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise((r) => setTimeout(r, delay * Math.pow(2, i)));
        }
    }
    throw new Error('Unreachable');
}
```

---

### 26. Incomplete Type for Lead Interface

**File:** `src/types/index.ts` (line 20)

**Issue:** `Lead` interface has optional `companyId` but services always expect it for multi-tenant.

**Fix:** Make `companyId` required or add a `TenantLead` type:

```typescript
export interface TenantLead extends Lead {
    companyId: string; // Required for multi-tenant operations
}
```

---

### 27. Magic Numbers in Rate Limiting

**File:** `src/lib/rate-limit.ts`

**Issue:** Numbers like `10000` and `100` not named.

**Fix:**

```typescript
const MAX_STORE_SIZE = 10_000;
const DEFAULT_LIMIT = 100;
const DEFAULT_WINDOW_SECONDS = 60;
```

---

### 28. Missing `aria-live` for Dynamic Content

**File:** `src/components/leads/LeadDetailDrawer.tsx`

**Issue:** Tab content changes not announced to screen readers.

**Fix:**

```typescript
<div
    className="flex-1 overflow-y-auto p-6 space-y-6"
    role="tabpanel"
    aria-live="polite"  // Add this
    ...
>
```

---

### 29. Inconsistent Nullable Patterns

**Files Affected:** Multiple

**Issue:** Some files use `| null`, others use `| undefined`, some use both.

**Fix:** Establish convention:

- Use `null` for intentionally absent values (API responses)
- Use `undefined` for optional parameters
- Document in CONTRIBUTING.md

---

### 30. Missing `rel="noopener"` on External Links

**File:** `src/lib/sendgrid.ts` (email templates)

**Issue:** Links in HTML emails should have `rel="noopener noreferrer"` for security.

**Fix:** Add to all `<a>` tags in email templates.

---

### 31. Potential Memory Leak in Rate Limit Store

**File:** `src/lib/rate-limit.ts` (line 25)

**Issue:** `cleanupExpiredEntries` only triggers when store exceeds 10,000 entries.

**Fix:** Add periodic cleanup:

```typescript
setInterval(cleanupExpiredEntries, 60_000); // Clean every minute
```

---

### 32. Missing Index for Firestore Queries

**File:** `src/lib/firebase/leads.ts`

**Issue:** Composite queries require Firestore indexes.

**Fix:** Document required indexes:

```javascript
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "leads",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

### 33. Unsafe Optional Chaining in Templates

**File:** `src/app/leads/LeadsClient.tsx` (line 750)

**Issue:** `lead.enrichmentData.painPoints.slice(0, 2)` - no check if array exists.

**Fix:**

```typescript
{(lead.enrichmentData?.painPoints ?? []).slice(0, 2).map(...)}
```

---

### 34. Console.error Should Use Structured Logging

**Files Affected:** All API routes

**Issue:** `console.error` doesn't integrate with log aggregation services.

**Fix:** Create structured logger:

```typescript
import { captureError } from '@/lib/sentry';

function logError(message: string, error: unknown, context?: Record<string, unknown>) {
    console.error(message, error);
    captureError(error instanceof Error ? error : new Error(String(error)), {
        action: message,
        metadata: context,
    });
}
```

---

## 🟢 Low Priority Issues

### 35. ESLint Config Downgrades Warnings

**File:** `eslint.config.mjs`

**Issue:** `@typescript-eslint/no-unused-vars` set to `warn` instead of `error`.

**Fix:** Consider `error` for stricter CI enforcement.

---

### 36. Missing JSDoc Comments

**Files Affected:** Most utility functions

**Fix:** Add JSDoc for public APIs:

```typescript
/**
 * Calculate lead velocity score based on activity history
 * @param lead - The lead to analyze
 * @param activities - Recent activities for this lead
 * @returns Velocity metrics including score, status, and momentum
 */
export function calculateLeadVelocity(lead: Lead, activities?: Activity[]): VelocityResult;
```

---

### 37. Unused Imports

**Files Affected:** Various

**Example:** `src/app/leads/LeadsClient.tsx` imports `Filter` but doesn't use it.

**Fix:** Run `eslint --fix` or configure `no-unused-imports` rule.

---

### 38. Long File Length

**File:** `src/app/leads/LeadsClient.tsx` (1400+ lines)

**Fix:** Split into smaller components:

- `LeadCard.tsx`
- `LeadFilters.tsx`
- `BulkActions.tsx`
- `LeadEnrichmentSection.tsx`

---

### 39. Tailwind Class Duplication

**Files Affected:** Multiple components

**Issue:** Repeated class combinations like `"px-3 py-2 text-xs bg-slate-800/50 border border-white/10 rounded-lg"`.

**Fix:** Extract to component or use `@apply`:

```css
/* globals.css */
@layer components {
    .btn-secondary {
        @apply px-3 py-2 text-xs bg-slate-800/50 border border-white/10 rounded-lg;
    }
}
```

---

### 40. Missing TypeScript Strict Flags

**File:** `tsconfig.json`

**Issue:** Some additional strict flags could catch more errors.

**Fix:**

```json
{
    "compilerOptions": {
        "strict": true,
        "noUncheckedIndexedAccess": true, // Add
        "exactOptionalPropertyTypes": true, // Add
        "noPropertyAccessFromIndexSignature": true // Add
    }
}
```

---

### 41. Test Coverage Gaps

**Files Missing Tests:**

- `src/lib/ai/gemini.ts`
- `src/lib/discovery/aiAnalyzer.ts`
- `src/lib/utils/scoring.ts`
- `src/components/leads/LeadDetailDrawer.tsx`

**Fix:** Add unit tests for critical business logic.

---

### 42. Missing Prettier Config for Markdown

**File:** `.prettierrc` (if exists)

**Fix:** Add markdown formatting:

```json
{
    "overrides": [
        {
            "files": "*.md",
            "options": {
                "proseWrap": "always"
            }
        }
    ]
}
```

---

## Recommended Next Steps

### Immediate (This Sprint)

1. Fix Zod nullable handling in `enrichmentDataSchema` (Critical #1)
2. Add authentication to `/api/leads/[id]/enrich/route.ts` (High #6)
3. Remove `'unsafe-eval'` from CSP or make environment-specific (High #10)
4. Fix Stripe webhook secret fallback (High #9)

### Short-term (Next 2 Sprints)

5. Add rate limiting to all unprotected API routes (High #5)
6. Implement proper type guards for AI responses (Critical #2)
7. Standardize error response format (Medium #19)
8. Add retry logic for AI API calls (Medium #25)

### Long-term (Tech Debt Backlog)

9. Split large components into smaller modules (Low #38)
10. Add comprehensive test coverage (Low #41)
11. Enable additional TypeScript strict flags (Low #40)
12. Implement structured logging (Medium #34)

---

## Appendix: File-by-File Summary

| File                                        | Critical | High | Medium | Low |
| ------------------------------------------- | -------- | ---- | ------ | --- |
| `src/lib/validation.ts`                     | 1        | 0    | 1      | 0   |
| `src/lib/ai/gemini.ts`                      | 1        | 0    | 0      | 1   |
| `src/app/leads/LeadsClient.tsx`             | 1        | 0    | 4      | 2   |
| `src/components/providers/AuthProvider.tsx` | 1        | 2    | 0      | 0   |
| `src/app/api/leads/[id]/enrich/route.ts`    | 0        | 2    | 0      | 0   |
| `src/app/api/stripe/webhook/route.ts`       | 0        | 1    | 0      | 0   |
| `src/middleware.ts`                         | 0        | 1    | 0      | 0   |
| `src/app/api/twilio/sms/route.ts`           | 0        | 1    | 0      | 0   |
| `src/lib/sendgrid.ts`                       | 0        | 1    | 1      | 0   |
| `src/lib/firebase/services.ts`              | 0        | 0    | 2      | 0   |
| `src/lib/discovery/aiAnalyzer.ts`           | 0        | 0    | 2      | 1   |
| `src/lib/rate-limit.ts`                     | 0        | 0    | 2      | 0   |
| Other files                                 | 0        | 4    | 6      | 4   |

---

_Report generated by automated code analysis. Manual review recommended for all critical and high priority items._
