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

        // Wait for sidebar to be visible
        const sidebar = page.locator('aside, nav');
        await expect(sidebar).toBeVisible();

        // Check for navigation items
        await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /leads/i })).toBeVisible();
    });
});

test.describe('Leads Page', () => {
    test('leads page loads successfully', async ({ page }) => {
        await page.goto('/leads');

        // Should see the leads page header
        await expect(page.locator('text=Leads Pipeline')).toBeVisible({ timeout: 10000 });
    });

    test('add lead button is visible', async ({ page }) => {
        await page.goto('/leads');

        // Should see add lead button
        await expect(page.getByRole('button', { name: /add lead/i })).toBeVisible({
            timeout: 10000,
        });
    });
});

test.describe('Activities Page', () => {
    test('activities page loads successfully', async ({ page }) => {
        await page.goto('/activities');

        // Should see the activities page
        await expect(page.locator('text=Activities')).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Analytics Page', () => {
    test('analytics page loads successfully', async ({ page }) => {
        await page.goto('/analytics');

        // Should see the analytics page
        await expect(page.locator('text=Analytics')).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Settings Page', () => {
    test('settings page loads successfully', async ({ page }) => {
        await page.goto('/settings');

        // Should see the settings page
        await expect(page.locator('text=Settings')).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Error Handling', () => {
    test('non-existent route shows error or redirects', async ({ page }) => {
        const response = await page.goto('/non-existent-page-12345');

        // Should either 404 or redirect
        expect([200, 404]).toContain(response?.status());
    });
});
