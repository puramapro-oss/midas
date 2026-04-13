import { test, expect } from '@playwright/test';

const BASE = 'https://midas.purama.dev';

async function gotoWithoutCookieBanner(page: import('@playwright/test').Page, path: string) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('midas-cookie-consent', JSON.stringify({ necessary: true, analytics: false, performance: false }));
  });
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
}

test.describe('Onboarding Wizard', () => {
  test('Step 1: Bienvenue sur MIDAS', async ({ page }) => {
    await gotoWithoutCookieBanner(page, '/onboarding');

    const title = page.locator('[data-testid="welcome-title"]');
    await expect(title).toBeVisible();
    expect(await title.textContent()).toContain('Bienvenue');
    await expect(page.locator('[data-testid="welcome-next"]')).toBeVisible();
    console.log('  ✅ Step 1: Bienvenue + button');
  });

  test('Step 2: Binance referral link', async ({ page }) => {
    await gotoWithoutCookieBanner(page, '/onboarding');
    await page.locator('[data-testid="welcome-next"]').click();
    await page.waitForTimeout(600);

    const createBtn = page.locator('[data-testid="binance-create"]');
    await expect(createBtn).toBeVisible();
    const href = await createBtn.getAttribute('href');
    expect(href).toContain('CPA_00BM2GEU29');
    await expect(page.locator('[data-testid="binance-skip"]')).toBeVisible();
    console.log(`  ✅ Step 2: Binance ref link = ${href}`);
  });

  test('Step 3: API guide + red alert', async ({ page }) => {
    await gotoWithoutCookieBanner(page, '/onboarding');
    await page.locator('[data-testid="welcome-next"]').click();
    await page.waitForTimeout(600);
    await page.locator('[data-testid="binance-skip"]').click();
    await page.waitForTimeout(600);

    const body = await page.locator('body').textContent();
    expect(body).toContain('NE JAMAIS');
    expect(body).toContain('Retrait');
    await expect(page.locator('[data-testid="guide-next"]')).toBeVisible();
    console.log('  ✅ Step 3: Red alert visible');
  });

  test('Step 4: API key inputs + AES-256', async ({ page }) => {
    await gotoWithoutCookieBanner(page, '/onboarding');
    await page.locator('[data-testid="welcome-next"]').click();
    await page.waitForTimeout(600);
    await page.locator('[data-testid="binance-skip"]').click();
    await page.waitForTimeout(600);
    await page.locator('[data-testid="guide-next"]').click();
    await page.waitForTimeout(600);

    await expect(page.locator('[data-testid="api-key-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="api-secret-input"]')).toBeVisible();
    const body = await page.locator('body').textContent();
    expect(body).toContain('AES-256');
    console.log('  ✅ Step 4: API inputs + AES-256');
  });

  test('Step 5: Risk profiles', async ({ page }) => {
    await gotoWithoutCookieBanner(page, '/onboarding');
    await page.locator('[data-testid="welcome-next"]').click();
    await page.waitForTimeout(600);
    await page.locator('[data-testid="binance-skip"]').click();
    await page.waitForTimeout(600);
    await page.locator('[data-testid="guide-next"]').click();
    await page.waitForTimeout(600);
    await page.locator('[data-testid="keys-save"]').click();
    await page.waitForTimeout(600);

    for (const id of [0, 1, 2]) {
      await expect(page.locator(`[data-testid="risk-${id}"]`)).toBeVisible();
    }
    const body = await page.locator('body').textContent();
    expect(body).toContain('Prudent');
    expect(body).toContain('Agressif');
    console.log('  ✅ Step 5: 3 risk profiles');
  });

  test('Step 6: MIDAS est pret', async ({ page }) => {
    await gotoWithoutCookieBanner(page, '/onboarding');
    await page.locator('[data-testid="welcome-next"]').click();
    await page.waitForTimeout(600);
    await page.locator('[data-testid="binance-skip"]').click();
    await page.waitForTimeout(600);
    await page.locator('[data-testid="guide-next"]').click();
    await page.waitForTimeout(600);
    await page.locator('[data-testid="keys-save"]').click();
    await page.waitForTimeout(600);
    await page.locator('[data-testid="risk-next"]').click();
    await page.waitForTimeout(600);

    const title = page.locator('[data-testid="ready-title"]');
    await expect(title).toBeVisible();
    expect(await title.textContent()).toContain('MIDAS est pret');
    await expect(page.locator('[data-testid="activate-midas"]')).toBeVisible();
    console.log('  ✅ Step 6: Ready + Activer MIDAS');
  });

  test('API /api/keys/save returns 401 without auth', async ({ page }) => {
    const resp = await page.request.post(`${BASE}/api/keys/save`, {
      data: { apiKey: 'test', apiSecret: 'test' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(resp.status()).toBe(401);
    console.log('  ✅ /api/keys/save — 401');
  });
});
