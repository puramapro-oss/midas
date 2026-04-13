import { test, expect } from '@playwright/test';

const BASE = 'https://midas.purama.dev';

test.describe('Legal compliance', () => {
  test('All legal pages return 200 and have correct content', async ({ page }) => {
    const pages = [
      { path: '/legal/cgu', mustContain: 'PURAMA SASU' },
      { path: '/legal/cgv', mustContain: 'Conditions Generales de Vente' },
      { path: '/legal/cookies', mustContain: 'Politique de Cookies' },
      { path: '/legal/privacy', mustContain: 'Politique de Confidentialit' },
      { path: '/legal/mentions', mustContain: 'Mentions Legales' },
      { path: '/legal/disclaimer', mustContain: 'Avertissement' },
    ];

    for (const p of pages) {
      const resp = await page.request.get(`${BASE}${p.path}`);
      expect(resp.status()).toBe(200);
      const body = await resp.text();
      expect(body).toContain(p.mustContain);
      console.log(`  ✅ ${p.path} — contains "${p.mustContain}"`);
    }
  });

  test('Cookie banner appears on first visit', async ({ page }) => {
    // Clear cookies and storage
    await page.context().clearCookies();

    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const banner = page.locator('[data-testid="cookie-banner"]');
    await expect(banner).toBeVisible({ timeout: 5000 });
    console.log('  ✅ Cookie banner visible');

    // Check buttons exist
    const acceptBtn = page.locator('[data-testid="cookie-accept"]');
    const refuseBtn = page.locator('[data-testid="cookie-refuse"]');
    await expect(acceptBtn).toBeVisible();
    await expect(refuseBtn).toBeVisible();
    console.log('  ✅ Accept and Refuse buttons visible');

    // Check customize toggle
    const customizeBtn = page.locator('[data-testid="cookie-customize-toggle"]');
    await expect(customizeBtn).toBeVisible();
    await customizeBtn.click();
    await page.waitForTimeout(500);

    const analyticsToggle = page.locator('[data-testid="cookie-analytics-toggle"]');
    await expect(analyticsToggle).toBeVisible();
    console.log('  ✅ Customize panel opens with analytics toggle');
  });

  test('Cookie banner disappears after accepting', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const banner = page.locator('[data-testid="cookie-banner"]');
    await expect(banner).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="cookie-accept"]').click();
    await page.waitForTimeout(500);
    await expect(banner).not.toBeVisible();
    console.log('  ✅ Banner hidden after accept');
  });

  test('Registration form has CGU, CGV and Privacy links', async ({ page }) => {
    await page.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const cguLink = page.locator('[data-testid="cgu-link"]');
    const cgvLink = page.locator('[data-testid="cgv-link"]');
    const privacyLink = page.locator('[data-testid="privacy-link"]');

    await expect(cguLink).toBeVisible();
    await expect(cgvLink).toBeVisible();
    await expect(privacyLink).toBeVisible();

    expect(await cguLink.getAttribute('href')).toBe('/legal/cgu');
    expect(await cgvLink.getAttribute('href')).toBe('/legal/cgv');
    expect(await privacyLink.getAttribute('href')).toBe('/legal/privacy');

    console.log('  ✅ CGU, CGV and Privacy links present on register form');
  });

  test('Footer has all 6 legal links', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const footerLinks = ['CGU', 'CGV', 'Confidentialite', 'Cookies', 'Mentions legales', 'Disclaimer'];

    for (const label of footerLinks) {
      const link = page.locator(`footer a:has-text("${label}")`);
      const count = await link.count();
      expect(count).toBeGreaterThan(0);
      console.log(`  ✅ Footer link: ${label}`);
    }
  });

  test('Mentions legales has PURAMA SASU details', async ({ page }) => {
    await page.goto(`${BASE}/legal/mentions`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const body = await page.locator('body').textContent();
    expect(body).toContain('PURAMA SASU');
    expect(body).toContain('8 Rue de la Chapelle');
    expect(body).toContain('25560 Frasne');
    expect(body).toContain('Matiss Dornier');
    expect(body).toContain('Vercel Inc.');
    expect(body).toContain('293 B');
    console.log('  ✅ All required legal mentions present');
  });
});
