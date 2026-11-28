import { expect, test } from '@playwright/test';

test('identifie un titre par ISIN et respecte le filtre de marché', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('searchbox');
  await search.fill('nl 0000235190');
  await page.getByRole('link', { name: 'Actions AIR Airbus' }).click();
  const sheet = page.locator('#fiche-instrument');
  await expect(sheet).toContainText('ISIN NL0000235190');
  await expect(sheet.getByRole('link', { name: /Euronext Paris/ })).toHaveAttribute(
    'href', 'https://live.euronext.com/en/product/equities/NL0000235190-XPAR'
  );
  await page.getByRole('combobox', { name: 'Marché' }).selectOption('Forex');
  await expect(page.getByText(/Aucun résultat/)).toBeVisible();
  await expect(sheet.getByRole('heading')).toHaveCount(0);
  await search.fill('###');
  await expect(page.getByText(/Aucun résultat/)).toBeVisible();
  await search.fill('');
  await expect(page.getByRole('link', { name: /Forex EUR\/USD/ })).toBeVisible();
});
