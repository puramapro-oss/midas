// =============================================================================
// MIDAS — Landing NIYAMA (D2=A) : page minimale information/éducation.
// Contrat : src/app/page.tsx + scripts/check-niyama-decisions.mjs
// (pas de hero 13 sections, pas de pricing CTA, pas de testid Hero/Pricing).
// =============================================================================
import { test, expect } from '@playwright/test';

test.describe('Landing page (NIYAMA D2=A)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('H1 annonce la plateforme et précise la disponibilité', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText('Investir et trader');
    await expect(page.getByText(/les ordres en argent réel sont indisponibles/i)).toBeVisible();
  });

  test('page has correct meta title', async ({ page }) => {
    const title = await page.title();
    expect(title.toLowerCase()).toContain('midas');
  });

  test('le marché est visible sans inscription', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Marchés', exact: true })).toBeVisible();
  });

  test('mention aucune clé API collectée', async ({ page }) => {
    await expect(page.getByText(/ne se connecte à aucun exchange/i)).toBeVisible();
  });

  test('recherche et filtre se combinent', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Marché' }).selectOption('Cryptos');
    await page.getByRole('searchbox').fill('eth');
    await expect(page.getByRole('link', { name: /ETH\/EUR/ })).toBeVisible();
    await page.getByRole('searchbox').fill('airbus');
    await expect(page.getByText(/Aucun résultat/)).toBeVisible();
  });

  test('CTA register + lien disclaimer existent', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Mon espace/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Lire l’avertissement/ })).toBeVisible();
  });

  test('compare deux offres sans compte depuis le lien manuel', async ({ page }) => {
    await page.getByRole('link', { name: 'Comparer un ordre manuel' }).click();
    await expect(page).toHaveURL(/\/#comparer-les-couts$/);
    const comparison = page.getByRole('region', { name: 'Comparer le coût de deux offres' });
    const costs = comparison.getByRole('row', { name: /Coût de l’aller-retour/ }).getByRole('cell');
    await expect(costs.nth(0)).toContainText('2,20');
    await expect(costs.nth(1)).toContainText('0,80');
    await comparison.getByLabel('Quantité d’unités').fill('2');
    await expect(costs.nth(0)).toContainText('2,40');
    await expect(costs.nth(1)).toContainText('1,60');
    await comparison.getByLabel('Quantité d’unités').fill('0');
    await expect(costs.nth(0)).toHaveText('—');
    await expect(costs.nth(1)).toHaveText('—');
  });

  test('EUR/USD compare les dollars par euro et le favori survit au rechargement', async ({ page }) => {
    await page.getByRole('searchbox').fill('eurusd');
    await page.getByRole('link', { name: /Forex EUR\/USD/ }).click();
    await page.getByRole('button', { name: /Définir comme favori/ }).click();
    await page.getByRole('link', { name: 'Comparer les offres pour EUR/USD' }).click();
    const offer = page.getByRole('group', { name: 'Offre A' });
    await expect(offer.getByLabel('Prix unitaire d’achat (USD)')).toHaveValue('');
    await page.getByLabel('Quantité d’unités').fill('100');
    await offer.getByLabel('Prix unitaire d’achat (USD)').fill('1,10');
    await offer.getByLabel('Prix unitaire de vente (USD)').fill('1,09');
    await expect(page.getByRole('row', { name: /Achat · montant débité/ }).getByRole('cell').first()).toContainText('110,00');
    await expect(page.getByRole('row', { name: /Coût de l’aller-retour/ }).getByRole('cell').first()).toContainText('1,00');
    await page.reload();
    await page.getByRole('link', { name: 'Mon favori · EUR/USD' }).click();
    await expect(page.getByRole('button', { name: /Retirer des favoris/ })).toBeVisible();
  });

  test('explique le mandat automatique depuis l’accueil', async ({ page }) => {
    const mode = page.getByText('Comprendre le mode automatique', { exact: true });
    const info = page.getByText('Dans le parcours envisagé', { exact: false });
    await expect(info).toBeHidden();
    await mode.focus();
    await mode.press('Enter');
    await expect(info).toBeVisible();
    await expect(page.getByText('en argent réel est indisponible', { exact: false })).toBeVisible();
    await mode.press('Enter');
    await expect(info).toBeHidden();
  });

  test('distingue les deux modes et conserve la main à l’utilisateur en assisté', async ({ page }) => {
    const modes = page.getByRole('region', { name: 'Modes MIDAS' });
    await expect(modes.getByRole('article')).toHaveCount(2);
    const assisted = modes.getByTestId('midas-assisted-mode');
    await expect(assisted.getByRole('heading', { name: 'Assisté — je passe mes ordres' })).toBeVisible();
    await expect(assisted).toContainText('Tu ouvres, modifies et fermes chaque position toi-même.');
    await expect(assisted).toContainText('Lire ou valider une alerte ne transmet aucun ordre.');
    await expect(assisted).toContainText('Les alertes de trading en direct sont indisponibles.');
    await expect(modes.getByRole('heading', { name: 'Automatique — MIDAS exécute' })).toBeVisible();
    const alertDetails = assisted.getByText('Comprendre les alertes', { exact: true });
    const exitExplanation = assisted.getByText('Une alerte de sortie restera une recommandation', { exact: false });
    await expect(exitExplanation).toBeHidden();
    await alertDetails.focus();
    await alertDetails.press('Enter');
    await expect(exitExplanation).toBeVisible();
    await expect(assisted.getByText('Une alerte devra préciser', { exact: false })).toBeVisible();
    await alertDetails.press('Enter');
    await expect(exitExplanation).toBeHidden();
  });

  test('consulter les deux modes et comparer ne déclenche aucune écriture ni demande d’ordre', async ({ page }) => {
    const unexpectedRequests: string[] = [];
    page.on('request', (request) => {
      const pathname = new URL(request.url()).pathname;
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) || /^\/api\/(trade|bot|signals|exchange|agents)(\/|$)/.test(pathname)) {
        unexpectedRequests.push(`${request.method()} ${pathname}`);
      }
    });
    await page.getByText('Comprendre les alertes', { exact: true }).click();
    await page.getByText('Comprendre le mode automatique', { exact: true }).click();
    await page.getByRole('link', { name: 'Comparer un ordre manuel' }).click();
    await expect(page).toHaveURL(/\/#comparer-les-couts$/);
    expect(unexpectedRequests).toEqual([]);
  });

  test('footer légal : CGU, CGV, Confidentialité, Mentions légales', async ({ page }) => {
    for (const label of ['CGU', 'CGV', 'Confidentialité', 'Mentions légales']) {
      await expect(page.getByRole('link', { name: label, exact: true })).toBeVisible();
    }
  });

  test('responsive: mobile 375px affiche le H1 sans overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('responsive: desktop 1440px sans sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('main > section').first()).toBeVisible();
    await expect(page.locator('aside, nav[data-testid="sidebar"]')).toHaveCount(0);
  });

  test('page scrolls to bottom without error', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    const scrollTop = await page.evaluate(() => window.scrollY);
    expect(scrollTop).toBeGreaterThan(50);
  });
});
