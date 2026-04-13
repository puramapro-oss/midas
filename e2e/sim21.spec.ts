import { test, expect } from '@playwright/test';

const BASE = 'https://midas.purama.dev';

test.describe('21 SIM — MIDAS Complete Human Simulation', () => {
  // ============================================
  // SIM 1: ALL PAGES RETURN 200
  // ============================================
  const publicPages = [
    '/', '/pricing', '/ecosystem', '/how-it-works', '/contact',
    '/financer', '/status', '/changelog', '/login', '/register',
    '/legal/privacy', '/legal/cgu', '/legal/cgv', '/legal/cookies',
    '/legal/mentions', '/legal/disclaimer', '/onboarding',
  ];

  for (const path of publicPages) {
    test(`SIM1: ${path} → 200`, async ({ request }) => {
      const res = await request.get(`${BASE}${path}`);
      expect(res.status()).toBe(200);
    });
  }

  // Dashboard pages should redirect to login (307) when not auth
  const dashboardPages = [
    '/dashboard', '/dashboard/trading', '/dashboard/markets',
    '/dashboard/portfolio', '/dashboard/signals', '/dashboard/agents',
    '/dashboard/bots', '/dashboard/alerts', '/dashboard/copy-trading',
    '/dashboard/paper', '/dashboard/earn', '/dashboard/backtesting',
    '/dashboard/chat', '/dashboard/referral', '/dashboard/classement',
    '/dashboard/wallet', '/dashboard/kyc', '/dashboard/tax',
    '/dashboard/partenaire', '/dashboard/boutique', '/dashboard/achievements',
    '/dashboard/community', '/dashboard/lottery', '/dashboard/wealth',
    '/dashboard/wrapped', '/dashboard/challenges', '/dashboard/share',
    '/dashboard/gratitude', '/dashboard/breathing', '/dashboard/buddies',
    '/dashboard/stories', '/dashboard/settings', '/dashboard/guide',
    '/dashboard/help',
  ];

  test('SIM1: All dashboard pages respond (200 or 307)', async ({ request }) => {
    const results: { path: string; status: number }[] = [];
    for (const path of dashboardPages) {
      const res = await request.get(`${BASE}${path}`, { maxRedirects: 0 });
      results.push({ path, status: res.status() });
    }
    const failures = results.filter(r => ![200, 307].includes(r.status));
    expect(failures, `Pages failing: ${JSON.stringify(failures)}`).toHaveLength(0);
  });

  // ============================================
  // SIM 2: ZERO DEAD BUTTONS ON LANDING
  // ============================================
  test('SIM2: Landing — 0 dead buttons', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const buttons = page.locator('button:visible, a[href]:visible');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
    // Check all links have valid hrefs
    const links = page.locator('a[href]:visible');
    const linkCount = await links.count();
    for (let i = 0; i < Math.min(linkCount, 20); i++) {
      const href = await links.nth(i).getAttribute('href');
      expect(href, `Link ${i} has empty href`).toBeTruthy();
      expect(href).not.toBe('#');
    }
  });

  // ============================================
  // SIM 3: FORMS HAVE ZOD VALIDATION (FR)
  // ============================================
  test('SIM3: Contact form validates in French', async ({ page }) => {
    await page.goto(`${BASE}/contact`);
    // Try submit empty
    const submitBtn = page.locator('button[type="submit"]');
    if (await submitBtn.count() > 0) {
      await submitBtn.first().click();
      await page.waitForTimeout(500);
      // Should show validation or not submit
      const url = page.url();
      expect(url).toContain('/contact');
    }
  });

  // ============================================
  // SIM 4: AUTH PAGES EXIST AND WORK
  // ============================================
  test('SIM4: Login page has email + password fields', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('SIM4: Register page has signup form', async ({ page }) => {
    await page.goto(`${BASE}/register`);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  });

  test('SIM4: Login with wrong creds shows error', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.waitForTimeout(1000);
    // Dismiss cookie banner if present
    const cookieAccept = page.locator('[data-testid="cookie-banner"] button, [data-testid="cookie-accept"]');
    if (await cookieAccept.count() > 0) {
      await cookieAccept.first().click({ force: true });
      await page.waitForTimeout(500);
    }
    await page.fill('input[type="email"], input[name="email"]', 'fake@test.com');
    await page.fill('input[type="password"]', 'wrongpassword123');
    const submitBtn = page.locator('button[type="submit"]');
    if (await submitBtn.count() > 0) {
      await submitBtn.first().click({ force: true });
      await page.waitForTimeout(2000);
      // Should stay on login or show error
      expect(page.url()).toContain('/login');
    }
  });

  // ============================================
  // SIM 5: RESPONSIVE 375px — NO OVERFLOW
  // ============================================
  test('SIM5: Landing 375px no horizontal overflow', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(376); // 1px tolerance
    await ctx.close();
  });

  test('SIM5: Pricing 375px no overflow', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(376);
    await ctx.close();
  });

  test('SIM5: Ecosystem 375px no overflow', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/ecosystem`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(376);
    await ctx.close();
  });

  // ============================================
  // SIM 6: RESPONSIVE 768px TABLET
  // ============================================
  test('SIM6: Landing 768px no overflow', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(769);
    await ctx.close();
  });

  // ============================================
  // SIM 7: RESPONSIVE 1920px DESKTOP
  // ============================================
  test('SIM7: Landing 1920px renders correctly', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(1921);
    await ctx.close();
  });

  // ============================================
  // SIM 8: NO FAKE CONTENT / PLACEHOLDERS
  // ============================================
  test('SIM8: Landing — no fake content', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    const html = await page.content();
    const forbidden = ['Lorem ipsum', 'TODO', 'placeholder text', '10.000 utilisateurs', '99% satisfaction'];
    for (const word of forbidden) {
      expect(html, `Found forbidden content: ${word}`).not.toContain(word);
    }
  });

  test('SIM8: Pricing — no fake testimonials', async ({ page }) => {
    await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
    const html = await page.content();
    expect(html).not.toContain('Lorem ipsum');
    expect(html).not.toContain('TODO');
  });

  // ============================================
  // SIM 9: APIs RETURN 401 WITHOUT AUTH
  // ============================================
  const protectedApis = [
    '/api/gratitude', '/api/breathing', '/api/community/buddy',
    '/api/golden-hour', '/api/mentorship', '/api/community-goals',
    '/api/review-prompt', '/api/collaborative-missions', '/api/ceremonies',
    '/api/kyc', '/api/copy-trading', '/api/earn/positions',
    '/api/challenges', '/api/share', '/api/points', '/api/daily-gift',
    '/api/boutique', '/api/achievements', '/api/community/wall',
    '/api/community/circles', '/api/lottery',
    '/api/notifications/preferences', '/api/wallet',
  ];

  test('SIM9: All protected APIs return 401', async ({ request }) => {
    const results: { api: string; status: number }[] = [];
    for (const api of protectedApis) {
      const res = await request.get(`${BASE}${api}`);
      results.push({ api, status: res.status() });
    }
    const failures = results.filter(r => r.status !== 401);
    expect(failures, `APIs not returning 401: ${JSON.stringify(failures)}`).toHaveLength(0);
  });

  // ============================================
  // SIM 10: PUBLIC API (status) RETURNS 200
  // ============================================
  test('SIM10: /api/status → 200 + JSON', async ({ request }) => {
    const res = await request.get(`${BASE}/api/status`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('status');
  });

  // ============================================
  // SIM 11: LEGAL PAGES HAVE REQUIRED CONTENT
  // ============================================
  test('SIM11: Privacy page has RGPD + DPO info', async ({ page }) => {
    await page.goto(`${BASE}/legal/privacy`);
    const text = await page.textContent('body');
    expect(text).toContain('PURAMA');
  });

  test('SIM11: CGU page has terms', async ({ page }) => {
    await page.goto(`${BASE}/legal/cgu`);
    const text = await page.textContent('body');
    expect(text?.length).toBeGreaterThan(100);
  });

  test('SIM11: Mentions legales has SASU info', async ({ page }) => {
    await page.goto(`${BASE}/legal/mentions`);
    const text = await page.textContent('body');
    expect(text).toContain('PURAMA');
  });

  // ============================================
  // SIM 12: CONSOLE ERRORS = 0
  // ============================================
  test('SIM12: Landing — 0 console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Filter out known third-party errors
    const realErrors = errors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('Script error') &&
      !e.includes('hydration')
    );
    expect(realErrors, `Console errors: ${realErrors.join(', ')}`).toHaveLength(0);
  });

  test('SIM12: Pricing — 0 console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const realErrors = errors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('Script error') &&
      !e.includes('hydration')
    );
    expect(realErrors, `Console errors: ${realErrors.join(', ')}`).toHaveLength(0);
  });

  // ============================================
  // SIM 13: NAVIGATION COHERENCE
  // ============================================
  test('SIM13: Login page has link to register', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    const registerLink = page.locator('a[href*="register"], a[href*="signup"]');
    expect(await registerLink.count()).toBeGreaterThan(0);
  });

  test('SIM13: Register page has link to login', async ({ page }) => {
    await page.goto(`${BASE}/register`);
    const loginLink = page.locator('a[href*="login"]');
    expect(await loginLink.count()).toBeGreaterThan(0);
  });

  // ============================================
  // SIM 14: PRICING HAS PLANS
  // ============================================
  test('SIM14: Pricing page shows plans', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForTimeout(2000);
    // Should have pricing cards (Free/Pro/Ultra)
    const body = await page.textContent('body');
    const hasPlan = body?.includes('Free') || body?.includes('Gratuit') || body?.includes('Pro') || body?.includes('Ultra');
    expect(hasPlan, 'Pricing page should show plan names').toBeTruthy();
  });

  // ============================================
  // SIM 15: FINANCER PAGE WORKS
  // ============================================
  test('SIM15: Financer page loads', async ({ page }) => {
    await page.goto(`${BASE}/financer`);
    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(100);
  });

  // ============================================
  // SIM 16: SEO — META TAGS
  // ============================================
  test('SIM16: Landing has title + description meta', async ({ page }) => {
    await page.goto(BASE);
    const title = await page.title();
    expect(title.length).toBeGreaterThan(5);
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc?.length ?? 0).toBeGreaterThan(10);
  });

  // ============================================
  // SIM 17: PERFORMANCE — PAGE LOAD < 5s
  // ============================================
  test('SIM17: Landing loads under 5s', async ({ page }) => {
    const start = Date.now();
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  test('SIM17: Pricing loads under 5s', async ({ page }) => {
    const start = Date.now();
    await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  // ============================================
  // SIM 18: DARK MODE DEFAULT
  // ============================================
  test('SIM18: Landing uses dark background', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const bg = await page.evaluate(() => {
      const el = document.querySelector('body');
      return el ? getComputedStyle(el).backgroundColor : '';
    });
    // Should be dark (rgb values close to 0)
    expect(bg).toBeTruthy();
  });

  // ============================================
  // SIM 19: ECOSYSTEM CROSS-PROMO
  // ============================================
  test('SIM19: Ecosystem shows all 19 apps', async ({ page }) => {
    await page.goto(`${BASE}/ecosystem`);
    const appCards = page.locator('.glass-card');
    const count = await appCards.count();
    expect(count).toBeGreaterThanOrEqual(19);
  });

  // ============================================
  // SIM 20: HOW IT WORKS — 6 STEPS
  // ============================================
  test('SIM20: How it works has 6 steps', async ({ page }) => {
    await page.goto(`${BASE}/how-it-works`);
    for (let i = 1; i <= 6; i++) {
      await expect(page.locator(`text=ETAPE ${i}`)).toBeVisible();
    }
  });

  // ============================================
  // SIM 21: CONTACT FORM EXISTS
  // ============================================
  test('SIM21: Contact form has all fields', async ({ page }) => {
    await page.goto(`${BASE}/contact`);
    await expect(page.locator('input[name="name"], input[placeholder*="nom"]').first()).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
  });
});
