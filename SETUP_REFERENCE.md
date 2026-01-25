# SalesTracker AI - Setup & Credentials Reference

> **This file contains all the configuration values you need to set up the production environment.**
>
> **⚠️ SECURITY**: Never commit actual secret values to git. Use Firebase App Hosting Secrets.

---

## 🌐 DNS Configuration (leads.avcpp.com)

Add these records to your domain registrar (Cloudflare, GoDaddy, Namecheap, etc.):

| Type      | Name                                     | Value                                                                        | TTL  |
| --------- | ---------------------------------------- | ---------------------------------------------------------------------------- | ---- |
| **A**     | `leads`                                  | `35.219.200.4`                                                               | 3600 |
| **TXT**   | `leads`                                  | `fah-claim=002-02-c7b00220-42e4-43d9-88fb-f49464e5ae23`                      | 3600 |
| **CNAME** | `_acme-challenge_3vy6hxc24yw4ws5e.leads` | `6c7753c1-79d0-4414-85d1-29145f5822eb.13.authorize.certificatemanager.goog.` | 3600 |

**Status Check**: https://console.firebase.google.com/project/antigrav-tracking-final/apphosting

---

## 🔐 Environment Variables

### Required Secrets (Set via Firebase App Hosting)

```bash
# Set each secret using:
firebase apphosting:secrets:set SECRET_NAME

# Or in Firebase Console:
# App Hosting → leadtracker2 → Settings → Environment Variables
```

| Variable                       | Description                    | Where to Get                                      |
| ------------------------------ | ------------------------------ | ------------------------------------------------- |
| `STRIPE_SECRET_KEY`            | Stripe API secret key          | https://dashboard.stripe.com/apikeys              |
| `STRIPE_WEBHOOK_SECRET`        | Stripe webhook signing secret  | https://dashboard.stripe.com/webhooks             |
| `NEXT_PUBLIC_SENTRY_DSN`       | Sentry error tracking DSN      | https://sentry.io/settings/projects/              |
| `APOLLO_API_KEY`               | Apollo.io enrichment API       | https://app.apollo.io/#/settings/integrations/api |
| `CALENDLY_API_KEY`             | Calendly personal access token | https://calendly.com/integrations/api_webhooks    |
| `CALENDLY_WEBHOOK_SIGNING_KEY` | Calendly webhook verification  | Create in Calendly webhook settings               |

### Already Configured (Verify These Work)

| Variable                 | Status               |
| ------------------------ | -------------------- |
| `NEXT_PUBLIC_FIREBASE_*` | ✅ Set               |
| `TWILIO_ACCOUNT_SID`     | ⚠️ Verify            |
| `TWILIO_AUTH_TOKEN`      | ⚠️ Verify            |
| `SENDGRID_API_KEY`       | ⚠️ Verify per tenant |

---

## 🔗 Webhook URLs

Configure these URLs in your third-party dashboards:

| Service          | Webhook URL                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------- |
| **Stripe**       | `https://leadtracker2--antigrav-tracking-final.us-central1.hosted.app/api/stripe/webhook`     |
| **Calendly**     | `https://leadtracker2--antigrav-tracking-final.us-central1.hosted.app/api/calendly/webhook`   |
| **Twilio SMS**   | `https://leadtracker2--antigrav-tracking-final.us-central1.hosted.app/api/twilio/sms-webhook` |
| **Twilio Voice** | `https://leadtracker2--antigrav-tracking-final.us-central1.hosted.app/api/twilio/webhook`     |

---

## 🔥 Firebase Project Details

| Property                | Value                                                                  |
| ----------------------- | ---------------------------------------------------------------------- |
| **Project ID**          | `antigrav-tracking-final`                                              |
| **App Hosting Backend** | `leadtracker2`                                                         |
| **Region**              | `us-central1`                                                          |
| **Default URL**         | `https://leadtracker2--antigrav-tracking-final.us-central1.hosted.app` |
| **Custom Domain**       | `https://leads.avcpp.com` (pending DNS)                                |
| **Firestore Database**  | `(default)`                                                            |
| **GitHub Repo**         | `optimize-avc/LEADTRACKING`                                            |
| **Auto-Deploy Branch**  | `main`                                                                 |

### Firebase Console Links

- **Project**: https://console.firebase.google.com/project/antigrav-tracking-final
- **App Hosting**: https://console.firebase.google.com/project/antigrav-tracking-final/apphosting
- **Firestore**: https://console.firebase.google.com/project/antigrav-tracking-final/firestore
- **Authentication**: https://console.firebase.google.com/project/antigrav-tracking-final/authentication

---

## 💳 Stripe Configuration

| Property             | Value                                                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard**        | https://dashboard.stripe.com                                                                                                                          |
| **Webhook Endpoint** | `/api/stripe/webhook`                                                                                                                                 |
| **Events to Listen** | `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed` |

### Price IDs (Update These)

```env
# Set these in your environment or code
STRIPE_PRICE_PRO_MONTHLY=price_xxx      # $49/month Pro plan
STRIPE_PRICE_ENTERPRISE=price_xxx       # Custom Enterprise pricing
```

---

## 📊 Monitoring & Analytics

| Service                  | Dashboard URL                  | Setup Guide     |
| ------------------------ | ------------------------------ | --------------- |
| **Sentry**               | https://sentry.io              | Error tracking  |
| **Firebase Performance** | Firebase Console → Performance | Core Web Vitals |
| **Firebase Analytics**   | Firebase Console → Analytics   | User events     |

---

## 🧪 Testing Credentials (Development Only)

```env
# Use these for local development (.env.local)
# NEVER use in production

# Stripe Test Mode
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Test card: 4242 4242 4242 4242 (any future date, any CVC)
```

---

## 📁 Important File Locations

| Purpose             | File Path                    |
| ------------------- | ---------------------------- |
| Firebase Config     | `src/lib/firebase/config.ts` |
| Stripe Config       | `src/lib/stripe/config.ts`   |
| Twilio Config       | `src/lib/twilio/config.ts`   |
| Environment Example | `.env.example`               |
| Firestore Rules     | `firestore.rules`            |
| Firestore Indexes   | `firestore.indexes.json`     |

---

## 🚀 Quick Commands

```bash
# Deploy everything
firebase deploy

# Deploy only rules
firebase deploy --only firestore:rules

# Deploy only indexes
firebase deploy --only firestore:indexes

# Set a secret
firebase apphosting:secrets:set SECRET_NAME

# List secrets
firebase apphosting:secrets:list

# Local development
npm run dev

# Run tests
npm test

# Build check
npm run build
```

---

## ✅ Setup Checklist

- [ ] DNS records added for custom domain
- [ ] Wait 24-48 hours for DNS propagation
- [ ] Stripe webhook configured with correct URL
- [ ] Stripe webhook secret set in secrets
- [ ] Sentry DSN configured
- [ ] Apollo.io API key set (for enrichment)
- [ ] Calendly API key set (for scheduling)
- [ ] Verify all third-party webhooks are working
- [ ] Test a complete user flow (signup → payment → lead creation)
