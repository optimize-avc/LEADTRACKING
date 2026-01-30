# SalesTracker SaaS - Production Roadmap

**Created:** 2026-01-26
**Goal:** Transform into production-ready, multi-tenant, client-facing SaaS

---

## Current Status: ~90% Complete (Production Ready minus Stripe)

### ✅ Already Built

- [x] Multi-tenant Firestore security rules with companyId isolation
- [x] Company management service (create, get, update, settings)
- [x] User/team management with roles (admin, manager, rep)
- [x] Lead management with full CRUD, activities, pipeline stages
- [x] Usage tracking service (leads, emails, activities, monthly resets)
- [x] Stripe integration (checkout, webhook, portal routes exist)
- [x] Pricing page with 3 tiers (Free, Pro $49, Venture/Contact)
- [x] Google OAuth login
- [x] Onboarding checklist component
- [x] Twilio phone integration
- [x] Gmail integration structure
- [x] SendGrid email with tenant-specific config
- [x] AI service (Gemini) for deal analysis
- [x] Firebase App Hosting configured
- [x] Sentry error monitoring (partial)
- [x] Analytics tracking

### ❌ Missing / Incomplete

See detailed phases below.

---

## Phase 1: Billing & Subscription Flow (CRITICAL)

**Priority:** P0 - Can't monetize without this
**Est. Time:** 4-6 hours

### 1.1 Stripe Configuration

- [ ] Create Stripe products & prices in Stripe Dashboard
    - Free tier: No Stripe product needed
    - Pro tier: $49/month subscription
    - Venture tier: Custom pricing (contact sales)
- [ ] Add to `.env.local` / App Hosting secrets:
    ```
    STRIPE_SECRET_KEY=sk_live_xxx
    STRIPE_WEBHOOK_SECRET=whsec_xxx
    STRIPE_PRICE_ID_PRO=price_xxx
    STRIPE_PRICE_ID_VENTURE=price_xxx
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
    ```
- [ ] Configure Stripe webhook endpoint in Stripe Dashboard:
    - URL: `https://[your-domain]/api/stripe/webhook`
    - Events: `checkout.session.completed`, `customer.subscription.updated`,
      `customer.subscription.deleted`, `invoice.payment_failed`

### 1.2 Plan Limits Enforcement

- [x] Create `src/lib/plans.ts` with tier limits
- [x] Add `usePlanLimits` hook (`src/hooks/usePlanLimits.ts`)
- [x] Create `UpgradePrompt` component (`src/components/billing/UpgradePrompt.tsx`)
- [x] Create server-side API for leads with plan checking (`src/app/api/leads/route.ts`)
- [ ] Integrate limit checks in client-side lead creation form
- [ ] Add limit checks to email sending service
- [ ] Add limit checks to team member adding

### 1.3 Subscription Management UI

- [x] Create `/settings/billing/page.tsx`:
    - Current plan display
    - Usage meters (leads, emails, team members)
    - Upgrade button
    - Manage in Stripe button
    - Feature access indicators
- [x] Add billing link to settings layout

### 1.4 Stripe Customer Portal

- [ ] Test `/api/stripe/portal/route.ts` works
- [ ] Configure portal in Stripe Dashboard:
    - Allow plan changes
    - Allow cancellation
    - Show invoice history

---

## Phase 2: Onboarding & Signup Flow

**Priority:** P0 - Users can't get started without this
**Est. Time:** 3-4 hours

### 2.1 New User Signup Flow

- [x] Create `/onboarding/page.tsx` wizard:
    - Step 1: Company name
    - Step 2: Industry selection + team size
    - Step 3: Optional team member invites
- [x] Create `OnboardingGuard` component (`src/components/guards/OnboardingGuard.tsx`)
- [x] Add redirect to onboarding in dashboard page
- [ ] Test full signup → onboarding → dashboard flow

### 2.2 Team Invitations ✅

- [x] `/api/team/invite/route.ts` - Create invites (already existed)
- [x] `/api/team/accept/route.ts` - Accept invites (new)
- [x] `/invite/accept/page.tsx` - Accept invite UI (new)
- [x] Team management UI in `/settings/team` (already existed)
- [ ] SendGrid credits exhausted - need to add more or use alternative

### 2.3 First-Time User Experience

- [ ] Enhance `OnboardingChecklist.tsx`:
    - Add company setup step
    - Add "Create first lead" step
    - Add "Send first email" step
- [ ] Create sample lead on first login (optional)

---

## Phase 3: Security Hardening

**Priority:** P1 - Required for production
**Est. Time:** 2-3 hours

### 3.1 Authentication Security

- [ ] Add email verification requirement (optional for Google OAuth)
- [ ] Implement session management:
    - Token refresh on activity
    - Idle timeout warning
    - Force logout on security events
- [x] Add rate limiting to API routes:
    - Created `src/lib/api-middleware.ts` with rate limit wrapper
    - Applied to `/api/leads` (POST/GET)
    - Applied to `/api/team/invite` (POST)

### 3.2 Audit Logging

- [x] `src/lib/firebase/audit.ts` already comprehensive:
    - Logs sensitive operations
    - Includes userId, companyId, action, timestamp
    - Stores in `companies/{companyId}/auditLog` subcollection
    - Has convenience methods for common actions
- [ ] Integrate audit logging into API routes (calling AuditService)

### 3.3 Data Validation

- [x] Created `src/lib/validation.ts` with Zod schemas:
    - Lead schemas (create/update)
    - Team invite schemas
    - Company schemas
    - Email schemas
    - Activity schemas
    - Settings schemas
