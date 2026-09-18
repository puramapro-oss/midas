// =============================================================================
// MIDAS — E2E /api/connect/withdraw + /api/wallet/balance
// NIYAMA D1=C (Tissma 2026-09-05) : retraits et Stripe Connect inaccessibles.
// - /api/connect/* → 403 éducation-only par le middleware, toute méthode.
// - /compte/* → 307 vers /dashboard/help (page d'aide), authentifié ou non.
// Le path happy (retrait réussi) restera bloqué tant que D1=C s'applique ;
// les gardes internes (paliers anti-fraude, phone gate) restent testées en
// unitaire côté src/lib (voir ANTIFRAUD-INTEGRATION.md).
// =============================================================================

import { test, expect } from '@playwright/test';

test.describe('/api/connect/withdraw — bloqué NIYAMA D1=C (403 avant route)', () => {
  test('POST sans auth → 403 éducation-only', async ({ request }) => {
    const response = await request.post('/api/connect/withdraw', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("limité à l’information générale");
  });

  test('GET → 403 éducation-only (garde avant route)', async ({ request }) => {
    const response = await request.get('/api/connect/withdraw');
    expect(response.status()).toBe(403);
  });

  test('PUT → 403 éducation-only (garde avant route)', async ({ request }) => {
    const response = await request.put('/api/connect/withdraw', { data: {} });
    expect(response.status()).toBe(403);
  });

  test('DELETE → 403 éducation-only (garde avant route)', async ({ request }) => {
    const response = await request.delete('/api/connect/withdraw');
    expect(response.status()).toBe(403);
  });

  test('POST amount_eur négatif sans auth → 403 (garde NIYAMA avant Zod)', async ({
    request,
  }) => {
    const response = await request.post('/api/connect/withdraw', {
      data: { amount_eur: -10 },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(403);
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

test.describe('/compte/connect — hub neutralisé NIYAMA D1=C', () => {
  test('GET /compte/connect anonyme → neutralisé, atterrit sur /login (next=/dashboard/help)', async ({ page }) => {
    await page.goto('/compte/connect');
    await expect(page).toHaveURL(/\/login/);
    await expect(page).not.toHaveURL(/compte/);
  });
});
