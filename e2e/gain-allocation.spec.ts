import { expect, test, type Page } from '@playwright/test';

function amount(page: Page, label: string) {
  return page.getByText(label, { exact: true }).locator('..').locator('dd');
}

test('annual fee, voluntary allocation and a cancelled or unfunded shopping example', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.getByRole('heading', { name: 'Accès via PURAMA' })).toBeVisible();
  await expect(amount(page, 'Commission de performance estimée')).toHaveText(/2,70\s*€/);
  await expect(amount(page, 'Solde sans affectation')).toHaveText(/87,30\s*€/);

  await page.getByRole('button', { name: 'Essayer 40 / 30 / 20 / 10 %' }).click();
  await expect(amount(page, 'Retrait vers ma banque')).toHaveText(/34,92\s*€/);
  await expect(amount(page, 'Épargne')).toHaveText(/26,19\s*€/);
  await expect(amount(page, 'Investir ailleurs')).toHaveText(/17,46\s*€/);
  await expect(amount(page, 'Achats PURAMA')).toHaveText(/8,73\s*€/);
  await expect(amount(page, 'Complément pour payer maintenant')).toHaveText(/99,27\s*€/);
  await page.getByRole('checkbox', { name: /finance un cashback/ }).uncheck();
  await expect(amount(page, 'Cashback après validation de l’achat')).toHaveText(/^0,00\s*€/);
  await page.getByRole('combobox', { name: 'Situation du panier fictif' }).selectOption('unavailable');
  await expect(page.getByText(/Budget achats conservé en totalité/)).toContainText(/8,73\s*€/);

  await page.getByRole('textbox', { name: /Résultat latent net/ }).fill('-100');
  await expect(amount(page, 'Commission de performance estimée')).toHaveText(/^0,00\s*€/);
  await expect(amount(page, 'Gain disponible à répartir')).toHaveText(/^0,00\s*€/);
});
