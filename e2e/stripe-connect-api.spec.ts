// =============================================================================
// MIDAS — E2E pour les routes /api/connect/* (NIYAMA D1=C)
// D1=C (Tissma 2026-09-05) : retraits/KYC/Stripe Connect inaccessibles.
// Le middleware (EDUCATION_ONLY_API_PREFIXES '/api/connect/') répond 403
// éducation-only pour TOUTE méthode, AVANT d'atteindre la route. Ces tests
// verrouillent ce contrat — si un 401/405 réapparaît, la garde NIYAMA a
// régressé.
// =============================================================================

import { test, expect } from '@playwright/test';


test.describe('/api/connect/onboard — bloqué NIYAMA D1=C', () => {
  test('POST sans auth → 403 éducation-only', async ({ request }) => {
    const response = await request.post('/api/connect/onboard', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("limité à l’information générale");
  });

  test('GET → 403 éducation-only (garde avant route)', async ({ request }) => {
    const response = await request.get('/api/connect/onboard');
    expect(response.status()).toBe(403);
  });
});

test.describe('/api/connect/account-session — bloqué NIYAMA D1=C', () => {
  test('POST sans auth → 403 éducation-only', async ({ request }) => {
    const response = await request.post('/api/connect/account-session', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("limité à l’information générale");
  });

  test('GET → 403 éducation-only (garde avant route)', async ({ request }) => {
    const response = await request.get('/api/connect/account-session');
    expect(response.status()).toBe(403);
  });
});

test.describe('/api/connect/status — bloqué NIYAMA D1=C', () => {
  test('GET sans auth → 403 éducation-only', async ({ request }) => {
    const response = await request.get('/api/connect/status');
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("limité à l’information générale");
  });

  test('POST → 403 éducation-only (garde avant route)', async ({ request }) => {
    const response = await request.post('/api/connect/status', { data: {} });
    expect(response.status()).toBe(403);
  });
});

test.describe('/api/connect/withdraw — bloqué NIYAMA D1=C', () => {
  test('POST → 403 éducation-only avant tout débit', async ({ request }) => {
    const response = await request.post('/api/connect/withdraw', {
      data: { amount_eur: 50 },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("limité à l’information générale");
  });
});
