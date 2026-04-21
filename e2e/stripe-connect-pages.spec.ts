// =============================================================================
// MIDAS — E2E pages /compte/* (V4.1)
// Vérifie que les 7 pages Stripe Connect Embedded redirigent vers /login
// quand l'user n'est pas authentifié. Le contenu des pages (composants Stripe
// embarqués) nécessite un compte réel et sera couvert par tests manuels en
// staging.
// =============================================================================

import { test, expect } from '@playwright/test';

const CONNECT_PAGES = [
  'configuration',
  'gestion',
  'virements',
  'paiements',
  'soldes',
  'documents',
  'notifications',
] as const;

for (const slug of CONNECT_PAGES) {
  test(`GET /compte/${slug} sans auth → redirect /login?next=/compte/${slug}`, async ({
    page,
  }) => {
    const response = await page.goto(`/compte/${slug}`);
    // Suit la redirection : l'URL finale doit contenir /login avec ?next=
    await expect(page).toHaveURL(new RegExp(`/login\\?next=%2Fcompte%2F${slug}$`));
    // Le status final du document après redirection est 200 (page login)
    expect(response?.status()).toBe(200);
  });
}
