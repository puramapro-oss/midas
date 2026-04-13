import { test, expect } from '@playwright/test';

test('Particles canvas renders on landing page', async ({ page }) => {
  await page.goto('https://midas.purama.dev/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const canvas = page.locator('#midas-particles canvas');
  await expect(canvas).toBeVisible({ timeout: 10000 });
  console.log('  ✅ Particles canvas is visible');

  // Verify canvas has real dimensions
  const box = await canvas.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.width).toBeGreaterThan(100);
  expect(box!.height).toBeGreaterThan(100);
  console.log(`  ✅ Canvas size: ${box!.width}x${box!.height}`);
});
