# Testing Guide

## Overview

LEADTRACKING uses a comprehensive testing strategy with unit tests (Jest + React Testing Library) and end-to-end tests (Playwright).

## Quick Start

```bash
# Install dependencies (includes test libraries)
npm install

# Run unit tests
npm run test

# Run tests in watch mode (development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run E2E tests (requires dev server)
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

## Test Structure

```
├── __tests__/                  # Unit and integration tests
│   ├── components/             # Component tests
│   │   └── GlassCard.test.tsx
│   └── pages/                  # Page component tests
│       └── leads.test.tsx
├── e2e/                        # End-to-end tests
│   └── app.spec.ts             # Full application flows
├── jest.config.ts              # Jest configuration
├── jest.setup.ts               # Global test setup and mocks
└── playwright.config.ts        # Playwright configuration
```

## Unit Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- __tests__/components/GlassCard.test.tsx

# Run tests matching a pattern
npm run test -- --testNamePattern="renders"

# Update snapshots
npm run test -- --updateSnapshot
```

### Writing Tests

#### Component Test Example
```typescript
import { render, screen } from '@testing-library/react';
import { GlassCard } from '@/components/ui/GlassCard';

describe('GlassCard', () => {
    it('renders children correctly', () => {
        render(<GlassCard>Test Content</GlassCard>);
        expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
        render(<GlassCard className="custom">Content</GlassCard>);
        expect(screen.getByText('Content').parentElement).toHaveClass('custom');
    });
});
```

#### Testing with Hooks
```typescript
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/components/providers/AuthProvider';

describe('useAuth', () => {
    it('provides auth context', () => {
        const { result } = renderHook(() => useAuth());
        expect(result.current.user).toBeDefined();
    });
});
```

### Mocking

#### Firebase Mocks (in jest.setup.ts)
Firebase services are mocked globally:
- `firebase/auth` - Authentication functions
- `firebase/firestore` - Database operations
- `@/lib/firebase/config` - App configuration

#### Local Mocks
```typescript
jest.mock('@/lib/firebase/services', () => ({
    LeadsService: {
        getLeads: jest.fn().mockResolvedValue([
            { id: '1', companyName: 'Test Corp' }
        ]),
    },
}));
```

## E2E Testing

### Setup

```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npm run test:e2e

# Run with specific browser
npm run test:e2e -- --project=chromium

# Run with UI mode (interactive)
npm run test:e2e:ui
```

### Writing E2E Tests

```typescript
import { test, expect } from '@playwright/test';

test.describe('Leads Page', () => {
    test('loads successfully', async ({ page }) => {
        await page.goto('/leads');
        await expect(page.locator('text=Leads Pipeline')).toBeVisible();
    });

    test('can add a new lead', async ({ page }) => {
        await page.goto('/leads');
        await page.click('button:has-text("Add Lead")');
        await page.fill('input[name="companyName"]', 'Test Company');
        await page.click('button:has-text("Save")');
        await expect(page.locator('text=Test Company')).toBeVisible();
    });
});
```

### Authentication in E2E

For tests requiring authentication:
```typescript
test.describe('Authenticated flows', () => {
    test.beforeEach(async ({ page }) => {
        // Set up auth state or use storage state
        await page.goto('/');
        // Login logic here
    });

    test('creates a lead', async ({ page }) => {
        // Test authenticated functionality
    });
});
```

## Coverage

### Viewing Coverage Report

```bash
npm run test:coverage
```

Coverage report is generated in `coverage/` directory. Open `coverage/lcov-report/index.html` in a browser.

### Coverage Thresholds

Configured in `jest.config.ts`:
```typescript
coverageThreshold: {
    global: {
        branches: 50,
        functions: 50,
        lines: 50,
        statements: 50,
    },
},
```

## CI Integration

Tests run automatically in CI via GitHub Actions:

1. **Unit Tests**: Run on every push/PR
2. **E2E Tests**: Run on main branch only (to save CI minutes)
3. **Coverage**: Uploaded to Codecov

### Debugging CI Failures

1. Check GitHub Actions logs
2. Download test artifacts (screenshots, videos)
3. Run locally with same Node version

## Best Practices

### Do's
- ✅ Test user-visible behavior, not implementation
- ✅ Use `screen.getByRole()` for accessibility
- ✅ Mock external services (Firebase, APIs)
- ✅ Keep tests independent and isolated
- ✅ Use descriptive test names

### Don'ts
- ❌ Test implementation details
- ❌ Rely on CSS selectors
- ❌ Share state between tests
- ❌ Skip flaky tests permanently
- ❌ Mock what you don't control

## Troubleshooting

### Tests Not Finding Elements
- Use `screen.debug()` to see current DOM
- Check for async rendering (use `findBy*` or `waitFor`)
- Verify mocks are set up correctly

### Firebase Mock Issues
- Ensure mocks are defined before imports
- Check jest.setup.ts loaded correctly
- Use `jest.clearAllMocks()` in beforeEach

### Playwright Timeout Issues
- Increase timeout in config
- Use `{ timeout: 10000 }` in expects
- Check if dev server is running
