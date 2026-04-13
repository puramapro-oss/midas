import { test, expect } from '@playwright/test';

const BASE = 'https://midas.purama.dev';

test.describe('Phase 14 — New Pages & APIs', () => {
  // === PUBLIC PAGES ===
  test('GET /ecosystem → 200', async ({ request }) => {
    const res = await request.get(`${BASE}/ecosystem`);
    expect(res.status()).toBe(200);
  });

  test('GET /how-it-works → 200', async ({ request }) => {
    const res = await request.get(`${BASE}/how-it-works`);
    expect(res.status()).toBe(200);
  });

  // === DASHBOARD PAGES (redirect to login = 307 or 200) ===
  test('GET /dashboard/challenges → auth redirect', async ({ request }) => {
    const res = await request.get(`${BASE}/dashboard/challenges`, { maxRedirects: 0 });
    expect([200, 307]).toContain(res.status());
  });

  test('GET /dashboard/share → auth redirect', async ({ request }) => {
    const res = await request.get(`${BASE}/dashboard/share`, { maxRedirects: 0 });
    expect([200, 307]).toContain(res.status());
  });

  test('GET /dashboard/gratitude → auth redirect', async ({ request }) => {
    const res = await request.get(`${BASE}/dashboard/gratitude`, { maxRedirects: 0 });
    expect([200, 307]).toContain(res.status());
  });

  test('GET /dashboard/breathing → auth redirect', async ({ request }) => {
    const res = await request.get(`${BASE}/dashboard/breathing`, { maxRedirects: 0 });
    expect([200, 307]).toContain(res.status());
  });

  test('GET /dashboard/buddies → auth redirect', async ({ request }) => {
    const res = await request.get(`${BASE}/dashboard/buddies`, { maxRedirects: 0 });
    expect([200, 307]).toContain(res.status());
  });

  test('GET /dashboard/stories → auth redirect', async ({ request }) => {
    const res = await request.get(`${BASE}/dashboard/stories`, { maxRedirects: 0 });
    expect([200, 307]).toContain(res.status());
  });

  test('GET /dashboard/kyc → auth redirect', async ({ request }) => {
    const res = await request.get(`${BASE}/dashboard/kyc`, { maxRedirects: 0 });
    expect([200, 307]).toContain(res.status());
  });

  test('GET /dashboard/copy-trading → auth redirect', async ({ request }) => {
    const res = await request.get(`${BASE}/dashboard/copy-trading`, { maxRedirects: 0 });
    expect([200, 307]).toContain(res.status());
  });

  // === APIs (should return 401 without auth) ===
  test('GET /api/gratitude → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/gratitude`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/breathing → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/breathing`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/community/buddy → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/community/buddy`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/golden-hour → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/golden-hour`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/mentorship → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/mentorship`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/community-goals → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/community-goals`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/review-prompt → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/review-prompt`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/collaborative-missions → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/collaborative-missions`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/ceremonies → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/ceremonies`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/kyc → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/kyc`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/copy-trading → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/copy-trading`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/earn/positions → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/earn/positions`);
    expect(res.status()).toBe(401);
  });

  // === POST without auth → 401 ===
  test('POST /api/gratitude → 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/gratitude`, { data: { content: 'test' } });
    expect(res.status()).toBe(401);
  });

  test('POST /api/breathing → 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/breathing`, { data: { technique: '4-7-8', duration_seconds: 60, cycles: 3 } });
    expect(res.status()).toBe(401);
  });

  test('POST /api/review-prompt → 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/review-prompt`, { data: { triggered_by: 'test', action: 'later' } });
    expect(res.status()).toBe(401);
  });

  // === VISUAL CHECKS ===
  test('Ecosystem page has app grid', async ({ page }) => {
    await page.goto(`${BASE}/ecosystem`);
    await expect(page.locator('text=Trading IA')).toBeVisible();
    await expect(page.locator('text=AKASHA')).toBeVisible();
    await expect(page.locator('text=CROSS50')).toBeVisible();
  });

  test('How it works page has steps', async ({ page }) => {
    await page.goto(`${BASE}/how-it-works`);
    await expect(page.locator('text=ETAPE 1')).toBeVisible();
    await expect(page.locator('text=ETAPE 6')).toBeVisible();
    await expect(page.locator('text=Commencer gratuitement')).toBeVisible();
  });

  // === RESPONSIVE CHECKS ===
  test('Ecosystem responsive 375px', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/ecosystem`);
    await expect(page.locator('text=Trading IA')).toBeVisible();
    const body = page.locator('body');
    const box = await body.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(375);
    await ctx.close();
  });

  test('How it works responsive 375px', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/how-it-works`);
    await expect(page.locator('text=ETAPE 1')).toBeVisible();
    await ctx.close();
  });
});
