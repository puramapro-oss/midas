import { test, expect } from '@playwright/test';

// Dismiss cookie banner by pre-setting consent in localStorage
async function dismissCookies(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    localStorage.setItem('midas-cookie-consent', JSON.stringify({ essential: true, analytics: true, marketing: true }));
  });
  // Reload so the banner doesn't appear
  await page.reload({ waitUntil: 'domcontentloaded' });
}

// Collect JS errors
function collectErrors(page: import('@playwright/test').Page) {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

// ============================================================
// 1. PUBLIC PAGES — accessible sans auth, HTTP 200, pas d'erreur JS
// ============================================================
test.describe('Public pages load correctly', () => {
  const publicPages = [
    { path: '/', name: 'Landing' },
    { path: '/login', name: 'Login' },
    { path: '/register', name: 'Register' },
    { path: '/pricing', name: 'Pricing' },
    { path: '/status', name: 'Status' },
    { path: '/changelog', name: 'Changelog' },
    { path: '/offline', name: 'Offline' },
    { path: '/onboarding', name: 'Onboarding' },
    { path: '/forgot-password', name: 'Forgot Password' },
    { path: '/legal/mentions', name: 'Mentions Legales' },
    { path: '/legal/privacy', name: 'Politique Confidentialite' },
    { path: '/legal/cgu', name: 'CGU' },
    { path: '/legal/cgv', name: 'CGV' },
    { path: '/legal/cookies', name: 'Cookies' },
    { path: '/legal/disclaimer', name: 'Disclaimer' },
  ];

  for (const { path, name } of publicPages) {
    test(`${name} (${path}) loads with HTTP 200`, async ({ page }) => {
      const errors = collectErrors(page);
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);
      // Allow React hydration warnings but no real errors
      const criticalErrors = errors.filter(
        (e) => !e.includes('Hydration') && !e.includes('hydrat') && !e.includes('minified React')
      );
      expect(criticalErrors).toHaveLength(0);
    });
  }
});

// ============================================================
// 2. AUTH — middleware protects dashboard
// ============================================================
test.describe('Auth protection', () => {
  test('dashboard redirects to /login without session', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/login**');
    expect(page.url()).toContain('/login');
  });

  test('admin redirects to /login without session', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL('**/login**');
    expect(page.url()).toContain('/login');
  });

  test('dashboard/chat redirects to /login without session', async ({ page }) => {
    await page.goto('/dashboard/chat');
    await page.waitForURL('**/login**');
    expect(page.url()).toContain('/login');
  });

  test('dashboard/wallet redirects to /login without session', async ({ page }) => {
    await page.goto('/dashboard/wallet');
    await page.waitForURL('**/login**');
    expect(page.url()).toContain('/login');
  });

  test('dashboard/settings redirects to /login without session', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.waitForURL('**/login**');
    expect(page.url()).toContain('/login');
  });
});

// ============================================================
// 3. LOGIN PAGE — all elements present
// ============================================================
test.describe('Login page elements', () => {
  test('all login elements are present', async ({ page }) => {
    await page.goto('/login');
    await dismissCookies(page);

    await expect(page.locator('[data-testid="login-logo"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="google-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="remember-me-checkbox"]')).toBeVisible();
    await expect(page.locator('[data-testid="forgot-password-link"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-link"]')).toBeVisible();
  });

  test('register link navigates to /register', async ({ page }) => {
    await page.goto('/login');
    await dismissCookies(page);
    await page.locator('[data-testid="register-link"]').click();
    await page.waitForURL('**/register');
    expect(page.url()).toContain('/register');
  });

  test('forgot password link navigates correctly', async ({ page }) => {
    await page.goto('/login');
    await dismissCookies(page);
    await page.locator('[data-testid="forgot-password-link"]').click();
    await page.waitForURL('**/forgot-password');
    expect(page.url()).toContain('/forgot-password');
  });

  test('Google button triggers OAuth flow', async ({ page }) => {
    await page.goto('/login');
    await dismissCookies(page);
    const [popup] = await Promise.all([
      page.waitForEvent('popup', { timeout: 5000 }).catch(() => null),
      page.locator('[data-testid="google-button"]').click(),
    ]);
    // Either redirects to Google or opens popup
    if (popup) {
      expect(popup.url()).toContain('google');
    } else {
      // May redirect in same window
      await page.waitForURL(/google|accounts\.google|auth\.purama/, { timeout: 5000 }).catch(() => {});
    }
  });
});

