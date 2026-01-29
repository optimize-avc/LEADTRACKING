# SalesTracker Production Bug Fix Roadmap

> Generated: 2026-01-29
> Based on console error analysis and codebase review

---

## 📋 Summary of Issues

| # | Issue | Severity | Category | Effort |
|---|-------|----------|----------|--------|
| 1 | Firestore permissions failures | 🔴 High | Security/Data | Medium |
| 2 | Missing PWA icons (404s) | 🟡 Medium | UX/PWA | Low |
| 3 | Discovery API 500 errors | 🔴 High | API | Medium |
| 4 | Resources page permissions | 🟠 High | Security/Data | Medium |

---

## 🔴 Issue 1: Firestore Permissions Failures

### Errors
```
Failed to save channel mapping: FirebaseError: Missing or insufficient permissions.
Error loading profile: FirebaseError: Missing or insufficient permissions.
Failed to load resources: FirebaseError: Missing or insufficient permissions.
Failed to fetch resources: FirebaseError: Missing or insufficient permissions.
```

### Root Cause Analysis
The current Firestore security rules have a **chicken-and-egg problem**:
1. User logs in → tries to read their company data
2. Rules check: `userBelongsToCompany(companyId)` which calls `getUserCompanyId()`
3. `getUserCompanyId()` reads from `/users/{uid}` to get `companyId`
4. **But**: The user document may not have `companyId` yet, OR the user may not have read access to their own profile before company membership is established

The rules are also inconsistent across different data access patterns.

### Proper Fix Strategy

#### Phase 1: Simplify User Document Access (Day 1)
**Goal:** Users should ALWAYS be able to read/update their own profile

```javascript
// CURRENT (problematic)
match /users/{userId} {
  allow read: if isOwner(userId);  // This works
  allow update: if isOwner(userId) && !protectedFieldsModified();
}

// FIX - Add: Users can also read other users in their company (for team features)
match /users/{userId} {
  allow read: if isOwner(userId) || 
              (isAuthenticated() && 
               resource.data.companyId != null && 
               resource.data.companyId == getUserCompanyId());
  allow update: if isOwner(userId) && !protectedFieldsModified();
  allow create: if isOwner(userId);
}
```

#### Phase 2: Fix Company Bootstrapping (Day 1-2)
**Goal:** New users can bootstrap their company without permission errors

Current flow has a race condition:
1. User signs up
2. Frontend tries to load company (fails - user has no companyId yet)
3. Frontend tries to create company (calls API)
4. API creates company, updates user document
5. Frontend retries but cached auth state doesn't have new claims

**Fix: Move ALL company bootstrap logic server-side**

```typescript
// src/app/api/company/bootstrap/route.ts (NEW)
// Single endpoint that handles:
// 1. Check if user has company
// 2. Create company if not
// 3. Return company data + updated user
// Frontend calls this ONCE on login, waits for response
```

#### Phase 3: Add Fallback Permission Rules (Day 2)
**Goal:** Resources collection needs proper company scoping

```javascript
// CURRENT
match /resources/{resourceId} {
  allow read: if isAuthenticated();  // Too broad
}

// FIX - Scope to company OR user
match /resources/{resourceId} {
  // Company-wide resources: any company member can read
  allow read: if isAuthenticated() && 
              (resource.data.visibility == 'company' || 
               resource.data.createdBy == request.auth.uid);
  
  // Users can create resources
  allow create: if isAuthenticated() && 
                request.resource.data.createdBy == request.auth.uid;
                
  // Only creator can update/delete
  allow update, delete: if isAuthenticated() && 
                        resource.data.createdBy == request.auth.uid;
}
```

#### Phase 4: Channel Mapping Fix (Day 2)
**Goal:** Bot Studio channel mapping saves correctly

The `updateChannelMapping` function uses client-side Firestore, which requires the user to have update permissions on the company document.

**Fix Options:**
1. **Recommended:** Move to server-side API route (like company creation)
2. **Alternative:** Add explicit rule allowing company members to update `settings.channelMapping`

