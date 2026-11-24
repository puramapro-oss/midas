import { test, expect } from '@playwright/test';

test.describe('Anonymous auth preferences and local session markers', () => {
  test.beforeEach(async ({ page }) => {
    // Pre-accept cookies to prevent banner from overlaying the form
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('midas-cookie-consent', JSON.stringify({ necessary: true, analytics: false, performance: false }));
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

    // The isolated fixture refuses these synthetic credentials.
    await page.locator('[data-testid="email-input"]').fill('local-fixture@example.invalid');
    await page.locator('[data-testid="password-input"]').fill('testpassword123');
    await page.locator('[data-testid="login-button"]').click();

    // Verify localStorage was set
    await expect.poll(() => page.evaluate(() => localStorage.getItem('midas_remember'))).toBe('true');

    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('midas_session_valid'))).toBe('true');

    // Forced logout should be cleared
    const forcedLogout = await page.evaluate(() => localStorage.getItem('midas_forced_logout'));
    expect(forcedLogout).toBeNull();
  });

  test('login without remember-me stores false preference', async ({ page }) => {
    // Don't check remember me (default unchecked)
    await page.locator('[data-testid="email-input"]').fill('local-fixture@example.invalid');
    await page.locator('[data-testid="password-input"]').fill('testpassword123');
    await page.locator('[data-testid="login-button"]').click();

    await expect.poll(() => page.evaluate(() => localStorage.getItem('midas_remember'))).toBe('false');
  });

  test('invalid local credentials produce the visible login error without a session', async ({ page, baseURL }) => {
    expect(process.env.MIDAS_E2E_ISOLATED).toBe('1');
    expect(baseURL).toBe('http://127.0.0.1:3000');
    const refused = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.origin === baseURL && url.pathname === '/__e2e/supabase/auth/v1/token' &&
        url.searchParams.get('grant_type') === 'password' && response.request().method() === 'POST';
    });
    await page.getByTestId('email-input').fill('local-fixture@example.invalid');
    await page.getByTestId('password-input').fill('not-a-real-password');
    await page.getByTestId('login-button').click();
    const response = await refused;
    expect(response.status()).toBe(400);
    expect((await response.json()).code).toBe('invalid_credentials');
    await expect(page.getByText('Email ou mot de passe incorrect', { exact: true })).toBeVisible();
    await expect(page).toHaveURL(`${baseURL}/login`);
    // The real logout handlers are exercised in local-protocols.spec.ts.
  });

  test('anonymous login remains usable with a forced-logout marker after reload', async ({ page }) => {
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

  test('false remember preference is cleared when its local session marker is absent', async ({ page }) => {
    // Synthetic markers only: no authenticated session is created.
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

  test('true remember preference survives reload with its local session marker', async ({ page }) => {
    // Persistence of local markers does not prove persistence of a Supabase session.
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
