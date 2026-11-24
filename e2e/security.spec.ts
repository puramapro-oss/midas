import { test, expect } from '@playwright/test';
import { expectJsonResponse } from './helpers';

test.describe('Security', () => {
  test('landing query containing a script does not open a dialog', async ({ page }) => {
    const dialogs: string[] = [];
    // Attach before navigation: synchronous script execution must be observed.
    page.on('dialog', async dialog => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });
    await page.goto('/?q=<script>alert("xss")</script>');
    await expect(page.locator('h1')).toBeVisible();
    await page.waitForTimeout(2000);
    expect(dialogs).toEqual([]);
  });

  test('landing renders normally for an SQL-shaped unused query value', async ({ page }) => {
    const response = await page.goto('/?id=1%27%20OR%201%3D1%20--');
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
    await expect(page.locator('h1')).toHaveText('Comprendre les marchés crypto sans ordre réel ni conseil personnalisé.');
    // The landing does not query a database; this is not a SQL security proof.
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

  test('anonymous chat refuses malformed JSON before parsing it', async ({ request }) => {
    const response = await request.post('/api/chat', {
      headers: { 'content-type': 'application/json' },
      data: 'not-valid-json{{{',
    });

    await expectJsonResponse(response, 401, 'Non autorise');
  });
});
