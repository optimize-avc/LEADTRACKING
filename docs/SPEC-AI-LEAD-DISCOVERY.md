# AI Lead Discovery Engine - Technical Specification

> **Status:** Draft v1.0
> **Author:** Clawd + Funky Phantom
> **Date:** 2026-01-29

---

## 1. Overview

### What It Does
An AI-powered automated prospecting system that continuously discovers potential leads based on user-defined targeting criteria, verifies them, and delivers qualified prospects to both the app and connected Discord servers.

### Value Proposition
- **Save hours** of manual prospecting
- **Never miss** a potential customer
- **AI-verified** leads with real contact info
- **Automated delivery** on your schedule

---

## 2. User Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER JOURNEY                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. SETUP (One-time)                                                    │
│     ├── Navigate to Settings → Bot Studio                               │
│     ├── Connect Discord server ✅ (already built)                       │
│     └── Configure brain (industry, persona) ✅ (already built)          │
│                                                                         │
│  2. CONFIGURE DISCOVERY (Settings → Discovery)                          │
│     ├── Describe your business in plain English                         │
│     ├── AI parses into targeting criteria                               │
│     ├── Review & refine the parsed criteria                             │
│     ├── Set sweep schedule (daily/weekly/custom)                        │
│     └── Choose notification preferences                                 │
│                                                                         │
│  3. AUTOMATED SWEEPS (Background)                                       │
│     ├── Cron job triggers based on schedule                             │
│     ├── AI searches multiple sources                                    │
│     ├── Results are fact-checked & verified                             │
│     └── Qualified leads stored in database                              │
│                                                                         │
│  4. DELIVERY                                                            │
│     ├── In-App: New tab in Discover page shows results                  │
│     ├── Discord: Bot posts summary to configured channel                │
│     └── Optional: Email digest                                          │
│                                                                         │
│  5. ACTION                                                              │
│     ├── Review discovered leads                                         │
│     ├── Click "Add to Pipeline" to convert                              │
│     └── Dismiss irrelevant ones (trains AI)                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema

### 3.1 Discovery Profiles (per company)

```typescript
// Collection: companies/{companyId}/discoveryProfile

interface DiscoveryProfile {
  id: string;
  companyId: string;
  
  // Raw user input
  businessDescription: string;  // Plain English description
  
  // AI-parsed targeting criteria
  targetingCriteria: {
    industries: string[];           // ["HVAC", "Plumbing", "Electrical"]
    companySize: {
      min: number;                  // 10
      max: number;                  // 500
    };
    geography: {
      countries: string[];          // ["US"]
      states: string[];             // ["TX", "OK", "LA"]
      cities: string[];             // ["Houston", "Dallas"]
      radius?: number;              // miles from a point
    };
    painPoints: string[];           // ["outdated equipment", "high energy costs"]
    buyingSignals: string[];        // ["hiring", "expanding", "funding"]
    excludeKeywords: string[];      // ["residential", "DIY"]
    idealCustomerProfile: string;   // AI-generated summary
  };
  
  // Schedule settings
  schedule: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
    customDays?: number;            // If custom, run every N days
    preferredTime: string;          // "09:00" UTC
    lastRunAt: number | null;       // Timestamp
    nextRunAt: number | null;       // Timestamp
  };
  
  // Notification settings
  notifications: {
    discord: {
      enabled: boolean;
      channelId: string | null;     // Which channel to post to
      mentionRole: string | null;   // @sales-team etc
    };
    email: {
      enabled: boolean;
      recipients: string[];
    };
    inApp: {
      enabled: boolean;             // Always true basically
    };
  };
  
  // Stats
  stats: {
    totalLeadsFound: number;
    leadsAddedToPipeline: number;
    leadsDismissed: number;
    lastSweepLeadsCount: number;
  };
  
  createdAt: number;
  updatedAt: number;
}
```

### 3.2 Discovered Leads

