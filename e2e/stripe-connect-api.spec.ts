// =============================================================================
// MIDAS — E2E pour les routes /api/connect/* (V4.1)
// Tests sur serveur dev live. Couvre les garde-fous auth et les shapes JSON.
// =============================================================================

import { test, expect } from '@playwright/test';

test.describe('/api/connect/onboard', () => {
  test('POST sans auth → 401 + message FR', async ({ request }) => {
    const response = await request.post('/api/connect/onboard', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Non autorisé');
  });

  test('GET → 405 (méthode non supportée)', async ({ request }) => {
    const response = await request.get('/api/connect/onboard');
    // Next.js App Router : route POST-only renvoie 405 sur GET
    expect(response.status()).toBe(405);
  });
});

test.describe('/api/connect/account-session', () => {
  test('POST sans auth → 401 + message FR', async ({ request }) => {
    const response = await request.post('/api/connect/account-session', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Non autorisé');
  });

  test('GET → 405 (méthode non supportée)', async ({ request }) => {
    const response = await request.get('/api/connect/account-session');
    expect(response.status()).toBe(405);
  });
});

test.describe('/api/connect/status', () => {
  test('GET sans auth → 401 + message FR', async ({ request }) => {
    const response = await request.get('/api/connect/status');
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Non autorisé');
  });

  test('POST → 405 (méthode non supportée)', async ({ request }) => {
    const response = await request.post('/api/connect/status', { data: {} });
    expect(response.status()).toBe(405);
  });
});
