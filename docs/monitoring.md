# Monitoring & Observability

## Overview

LEADTRACKING uses Sentry for error tracking and Firebase/Google Cloud for logging and metrics.

## Error Tracking (Sentry)

### Setup

1. **Create Sentry Project**
    - Go to [sentry.io](https://sentry.io)
    - Create a new Next.js project
    - Copy the DSN

2. **Configure Environment**

    ```bash
    # .env.local
    SENTRY_DSN=https://your-dsn@o123.ingest.sentry.io/456
    NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@o123.ingest.sentry.io/456

    # For source maps (optional)
    SENTRY_ORG=your-org
    SENTRY_PROJECT=leadtracking
    SENTRY_AUTH_TOKEN=your-auth-token
    ```

3. **Verify Integration**
    - Deploy to production
    - Trigger an error (e.g., `/api/test-error`)
    - Check Sentry dashboard

### What's Tracked

- **Client Errors**: Unhandled exceptions, rejected promises
- **Server Errors**: API route failures, SSR errors
- **Performance**: Page load times, API latency
- **Session Replay**: (Optional) User session recordings

### Configuration Files

| File                      | Purpose                |
| ------------------------- | ---------------------- |
| `sentry.client.config.ts` | Browser error tracking |
| `sentry.server.config.ts` | Node.js error tracking |
| `sentry.edge.config.ts`   | Edge runtime tracking  |

### Best Practices

```typescript
// Manual error capture
import * as Sentry from '@sentry/nextjs';

try {
    await riskyOperation();
} catch (error) {
    Sentry.captureException(error, {
        tags: { feature: 'leads' },
        extra: { leadId: '123' },
    });
}

// Add breadcrumbs for context
Sentry.addBreadcrumb({
    category: 'user',
    message: 'Created new lead',
    level: 'info',
});
```

## Logging

### Structured Logging Pattern

```typescript
// lib/logger.ts
const logger = {
    info: (message: string, meta?: object) => {
        console.log(
            JSON.stringify({
                severity: 'INFO',
                message,
                timestamp: new Date().toISOString(),
                ...meta,
            })
        );
    },
    error: (message: string, error: Error, meta?: object) => {
        console.error(
            JSON.stringify({
                severity: 'ERROR',
                message,
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                ...meta,
            })
        );
    },
};

export default logger;
```

### Usage

```typescript
import logger from '@/lib/logger';

// In API routes
export async function POST(request: Request) {
    logger.info('Lead creation started', { userId: 'abc' });

    try {
        const lead = await createLead(data);
        logger.info('Lead created', { leadId: lead.id });
        return Response.json(lead);
    } catch (error) {
        logger.error('Lead creation failed', error as Error, { data });
        throw error;
    }
}
```

### Viewing Logs

**Firebase Console:**

1. Go to Firebase Console
2. Navigate to App Hosting → Logs
3. Filter by severity, time range

**Google Cloud Console:**

1. Go to Cloud Logging
2. Select your Firebase project
3. Query logs by resource type or custom fields

### Log Queries

```
# All errors in last hour
severity="ERROR" timestamp>="2024-01-01T00:00:00Z"

# Specific user's activity
jsonPayload.userId="abc123"

# Lead-related operations
jsonPayload.message=~"lead"
```

## Performance Monitoring

### Core Web Vitals

Tracked automatically by Next.js and Sentry:

- **LCP** (Largest Contentful Paint)
- **FID** (First Input Delay)
- **CLS** (Cumulative Layout Shift)

### Custom Metrics

```typescript
// Track business events
export function trackLeadCreated(leadId: string) {
    if (typeof window !== 'undefined' && 'performance' in window) {
        performance.mark(`lead-created-${leadId}`);
    }
}
```

## Alerts

### Sentry Alerts

Configure in Sentry Dashboard → Alerts:

1. **Error Spike Alert**
    - Trigger: >10 errors in 1 hour
    - Action: Email + Slack notification

2. **New Error Alert**
    - Trigger: First occurrence of error type
    - Action: Email notification

3. **Performance Alert**
    - Trigger: P95 latency > 3s
    - Action: Email notification

### Recommended Alert Rules

| Alert           | Condition           | Action    |
| --------------- | ------------------- | --------- |
| Critical Error  | Unhandled exception | PagerDuty |
| High Error Rate | >50 errors/hour     | Slack     |
| Slow API        | P95 > 2000ms        | Email     |
| Auth Failure    | >5 failures/minute  | Slack     |

## Dashboards

### Sentry Dashboard

Create custom dashboards for:

- Error trends by feature
- Performance by route
- User impact metrics

### Google Cloud Dashboard

1. Go to Cloud Monitoring
2. Create Dashboard
3. Add widgets:
    - Request count
    - Error rate
    - Latency percentiles
    - Active instances

## Runbooks

### High Error Rate

1. Check Sentry for error details
2. Identify affected routes/users
3. Review recent deployments
4. Roll back if needed
5. Fix and redeploy

### Performance Degradation

1. Check Cloud Monitoring for resource usage
2. Review slow queries in logs
3. Check for external service issues
4. Scale up if needed:
    ```bash
    firebase hosting:channel:deploy --minInstances=2
    ```

### Authentication Issues

1. Check Firebase Auth status
2. Review auth-related errors in Sentry
3. Verify OAuth credentials
4. Check token expiration

## Health Checks

### Endpoint

```typescript
// app/api/health/route.ts
export async function GET() {
    const checks = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version,
        checks: {
            firebase: await checkFirebase(),
            // Add more checks as needed
        },
    };

    const allHealthy = Object.values(checks.checks).every((c) => c === 'ok');

    return Response.json(checks, {
        status: allHealthy ? 200 : 503,
    });
}

async function checkFirebase(): Promise<string> {
    try {
        // Lightweight Firestore check
        return 'ok';
    } catch {
        return 'error';
    }
}
```

### Uptime Monitoring

Configure external uptime monitoring:

- **UptimeRobot**: Free tier available
- **BetterUptime**: Good for status pages
- **Pingdom**: Enterprise option

## Incident Response

### Severity Levels

| Level | Description          | Response Time  |
| ----- | -------------------- | -------------- |
| P1    | Service down         | 15 minutes     |
| P2    | Major feature broken | 1 hour         |
| P3    | Minor issue          | 4 hours        |
| P4    | Cosmetic/minor       | 1 business day |

### Response Checklist

1. [ ] Acknowledge alert
2. [ ] Assess severity
3. [ ] Identify root cause
4. [ ] Implement fix or rollback
5. [ ] Communicate status
6. [ ] Post-incident review
