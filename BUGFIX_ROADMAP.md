# SalesTracker Production Bug Fix Roadmap

> Generated: 2026-01-29
> Updated: 2026-01-29 (Day 1 fixes complete)

---

## 📋 Summary of Issues

| # | Issue | Severity | Status | Notes |
|---|-------|----------|--------|-------|
| 1 | Firestore permissions failures | 🔴 High | ✅ Fixed | Server-side APIs bypass rules |
| 2 | Missing PWA icons (404s) | 🟡 Medium | ✅ Fixed | All icons generated |
| 3 | Discovery API 500 errors | 🔴 High | ✅ Fixed | Shared auth helper + empty handling |
| 4 | Resources page permissions | 🟠 High | ✅ Fixed | Auth racing + graceful errors |
| 5 | Channel mapping save fails | 🔴 High | ✅ Fixed | Moved to server-side API |

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
- Moved all settings updates from client-side Firestore:
  - `updateChannelMapping()` ✅
  - `updateSettings()` ✅
  - `updateEmailConfig()` ✅
  - `clearEmailConfig()` ✅
  - `updateTwilioConfig()` ✅
  - `clearTwilioConfig()` ✅
- Proper auth checks (owner OR admin role required)

### 5. Twilio Settings API
- Updated `/api/settings/twilio` to use shared auth helper
- Now supports both owners AND admins
- Removed manual userId/companyId params

---

## 🔧 Still Pending

### Firestore Rules Deployment
The `firestore.rules` file is updated but needs manual deployment:
```bash
cd C:\Users\tryst\LEADTRACKING
firebase login --reauth
firebase deploy --only firestore:rules
```

**Rules changes made:**
- Added `users/{userId}/resources/{resourceId}` subcollection rule
- Users can now store personal resources in their user subcollection

---

## 📁 Files Modified

### New Files
- `src/lib/api/auth-helpers.ts` - Shared auth context helper
- `src/app/api/company/settings/route.ts` - Server-side settings API
- `public/icons/icon-*.png` (8 files) - PWA icons
- `scripts/generate-pwa-icons.mjs` - Icon generation script

### Modified Files
- `src/app/api/discovery/leads/route.ts`
- `src/app/api/discovery/profile/route.ts`
- `src/app/api/discovery/sweep/route.ts`
- `src/app/api/discovery/parse/route.ts`
- `src/app/api/settings/twilio/route.ts`
- `src/app/resources/ResourcesClient.tsx`
- `src/lib/firebase/company.ts`
- `firestore.rules`

---

## 🧪 Testing Checklist

After deployment, verify:

- [ ] Dashboard loads without console errors
- [ ] Discover → AI Discovered tab shows empty state (not 500)
- [ ] Resources/Enablement page loads without crashing
- [ ] Bot Studio → Save Channel Mapping works
- [ ] Settings → Twilio config saves/clears
- [ ] PWA icons load at `/icons/icon-144x144.png`
- [ ] No "Missing or insufficient permissions" errors in console