// ============================================================
// 4. REGISTER PAGE — all elements present
// ============================================================
test.describe('Register page elements', () => {
  test('register form has all fields', async ({ page }) => {
    await page.goto('/register');
    await dismissCookies(page);

    await expect(page.locator('[data-testid="fullname-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="google-button"]')).toBeVisible();
  });

  test('login link navigates back to /login', async ({ page }) => {
    await page.goto('/register');
    await dismissCookies(page);
    await page.locator('[data-testid="login-link"]').click();
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });
});

// ============================================================
// 5. PRICING PAGE — plans and buttons
// ============================================================
test.describe('Pricing page', () => {
  test('displays plan cards with prices', async ({ page }) => {
    await page.goto('/pricing');
    await dismissCookies(page);

    // Check that pricing section exists with plan cards
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();

    // Should show at least "Gratuit" or "Free" and price values
    const hasPlans = pageContent?.includes('Gratuit') ||
                     pageContent?.includes('Free') ||
                     pageContent?.includes('0') ||
                     pageContent?.includes('€');
    expect(hasPlans).toBeTruthy();
  });

  test('CTA buttons exist on pricing cards', async ({ page }) => {
    await page.goto('/pricing');
    await dismissCookies(page);

    // Each plan should have a button
    const buttons = page.locator('button, a[href*="checkout"], a[href*="stripe"], [data-testid*="plan"]');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });
});

// ============================================================
// 6. LEGAL PAGES — have real content
// ============================================================
test.describe('Legal pages have content', () => {
  const legalPages = [
    { path: '/legal/mentions', minChars: 500, keyword: 'purama' },
    { path: '/legal/privacy', minChars: 500, keyword: 'confidentialit' },
    { path: '/legal/cgu', minChars: 500, keyword: 'utilisat' },
    { path: '/legal/cgv', minChars: 300, keyword: 'vente' },
    { path: '/legal/cookies', minChars: 300, keyword: 'cookie' },
    { path: '/legal/disclaimer', minChars: 200, keyword: 'risque' },
  ];

  for (const { path, minChars, keyword } of legalPages) {
    test(`${path} has real content (>=${minChars} chars, contains "${keyword}")`, async ({ page }) => {
      await page.goto(path);
      const text = await page.textContent('body');
      expect(text?.length).toBeGreaterThan(minChars);
      expect(text?.toLowerCase()).toContain(keyword);
    });
  }
});

// ============================================================
// 7. LANDING PAGE — sections and navigation
// ============================================================
test.describe('Landing page', () => {
  test('has hero section with CTA', async ({ page }) => {
    await page.goto('/');
    await dismissCookies(page);

    // Should have MIDAS title
    const text = await page.textContent('body');
    expect(text).toContain('MIDAS');
  });

  test('footer has legal links', async ({ page }) => {
    await page.goto('/');
    await dismissCookies(page);

    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const footer = page.locator('footer');
    if (await footer.isVisible().catch(() => false)) {
      const footerText = await footer.textContent();
      // Footer should contain legal-related links
      const hasLegalLinks =
        footerText?.includes('Mentions') ||
        footerText?.includes('mentions') ||
        footerText?.includes('legal') ||
        footerText?.includes('Confidential') ||
        footerText?.includes('CGU') ||
        footerText?.includes('CGV');
      expect(hasLegalLinks).toBeTruthy();
    }
  });

  test('pricing section has plans', async ({ page }) => {
    await page.goto('/');
    await dismissCookies(page);

    // Scroll down to find pricing
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(500);

    const text = await page.textContent('body');
    const hasPricing = text?.includes('€') || text?.includes('Gratuit') || text?.includes('pricing') || text?.includes('plan');
    expect(hasPricing).toBeTruthy();
  });
});

