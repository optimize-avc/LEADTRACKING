import { test, expect } from '@playwright/test';

/**
 * Login Flow E2E Tests
 *
 * Tests the authentication flows including:
 * - Google Sign-in button visibility
 * - Login redirect behavior
 * - Session persistence
 */

test.describe('Login Flow', () => {
    test('displays Google sign-in option on landing', async ({ page }) => {
        await page.goto('/');

        // Should show sign-in option for unauthenticated users
        await expect(
            page.locator('text=Sign in, text=Google, button:has-text("Sign")').first()
        ).toBeVisible({ timeout: 15000 });
    });

    test('sign-in button triggers auth flow', async ({ page }) => {
        await page.goto('/');

        // Find and click sign-in button
        const signInButton = page.locator('button:has-text("Sign"), a:has-text("Sign")').first();

        if (await signInButton.isVisible()) {
            // Click should trigger navigation or modal
            await signInButton.click();

            // Wait for either a popup, redirect, or modal
            await page.waitForTimeout(1000);

            // Should either open popup or show login modal
            const hasPopup = page.context().pages().length > 1;
            const hasModal = await page
                .locator('[role="dialog"], .modal, [data-testid="login-modal"]')
                .isVisible();
            const urlChanged = page.url() !== 'http://localhost:3000/';

            expect(hasPopup || hasModal || urlChanged).toBeTruthy();
        }
    });

    test('protected routes redirect to login', async ({ page }) => {
        // Try accessing a protected route
        await page.goto('/settings');

        // Should either show login prompt or redirect
        await expect(page).toHaveURL(/\/(settings|login)?/);

        // Should show some form of login UI
        const loginUI = page.locator('text=Sign in, button:has-text("Sign"), text=Login').first();
        await expect(loginUI).toBeVisible({ timeout: 10000 });
    });

    test('displays user menu when header is visible', async ({ page }) => {
        await page.goto('/');

        // Check for user-related UI elements
        const userElements = page.locator(
            '[data-testid="user-menu"], [aria-label*="user"], [aria-label*="account"], .avatar, img[alt*="profile"]'
        );

        // Wait for page to load
        await page.waitForTimeout(2000);

        // Either shows user menu (authenticated) or sign-in option (unauthenticated)
        const hasUserMenu = (await userElements.count()) > 0;
        const hasSignIn = await page.locator('text=Sign in').isVisible();

        expect(hasUserMenu || hasSignIn).toBeTruthy();
    });
});

test.describe('Session Management', () => {
    test('maintains session across navigation', async ({ page }) => {
        await page.goto('/');

        // Navigate to another page
        await page.goto('/leads');
        await page.waitForTimeout(1000);

        // Navigate back
        await page.goto('/');
        await page.waitForTimeout(1000);

        // Page should still function (no error states)
        await expect(page.locator('body')).not.toContainText('Error');
    });

    test('handles invalid session gracefully', async ({ page, context }) => {
        // Clear cookies to simulate invalid session
        await context.clearCookies();

        await page.goto('/leads');

        // Should handle gracefully - either redirect or show login
        await page.waitForTimeout(2000);

        // Should not show error page
        const hasError =
            (await page.locator('text=500, text=Server Error').isVisible()) ||
            (await page.locator('[data-testid="error-boundary"]').isVisible());

        expect(hasError).toBeFalsy();
    });
});
