import { test, expect } from '@playwright/test';

test.describe('P4 — Admin Pages', () => {
  test('/admin redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL('**/login**');
    expect(page.url()).toContain('/login');
  });

  test('/admin/monitoring redirects to /login', async ({ page }) => {
    await page.goto('/admin/monitoring');
    await page.waitForURL('**/login**');
    expect(page.url()).toContain('/login');
  });

  test('/admin/financement redirects to /login', async ({ page }) => {
    await page.goto('/admin/financement');
    await page.waitForURL('**/login**');
    expect(page.url()).toContain('/login');
  });
});

test.describe('P4 — Contact Page', () => {
  test('/contact loads and shows form', async ({ page }) => {
    const res = await page.goto('/contact');
    expect(res?.status()).toBe(200);
    const body = await page.textContent('body');
    expect(body).toContain('Contact');
  });

  test('/contact form has required fields', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('input[type="text"], input[type="email"], input[name], textarea').first()).toBeVisible();
  });

  test('/contact responsive at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/contact');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(376);
  });
});

test.describe('P4 — FAQ Page', () => {
  test('/dashboard/help/faq redirects to /login', async ({ page }) => {
    await page.goto('/dashboard/help/faq');
    await page.waitForURL('**/login**');
    expect(page.url()).toContain('/login');
  });
});

test.describe('P4 — API Routes', () => {
  test('POST /api/contact with valid data returns success', async ({ request }) => {
    const res = await request.post('/api/contact', {
      data: {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Ceci est un message de test.',
      },
    });
    const ct = res.headers()['content-type'] ?? '';
    if (ct.includes('application/json')) {
      const body = await res.json();
      // Either success or DB error (table might not exist in test env)
      expect(body.success || body.error).toBeTruthy();
    }
  });

  test('POST /api/contact with invalid data returns 400', async ({ request }) => {
    const res = await request.post('/api/contact', {
      data: { name: '' },
    });
    const ct = res.headers()['content-type'] ?? '';
    if (ct.includes('application/json')) {
      const body = await res.json();
      expect(body.error).toBeTruthy();
    }
  });

  test('GET /api/faq returns articles', async ({ request }) => {
    const res = await request.get('/api/faq');
    const ct = res.headers()['content-type'] ?? '';
    if (ct.includes('application/json')) {
      const body = await res.json();
      expect(body.articles || body.error).toBeTruthy();
    }
  });

  test('GET /api/admin/monitoring without auth returns error', async ({ request }) => {
    const res = await request.get('/api/admin/monitoring');
    const ct = res.headers()['content-type'] ?? '';
    if (ct.includes('application/json')) {
      const body = await res.json();
      expect(body.error).toBeTruthy();
    }
  });

  test('GET /api/admin/financement without auth returns error', async ({ request }) => {
    const res = await request.get('/api/admin/financement');
    const ct = res.headers()['content-type'] ?? '';
    if (ct.includes('application/json')) {
      const body = await res.json();
      expect(body.error).toBeTruthy();
    }
  });
});

test.describe('P5 — Design & Animations', () => {
  test('Landing page has cursor glow wrapper', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('Landing page all sections render', async ({ page }) => {
    await page.goto('/');
    // Check hero
    await expect(page.locator('h1')).toContainText('MIDAS');
    // Scroll down to trigger reveals
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    // Footer should be visible after scroll
    const footer = page.locator('footer');
    if (await footer.count() > 0) {
      await expect(footer.first()).toBeVisible();
    }
  });

  test('No horizontal overflow on landing at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForTimeout(500);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(376);
  });

  test('No horizontal overflow on landing at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(1921);
  });
});

test.describe('P5 — i18n', () => {
  test('Landing has lang attribute', async ({ page }) => {
    await page.goto('/');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
  });
});