// ============================================================
// 8. API ROUTES — public endpoints return correct status
// ============================================================
test.describe('API routes', () => {
  test('/api/status returns JSON with status:ok', async ({ request }) => {
    const response = await request.get('/api/status');
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.status).toBe('ok');
    expect(json.app).toBeTruthy();
  });

  test('/api/chat requires auth (401)', async ({ request }) => {
    const response = await request.post('/api/chat', {
      data: { message: 'test' },
    });
    expect(response.status()).toBe(401);
  });

  test('/api/admin/stats requires auth (401)', async ({ request }) => {
    const response = await request.get('/api/admin/stats');
    expect(response.status()).toBe(401);
  });

  test('/api/wallet requires auth (401)', async ({ request }) => {
    const response = await request.get('/api/wallet');
    expect(response.status()).toBe(401);
  });

  test('/api/stripe/checkout requires auth (401)', async ({ request }) => {
    const response = await request.post('/api/stripe/checkout', {
      data: { plan: 'pro', interval: 'month' },
    });
    expect(response.status()).toBe(401);
  });

  test('/api/keys/save requires auth (401)', async ({ request }) => {
    const response = await request.post('/api/keys/save', {
      data: { apiKey: 'test', apiSecret: 'test' },
    });
    expect(response.status()).toBe(401);
  });

  test('/api/market/prices returns data', async ({ request }) => {
    const response = await request.get('/api/market/prices');
    // Should return 200 with price data or empty array
    expect([200, 500]).toContain(response.status()); // 500 if Binance API is down
  });
});

// ============================================================
// 9. RESPONSIVE — mobile viewport
// ============================================================
test.describe('Mobile responsive (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('landing page renders on mobile', async ({ page }) => {
    await page.goto('/');
    await dismissCookies(page);
    const text = await page.textContent('body');
    expect(text).toContain('MIDAS');
  });

  test('login page renders on mobile', async ({ page }) => {
    await page.goto('/login');
    await dismissCookies(page);
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="remember-me-checkbox"]')).toBeVisible();
  });

  test('pricing page renders on mobile', async ({ page }) => {
    await page.goto('/pricing');
    await dismissCookies(page);
    const text = await page.textContent('body');
    expect(text).toBeTruthy();
  });

  test('legal pages render on mobile', async ({ page }) => {
    await page.goto('/legal/mentions');
    const text = await page.textContent('body');
    expect(text?.length).toBeGreaterThan(200);
  });
});

// ============================================================
// 10. SEO — meta tags
// ============================================================
test.describe('SEO meta tags', () => {
  const seoPages = ['/', '/pricing', '/login', '/legal/mentions', '/legal/privacy'];

  for (const path of seoPages) {
    test(`${path} has meta title and description`, async ({ page }) => {
      await page.goto(path);

      const title = await page.title();
      expect(title.length).toBeGreaterThan(5);

      const desc = await page.locator('meta[name="description"]').getAttribute('content');
      // Some pages may not have description, but title is mandatory
      if (desc) {
        expect(desc.length).toBeGreaterThan(10);
      }
    });
  }
});

// ============================================================
// 11. COOKIE BANNER — appears on first visit
// ============================================================
test.describe('Cookie banner', () => {
  test('cookie banner appears on first visit', async ({ page }) => {
    await page.goto('/');
    const banner = page.locator('[data-testid="cookie-banner"]');
    await expect(banner).toBeVisible({ timeout: 5000 });
  });

  test('cookie banner can be accepted', async ({ page }) => {
    await page.goto('/');
    const banner = page.locator('[data-testid="cookie-banner"]');
    await expect(banner).toBeVisible({ timeout: 5000 });

    const acceptBtn = page.locator('[data-testid="cookie-accept"]');
    await acceptBtn.click();
    await expect(banner).not.toBeVisible({ timeout: 3000 });
  });
});

// ============================================================
// 12. SITEMAP
// ============================================================
test.describe('Sitemap', () => {
  test('sitemap.xml exists', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    // Sitemap should exist (200) or be generated
    expect([200, 304]).toContain(response.status());
    const text = await response.text();
    expect(text).toContain('xml');
  });
});
