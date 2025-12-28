# Security Model

## Overview

LEADTRACKING implements defense-in-depth security with multiple layers of protection: Firebase Authentication, Firestore Security Rules, and server-side API validation.

## Authentication

### Firebase Authentication

- **Provider**: Google OAuth via Firebase Auth
- **Session Management**: Client-side via Firebase Auth SDK
- **Token Verification**: Automatic via Firebase

### Authentication Flow

1. User clicks "Sign in with Google"
2. Firebase Auth handles OAuth flow with Google
3. On success, Firebase returns user credentials
4. `AuthProvider` stores user in React context
5. All subsequent API calls include auth context

### Protected Routes

All routes are protected at the application level:

- Unauthenticated users see login prompt
- Auth state is checked via `useAuth()` hook
- API routes verify authentication before processing

## Authorization

### Role-Based Access Control

The application supports three roles:

- **admin**: Full system access
- **manager**: Team management + all rep capabilities
- **rep**: Individual lead and activity management

Roles are stored as Firebase custom claims and can be set via Firebase Admin SDK.

### Firestore Security Rules

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: Check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper: Check if user owns the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Users: Only access own data
    match /users/{userId} {
      allow read, write: if isOwner(userId);

      // Nested collections inherit parent rules
      match /leads/{leadId} {
        allow read, write: if isOwner(userId);
      }

      match /activities/{activityId} {
        allow read, write: if isOwner(userId);
      }

      match /emailThreads/{threadId} {
        allow read, write: if isOwner(userId);
      }

      match /emailMessages/{messageId} {
        allow read, write: if isOwner(userId);
      }

      match /integrations/{integrationId} {
        allow read, write: if isOwner(userId);
      }
    }

    // Default deny for unmatched paths
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Key Security Principles

1. **User Isolation**: All data is scoped under `users/{userId}/`. Users cannot access other users' data.

2. **Default Deny**: Any path not explicitly matched returns `false`.

3. **No Public Access**: No anonymous or public read/write is allowed.

4. **Ownership Validation**: Every rule verifies `request.auth.uid == userId` in the document path.

## API Security

### Route Handlers

API routes in `/api/*` should validate:

1. Authentication token presence
2. User authorization for the requested resource
3. Request body validation

### Example Pattern

```typescript
export async function POST(request: Request) {
    // 1. Get auth header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return new Response('Unauthorized', { status: 401 });
    }

    // 2. Verify token (in production, use firebase-admin)
    const token = authHeader.split('Bearer ')[1];

    // 3. Process request with validated user context
    // ...
}
```

## Secrets Management

### Environment Variables

All secrets are stored in environment variables, never in code:

| Variable                 | Purpose                | Required              |
| ------------------------ | ---------------------- | --------------------- |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase client config | Yes                   |
| `GOOGLE_CLIENT_ID`       | Gmail OAuth            | For email integration |
| `GOOGLE_CLIENT_SECRET`   | Gmail OAuth            | For email integration |
| `TWILIO_ACCOUNT_SID`     | Twilio API             | For SMS/calls         |
| `TWILIO_AUTH_TOKEN`      | Twilio API             | For SMS/calls         |
| `SENTRY_DSN`             | Error tracking         | Recommended           |

### Secret Rotation

- OAuth tokens stored in Firestore under `users/{userId}/integrations/`
- Refresh tokens used to obtain new access tokens automatically
- Twilio credentials are static but can be rotated in Twilio console

### Git Security

- `.env.local` is in `.gitignore`
- `.env.example` contains only placeholder values
- No actual secrets in repository

## Third-Party Integrations

### Gmail API

- OAuth 2.0 authorization with offline access
- Scopes: `gmail.send`, `gmail.readonly`
- Tokens stored encrypted in Firestore
- Refresh tokens never exposed to client

### Twilio

- Server-side only integration
- API keys never exposed to client
- All requests proxied through API routes

### Firebase AI / Vertex AI

- Uses Application Default Credentials (ADC) in production
- No API keys needed when running on Firebase App Hosting
- Falls back to local environment in development

## Security Checklist

- [x] Firestore rules use `rules_version = '2'`
- [x] All paths require authentication
- [x] User isolation enforced in rules
- [x] Default deny for unmatched paths
- [x] No secrets in codebase
- [x] Environment variables documented
- [x] OAuth tokens stored securely
- [ ] Firebase App Check (recommended for production)
- [ ] Rate limiting on API routes (recommended)
- [ ] Input validation/sanitization (recommended)

## Recommendations

1. **Enable App Check**: Adds attestation to prevent abuse
2. **Add Rate Limiting**: Prevent API abuse
3. **Implement CSP**: Content Security Policy headers
4. **Security Logging**: Track authentication events
5. **Regular Audits**: Review Firestore rules periodically
