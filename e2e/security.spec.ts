import { test, expect } from '@playwright/test';

test.describe('Security', () => {
  test('XSS in search params is escaped', async ({ page }) => {
    // Inject a script tag via query parameter
    await page.goto('/?q=<script>alert("xss")</script>');

    // The page should load without executing the script
    // Check that no alert dialog appeared (Playwright would catch it)
    const dialogPromise = page.waitForEvent('dialog', { timeout: 2000 }).catch(() => null);
    const dialog = await dialogPromise;
    expect(dialog).toBeNull();

    // The page should still render normally
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
  });

  test('SQL injection in query params does not cause 500', async ({ page }) => {
    const response = await page.goto('/?id=1%27%20OR%201%3D1%20--');
    expect(response).not.toBeNull();
    expect(response!.status()).not.toBe(500);
  });

  test('security headers are present', async ({ page }) => {
    const response = await page.goto('/');
    expect(response).not.toBeNull();

    const headers = response!.headers();

    // Check for common security headers
    // X-Content-Type-Options prevents MIME sniffing
    expect(headers['x-content-type-options']).toBe('nosniff');

    // X-Frame-Options prevents clickjacking
    const xFrameOptions = headers['x-frame-options'];
    expect(xFrameOptions).toBeTruthy();
    expect(['DENY', 'SAMEORIGIN', 'deny', 'sameorigin']).toContain(xFrameOptions);
  });

  test('API endpoints reject malformed JSON gracefully', async ({ request }) => {
    const response = await request.post('/api/chat', {
      headers: { 'content-type': 'application/json' },
      data: 'not-valid-json{{{',
    });

    // Should not return 500 - any 4xx is acceptable
    expect(response.status()).not.toBe(500);
  });
});
