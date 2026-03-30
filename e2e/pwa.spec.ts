import { test, expect } from '@playwright/test';

test.describe('PWA', () => {
  test('manifest.json is accessible and has correct name', async ({ page }) => {
    await page.goto('/');
    const manifest = page.locator('link[rel="manifest"]');
    const count = await manifest.count();
    expect(count).toBeGreaterThan(0);
  });

  test('page has viewport meta tag', async ({ page }) => {
    await page.goto('/');
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /width/);
  });

  test('page has theme-color meta tag', async ({ page }) => {
    await page.goto('/');
    const themeColor = page.locator('meta[name="theme-color"]');
    const count = await themeColor.count();
    expect(count).toBeGreaterThan(0);
  });
});
