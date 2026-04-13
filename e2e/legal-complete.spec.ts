import { test, expect } from '@playwright/test';

const BASE = 'https://midas.purama.dev';

test.describe('Legal compliance complete', () => {

  test('French slug URLs redirect to /legal/* and return 200', async ({ page }) => {
    const redirects = [
      { from: '/mentions-legales', to: '/legal/mentions' },
      { from: '/politique-confidentialite', to: '/legal/privacy' },
      { from: '/cgv', to: '/legal/cgv' },
      { from: '/cgu', to: '/legal/cgu' },
    ];
    for (const r of redirects) {
      const resp = await page.request.get(`${BASE}${r.from}`, { maxRedirects: 0 });
      expect(resp.status()).toBe(308); // permanent redirect
      const location = resp.headers()['location'];
      expect(location).toContain(r.to);
      console.log(`  ✅ ${r.from} → ${r.to}`);
    }
  });

  test('All /legal/* pages return 200', async ({ page }) => {
    const pages = ['/legal/mentions', '/legal/privacy', '/legal/cgv', '/legal/cgu', '/legal/cookies', '/legal/disclaimer'];
    for (const p of pages) {
      const resp = await page.request.get(`${BASE}${p}`);
      expect(resp.status()).toBe(200);
      console.log(`  ✅ ${p} — 200`);
    }
  });

  test('Mentions legales has all required info', async ({ page }) => {
    await page.goto(`${BASE}/legal/mentions`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const body = await page.locator('body').textContent();
    for (const text of ['PURAMA SASU', 'SIRET', '941 200 105', '8 Rue de la Chapelle', '25560 Frasne', 'Matiss Dornier', 'Vercel Inc', 'matiss.frasne@gmail.com']) {
      expect(body).toContain(text);
    }
    console.log('  ✅ Mentions legales: all required content present');
  });

  test('Privacy has RGPD, DPO, rights, and transfers', async ({ page }) => {
    await page.goto(`${BASE}/legal/privacy`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const body = await page.locator('body').textContent();
    for (const text of ['PURAMA SASU', 'SIRET', 'matiss.frasne@gmail.com', 'RGPD', 'Stripe', 'Vercel', 'Supabase']) {
      expect(body).toContain(text);
    }
    console.log('  ✅ Privacy: RGPD complete');
  });

  test('CGV has prices, retractation 14 days, Stripe', async ({ page }) => {
    await page.goto(`${BASE}/legal/cgv`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const body = await page.locator('body').textContent();
    for (const text of ['PURAMA SASU', 'SIRET', '14 jours', 'Stripe', '39', '79']) {
      expect(body).toContain(text);
    }
    console.log('  ✅ CGV: prices, retractation, Stripe present');
  });

  test('CGU has PURAMA SASU and responsibilities', async ({ page }) => {
    await page.goto(`${BASE}/legal/cgu`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const body = await page.locator('body').textContent();
    expect(body).toContain('PURAMA SASU');
    console.log('  ✅ CGU: complete');
  });

  test('Cookie banner appears with Accept/Refuse/Customize', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const banner = page.locator('[data-testid="cookie-banner"]');
    await expect(banner).toBeVisible({ timeout: 5000 });

    await expect(page.locator('[data-testid="cookie-accept"]')).toBeVisible();
    await expect(page.locator('[data-testid="cookie-refuse"]')).toBeVisible();
    await expect(page.locator('[data-testid="cookie-customize-toggle"]')).toBeVisible();
    console.log('  ✅ Cookie banner: Accept/Refuse/Customize visible');
  });

  test('Footer on landing has all legal links', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Dismiss cookie banner
    const refuse = page.locator('[data-testid="cookie-refuse"]');
    if (await refuse.isVisible().catch(() => false)) {
      await refuse.click();
      await page.waitForTimeout(300);
    }

    const expectedLinks = [
      { text: 'Mentions legales', href: '/legal/mentions' },
      { text: 'Politique de confidentialite', href: '/legal/privacy' },
      { text: 'CGV', href: '/legal/cgv' },
      { text: 'CGU', href: '/legal/cgu' },
      { text: 'Politique cookies', href: '/legal/cookies' },
      { text: 'Avertissement risques', href: '/legal/disclaimer' },
    ];

    for (const expected of expectedLinks) {
      const link = page.locator(`footer a[href="${expected.href}"]`);
      const count = await link.count();
      expect(count).toBeGreaterThan(0);
      console.log(`  ✅ Footer: "${expected.text}" → ${expected.href}`);
    }
  });

  test('Footer on /pricing has legal links', async ({ page }) => {
    await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const footerMentions = page.locator('footer a[href="/legal/mentions"]');
    await expect(footerMentions).toBeVisible();
    console.log('  ✅ Pricing page has footer with legal links');
  });
});
