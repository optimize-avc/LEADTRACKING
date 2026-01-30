# SalesTracker Production Bug Fix Roadmap

> Generated: 2026-01-29
> Updated: 2026-01-29 (Day 1 + Day 2 complete)

---

## 📋 Summary of Issues

| #   | Issue                          | Severity  | Status   | Notes                               |
| --- | ------------------------------ | --------- | -------- | ----------------------------------- |
| 1   | Firestore permissions failures | 🔴 High   | ✅ Fixed | Server-side APIs bypass rules       |
| 2   | Missing PWA icons (404s)       | 🟡 Medium | ✅ Fixed | All icons generated                 |
| 3   | Discovery API 500 errors       | 🔴 High   | ✅ Fixed | Shared auth helper + empty handling |
| 4   | Resources page permissions     | 🟠 High   | ✅ Fixed | Auth racing + graceful errors       |
| 5   | Channel mapping save fails     | 🔴 High   | ✅ Fixed | Moved to server-side API            |
| 6   | Firestore rules deploy         | 🔴 High   | ✅ Fixed | Deployed via CLI                    |

---

## ✅ Completed Fixes (Day 1)

### 1. PWA Icons (404s)

- Generated all 8 icon sizes (72-512px) using sharp
- Icons in `public/icons/` directory
- Manifest.json references work properly

### 2. Discovery API Auth Helper

- Created `src/lib/api/auth-helpers.ts` with `getAuthContext()`
- Supports both company owners AND team members
- Updated routes: `/api/discovery/leads`, `/api/discovery/profile`, `/api/discovery/sweep`, `/api/discovery/parse`
- Added graceful empty collection handling (returns `[]` instead of 500)

### 3. Resources Page Auth Racing

- Fixed `ResourcesClient.tsx` to wait for auth before Firestore queries
- Added `user.getIdToken(true)` validation before queries
- Errors logged to console instead of shown to users (graceful degradation)
- Added user resources subcollection rule to `firestore.rules`

### 4. Company Settings → Server-Side API

- Created `POST/PATCH /api/company/settings` endpoint
- Uses Firebase Admin SDK (bypasses Firestore rules)
- Moved all settings updates from client-side Firestore
- Proper auth checks (owner OR admin role required)

### 5. Twilio Settings API

- Updated `/api/settings/twilio` to use shared auth helper
- Now supports both owners AND admins

### 6. Firestore Rules Deploy

- Deployed updated rules via `firebase deploy --only firestore:rules`
- Resources collection now accessible to authenticated users
- User resources subcollection working

---

## ✅ Completed (Day 2)

### 1. Sentry Configuration

- Added `NEXT_PUBLIC_SENTRY_DSN` placeholder to `apphosting.yaml`
- User needs to create Sentry project and add DSN value
- ErrorBoundary now integrates with Sentry `captureError()`

### 2. Error Boundaries on Critical Pages

- Added `PageErrorBoundary` wrapper to:
    - `/leads` (LeadsClient)
    - `/discover` (DiscoverClient)
    - `/analytics` (AnalyticsClient)
    - `/settings` (SettingsClient)

### 3. Audit Logging

- Added audit logging to `/api/company/settings` PATCH
- Added audit logging to `/api/settings/twilio` POST/DELETE
- Extended `AuthContext` with `userName` field for better audit trails

---

## 🔧 Still Pending

### Stripe Billing (Deferred)

- Create Stripe products/prices in Dashboard
- Set Stripe secrets in Cloud Secret Manager
- Test checkout + webhook flow
- Configure customer portal

### Nice-to-Have

- Add audit logging to more API routes
- SendGrid email templates
- Client-side Zod validation on forms

---

## 📁 Files Modified

### Day 1 - New Files

- `src/lib/api/auth-helpers.ts` - Shared auth context helper
- `src/app/api/company/settings/route.ts` - Server-side settings API
- `public/icons/icon-*.png` (8 files) - PWA icons
- `scripts/generate-pwa-icons.mjs` - Icon generation script

### Day 1 - Modified Files

- `src/app/api/discovery/leads/route.ts`
- `src/app/api/discovery/profile/route.ts`
- `src/app/api/discovery/sweep/route.ts`
- `src/app/api/discovery/parse/route.ts`
- `src/app/api/settings/twilio/route.ts`
- `src/app/resources/ResourcesClient.tsx`
- `src/lib/firebase/company.ts`
- `firestore.rules`

### Day 2 - Modified Files

- `apphosting.yaml` - Added Sentry DSN config
- `src/app/leads/page.tsx` - Added PageErrorBoundary
- `src/app/discover/page.tsx` - Added PageErrorBoundary
- `src/app/analytics/page.tsx` - Added PageErrorBoundary
- `src/app/settings/page.tsx` - Added PageErrorBoundary
- `src/components/ui/ErrorBoundary.tsx` - Sentry integration
- `src/app/api/company/settings/route.ts` - Audit logging
- `src/app/api/settings/twilio/route.ts` - Audit logging
- `src/lib/api/auth-helpers.ts` - Added userName to AuthContext

---

## 🧪 Testing Results

**Day 1 Testing (Verified):**

- ✅ Dashboard loads without console errors
- ✅ Discover → AI Discovered tab shows empty state (not 500)
- ✅ Resources/Enablement page loads without crashing
- ✅ Bot Studio → Save Channel Mapping works
- ✅ PWA icons load properly
- ✅ No "Missing or insufficient permissions" errors after rules deploy

**Day 2 Testing (Pending Build):**

- ⏳ Error boundaries catch crashes gracefully
- ⏳ Sentry receives error reports (once DSN configured)
- ⏳ Audit logs appear in Firestore
