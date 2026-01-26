# Antigrav Lead Tracking - Credentials & Configuration

**Project:** antigrav-tracking-final  
**Production URL:** https://prod-lead-tracker--antigrav-tracking-final.us-central1.hosted.app  
**Custom Domain (pending setup):** https://leads.avcpp.com

---

## 🔥 Firebase Configuration

### Client SDK (Public - Browser)

```
NEXT_PUBLIC_FIREBASE_API_KEY=<firebase-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=antigrav-tracking-final.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=antigrav-tracking-final
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=antigrav-tracking-final.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<app-id>
```

### Admin SDK (Server-side)

```
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@antigrav-tracking-final.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=<from-service-account-json>
```

**Service Account JSON:** Download from Firebase Console → Project Settings → Service Accounts  
**Console:** https://console.firebase.google.com/project/antigrav-tracking-final

---

## 📧 Gmail OAuth (antigrav-tracking-final Project)

```
GOOGLE_CLIENT_ID=<from-gcp-console>
GOOGLE_CLIENT_SECRET=<from-gcp-console>
```

**OAuth Console:** https://console.cloud.google.com/apis/credentials?authuser=1&project=antigrav-tracking-final  
**Redirect URIs configured:**

- `https://prod-lead-tracker--antigrav-tracking-final.us-central1.hosted.app/api/auth/gmail/callback`
- `http://localhost:3001/api/auth/gmail/callback`

---

## 📱 Twilio Telephony

```
TWILIO_ACCOUNT_SID=<from-twilio-console>
TWILIO_AUTH_TOKEN=<from-twilio-console>
TWILIO_PHONE_NUMBER=<your-twilio-number>
TWILIO_TWIML_APP_SID=<from-twilio-console>
```

**Console:** https://console.twilio.com

---

## 🤖 Google Gemini AI

```
NEXT_PUBLIC_GEMINI_API_KEY=<from-ai-studio>
```

**Console:** https://aistudio.google.com/apikey

---

## 🔐 Cloud Secret Manager (Production Secrets)

The following secrets are stored in Google Cloud Secret Manager for the Firebase App Hosting backend:

| Secret Name            | Description               |
| ---------------------- | ------------------------- |
| `TWILIO_ACCOUNT_SID`   | Twilio Account SID        |
| `TWILIO_AUTH_TOKEN`    | Twilio Auth Token         |
| `GOOGLE_CLIENT_SECRET` | Gmail OAuth Client Secret |
| `GOOGLE_AI_API_KEY`    | Gemini API Key            |

**Console:** https://console.cloud.google.com/security/secret-manager?project=antigrav-tracking-final

---

## 📂 Configuration Files

| File              | Purpose                                      |
| ----------------- | -------------------------------------------- |
| `.env.local`      | Local development environment (NOT in git)   |
| `.env.production` | Production environment template (NOT in git) |
| `apphosting.yaml` | Firebase App Hosting configuration           |

---

## 🚀 Deployment

The app auto-deploys to Firebase App Hosting when changes are pushed to the `main` branch.

**GitHub Repo:** https://github.com/optimize-avc/LEADTRACKING  
**App Hosting Console:** https://console.firebase.google.com/project/antigrav-tracking-final/apphosting

---

## ⚠️ Production Checklist

- [x] Firebase Client SDK configured
- [x] Firebase Admin SDK credentials set
- [x] Gmail OAuth credentials created (antigrav-tracking-final project)
- [x] Gmail OAuth redirect URIs configured
- [x] GOOGLE_CLIENT_SECRET updated in Secret Manager (v2)
- [x] Twilio credentials in Secret Manager
- [x] Gemini API key configured
- [ ] Custom domain (leads.avcpp.com) DNS setup pending
- [ ] Enable Gmail API in GCP project

---

_Last updated: 2026-01-25_