```typescript
// Collection: companies/{companyId}/discoveredLeads

interface DiscoveredLead {
  id: string;
  companyId: string;
  discoveryProfileId: string;
  
  // Business info
  businessName: string;
  industry: string;
  website: string | null;
  
  // Contact info
  contacts: {
    name: string;
    title: string;
    email: string | null;
    phone: string | null;
    linkedin: string | null;
  }[];
  
  // Location
  location: {
    address: string | null;
    city: string;
    state: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  
  // AI analysis
  aiAnalysis: {
    matchScore: number;             // 0-100, how well they match criteria
    matchReasons: string[];         // ["In target industry", "Recently funded"]
    painPointsIdentified: string[]; // ["Mentioned equipment issues in review"]
    buyingSignals: string[];        // ["Hiring 3 sales reps", "New location"]
    summary: string;                // AI-generated 2-3 sentence summary
  };
  
  // Verification
  verification: {
    status: 'pending' | 'verified' | 'failed';
    verifiedAt: number | null;
    checks: {
      websiteExists: boolean;
      phoneValid: boolean;
      emailValid: boolean;
      businessRegistered: boolean;  // If we can check
    };
  };
  
  // Sources where we found them
  sources: {
    type: 'linkedin' | 'google' | 'directory' | 'news' | 'jobs' | 'social';
    url: string;
    foundAt: number;
  }[];
  
  // Status
  status: 'new' | 'reviewed' | 'added_to_pipeline' | 'dismissed';
  dismissReason?: string;           // If dismissed, why (for AI learning)
  pipelineLeadId?: string;          // If added, link to pipeline lead
  
  // Sweep info
  sweepId: string;                  // Which sweep found this
  discoveredAt: number;
  reviewedAt: number | null;
  reviewedBy: string | null;        // userId
}
```

### 3.3 Discovery Sweeps (audit log)

```typescript
// Collection: companies/{companyId}/discoverySweeps

interface DiscoverySweep {
  id: string;
  companyId: string;
  discoveryProfileId: string;
  
  // Execution
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: number;
  completedAt: number | null;
  
  // Results
  results: {
    sourcesSearched: number;
    rawResultsFound: number;
    afterDeduplication: number;
    afterVerification: number;
    finalLeadsCount: number;
  };
  
  // Errors if any
  errors: {
    source: string;
    error: string;
    timestamp: number;
  }[];
  
  // Notifications sent
  notificationsSent: {
    discord: boolean;
    email: boolean;
  };
  
  // Trigger
  triggeredBy: 'schedule' | 'manual';
  triggeredByUserId?: string;
}
```

---

## 4. API Endpoints

### 4.1 Discovery Profile Management

```
GET    /api/discovery/profile           - Get company's discovery profile
POST   /api/discovery/profile           - Create/update profile
DELETE /api/discovery/profile           - Delete profile (stops all sweeps)

POST   /api/discovery/parse-description - AI parses business description
       Body: { description: string }
       Returns: { targetingCriteria: {...} }
```

### 4.2 Sweep Management

```
POST   /api/discovery/sweep             - Trigger manual sweep
GET    /api/discovery/sweeps            - List past sweeps
GET    /api/discovery/sweeps/:id        - Get sweep details
```

### 4.3 Discovered Leads

```
GET    /api/discovery/leads             - List discovered leads
       Query: ?status=new&limit=50&offset=0
       
GET    /api/discovery/leads/:id         - Get lead details
PATCH  /api/discovery/leads/:id         - Update lead (review, dismiss)
POST   /api/discovery/leads/:id/add-to-pipeline - Convert to pipeline lead
```

### 4.4 Discord Integration

```
GET    /api/discovery/discord/channels  - List available channels in guild
POST   /api/discovery/discord/test      - Send test message to channel
```

---

## 5. UI Components

