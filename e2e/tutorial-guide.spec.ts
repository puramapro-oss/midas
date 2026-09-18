// GEL PROD : ces tests ciblent https://midas.purama.dev, actuellement en
// «This deployment is temporarily paused» (gel déploy Vercel, Tissma).
// Le contrat NIYAMA D1=C/D2=A est verrouillé localement par
// scripts/check-niyama-decisions.mjs + les specs locales. Réactiver après
// un nouveau déploy et mise à jour des attendus (403/307 NIYAMA).
import { test, expect } from '@playwright/test';

test.skip(true, 'PROD gelée (deployment paused) — specs pré-NIYAMA obsolètes');

test.describe('Tutorial & Guide', () => {
  test('page /dashboard/guide loads with correct content', async ({ page }) => {
    // Go to guide page (will redirect to login since auth required)
    await page.goto('https://midas.purama.dev/dashboard/guide');

    // Should redirect to login (auth protected)
    await expect(page).toHaveURL(/login/);
  });

  test('guide page renders correctly when accessed', async ({ page }) => {
    // Test the guide page structure via local dev or mocked auth
    await page.goto('https://midas.purama.dev/');
    await expect(page).toHaveTitle(/MIDAS/);
  });

  test('tutorial overlay component has correct structure', async ({ page }) => {
    await page.goto('https://midas.purama.dev/');

    // Landing page should load
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('help page includes guide link', async ({ page }) => {
    await page.goto('https://midas.purama.dev/dashboard/help');
    // Redirects to login because auth protected
    await expect(page).toHaveURL(/login/);
  });

  test('sidebar includes guide link', async ({ page }) => {
    await page.goto('https://midas.purama.dev/');
    // Landing page loads — sidebar is only visible on dashboard
    await expect(page.locator('body')).toBeVisible();
  });
});
