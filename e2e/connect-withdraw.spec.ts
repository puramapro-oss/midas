// =============================================================================
// MIDAS — E2E /api/connect/withdraw + /api/wallet/balance (V4.1 Axe 3)
// Tests sur serveur dev live. Couvre auth guards, Zod validation, 405.
// Le path happy (retrait réussi) nécessite un compte Stripe Connect + balance
// réels et sera couvert en staging manuel / tests intégration dédiés.
// =============================================================================

import { test, expect } from '@playwright/test';

test.describe('/api/connect/withdraw — auth + validation', () => {
  test('POST sans auth → 401 + message FR', async ({ request }) => {
    const response = await request.post('/api/connect/withdraw', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Non autorisé');
  });

  test('GET → 405 (méthode non supportée)', async ({ request }) => {
    const response = await request.get('/api/connect/withdraw');
    expect(response.status()).toBe(405);
  });

  test('PUT → 405 (méthode non supportée)', async ({ request }) => {
    const response = await request.put('/api/connect/withdraw', { data: {} });
    expect(response.status()).toBe(405);
  });

  test('DELETE → 405 (méthode non supportée)', async ({ request }) => {
    const response = await request.delete('/api/connect/withdraw');
    expect(response.status()).toBe(405);
  });

  // Zod validation : le body est parsé AVANT l'auth check dans ce handler ?
  // Non — auth check en premier. Donc ces cas restent en 401 sans auth.
  // Pour tester Zod il faudrait un user auth ; cas couvert en staging.
  test('POST body avec amount_eur négatif sans auth → 401 (auth first)', async ({
    request,
  }) => {
    const response = await request.post('/api/connect/withdraw', {
      data: { amount_eur: -10 },
      headers: { 'Content-Type': 'application/json' },
    });
    // Le auth guard passe avant Zod → 401 attendu sans session
    expect(response.status()).toBe(401);
  });
});

test.describe('/api/wallet/balance — auth + méthodes', () => {
  test('GET sans auth → 401 + message FR', async ({ request }) => {
    const response = await request.get('/api/wallet/balance');
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Non autorisé');
  });

  test('POST → 405 (méthode non supportée)', async ({ request }) => {
    const response = await request.post('/api/wallet/balance', { data: {} });
    expect(response.status()).toBe(405);
  });
});

test.describe('/compte/connect — hub page redirect quand non-auth', () => {
  test('GET /compte/connect sans auth → redirect /login?next=/compte/connect', async ({
    page,
  }) => {
    const response = await page.goto('/compte/connect');
    await expect(page).toHaveURL(/\/login\?next=%2Fcompte%2Fconnect$/);
    expect(response?.status()).toBe(200);
  });
});