### 5.1 Discovery Settings Page (`/settings/discovery`)

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to Settings                                              │
│                                                                 │
│ 🔍 AI Lead Discovery                                            │
│ Configure automated prospecting for your business               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ DESCRIBE YOUR BUSINESS                                          │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ We're a commercial HVAC company in Texas. We help           │ │
│ │ businesses with 50-500 employees reduce energy costs        │ │
│ │ through modern HVAC systems. Our ideal customers are        │ │
│ │ warehouses, manufacturing plants, and office buildings      │ │
│ │ that have equipment over 10 years old...                    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                        [✨ Parse with AI]       │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ TARGETING CRITERIA (AI-Generated)                    [Edit ✏️]  │
│                                                                 │
│ Industries:     [HVAC] [Commercial Real Estate] [Manufacturing] │
│ Company Size:   50 - 500 employees                              │
│ Geography:      Texas, Oklahoma, Louisiana                      │
│ Pain Points:    • High energy costs                             │
│                 • Aging equipment (10+ years)                   │
│                 • Compliance concerns                           │
│ Buying Signals: • Facility expansion                            │
│                 • Sustainability initiatives                    │
│                 • Recent funding                                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ SCHEDULE                                                        │
│                                                                 │
│ ◉ Enabled   ○ Disabled                                         │
│                                                                 │
│ Run every:  [Weekly ▾]  on  [Monday ▾]  at  [9:00 AM ▾]        │
│                                                                 │
│ Next sweep: Monday, Feb 3, 2026 at 9:00 AM                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ NOTIFICATIONS                                                   │
│                                                                 │
│ ☑️ Discord    Channel: [#leads-feed ▾]   Mention: [@sales ▾]   │
│ ☐ Email      Recipients: [Add emails...]                       │
│ ☑️ In-App    (Always on)                                        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ [💾 Save Configuration]              [🚀 Run Sweep Now]         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Discover Page - AI Results Tab (`/discover`)

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 Discover                                                     │
│                                                                 │
│ [Manual Search]  [✨ AI Discovered]                             │
│                  ━━━━━━━━━━━━━━━━━                              │
│                                                                 │
│ 12 new leads found · Last sweep: 2 hours ago    [🔄 Refresh]   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🏢 Texas Manufacturing Corp              Match: 94% 🟢      │ │
│ │    Manufacturing · Houston, TX · 150 employees              │ │
│ │                                                             │ │
│ │ "Expanding to new facility, mentioned HVAC upgrade needs    │ │
│ │  in recent job posting. Equipment is 15+ years old."        │ │
│ │                                                             │ │
│ │ 📧 john.smith@texasmfg.com  📞 (713) 555-0123              │ │
│ │                                                             │ │
│ │ Sources: LinkedIn · Google · Indeed                         │ │
│ │                                                             │ │
│ │ [➕ Add to Pipeline]  [👁️ View Details]  [✖️ Dismiss]       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🏢 Gulf Coast Warehousing                 Match: 87% 🟢     │ │
│ │    Logistics · Galveston, TX · 80 employees                 │ │
│ │    ...                                                      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🏢 Sunrise Office Park                    Match: 72% 🟡     │ │
│ │    Commercial Real Estate · Dallas, TX · 200 employees      │ │
│ │    ...                                                      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Discord Notification Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 AI Lead Discovery - 12 New Leads Found
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@sales-team Your weekly sweep is complete!

🏆 **Top Matches:**

**1. Texas Manufacturing Corp** (94% match)
   📍 Houston, TX · 150 employees
   💡 Expanding facility, needs HVAC upgrade
   🔗 [View in App](https://app.../discover?lead=xxx)

**2. Gulf Coast Warehousing** (87% match)
   📍 Galveston, TX · 80 employees
   💡 Recent funding, sustainability focus
   🔗 [View in App](https://app.../discover?lead=xxx)

**3. Sunrise Office Park** (72% match)
   📍 Dallas, TX · 200 employees
   💡 15-year-old equipment, maintenance issues
   🔗 [View in App](https://app.../discover?lead=xxx)

📊 **Summary:** 12 leads found · 8 verified · 3 high-priority

👉 [View All Leads](https://app.../discover?tab=ai)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 6. Technical Architecture

### 6.1 System Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                         DISCOVERY ENGINE FLOW                          │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  TRIGGER                                                               │
│  ───────                                                               │
│  ┌──────────────┐     ┌──────────────┐                                │
│  │ Cron Job     │ OR  │ Manual       │                                │
│  │ (scheduled)  │     │ (user click) │                                │
│  └──────┬───────┘     └──────┬───────┘                                │
│         └──────────┬─────────┘                                        │
│                    ▼                                                   │
│  ORCHESTRATOR (Cloud Function / Cloud Run)                            │
│  ─────────────────────────────────────────                            │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ 1. Load company's discovery profile                             │  │
│  │ 2. Create sweep record (status: running)                        │  │
│  │ 3. Fan out to data collectors                                   │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                    │                                                   │
│                    ▼                                                   │
│  DATA COLLECTORS (Parallel)                                           │
│  ──────────────────────────                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ LinkedIn │ │ Google   │ │ Industry │ │ News     │ │ Job      │   │
│  │ Scraper  │ │ Places   │ │ Dirs     │ │ Articles │ │ Boards   │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘   │
│       └────────────┴────────────┴────────────┴────────────┘          │
│                                 │                                      │
│                                 ▼                                      │
│  AGGREGATOR                                                           │
│  ──────────                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ 1. Merge results from all collectors                            │  │
│  │ 2. Deduplicate (by name + location)                             │  │
│  │ 3. Initial relevance scoring                                    │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                 │                                      │
│                                 ▼                                      │
│  AI ANALYZER (GPT-4 / Claude)                                         │
│  ────────────────────────────                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ For each candidate:                                             │  │
│  │ 1. Match against targeting criteria → score 0-100               │  │
│  │ 2. Identify pain points from available data                     │  │
│  │ 3. Detect buying signals                                        │  │
│  │ 4. Generate 2-3 sentence summary                                │  │
│  │ 5. Flag any red flags (competitors, wrong fit)                  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                 │                                      │
│                                 ▼                                      │
│  VERIFIER                                                             │
│  ────────                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ 1. Check website exists (HEAD request)                          │  │
│  │ 2. Validate email format + MX records                           │  │
│  │ 3. Validate phone format                                        │  │
│  │ 4. Optional: Business registry lookup                           │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                 │                                      │
│                                 ▼                                      │
│  STORAGE & NOTIFICATION                                               │
│  ──────────────────────                                               │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ 1. Save verified leads to Firestore                             │  │
│  │ 2. Update sweep record (status: completed)                      │  │
│  │ 3. Send Discord notification via bot                            │  │
│  │ 4. Send email digest (if enabled)                               │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Tech Stack

| Component | Technology |
|-----------|------------|
| Scheduler | Firebase Cloud Scheduler + Pub/Sub |
| Orchestrator | Cloud Functions (Node.js) or Cloud Run |
| Data Collectors | Cloud Functions (parallelized) |
| AI Analysis | OpenAI GPT-4 or Anthropic Claude API |
| Verification | Custom validation + 3rd party APIs |
| Storage | Firestore |
| Discord Bot | Discord.js (existing bot) |
| Email | SendGrid |

### 6.3 Data Sources & Methods

| Source | Method | What We Get |
|--------|--------|-------------|
| Google Places | API | Business name, address, phone, website, reviews |
| LinkedIn | Scraper/API | Company size, industry, recent posts, employees |
| Industry Directories | Scraper | Niche-specific business listings |
| News/PR | API (NewsAPI) | Funding, expansion, leadership changes |
| Job Boards | Scraper | Hiring signals, growth indicators |
| Social Media | APIs | Sentiment, engagement, recent activity |
| Business Registries | API | Verification, founding date, status |

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Database schema setup
- [ ] Discovery profile CRUD API
- [ ] Settings UI for discovery configuration
- [ ] AI description parser (LLM integration)

### Phase 2: Data Collection (Week 3-4)
- [ ] Google Places integration
- [ ] Basic web scraper framework
- [ ] News API integration
- [ ] Result aggregation & deduplication

### Phase 3: AI Analysis (Week 5)
- [ ] Lead scoring algorithm
- [ ] Pain point identification
- [ ] Summary generation
- [ ] Match reasoning

### Phase 4: Verification (Week 6)
- [ ] Website validation
- [ ] Email validation (MX check)
- [ ] Phone format validation
- [ ] Verification status tracking

### Phase 5: Delivery (Week 7)
- [ ] Discover page AI tab UI
- [ ] Discord notification integration
- [ ] Email digest setup
- [ ] "Add to Pipeline" flow

### Phase 6: Scheduling (Week 8)
- [ ] Cloud Scheduler setup
- [ ] Sweep history & audit log
- [ ] Manual sweep trigger
- [ ] Error handling & retry logic

### Phase 7: Polish (Week 9-10)
- [ ] Performance optimization
- [ ] Rate limiting & quotas
- [ ] Feedback loop (dismissed leads train AI)
- [ ] Analytics dashboard for discovery stats

---

## 8. Cost Considerations & Token Safety

### 8.1 Cost-Optimized Architecture

**Philosophy:** AI is expensive. Use it surgically, not liberally.

```
┌─────────────────────────────────────────────────────────────────┐
│                    COST OPTIMIZATION FUNNEL                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STAGE 1: Free/Cheap Data Collection                           │
│  ────────────────────────────────────                          │
│  • Google Search (free via scraping)                           │
│  • Public directories (free)                                   │
│  • Cached results (free)                                       │
│  → Output: ~500 raw candidates                                 │
│                                                                 │
│  STAGE 2: Rule-Based Filtering (NO AI)                         │
│  ─────────────────────────────────────                         │
│  • Location match? (string comparison)                         │
│  • Industry keywords? (regex)                                  │
│  • Company size in range? (number comparison)                  │
│  • Already in pipeline? (DB lookup)                            │
│  • Already dismissed? (DB lookup)                              │
│  → Output: ~50 filtered candidates                             │
│                                                                 │
│  STAGE 3: Cheap AI Scoring (GPT-4o-mini / Gemini Flash)        │
│  ──────────────────────────────────────────────────────        │
│  • Batch process in single API call                            │
│  • Simple relevance score 0-100                                │
│  • ~$0.01 for 50 leads                                         │
│  → Output: ~15 high-scoring leads                              │
│                                                                 │
│  STAGE 4: Smart AI Analysis (GPT-4o / Claude Sonnet)           │
│  ───────────────────────────────────────────────────           │
│  • Only for leads scoring 70+                                  │
│  • Pain point identification                                   │
│  • Buying signal detection                                     │
│  • Summary generation                                          │
│  • ~$0.10-0.20 for 15 leads                                    │
│  → Output: Final enriched leads                                │
│                                                                 │
│  TOTAL COST PER SWEEP: ~$0.05 - $0.30                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Token Safety Guardrails

**Hard Limits (Non-negotiable)**

```typescript
// Global limits - stored in config, enforced in code
const TOKEN_SAFETY = {
  // Per-sweep limits
  maxTokensPerSweep: 50_000,        // Hard cap per sweep
  maxAPICallsPerSweep: 20,          // Max LLM calls per sweep
  maxLeadsToAnalyze: 50,            // Never analyze more than this
  
  // Per-company daily limits
  maxTokensPerCompanyPerDay: 100_000,
  maxSweepsPerCompanyPerDay: 3,
  
  // Global platform limits (all companies combined)
  maxTokensPerHour: 500_000,        // Platform-wide hourly cap
  maxConcurrentSweeps: 5,           // Don't overload APIs
  
  // Cost circuit breaker
  maxDailyCostUSD: 50.00,           // Platform-wide daily spend cap
  alertThresholdUSD: 25.00,         // Alert admin at this point
};
```

**Enforcement Layers**

```typescript
// Layer 1: Pre-sweep check
async function canRunSweep(companyId: string): Promise<boolean> {
  const usage = await getCompanyUsageToday(companyId);
  
  if (usage.sweepCount >= TOKEN_SAFETY.maxSweepsPerCompanyPerDay) {
    throw new Error('Daily sweep limit reached');
  }
  if (usage.tokensUsed >= TOKEN_SAFETY.maxTokensPerCompanyPerDay) {
    throw new Error('Daily token limit reached');
  }
  
  const platformUsage = await getPlatformUsageToday();
  if (platformUsage.costUSD >= TOKEN_SAFETY.maxDailyCostUSD) {
    await alertAdmin('CIRCUIT BREAKER: Daily cost limit reached');
    throw new Error('Platform cost limit reached');
  }
  
  return true;
}

// Layer 2: Mid-sweep monitoring
class TokenBudget {
  private tokensUsed = 0;
  private apiCalls = 0;
  
  consume(tokens: number) {
    this.tokensUsed += tokens;
    this.apiCalls++;
    
    if (this.tokensUsed > TOKEN_SAFETY.maxTokensPerSweep) {
      throw new Error('Sweep token budget exceeded');
    }
    if (this.apiCalls > TOKEN_SAFETY.maxAPICallsPerSweep) {
      throw new Error('Sweep API call limit exceeded');
    }
  }
  
  getRemaining() {
    return TOKEN_SAFETY.maxTokensPerSweep - this.tokensUsed;
  }
}

// Layer 3: Batch processing to minimize calls
async function analyzeLeadsBatch(leads: Lead[], budget: TokenBudget) {
  // Instead of 50 API calls, make 1 call with all leads
  const prompt = buildBatchPrompt(leads); // All leads in one prompt
  
  const estimatedTokens = estimateTokens(prompt);
  if (estimatedTokens > budget.getRemaining()) {
    // Reduce batch size to fit budget
    leads = leads.slice(0, Math.floor(leads.length * budget.getRemaining() / estimatedTokens));
  }
  
  budget.consume(estimatedTokens);
  return await callLLM(prompt);
}
```

**Caching Strategy**

```typescript
// Cache everything possible
const CACHE_CONFIG = {
  // Business info cache (they don't change often)
  businessInfoTTL: 7 * 24 * 60 * 60 * 1000,  // 7 days
  
  // AI analysis cache (reuse for same business)
  aiAnalysisTTL: 30 * 24 * 60 * 60 * 1000,   // 30 days
  
  // Search results cache
  searchResultsTTL: 24 * 60 * 60 * 1000,      // 24 hours
};

async function getBusinessAnalysis(businessId: string, data: BusinessData) {
  // Check cache first
  const cached = await cache.get(`analysis:${businessId}`);
  if (cached && !isStale(cached, CACHE_CONFIG.aiAnalysisTTL)) {
    return cached; // FREE!
  }
  
  // Only call AI if not cached
  const analysis = await analyzeWithAI(data);
  await cache.set(`analysis:${businessId}`, analysis);
  return analysis;
}
```

**Usage Tracking & Alerts**

```typescript
// Collection: platform/usage/daily/{date}
interface DailyUsage {
  date: string;
  totalTokens: number;
  totalCostUSD: number;
  sweepCount: number;
  byCompany: {
    [companyId: string]: {
      tokens: number;
      sweeps: number;
      costUSD: number;
    };
  };
}

// Alert thresholds
async function checkAndAlert(usage: DailyUsage) {
  if (usage.totalCostUSD >= TOKEN_SAFETY.alertThresholdUSD) {
    await notifyAdmin({
      type: 'cost_warning',
      message: `Daily spend at $${usage.totalCostUSD}`,
      threshold: TOKEN_SAFETY.maxDailyCostUSD
    });
  }
}
```

### 8.3 Revised Cost Estimates

| Component | Cost | Notes |
|-----------|------|-------|
| Data collection | ~$0 | Free sources + caching |
| Rule filtering | ~$0 | Pure code, no API |
| Cheap AI scoring | ~$0.01 | GPT-4o-mini batch |
| Smart AI analysis | ~$0.10-0.20 | Only top 15 leads |
| Verification | ~$0.01 | MX lookup, HEAD requests |
| **Total per sweep** | **$0.05-0.30** | |

**Monthly estimate per company:**
- Weekly sweeps (4/month): $0.20 - $1.20
- Daily sweeps (30/month): $1.50 - $9.00

### 8.4 Subscription Tier Limits

| Tier | Sweeps/Month | Max Leads/Sweep | AI Analysis |
|------|-------------|-----------------|-------------|
| Free | 2 | 10 | Basic (mini only) |
| Pro | 8 | 25 | Full |
| Enterprise | Unlimited* | 50 | Full + priority |

*Enterprise "unlimited" still has daily caps for safety

---

## 9. Open Questions

1. **Scraping legality:** Need to ensure compliance with ToS for each source. Consider using official APIs where available.

2. **Rate limits:** How do we handle multiple companies sweeping simultaneously? Queue system?

3. **Data freshness:** How long do we keep discovered leads? Auto-archive after X days?

4. **Feedback loop:** How do we use "dismissed" leads to improve targeting? Store reasons and retrain?

5. **Multi-tenant isolation:** Ensure one company's searches don't leak to another.

---

## 10. Success Metrics

- **Leads discovered per sweep** (target: 10-50)
- **Lead quality score** (avg match % of added leads)
- **Conversion rate** (discovered → pipeline → won)
- **Time saved** (estimated hours of manual research replaced)
- **User engagement** (how often they review discovered leads)

---

*This spec is a living document. Update as we build and learn.*
