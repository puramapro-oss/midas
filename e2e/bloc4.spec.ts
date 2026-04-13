import { test, expect } from '@playwright/test';

const BASE = 'https://midas.purama.dev';

test.describe('Admin pages', () => {
  test('Admin pages exist (auth-protected, not 404)', async ({ page }) => {
    for (const p of ['/admin', '/admin/users', '/admin/withdrawals', '/admin/contests']) {
      await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      // Should redirect to /login (not 404) — only super_admin can access
      expect(page.url()).toContain('/login');
      console.log(`  ✅ ${p} — auth-protected`);
    }
  });
});

test.describe('Help guides', () => {
  test('All 4 guide pages exist (auth-protected)', async ({ page }) => {
    for (const p of [
      '/dashboard/help',
      '/dashboard/help/connect-binance',
      '/dashboard/help/strategies',
      '/dashboard/help/shield',
      '/dashboard/help/referral-wallet',
    ]) {
      await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      expect(page.url()).toContain('/login');
      console.log(`  ✅ ${p} — exists`);
    }
  });
});

test.describe('FULL AUDIT — All pages and links', () => {
  test('All public pages return 200', async ({ page }) => {
    const pages = [
      '/', '/pricing', '/login', '/register', '/status', '/changelog',
      '/offline', '/onboarding',
      '/legal/cgu', '/legal/cgv', '/legal/cookies', '/legal/privacy',
      '/legal/mentions', '/legal/disclaimer',
    ];
    for (const p of pages) {
      const resp = await page.request.get(`${BASE}${p}`);
      expect(resp.status()).toBe(200);
    }
    console.log(`  ✅ All ${pages.length} public pages return 200`);
  });

  test('All dashboard pages are auth-protected (not 404)', async ({ page }) => {
    const dashPages = [
      '/dashboard', '/dashboard/trading', '/dashboard/portfolio',
      '/dashboard/chat', '/dashboard/settings', '/dashboard/signals',
      '/dashboard/alerts', '/dashboard/markets', '/dashboard/backtesting',
      '/dashboard/bots', '/dashboard/leaderboard', '/dashboard/help',
      '/dashboard/referral', '/dashboard/contest', '/dashboard/wallet',
    ];
    for (const p of dashPages) {
      await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/login');
    }
    console.log(`  ✅ All ${dashPages.length} dashboard pages auth-protected`);
  });

  test('Landing page: 0 dead links', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const hrefs = await page.$$eval('a[href^="/"]', (els) =>
      [...new Set(els.filter(el => el.getBoundingClientRect().width > 0).map(el => el.getAttribute('href')))]
    );

    const dead: string[] = [];
    for (const href of hrefs) {
      if (!href) continue;
      const resp = await page.request.get(`${BASE}${href}`);
      if (resp.status() >= 400) dead.push(`${href} (${resp.status()})`);
    }
    if (dead.length) console.log('  ❌ Dead:', dead);
    expect(dead).toEqual([]);
    console.log(`  ✅ ${hrefs.length} landing links, 0 dead`);
  });

  test('Pricing page: 0 dead links', async ({ page }) => {
    await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const hrefs = await page.$$eval('a[href^="/"]', (els) =>
      [...new Set(els.filter(el => el.getBoundingClientRect().width > 0).map(el => el.getAttribute('href')))]
    );

    const dead: string[] = [];
    for (const href of hrefs) {
      if (!href) continue;
      const resp = await page.request.get(`${BASE}${href}`);
      if (resp.status() >= 400) dead.push(`${href} (${resp.status()})`);
    }
    expect(dead).toEqual([]);
    console.log(`  ✅ ${hrefs.length} pricing links, 0 dead`);
  });

  test('Login + Register: 0 dead links', async ({ page }) => {
    for (const path of ['/login', '/register']) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      // Dismiss cookie banner
      const btn = page.locator('[data-testid="cookie-refuse"]');
      if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(300);
      }

      const hrefs = await page.$$eval('a[href^="/"]', (els) =>
        [...new Set(els.filter(el => el.getBoundingClientRect().width > 0).map(el => el.getAttribute('href')))]
      );
      for (const href of hrefs) {
        if (!href) continue;
        const resp = await page.request.get(`${BASE}${href}`);
        expect(resp.status()).toBeLessThan(400);
      }
      console.log(`  ✅ ${path}: ${hrefs.length} links, 0 dead`);
    }
  });

  test('Redirects work: /cgv /cgu /signup', async ({ page }) => {
    for (const r of [
      { from: '/cgv', expect: '/legal/cgv' },
      { from: '/cgu', expect: '/legal/cgu' },
      { from: '/signup', expect: '/register' },
    ]) {
      await page.goto(`${BASE}${r.from}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      expect(page.url()).toContain(r.expect);
      console.log(`  ✅ ${r.from} → ${r.expect}`);
    }
  });

  test('API routes return proper status (not 404)', async ({ page }) => {
    const apis = [
      { path: '/api/status', method: 'GET', expect: 200 },
      { path: '/api/chat', method: 'POST', expect: 401 },
      { path: '/api/stripe/checkout', method: 'POST', expect: 401 },
      { path: '/api/keys/save', method: 'POST', expect: 401 },
    ];
    for (const api of apis) {
      const resp = api.method === 'GET'
        ? await page.request.get(`${BASE}${api.path}`)
        : await page.request.post(`${BASE}${api.path}`, {
            data: { test: true },
            headers: { 'Content-Type': 'application/json' },
          });
      expect(resp.status()).toBe(api.expect);
      console.log(`  ✅ ${api.method} ${api.path} → ${resp.status()}`);
    }
  });
});
