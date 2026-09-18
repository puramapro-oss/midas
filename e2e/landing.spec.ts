// =============================================================================
// MIDAS — Landing NIYAMA (D2=A) : page minimale information/éducation.
// Contrat : src/app/page.tsx + scripts/check-niyama-decisions.mjs
// (pas de hero 13 sections, pas de pricing CTA, pas de testid Hero/Pricing).
// =============================================================================
import { test, expect } from '@playwright/test';

test.describe('Landing page (NIYAMA D2=A)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('H1 annonce éducation sans ordre réel', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    await expect(h1).toContainText('sans ordre réel');
  });

  test('page has correct meta title', async ({ page }) => {
    const title = await page.title();
    expect(title.toLowerCase()).toContain('midas');
  });

  test('badge Information générale · Éducation visible', async ({ page }) => {
    await expect(page.getByText('Information générale · Éducation')).toBeVisible();
  });

  test('mention aucune clé API collectée', async ({ page }) => {
    await expect(page.getByText(/ne se connecte à aucun exchange/i)).toBeVisible();
  });

  test('2 cartes : Apprentissage général + Limites explicites', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Apprentissage général' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Limites explicites' })).toBeVisible();
  });

  test('CTA register + lien disclaimer existent', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Accéder à l’espace éducatif/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Lire l’avertissement/ })).toBeVisible();
  });

  test('footer légal : CGU, CGV, Confidentialité, Mentions légales', async ({ page }) => {
    for (const label of ['CGU', 'CGV', 'Confidentialité', 'Mentions légales']) {
      await expect(page.getByRole('link', { name: label, exact: true })).toBeVisible();
    }
  });

  test('responsive: mobile 375px affiche le H1 sans overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('responsive: desktop 1440px sans sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('main > section').first()).toBeVisible();
    await expect(page.locator('aside, nav[data-testid="sidebar"]')).toHaveCount(0);
  });

  test('page scrolls to bottom without error', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    const scrollTop = await page.evaluate(() => window.scrollY);
    expect(scrollTop).toBeGreaterThan(50);
  });
});
