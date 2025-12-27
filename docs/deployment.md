# Deployment Guide

## Overview

LEADTRACKING is deployed to **Firebase App Hosting** with automated CI/CD via GitHub Actions.

## Environments

| Environment | Branch | Firebase Project | URL |
|-------------|--------|------------------|-----|
| Development | `develop` | (local emulator) | `localhost:3000` |
| Staging | `develop` | staging project | staging URL |
| Production | `main` | production project | live URL |

## Prerequisites

1. **Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **GitHub Repository Secrets**
   Configure these in GitHub → Settings → Secrets:
   
   | Secret | Description |
   |--------|-------------|
   | `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key |
   | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
   | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
   | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage bucket |
   | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
   | `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
   | `FIREBASE_SERVICE_ACCOUNT` | Service account JSON |
   | `SENTRY_DSN` | Sentry DSN (optional) |

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access at http://localhost:3000
```

### Using Firebase Emulators

```bash
# Start emulators (Auth + Firestore)
firebase emulators:start

# Start Next.js with emulator connection
npm run dev
```

## Manual Deployment

### Deploy to Firebase App Hosting

```bash
# Build the application
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

### Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### Deploy Storage Rules

```bash
firebase deploy --only storage
```

## Automated Deployment (CI/CD)

### CI Pipeline (`.github/workflows/ci.yml`)

Runs on every push and pull request:

1. **Code Quality**
   - ESLint check
   - Prettier format check
   - TypeScript type check

2. **Unit Tests**
   - Jest with coverage
   - Upload to Codecov

3. **Build Verification**
   - Production build
   - Ensures no build errors

4. **Security Audit**
   - `npm audit` for vulnerabilities

5. **E2E Tests** (main branch only)
   - Playwright tests
   - Cross-browser testing

### CD Pipeline (`.github/workflows/deploy.yml`)

Runs on merge to `main`:

1. Build production app
2. Authenticate with Google Cloud
3. Deploy to Firebase App Hosting
4. Notify on success/failure

## Environment Configuration

### Development (`.env.local`)

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your-dev-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-dev-project
# ... other config

# Integrations (optional for dev)
GOOGLE_CLIENT_ID=your-dev-oauth-id
GOOGLE_CLIENT_SECRET=your-dev-oauth-secret
```

### Production (GitHub Secrets)

All environment variables are stored as GitHub Secrets and injected during build.

## Firebase App Hosting Configuration

### `firebase.json`

```json
{
    "firestore": {
        "rules": "firestore.rules",
        "indexes": "firestore.indexes.json"
    },
    "hosting": {
        "source": ".",
        "ignore": [
            "firebase.json",
            "**/.*",
            "**/node_modules/**"
        ],
        "frameworksBackend": {
            "region": "us-central1"
        }
    }
}
```

### Required Configurations

1. **Enable App Hosting** in Firebase Console
2. **Connect GitHub Repository** for automatic deployments
3. **Configure Build Settings**:
   - Root directory: `/`
   - Build command: `npm run build`
   - Output directory: `.next`

## Health Checks

Firebase App Hosting includes automatic health checks:
- Monitors application status
- Auto-restarts on failure
- Automatic rollback on failed deployments

### Custom Health Check

Add a health endpoint:
```typescript
// app/api/health/route.ts
export async function GET() {
    return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
}
```

## Rollback

### Automatic Rollback
Firebase App Hosting automatically rolls back if:
- Health checks fail
- Build fails

### Manual Rollback

```bash
# List recent deployments
firebase hosting:channel:list

# Rollback to previous version
firebase hosting:channel:deploy live --expires 0
```

## Monitoring

### Build Logs
- GitHub Actions → Workflow runs
- Firebase Console → App Hosting → Builds

### Runtime Logs
- Firebase Console → App Hosting → Logs
- Sentry Dashboard (if configured)

## Troubleshooting

### Build Failures

1. Check GitHub Actions logs
2. Verify environment variables are set
3. Run build locally: `npm run build`

### Deployment Failures

1. Check Firebase Console for errors
2. Verify Firebase project permissions
3. Ensure `firebase.json` is valid

### Runtime Errors

1. Check Sentry for error details
2. Review Firebase Console logs
3. Verify environment variables in production

## Scaling

Firebase App Hosting automatically scales:
- **Cold starts**: Minimal with warm instances
- **Concurrency**: Configurable per environment
- **Regions**: Deploy to multiple regions for latency

### Recommended Settings

```json
{
    "hosting": {
        "frameworksBackend": {
            "region": "us-central1",
            "minInstances": 1,
            "maxInstances": 10,
            "concurrency": 80
        }
    }
}
```
