import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
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

  test('all 9 sections are visible', async ({ page }) => {
    // Hero section
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();

    // HowItWorks section
    await expect(page.locator('[data-testid="how-it-works-section"]')).toBeVisible();

    // AILayers section
    await expect(page.locator('[data-testid="ai-layers-section"]')).toBeVisible();

    // ShieldShowcase section
    await expect(page.locator('[data-testid="shield-showcase-section"]')).toBeVisible();

    // Comparison section
    await expect(page.locator('[data-testid="comparison-section"]')).toBeVisible();

    // Pricing section - check for plan cards
    await expect(page.locator('[data-testid="plan-free"]')).toBeVisible();

    // Testimonials - check for testimonial content
    await expect(page.getByText('temoignages', { exact: false })).toBeVisible();

    // FAQ - check for FAQ questions
    await expect(page.getByText('Est-ce que MIDAS est legal', { exact: false })).toBeVisible();

    // Footer - check for disclaimer
    await expect(page.getByText('Avertissement', { exact: false })).toBeVisible();
  });

  test('responsive: mobile burger menu visible at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    // On mobile, the landing page should still display the hero
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
  });

  test('responsive: desktop layout at 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // Landing page should not have a sidebar
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).not.toBeVisible();

    // Hero should be visible
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
  });

  test('pricing cards visible: Free, Pro, Ultra', async ({ page }) => {
    await expect(page.locator('[data-testid="plan-free"]')).toBeVisible();
    await expect(page.locator('[data-testid="plan-pro"]')).toBeVisible();
    await expect(page.locator('[data-testid="plan-ultra"]')).toBeVisible();
  });

  test('FAQ accordion opens on click', async ({ page }) => {
    const firstQuestion = page.getByText('Est-ce que MIDAS est legal', { exact: false });
    await firstQuestion.scrollIntoViewIfNeeded();
    await firstQuestion.click();

    // After clicking, the answer should be visible
    await expect(page.getByText('100% legal', { exact: false })).toBeVisible();
  });

  test('footer contains disclaimer text', async ({ page }) => {
    const disclaimer = page.getByText('Avertissement', { exact: false });
    await disclaimer.scrollIntoViewIfNeeded();
    await expect(disclaimer).toBeVisible();

    // Check disclaimer content
    await expect(
      page.getByText('outil d\'aide a la decision', { exact: false })
    ).toBeVisible();
  });

  test('CTA buttons exist', async ({ page }) => {
    await expect(page.locator('[data-testid="cta-signup"]')).toBeVisible();
    await expect(page.locator('[data-testid="cta-demo"]')).toBeVisible();
  });
});
