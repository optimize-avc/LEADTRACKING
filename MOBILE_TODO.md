# LEADTRACKING Mobile App - Complete TODO

**Goal:** Get this web app packaged as native iOS & Android apps and submitted to the App Store / Play Store.

**Strategy:** Use **Capacitor** to wrap the existing Next.js web app. This preserves all existing functionality while adding native capabilities.

---

## Phase 1: Fix Build Issues & Prep Web App ✅

### 1.1 Fix Next.js Build ✅
- [x] Fix middleware deprecation (warning only, build works)
- [x] Fix Turbopack build crash (disabled turbopack config, builds clean)
- [x] Verify clean build completes: `npm run build`

### 1.2 Mobile-First CSS Adjustments ✅
- [x] Touch-friendly tap targets already implemented (globals.css)
- [x] Safe-area-inset padding added
- [x] Touch scroll optimizations present
- [ ] Test on actual devices (needs manual testing)

### 1.3 PWA Manifest & Icons 🔧
- [x] Create `public/manifest.json` with app metadata
- [x] Add manifest link to layout.tsx
- [x] Add apple-touch-icon meta tags
- [x] Add theme-color meta tag
- [ ] **Generate app icons** (need to create actual images)
- [ ] Create splash screens for iOS

---

## Phase 2: Capacitor Integration ✅

### 2.1 Initialize Capacitor ✅
- [x] Install Capacitor: `npm install @capacitor/core @capacitor/cli`
- [x] Initialize: `npx cap init "SalesTracker" "com.avcpp.salestracker"`
- [x] Configure `capacitor.config.ts` with server URL

### 2.2 Configure for Remote Loading ✅
- [x] Set server.url to deployed Firebase App Hosting URL
- [x] Web app served remotely (API routes work normally)

### 2.3 Add Native Platforms ✅
- [x] Add iOS: `npx cap add ios`
- [x] Add Android: `npx cap add android`
- [x] Sync: `npx cap sync`

---

## Phase 3: Native Features 🔧

### 3.1 Push Notifications
- [x] Install: `@capacitor/push-notifications` (installed)
- [ ] Configure Firebase Cloud Messaging (FCM) for Android
- [ ] Configure Apple Push Notification service (APNs) for iOS
- [ ] Add notification handling code to app
- [ ] Test notification delivery

### 3.2 Status Bar & Splash Screen ✅
- [x] Install: `@capacitor/status-bar`, `@capacitor/splash-screen`
- [x] Configure in capacitor.config.ts
- [ ] Create custom splash screen images

### 3.3 Keyboard & Haptics ✅
- [x] Install: `@capacitor/keyboard`, `@capacitor/haptics`
- [ ] Integrate haptics into UI interactions (optional polish)

---

## Phase 4: iOS App Store Prep 🔜

### 4.1 Apple Developer Account
- [ ] Verify Apple Developer Program membership ($99/year)
- [ ] Create App ID: `com.avcpp.salestracker`
- [ ] Create provisioning profiles (Development & Distribution)

### 4.2 Xcode Project Setup
- [ ] Open `ios/App/App.xcworkspace` in Xcode
- [x] Bundle Identifier set: `com.avcpp.salestracker`
- [x] Display Name set: `SalesTracker`
- [ ] Configure signing (Team, Provisioning Profile)
- [ ] Set minimum iOS version to 15.0+

### 4.3 App Icons (iOS) 📸
- [ ] Create 1024x1024 master icon
- [ ] Generate all sizes via Xcode or online tool
- [ ] Replace placeholder in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

### 4.4 Launch Screen
- [ ] Update `LaunchScreen.storyboard` with SalesTracker branding
- [ ] Match dark theme (#0b1121 background)

### 4.5 Info.plist Permissions ✅
- [x] Face ID usage description added
- [x] Remote notification background mode added

### 4.6 App Store Connect Setup
- [ ] Create app in App Store Connect
- [ ] App name: SalesTracker AI
- [ ] Fill in description, keywords, support URL
- [ ] Add screenshots (6.7", 6.5", 5.5" sizes)
- [ ] Set pricing

### 4.7 Privacy & Legal ✅
- [x] Privacy Policy URL exists: `/privacy`
- [x] Terms of Service URL exists: `/terms`
- [ ] Fill App Privacy questionnaire

### 4.8 TestFlight
- [ ] Archive build in Xcode
- [ ] Upload to App Store Connect
- [ ] Test on real devices
- [ ] Fix any issues

### 4.9 Submit for Review
- [ ] Final build uploaded
- [ ] Submit for App Review

---

## Phase 5: Google Play Store Prep 🔜

### 5.1 Google Play Developer Account
- [ ] Ensure Google Play Console access ($25 one-time)
- [ ] Create new app

### 5.2 Android Project Setup ✅
- [x] applicationId set: `com.avcpp.salestracker`
- [x] App name set in `strings.xml`
- [ ] Generate signing keystore (KEEP IT SAFE!)
- [ ] Configure signing in build.gradle
- [ ] Set minSdk to 24 (Android 7.0)

### 5.3 App Icons (Android) 📸
- [ ] Create adaptive icon (foreground + background layers)
- [ ] Replace placeholders in `android/app/src/main/res/mipmap-*/`

### 5.4 Play Store Listing
- [ ] Short description (80 chars)
- [ ] Full description (4000 chars)
- [ ] Screenshots
- [ ] Feature graphic (1024x500)

### 5.5 Testing & Release
- [ ] Build signed AAB
- [ ] Internal testing track
- [ ] Production release

---

## NEXT STEPS (Immediate Actions)

1. **Create App Icons** - Need a 1024x1024 PNG master icon
   - Use a gradient blue/purple style matching the web app
   - "ST" or chart/graph icon representing sales tracking
   
2. **Test in Simulator/Emulator**
   - iOS: `npx cap open ios` (requires Mac with Xcode)
   - Android: `npx cap open android` (requires Android Studio)

3. **Get Apple Developer Account** - Required for iOS distribution

4. **Generate Signing Key** for Android

---

## Files Modified/Created

| File | Status |
|------|--------|
| `capacitor.config.ts` | ✅ Created & configured |
| `public/manifest.json` | ✅ Created |
| `src/app/layout.tsx` | ✅ Updated with PWA meta |
| `ios/App/App/Info.plist` | ✅ Updated with permissions |
| `android/` | ✅ Platform added |
| `ios/` | ✅ Platform added |
| `MOBILE_TODO.md` | ✅ This file |

---

## Commands Reference

```bash
# Sync web assets to native projects
npx cap sync

# Open in Xcode (iOS)
npx cap open ios

# Open in Android Studio
npx cap open android

# Build web app
npm run build

# Run dev server (for local testing)
npm run dev
```

---

*Last updated: 2026-01-27 11:28 AM*
