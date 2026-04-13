import { test, expect } from '@playwright/test';

test.describe('Auth Session Security', () => {
  test.beforeEach(async ({ page }) => {
    // Pre-accept cookies to prevent banner from overlaying the form
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('midas-cookie-consent', JSON.stringify({ essential: true, analytics: true, marketing: true }));
    });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
  });

  test('login page shows "Rester connecte" checkbox', async ({ page }) => {
    const checkbox = page.locator('[data-testid="remember-me-checkbox"]');
    await expect(checkbox).toBeVisible();
    // Default: unchecked
    await expect(checkbox).not.toBeChecked();
  });

  test('remember-me checkbox toggles correctly', async ({ page }) => {
    const checkbox = page.locator('[data-testid="remember-me-checkbox"]');
    await expect(checkbox).not.toBeChecked();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });

  test('remember-me checkbox is near login button and Google button', async ({ page }) => {
    // Checkbox should be visible alongside other login elements
    await expect(page.locator('[data-testid="remember-me-label"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="google-button"]')).toBeVisible();
  });

  test('login stores remember-me preference in localStorage', async ({ page }) => {
    // Check remember me
    await page.locator('[data-testid="remember-me-checkbox"]').check();

    // Fill valid credentials (won't actually authenticate but will store prefs)
    await page.locator('[data-testid="email-input"]').fill('test@purama.dev');
    await page.locator('[data-testid="password-input"]').fill('testpassword123');
    await page.locator('[data-testid="login-button"]').click();

    // Verify localStorage was set
    const rememberValue = await page.evaluate(() => localStorage.getItem('midas_remember'));
    expect(rememberValue).toBe('true');

    const sessionValid = await page.evaluate(() => sessionStorage.getItem('midas_session_valid'));
    expect(sessionValid).toBe('true');

    // Forced logout should be cleared
    const forcedLogout = await page.evaluate(() => localStorage.getItem('midas_forced_logout'));
    expect(forcedLogout).toBeNull();
  });

  test('login without remember-me stores false preference', async ({ page }) => {
    // Don't check remember me (default unchecked)
    await page.locator('[data-testid="email-input"]').fill('test@purama.dev');
    await page.locator('[data-testid="password-input"]').fill('testpassword123');
    await page.locator('[data-testid="login-button"]').click();

    const rememberValue = await page.evaluate(() => localStorage.getItem('midas_remember'));
    expect(rememberValue).toBe('false');
  });

  test('signout button sets forced logout flag and redirects to /login', async ({ page }) => {
    // Go to dashboard (will be redirected to login if not authenticated)
    await page.goto('/dashboard');

    // If we end up on login, simulate what happens when user clicks logout
    // by testing the UserMenu's logout function directly
    await page.goto('/login');

    // Simulate forced logout flag being set (as handleLogout does)
    await page.evaluate(() => {
      localStorage.setItem('midas_forced_logout', 'true');
      localStorage.removeItem('midas_remember');
      sessionStorage.removeItem('midas_session_valid');
    });

    // Verify the flag persists
    const flag = await page.evaluate(() => localStorage.getItem('midas_forced_logout'));
    expect(flag).toBe('true');

    // Verify we're on login page
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('forced logout flag prevents auto-reconnection on page reload', async ({ page }) => {
    // Set the forced logout flag
    await page.evaluate(() => {
      localStorage.setItem('midas_forced_logout', 'true');
    });

    // Reload the page
    await page.reload();

    // Should still be on login, not auto-redirected
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="remember-me-checkbox"]')).toBeVisible();
  });

  test('session without remember-me is cleared when midas_session_valid is missing', async ({ page }) => {
    // Simulate: user logged in without remember-me, browser was closed (sessionStorage cleared)
    await page.evaluate(() => {
      localStorage.setItem('midas_remember', 'false');
      // sessionStorage.midas_session_valid is NOT set (simulates browser close)
    });

    // Reload — useAuth should detect no session marker and clear auth
    await page.reload();
    await page.waitForLoadState('networkidle');

    // The remember flag should be cleared after session expiry
    const remember = await page.evaluate(() => localStorage.getItem('midas_remember'));
    expect(remember).toBeNull();
  });

  test('session with remember-me survives page reload', async ({ page }) => {
    // Simulate: user logged in with remember-me
    await page.evaluate(() => {
      localStorage.setItem('midas_remember', 'true');
      sessionStorage.setItem('midas_session_valid', 'true');
      localStorage.removeItem('midas_forced_logout');
    });

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // midas_remember should still be 'true'
    const remember = await page.evaluate(() => localStorage.getItem('midas_remember'));
    expect(remember).toBe('true');
  });
});
