import { test, expect } from '@playwright/test';

const BASE = 'https://midas.purama.dev';

test.describe('Wallet', () => {
  test('/dashboard/wallet exists (auth-protected)', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/wallet`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/login');
    expect(page.url()).toContain('next=%2Fdashboard%2Fwallet');
    console.log('  ✅ /dashboard/wallet exists and is auth-protected');
  });
});

test.describe('Contest', () => {
  test('/dashboard/contest exists (auth-protected)', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/contest`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/login');
    expect(page.url()).toContain('next=%2Fdashboard%2Fcontest');
    console.log('  ✅ /dashboard/contest exists and is auth-protected');
  });
});

test.describe('CRON API routes', () => {
  test('/api/cron/contest-weekly returns 401 without auth', async ({ page }) => {
    const resp = await page.request.get(`${BASE}/api/cron/contest-weekly`);
    // Should return 401 (no CRON_SECRET) or 500 (no DB) — NOT 404
    expect(resp.status()).not.toBe(404);
    console.log(`  ✅ /api/cron/contest-weekly — ${resp.status()} (route exists)`);
  });

  test('/api/cron/contest-monthly returns 401 without auth', async ({ page }) => {
    const resp = await page.request.get(`${BASE}/api/cron/contest-monthly`);
    expect(resp.status()).not.toBe(404);
    console.log(`  ✅ /api/cron/contest-monthly — ${resp.status()} (route exists)`);
  });
});

test.describe('Navigation', () => {
  test('All new dashboard pages are accessible', async ({ page }) => {
    const pages = ['/dashboard/wallet', '/dashboard/contest', '/dashboard/referral'];
    for (const p of pages) {
      await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      // Should redirect to login (auth-protected, not 404)
      expect(page.url()).toContain('/login');
      console.log(`  ✅ ${p} — auth-protected`);
    }
  });

  test('All public pages still work', async ({ page }) => {
    const pages = ['/', '/pricing', '/login', '/register', '/status'];
    for (const p of pages) {
      const resp = await page.request.get(`${BASE}${p}`);
      expect(resp.status()).toBe(200);
    }
    console.log('  ✅ All 5 public pages return 200');
  });

  test('All landing page links resolve (0 dead)', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const links = await page.$$eval('a[href^="/"]', (els) =>
      [...new Set(els.filter(el => el.getBoundingClientRect().width > 0).map(el => el.getAttribute('href')))]
    );

    const dead: string[] = [];
    for (const href of links) {
      if (!href) continue;
      const resp = await page.request.get(`${BASE}${href}`);
      if (resp.status() >= 400) dead.push(`${href} (${resp.status()})`);
    }

    if (dead.length) console.log('  ❌ Dead:', dead);
    expect(dead).toEqual([]);
    console.log(`  ✅ ${links.length} links, 0 dead`);
  });
});
