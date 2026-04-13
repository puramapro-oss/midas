import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
  });

  test('H1 contains MIDAS', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    await expect(h1).toContainText('MIDAS');
  });

  test('page has correct meta title', async ({ page }) => {
    const title = await page.title();
    expect(title.toLowerCase()).toContain('midas');
  });

  test('hero section is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
  });

  test('how-it-works section is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="how-it-works-section"]')).toBeVisible();
  });

  test('AI layers section is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="ai-layers-section"]')).toBeVisible();
  });

  test('shield showcase section is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="shield-showcase-section"]')).toBeVisible();
  });

  test('responsive: mobile at 375px shows hero', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
  });

  test('responsive: desktop at 1440px no sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForTimeout(1000);
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).not.toBeVisible();
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
  });

  test('CTA signup button exists', async ({ page }) => {
    await expect(page.locator('[data-testid="cta-signup"]')).toBeVisible();
  });

  test('CTA pricing button exists', async ({ page }) => {
    await expect(page.locator('[data-testid="cta-pricing"]')).toBeVisible();
  });

  test('page scrolls to bottom without error', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    const scrollTop = await page.evaluate(() => window.scrollY);
    expect(scrollTop).toBeGreaterThan(100);
  });
});