```typescript
// src/app/api/company/settings/route.ts (modify)
export async function PATCH(request: NextRequest) {
  // ... auth validation
  // Allow updating: channelMapping, persona, industry, qualificationRules
  // Admin SDK bypasses rules
}
```

### Implementation Checklist
- [ ] Create `/api/company/bootstrap` endpoint
- [ ] Modify AuthProvider to call bootstrap on login
- [ ] Update Firestore rules for users collection
- [ ] Update Firestore rules for resources collection  
- [ ] Move channel mapping to server-side API
- [ ] Add proper error handling with user feedback
- [ ] Test all flows: signup, login, company switch

---

## 🟡 Issue 2: Missing PWA Icons (404s)

### Errors
```
Failed to load resource: 404 - /icons/icon-144x144.png
(and all other icon sizes)
```

### Root Cause
The `public/icons/` directory exists but is **empty**. The `manifest.json` references icons that don't exist.

### Proper Fix Strategy

#### Option A: Generate Real PWA Icons (Recommended)
**Goal:** Full PWA support with installable app

```bash
# 1. Create a source icon (512x512 PNG, ideally SVG for crisp scaling)
# Use the app's logo/branding

# 2. Generate all required sizes
# Tool: sharp-cli, pwa-asset-generator, or online tool

npx pwa-asset-generator ./source-logo.png ./public/icons --manifest ./public/manifest.json
```

Required sizes for manifest.json:
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192
- 384x384
- 512x512

#### Option B: Remove PWA Icons (Quick fix)
**Goal:** Stop 404 errors if PWA isn't a priority

```json
// public/manifest.json - simplified
{
  "name": "SalesTracker AI",
  "short_name": "SalesTracker",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0b1121",
  "theme_color": "#0b1121",
  "icons": []
}
```

### Implementation Checklist
- [ ] Create/source brand icon at 512x512
- [ ] Generate all PWA icon sizes
- [ ] Place in `public/icons/`
- [ ] Verify manifest.json paths match
- [ ] Test PWA install flow on mobile

---

## 🔴 Issue 3: Discovery API 500 Errors

### Errors
```
Failed to load resource: 500 - /api/discovery/leads?status=new&limit=50
```

### Root Cause Analysis
The `/api/discovery/leads` endpoint is failing because:

1. **Auth lookup may fail:** `getCompanyIdFromToken` looks for companies where `ownerId == userId`, but if the user is a team member (not owner), this fails.

2. **Collection may not exist:** New companies don't have a `discoveredLeads` subcollection until first sweep.

### Proper Fix Strategy

#### Phase 1: Fix Company Lookup (Day 1)
```typescript
// CURRENT (only finds owner's companies)
const companiesSnap = await db.collection('companies')
    .where('ownerId', '==', userId)
    .limit(1)
    .get();

// FIX (find company where user is owner OR member)
async function getCompanyIdFromToken(request: NextRequest) {
    // ... token validation ...
    
    // First check if user owns a company
    let companiesSnap = await db.collection('companies')
        .where('ownerId', '==', userId)
        .limit(1)
        .get();
    
    if (companiesSnap.empty) {
        // Check user document for companyId (team members)
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists && userDoc.data()?.companyId) {
            return { 
                companyId: userDoc.data()!.companyId, 
                userId 
            };
        }
        return null;
    }
    
    return { companyId: companiesSnap.docs[0].id, userId };
}
```

#### Phase 2: Handle Missing Collection (Day 1)
```typescript
// Add graceful handling for empty/missing collection
export async function GET(request: NextRequest) {
    // ... auth ...
    
    try {
        // Check if collection exists first
        const collectionRef = db.collection('companies')
            .doc(auth.companyId)
            .collection('discoveredLeads');
            
        const snapshot = await collectionRef.limit(1).get();
        
        // If empty, return empty result instead of erroring
        if (snapshot.empty) {
            return NextResponse.json({
                leads: [],
                total: 0,
                limit: limitParam,
                offset: offsetParam,
            });
        }
        
        // ... continue with query ...
    } catch (error) {
        console.error('Error:', error);
        // Return empty state instead of 500
        return NextResponse.json({
            leads: [],
            total: 0,
            limit: 50,
            offset: 0,
            error: 'Discovery not configured yet'
        });
    }
}
```

