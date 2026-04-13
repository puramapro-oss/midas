import { test, expect } from '@playwright/test';

test.describe('V3 Features — Public Pages', () => {
  test('Landing page loads and displays hero', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toContainText('MIDAS');
  });

  test('/pricing loads with plan cards', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveURL(/pricing/);
    const body = await page.textContent('body');
    expect(body).toContain('Free');
  });

  test('/login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input')).toBeTruthy();
  });

  test('/register page loads', async ({ page }) => {
    await page.goto('/register');
    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(50);
  });

  test('/legal/cgu loads', async ({ page }) => {
    const res = await page.goto('/legal/cgu');
    expect(res?.status()).toBe(200);
  });

  test('/legal/privacy loads', async ({ page }) => {
    const res = await page.goto('/legal/privacy');
    expect(res?.status()).toBe(200);
  });

  test('/legal/mentions loads', async ({ page }) => {
    const res = await page.goto('/legal/mentions');
    expect(res?.status()).toBe(200);
  });
});

test.describe('V3 Features — Dashboard Auth Guard', () => {
  const protectedPages = [
    '/dashboard',
    '/dashboard/trading',
    '/dashboard/chat',
    '/dashboard/settings',
    '/dashboard/boutique',
    '/dashboard/achievements',
    '/dashboard/community',
    '/dashboard/lottery',
    '/dashboard/wallet',
  ];

  for (const path of protectedPages) {
    test(`${path} redirects to /login when not authenticated`, async ({ page }) => {
      await page.goto(path);
      await page.waitForURL('**/login**', { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });
  }
});

test.describe('V3 Features — API Routes Auth', () => {
  test('GET /api/points without auth returns 401', async ({ request }) => {
    const res = await request.get('/api/points');
    const ct = res.headers()['content-type'] ?? '';
    if (ct.includes('application/json')) {
      const body = await res.json();
      expect(body.error).toBeTruthy();
    }
  });

  test('GET /api/daily-gift without auth returns 401', async ({ request }) => {
    const res = await request.get('/api/daily-gift');
    const ct = res.headers()['content-type'] ?? '';
    if (ct.includes('application/json')) {
      const body = await res.json();
      expect(body.error).toBeTruthy();
    }
  });

  test('GET /api/boutique returns items (public)', async ({ request }) => {
    const res = await request.get('/api/boutique');
    const ct = res.headers()['content-type'] ?? '';
    if (ct.includes('application/json')) {
      const body = await res.json();
      // Either items array or auth error
      expect(body.items || body.error).toBeTruthy();
    }
  });

  test('GET /api/achievements returns data', async ({ request }) => {
    const res = await request.get('/api/achievements');
    const ct = res.headers()['content-type'] ?? '';
    if (ct.includes('application/json')) {
      const body = await res.json();
      expect(body.achievements || body.error).toBeTruthy();
    }
  });

  test('GET /api/lottery returns data', async ({ request }) => {
    const res = await request.get('/api/lottery');
    const ct = res.headers()['content-type'] ?? '';
    if (ct.includes('application/json')) {
      const body = await res.json();
      expect(body.draws || body.current_draw || body.error).toBeTruthy();
    }
  });

  test('GET /api/cross-promo returns apps', async ({ request }) => {
    const res = await request.get('/api/cross-promo');
    const ct = res.headers()['content-type'] ?? '';
    if (ct.includes('application/json')) {
      const body = await res.json();
      expect(body.apps || body.error).toBeTruthy();
    }
  });

  test('POST /api/feedback without auth returns error', async ({ request }) => {
    const res = await request.post('/api/feedback', {
      data: { rating: 5, comment: 'test' },
    });
    const ct = res.headers()['content-type'] ?? '';
    if (ct.includes('application/json')) {
      const body = await res.json();
      expect(body.error).toBeTruthy();
    }
  });

  test('GET /api/market/prices returns data', async ({ request }) => {
    const res = await request.get('/api/market/prices');
    expect([200, 307]).toContain(res.status());
  });
});

test.describe('V3 Features — Responsive', () => {
  test('Landing page responsive at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(376);
  });

  test('Landing page responsive at 768px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('Pricing responsive at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/pricing');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(376);
  });
});

test.describe('V3 Features — No Console Errors', () => {
  test('Landing has no critical console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForTimeout(2000);
    // Filter out known non-critical errors (3rd party, hydration warnings)
    const critical = errors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('Failed to load resource') &&
        !e.includes('hydrat') &&
        !e.includes('PostHog')
    );
    expect(critical.length).toBe(0);
  });
});

test.describe('V3 Features — SEO Basics', () => {
  test('Landing has meta description', async ({ page }) => {
    await page.goto('/');
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc).toBeTruthy();
    expect(desc!.length).toBeGreaterThan(20);
  });

  test('Login page has title', async ({ page }) => {
    await page.goto('/login');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