- [x] Applied validation to `/api/leads` POST
- [x] Applied validation to `/api/team/invite` POST
- [ ] Add client-side validation using same schemas

---

## Phase 4: Admin & Support Features

**Priority:** P1 - Needed for operating the SaaS
**Est. Time:** 3-4 hours

### 4.1 Super Admin Dashboard

- [x] Create `/admin/page.tsx` (protected by admin check)
- [x] Features:
    - List all companies (tenants)
    - View usage stats per company
    - View subscription status
    - Search users
- [x] Add super admin role check (hardcoded admin emails or Firestore flag)
- [x] Created `/api/admin/metrics/route.ts` with real data

### 4.2 Impersonation for Support

- [x] Create `/api/admin/impersonate/route.ts`:
    - Only super admins
    - Create custom token for target user
    - Log impersonation event
- [ ] Add "Exit Impersonation" banner when impersonating (UI enhancement, lower priority)

### 4.3 Company Management

- [x] Create `/api/admin/companies/route.ts`:
    - List all companies with pagination/search
    - Update company tier
    - Disable/enable company
    - Extend trial
- [ ] Add company management UI in admin dashboard (enhancement)

---

## Phase 5: Production Readiness

**Priority:** P1 - Deploy with confidence
**Est. Time:** 2-3 hours

### 5.1 Environment Configuration

- [x] Updated `apphosting.yaml` with all required secrets:
    - `STRIPE_SECRET_KEY`
    - `STRIPE_WEBHOOK_SECRET`
    - `STRIPE_PRICE_ID_PRO`
    - `STRIPE_PRICE_ID_VENTURE`
    - `GOOGLE_CLIENT_SECRET`
    - `GOOGLE_AI_API_KEY` (Gemini)
    - `TWILIO_ACCOUNT_SID`
    - `TWILIO_AUTH_TOKEN`
    - `SENDGRID_API_KEY` (platform default)
- [x] Verify `apphosting.yaml` has all env vars
- [ ] Set secrets in Cloud Secret Manager (manual step):
    ```bash
    firebase apphosting:secrets:set STRIPE_SECRET_KEY --data-file=-
    firebase apphosting:secrets:set STRIPE_WEBHOOK_SECRET --data-file=-
    firebase apphosting:secrets:set STRIPE_PRICE_ID_PRO --data-file=-
    firebase apphosting:secrets:set SENDGRID_API_KEY --data-file=-
    ```

### 5.2 Error Monitoring

- [x] Sentry setup already complete:
    - `sentry.client.config.ts` ✓
    - `sentry.server.config.ts` ✓
    - `sentry.edge.config.ts` ✓
- [x] Created `ErrorBoundary` component (`src/components/ui/ErrorBoundary.tsx`)
    - Basic error boundary with retry
    - Page-level error boundary
    - Sentry integration for error capture
- [ ] Add NEXT_PUBLIC_SENTRY_DSN to apphosting.yaml secrets
- [ ] Wrap critical pages with PageErrorBoundary

### 5.3 Email Templates

- [ ] Create SendGrid dynamic templates:
    - Welcome email
    - Team invitation
    - Password reset (if email/password auth added)
    - Payment failed notification
    - Subscription confirmation
- [ ] Store template IDs in config

### 5.4 Performance & Caching

- [ ] Add React Query caching for frequently accessed data
- [ ] Implement Firestore offline persistence
- [ ] Add loading skeletons to all data-fetching pages

---

## Phase 6: Nice-to-Have Enhancements

**Priority:** P2 - Post-launch improvements
**Est. Time:** Ongoing

### 6.1 Additional Auth Methods

- [ ] Email/password signup (optional)
- [ ] Microsoft/Azure AD for enterprise

### 6.2 Advanced Features

- [ ] Custom domains per tenant
- [ ] White-labeling options
- [ ] API access for Pro/Enterprise tiers
- [ ] Zapier/webhook integrations

### 6.3 Analytics & Reporting

- [ ] Admin dashboard with platform-wide metrics
- [ ] Tenant usage reports
- [ ] Churn analysis

---

## Implementation Order (Recommended)

1. **Phase 1.1** - Stripe config (can't test billing without it)
2. **Phase 2.1** - New user signup flow (core user journey)
3. **Phase 1.2-1.4** - Plan limits & billing UI
4. **Phase 2.2-2.3** - Team invites & onboarding polish
5. **Phase 3** - Security (before going live)
6. **Phase 5** - Production config & monitoring
7. **Phase 4** - Admin tools (for operations)
8. **Phase 6** - Nice-to-haves (post-launch)

---

## Quick Start Commands

```bash
# Navigate to project
cd C:\Users\tryst\.gemini\antigravity\scratch\antigrav-tracking

# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Deploy to Firebase App Hosting
firebase apphosting:backends:create --project antigrav-tracking-final
```

---

## Environment Variables Checklist

### Required for Development (.env.local)

```
# Firebase (already set in apphosting.yaml)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=antigrav-tracking-final
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
# ... other Firebase config

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID_PRO=price_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Google OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# AI
GOOGLE_AI_API_KEY=xxx

# Twilio
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+17086947326

# SendGrid (platform default)
SENDGRID_API_KEY=xxx
```

---

## Notes

- **Firebase App Hosting** handles automatic scaling, SSL, and CDN
- **Firestore security rules** already enforce multi-tenancy via companyId
- **Stripe webhooks** must be configured in Stripe Dashboard for production
- **Google OAuth** requires authorized domains in Firebase Console
