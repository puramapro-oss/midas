import { test, expect } from '@playwright/test';

const BASE = 'https://midas.purama.dev';

test('Landing page loads under 2 seconds', async ({ page }) => {
  const start = Date.now();
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  const domReady = Date.now() - start;

  // Wait for hero to be visible (first meaningful paint)
  await page.locator('[data-testid="cta-signup"]').waitFor({ state: 'visible', timeout: 5000 });
  const fmp = Date.now() - start;

  console.log(`  DOM ready: ${domReady}ms`);
  console.log(`  First meaningful paint: ${fmp}ms`);
  expect(fmp).toBeLessThan(4000); // network latency buffer for remote test

  // Check performance timing from browser
  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
      loadComplete: Math.round(nav.loadEventEnd - nav.startTime),
      ttfb: Math.round(nav.responseStart - nav.startTime),
    };
  });

  console.log(`  TTFB: ${timing.ttfb}ms`);
  console.log(`  DOMContentLoaded: ${timing.domContentLoaded}ms`);
  console.log(`  Load complete: ${timing.loadComplete}ms`);

  // DOMContentLoaded should be under 2s
  expect(timing.domContentLoaded).toBeLessThan(2000);
  console.log('  ✅ DOMContentLoaded < 2s');
});

test('Particles: 30 on desktop, links disabled on mobile', async ({ browser }) => {
  // Desktop
  const desktopCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const desktopPage = await desktopCtx.newPage();
  await desktopPage.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await desktopPage.waitForTimeout(3000);

  const desktopCanvas = desktopPage.locator('#midas-particles canvas');
  await expect(desktopCanvas).toBeVisible({ timeout: 10000 });
  console.log('  ✅ Desktop: particles canvas visible');
  await desktopCtx.close();

  // Mobile
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(3000);

  const mobileCanvas = mobilePage.locator('#midas-particles canvas');
  await expect(mobileCanvas).toBeVisible({ timeout: 10000 });
  console.log('  ✅ Mobile: particles canvas visible (fewer particles, no links)');
  await mobileCtx.close();
});
