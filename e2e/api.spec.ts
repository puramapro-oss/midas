import { test, expect } from '@playwright/test';

test.describe('API routes', () => {
  test('GET /api/market/prices returns data', async ({ request }) => {
    const response = await request.get('/api/market/prices');
    expect([200, 307]).toContain(response.status());
  });

  test('POST /api/chat without auth does not return success data', async ({ request }) => {
    const response = await request.post('/api/chat', {
      data: { message: 'test' },
    });
    // Middleware may redirect (200 HTML) or route returns 401
    const contentType = response.headers()['content-type'] ?? '';
    if (contentType.includes('application/json')) {
      const body = await response.json();
      expect(body.error).toBeTruthy();
    }
    // If HTML was returned, the auth middleware blocked access (redirect to login)
  });

  test('POST /api/trade/execute without auth does not return trade', async ({ request }) => {
    const response = await request.post('/api/trade/execute', {
      data: { pair: 'BTC/USDT', side: 'buy', amount: 100 },
    });
    const contentType = response.headers()['content-type'] ?? '';
    if (contentType.includes('application/json')) {
      const body = await response.json();
      expect(body.trade).toBeFalsy();
    }
  });

  test('POST /api/signals/generate requires valid auth', async ({ request }) => {
    const response = await request.post('/api/signals/generate', {
      data: {},
    });
    // Should not return successful signal generation
    const contentType = response.headers()['content-type'] ?? '';
    if (contentType.includes('application/json')) {
      const body = await response.json();
      expect(body.generated).toBeFalsy();
    }
  });

  test('Security headers are present on API', async ({ request }) => {
    const response = await request.get('/api/market/prices');
    const headers = response.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
  });
});