### Implementation Checklist
- [ ] Update `getCompanyIdFromToken` helper function
- [ ] Add graceful empty collection handling
- [ ] Add proper error responses (not 500)
- [ ] Test with: owner, team member, new user

---

## 🟠 Issue 4: Resources Page Permissions

### Errors
```
Failed to load resources: FirebaseError: Missing or insufficient permissions.
Failed to fetch resources: FirebaseError: Missing or insufficient permissions.
```

### Root Cause
The Resources page calls `ResourcesService.getCompanyResources()` which queries the `/resources` collection. The Firestore rules require authentication but may fail due to:
1. Auth state not ready when query runs
2. Resources collection using `visibility` field not accounted for in rules

### Proper Fix Strategy

#### Phase 1: Fix Auth State Racing (Day 1)
```typescript
// ResourcesClient.tsx - CURRENT
useEffect(() => {
    async function fetchResources() {
        if (authLoading) return;  // Good
        setLoading(true);
        try {
            if (user?.uid) {
                const companyData = await ResourcesService.getCompanyResources();
                // ... 
            }
        }
    }
    fetchResources();
}, [user, authLoading]);

// FIX: Add token validation before Firestore queries
useEffect(() => {
    async function fetchResources() {
        if (authLoading) return;
        if (!user?.uid) {
            setLoading(false);
            return;
        }
        
        // Ensure we have a valid token before querying
        try {
            await user.getIdToken(true);  // Force refresh
        } catch {
            console.error('Auth token invalid');
            setLoading(false);
            return;
        }
        
        setLoading(true);
        // ... continue with queries
    }
    fetchResources();
}, [user, authLoading]);
```

#### Phase 2: Add Loading States (Day 1)
Show appropriate UI while waiting for auth, rather than querying with invalid state.

#### Phase 3: Move to Server-Side API (Day 2, if needed)
If client-side Firestore continues to have issues, create API routes:
- `GET /api/resources` - List resources with proper auth
- `POST /api/resources` - Upload with server-side validation

### Implementation Checklist
- [ ] Fix auth state racing in ResourcesClient
- [ ] Add token refresh before queries
- [ ] Update Firestore rules for resources
- [ ] Consider server-side API if issues persist

---

## 📅 Implementation Timeline

### Day 1: Critical Fixes
- [ ] Fix `getCompanyIdFromToken` in all API routes
- [ ] Handle empty collections gracefully
- [ ] Generate/add PWA icons
- [ ] Fix auth state racing in ResourcesClient

### Day 2: Security Rules Overhaul
- [ ] Rewrite Firestore rules with proper patterns
- [ ] Create `/api/company/bootstrap` endpoint
- [ ] Move channel mapping to server-side
- [ ] Test all permission scenarios

### Day 3: Testing & Polish
- [ ] Test full signup → onboarding flow
- [ ] Test team member invite → accept flow
- [ ] Test all settings pages as owner and member
- [ ] Verify no console errors remain
- [ ] Deploy to staging for QA

---

## 🧪 Testing Scenarios

After fixes, verify these work without console errors:

1. **New User Signup**
   - Sign up with Google
   - Auto-creates company
   - Can access all features

2. **Team Member Join**
   - Accept invite
   - Gets added to existing company
   - Can read resources, leads
   - Cannot modify company settings (unless admin)

3. **Settings Pages**
   - Bot Studio: Connect Discord, map channels
   - Discovery: Save configuration
   - Account: Save preferences
   - Email: Save SendGrid config

4. **Data Features**
   - Resources: Upload, view, delete
   - Leads: Create, update, view
   - Activities: Create, view

---

## 📝 Notes

### Why Not Just Use `allow read, write: if true`?
- Security nightmare - anyone could read/write any data
- No multi-tenant isolation
- GDPR/compliance violations

### Why Server-Side APIs?
- Firebase Admin SDK bypasses security rules
- Allows complex validation logic
- Better audit logging
- More reliable than client-side rule evaluation

### Firestore Rule Gotchas
- `get()` calls in rules count against quotas
- Recursive rules can hit call limits
- Rules are not filters - queries must match rule predicates
