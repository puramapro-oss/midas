import { expect, test } from '@playwright/test';

test('simule chaque sens sur une offre choisie, sans transmettre d’ordre', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', req => {
    if (req.method() !== 'GET' && /\/api\/(trade|exchange|paper)(\/|$)/.test(req.url())) requests.push(req.url());
  });
  await page.goto('/');
  await page.getByRole('searchbox').fill('EURUSD');
  await page.getByRole('link', { name: /Forex EUR\/USD/ }).click();
  await page.getByRole('link', { name: 'Comparer les offres pour EUR/USD' }).click();
  const comparison = page.getByRole('region', { name: 'Comparer le coût de deux offres' });
  const ticket = comparison.getByRole('region', { name: 'Récapitulatif simulé' });
  await comparison.getByRole('radio', { name: 'Achat', exact: true }).check();
  await comparison.getByLabel('Quantité d’unités').fill('100');
  await comparison.getByLabel('Prix unitaire d’achat (USD)').fill('1,10');
  await comparison.getByLabel('Commission par ordre (%)').fill('0,5');
  await comparison.getByLabel('Autres frais par ordre (USD)').fill('1');
  await expect(ticket).toContainText('Achat simulé · EUR/USD · Offre A');
  for (const amount of ['110,00', '1,55', '111,55']) await expect(ticket).toContainText(amount);
  await comparison.getByRole('radio', { name: 'Vente', exact: true }).check();
  await comparison.getByLabel('Offre simulée').selectOption('1');
  await expect(ticket).toContainText('Indique un prix unitaire positif');
  await comparison.getByLabel('Prix unitaire de vente (USD)').fill('1,09');
  await comparison.getByLabel('Commission à la vente (%)').fill('1');
  await comparison.getByLabel('Autres frais à la vente (USD)').fill('2');
  await expect(ticket).toContainText('Vente simulée');
  await expect(ticket).toContainText('Offre B');
  for (const amount of ['109,00', '3,09', '105,91']) await expect(ticket).toContainText(amount);
  await comparison.getByLabel('Quantité d’unités').fill('0');
  await expect(ticket).not.toContainText('105,91');
  await expect(ticket).toContainText('quantité positive');
  expect(requests).toEqual([]);
});
