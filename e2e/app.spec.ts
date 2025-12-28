import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('shows login button when not authenticated', async ({ page }) => {
        await page.goto('/');

        // Should see login prompt or sidebar with login option
        await expect(page.locator('text=Sign in')).toBeVisible({ timeout: 10000 });
    });

    test('dashboard is accessible at root path', async ({ page }) => {
        await page.goto('/');

        // Should see the dashboard page (even if showing login)
        await expect(page).toHaveURL('/');
    });

    test('navigation links are visible in sidebar', async ({ page }) => {
        await page.goto('/');

        // Wait for sidebar (aside element) to be visible - use first() to avoid strict mode violation
        const sidebar = page.locator('aside').first();
        await expect(sidebar).toBeVisible({ timeout: 10000 });

        // Check for navigation items - use first() to handle multiple matches
        await expect(page.getByRole('link', { name: /dashboard/i }).first()).toBeVisible({
            timeout: 10000,
        });
        await expect(page.getByRole('link', { name: /leads/i }).first()).toBeVisible({
            timeout: 10000,
        });
    });
});

test.describe('Leads Page', () => {
    test('leads page loads successfully', async ({ page }) => {
        await page.goto('/leads');

        // Should see the leads page content - look for any h1/h2 header or main content
        await expect(page.locator('h1, h2, [data-testid="leads-page"]').first()).toBeVisible({
            timeout: 10000,
        });
    });

    test('add lead button is visible', async ({ page }) => {
        await page.goto('/leads');

        // Should see add lead button - be more flexible with the matcher
        const addButton = page.locator('button:has-text("Add"), button:has-text("New")').first();
        await expect(addButton).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Activities Page', () => {
    test('activities page loads successfully', async ({ page }) => {
        await page.goto('/activities');

        // Should see the activities page - look for main content area
        await expect(page.locator('main, [role="main"], h1, h2').first()).toBeVisible({
            timeout: 10000,
        });
    });
});

test.describe('Analytics Page', () => {
    test('analytics page loads successfully', async ({ page }) => {
        await page.goto('/analytics');

        // Should see the analytics page - look for main content
        await expect(page.locator('main, [role="main"], h1, h2').first()).toBeVisible({
            timeout: 10000,
        });
    });
});

test.describe('Settings Page', () => {
    test('settings page loads successfully', async ({ page }) => {
        await page.goto('/settings');

        // Should see the settings page - look for main content
        await expect(page.locator('main, [role="main"], h1, h2').first()).toBeVisible({
            timeout: 10000,
        });
    });
});

test.describe('Error Handling', () => {
    test('non-existent route shows error or redirects', async ({ page }) => {
        const response = await page.goto('/non-existent-page-12345');

        // Should either 404 or redirect
        expect([200, 404]).toContain(response?.status());
    });
});
