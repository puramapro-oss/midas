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

test('saving, correcting and undoing annual statements recomputes once and keeps the draft', async ({ page }) => {
  await page.goto('/pricing');
  const realized = page.getByRole('textbox', { name: /Résultat réalisé des opérations/ });
  const subscription = page.getByRole('textbox', { name: /Abonnement imputable/ });
  const cash = page.getByRole('textbox', { name: /Trésorerie effectivement disponible/ });
  const save = page.getByRole('button', { name: /^Enregistrer l’arrêté de l’année/ });
  const history = page.getByRole('region', { name: 'Arrêtés enregistrés' });
  const csv = page.getByRole('button', { name: /Télécharger les arrêtés/ });

  await expect(csv).toHaveCount(0);
  await save.click();
  await expect(history.getByRole('listitem')).toHaveCount(1);
  await expect(save).toBeDisabled();
  await expect(cash).toHaveValue('');
  await realized.fill('-50');
  await subscription.fill('0');
  await expect(amount(page, 'Pertes restant à rattraper')).toHaveText(/50,00\s*€/);
  await save.click();

  await realized.fill('70');
  await subscription.fill('0');
  await expect(amount(page, 'Commission de performance estimée')).toHaveText(/0,60\s*€/);
  await save.click();
  await expect(history.getByRole('listitem').last()).toContainText(/cumul des commissions 3,30\s*€/);
  await realized.fill('15');
  await cash.fill('12');
  await page.getByRole('button', { name: 'Corriger l’année 2' }).click();
  await expect(realized).toBeFocused();
  await expect(realized).toHaveValue('-50');
  await expect(cash).toHaveValue('');
  await realized.fill('-10');
  await page.getByRole('button', { name: 'Appliquer la correction' }).click();
  await expect(history.getByRole('listitem')).toHaveCount(3);
  await expect(history.getByRole('listitem').last()).toContainText(/Commission 1,80\s*€ · cumul des commissions 4,50\s*€/);
  await expect(realized).toHaveValue('15');
  await expect(cash).toHaveValue('');

  await page.getByRole('button', { name: 'Corriger l’année 1' }).click();
  await realized.fill('999');
  await page.getByRole('button', { name: 'Abandonner la correction' }).click();
  await expect(history.getByRole('listitem').last()).toContainText(/cumul des commissions 4,50\s*€/);
  const downloaded = page.waitForEvent('download');
  await csv.click();
  expect((await downloaded).suggestedFilename()).toBe('MIDAS-simulation-arretes.csv');
  await cash.fill('10');
  await page.getByRole('button', { name: 'Essayer 40 / 30 / 20 / 10 %' }).click();
  await page.getByRole('button', { name: 'Annuler le dernier arrêté' }).click();
  await expect(cash).toHaveValue('');
  await expect(page.getByRole('textbox', { name: /Retrait vers ma banque/ })).toHaveValue('0');
  await expect(page.getByRole('status').filter({ hasText: 'Le brouillon porte désormais sur l’année 3' })).toBeVisible();
  await expect(history.getByRole('listitem')).toHaveCount(2);
  await expect(history.getByRole('listitem').last()).toContainText(/cumul des commissions 2,70\s*€/);
  await expect(realized).toHaveValue('15');
});
