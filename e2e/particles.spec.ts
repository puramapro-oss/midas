// GEL PROD : cible https://midas.purama.dev, actuellement en
// «This deployment is temporarily paused» (gel déploy Vercel, Tissma).
// NIYAMA D1=C/D2=A verrouillé localement par scripts/check-niyama-decisions.mjs.
import { test, expect } from '@playwright/test';

test.skip(true, 'PROD gelée (deployment paused) — specs pré-NIYAMA obsolètes');

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
