// =============================================================================
// MIDAS — E2E /api/stripe/webhook garde-fous sécurité (V4.1)
// Vérifie que le webhook refuse toute requête sans signature Stripe valide.
// Les cases métier (invoice.paid, account.updated, etc.) sont couvertes par
// les tests unitaires et les tests d'intégration Stripe CLI en staging.
// =============================================================================

import { test, expect } from '@playwright/test';

test.describe('/api/stripe/webhook — sécurité signature', () => {
  test('POST sans header stripe-signature → 400 "Signature manquante"', async ({
    request,
  }) => {
    const response = await request.post('/api/stripe/webhook', {
      data: JSON.stringify({ type: 'account.updated', data: { object: {} } }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Signature manquante');
  });

  test('POST avec signature invalide → 400 "Signature invalide"', async ({
    request,
  }) => {
    const response = await request.post('/api/stripe/webhook', {
      data: JSON.stringify({ type: 'account.updated', data: { object: {} } }),
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=1,v1=definitely-not-a-real-signature',
      },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Signature invalide');
  });
});
