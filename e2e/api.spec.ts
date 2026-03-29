import { test, expect } from '@playwright/test';

test.describe('API routes', () => {
  test('GET /api/market/prices returns 200 with prices', async ({ request }) => {
    const response = await request.get('/api/market/prices');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toBeTruthy();
    expect(typeof body).toBe('object');
  });

  test('POST /api/chat without auth returns 401', async ({ request }) => {
    const response = await request.post('/api/chat', {
      data: { message: 'test' },
    });
    expect(response.status()).toBe(401);
  });

  test('POST /api/trade/execute without auth returns 401', async ({ request }) => {
    const response = await request.post('/api/trade/execute', {
      data: { pair: 'BTC/USDT', side: 'buy', amount: 100 },
    });
    expect(response.status()).toBe(401);
  });

  test('POST /api/signals/generate without CRON_SECRET returns 401', async ({ request }) => {
    const response = await request.post('/api/signals/generate', {
      data: {},
    });
    expect(response.status()).toBe(401);
  });

  test('POST /api/signals/generate with invalid CRON_SECRET returns 401', async ({ request }) => {
    const response = await request.post('/api/signals/generate', {
      headers: {
        authorization: 'Bearer invalid-secret',
      },
      data: {},
    });
    expect(response.status()).toBe(401);
  });
});
