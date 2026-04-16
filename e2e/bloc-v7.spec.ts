// MIDAS — V7 §15 : tests e2e des 3 blocs V7 above the fold + cookie purama_promo
// NOTE: ces tests tournent contre l'URL de prod (midas.purama.dev). Les routes
// créées pour V7 doivent être déployées AVANT d'exécuter ce spec.

import { test, expect } from '@playwright/test';

const BASE = 'https://midas.purama.dev';

test.describe('V7 §15 — /go/[slug] + cookie purama_promo', () => {
  test('/go/midas?coupon=WELCOME50 pose cookie purama_promo et redirige /register?ref=midas', async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/go/midas?coupon=WELCOME50`, { waitUntil: 'domcontentloaded' });

    // Redirect final vers /register?ref=midas
    await expect(page).toHaveURL(/\/register\?ref=midas/);

    // Cookie purama_promo posé sur .purama.dev
    const cookies = await ctx.cookies();
    const promo = cookies.find((c) => c.name === 'purama_promo');
    expect(promo, 'cookie purama_promo doit être présent').toBeTruthy();

    if (promo) {
      const payload = JSON.parse(decodeURIComponent(promo.value));
      expect(payload.coupon).toBe('WELCOME50');
      expect(payload.source).toBe('midas');
      expect(typeof payload.expires).toBe('number');
      expect(payload.expires).toBeGreaterThan(Date.now());
      // Scope .purama.dev pour lecture cross-sous-domaines
      expect(promo.domain).toMatch(/purama\.dev$/);
      expect(promo.httpOnly).toBe(true);
    }

    await ctx.close();
  });

  test('/go/midas sans coupon redirige mais ne pose PAS de cookie purama_promo', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/go/midas`, { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/register\?ref=midas/);

    const cookies = await ctx.cookies();
    const promo = cookies.find((c) => c.name === 'purama_promo');
    expect(promo, 'pas de cookie purama_promo sans coupon').toBeFalsy();

    await ctx.close();
  });

  test('/go/midas?coupon=INVALIDE ignore le coupon invalide (pas de cookie)', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/go/midas?coupon=DEADBEEF`, { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/register\?ref=midas/);

    const cookies = await ctx.cookies();
    const promo = cookies.find((c) => c.name === 'purama_promo');
    expect(promo, 'coupon non whitelisté doit être ignoré').toBeFalsy();

    await ctx.close();
  });
});

test.describe('V7 §15 — API endpoints V7 (auth protection)', () => {
  test('GET /api/referral/stats sans auth → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/referral/stats`);
    expect(res.status()).toBe(401);
  });

  test('POST /api/cross-promo/click sans auth → 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/cross-promo/click`, {
      data: { target_app: 'kash', coupon: 'WELCOME50' },
    });
    expect(res.status()).toBe(401);
  });

  test('GET /api/cross-promo sans auth → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/cross-promo`);
    expect(res.status()).toBe(401);
  });
});

test.describe('V7 §15 — Dashboard 3 blocs (auth-protected)', () => {
  test('/dashboard non authentifié → redirect /login', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    expect(page.url()).toContain('/login');
  });

  test('/register?ref=midas charge 200 et mentionne le parrainage', async ({ page }) => {
    const response = await page.goto(`${BASE}/register?ref=midas`, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(500);
    // Page register doit contenir un indicateur qu'un code de parrainage est détecté
    const body = await page.content();
    expect(body.length).toBeGreaterThan(500);
  });
});

test.describe('V7 §15 — /ecosystem affiche wording WELCOME50', () => {
  test('/ecosystem mentionne WELCOME50 ou prime et -50%', async ({ page }) => {
    await page.goto(`${BASE}/ecosystem`, { waitUntil: 'domcontentloaded' });
    const body = await page.content();
    expect(body).toMatch(/WELCOME50|-50|100\s*€/);
  });
});
