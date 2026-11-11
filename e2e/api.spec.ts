import { test, expect } from '@playwright/test';

test.describe('API routes', () => {
  test('GET /api/market/prices returns data', async ({ request }) => {
    const response = await request.get('/api/market/prices');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    const body = await response.json();
    expect(body).toHaveProperty('prices');
    if (process.env.MIDAS_E2E_ISOLATED === '1') {
      expect(Object.keys(body.prices)).toEqual(['bitcoin', 'ethereum', 'solana', 'cardano', 'polkadot', 'chainlink', 'avalanche-2', 'polygon']);
      expect(body.prices.bitcoin).toEqual({ usd: 100, usd_24h_change: -3, usd_24h_vol: 1000 });
      expect(body.prices.polygon).toEqual({ usd: 107, usd_24h_change: 4, usd_24h_vol: 1007 });
    }
  });

  test('POST /api/chat without auth does not return success data', async ({ request }) => {
    const response = await request.post('/api/chat', {
      data: { message: 'test' },
    });
    expect(response.status()).toBe(401);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(await response.json()).toEqual({ error: 'Non autorise' });
  });

  test('POST /api/trade/execute without auth does not return trade', async ({ request }) => {
    const response = await request.post('/api/trade/execute', {
      data: { pair: 'BTC/USDT', side: 'buy', amount: 100 },
    });
    expect(response.status()).toBe(403);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(await response.json()).toEqual({ error: 'MIDAS est limité à l’information générale et à la simulation éducative.' });
  });

  test('POST /api/signals/generate requires valid auth', async ({ request }) => {
    const response = await request.post('/api/signals/generate', {
      data: {},
    });
    expect(response.status()).toBe(403);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(await response.json()).toEqual({ error: 'MIDAS est limité à l’information générale et à la simulation éducative.' });
  });

  test('Security headers are present on API', async ({ request }) => {
    const response = await request.get('/api/market/prices');
    const headers = response.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
  });
});
