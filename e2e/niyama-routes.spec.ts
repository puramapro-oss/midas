import { test, expect, type APIResponse } from '@playwright/test';
import { expectJsonResponse } from './helpers';

// These contracts exercise the current middleware and anonymous route branches.
// They do not restore the retired promotional, trading or authenticated flows.
test.beforeEach(async ({ baseURL }) => {
  expect(process.env.MIDAS_E2E_ISOLATED).toBe('1');
  expect(baseURL).toBe('http://127.0.0.1:3000');
});

function expectRedirect(response: APIResponse, origin: string, path: string, status = 307) {
  expect(response.status()).toBe(status);
  const location = response.headers().location;
  expect(location).toBeTruthy();
  expect(new URL(location, origin).href).toBe(new URL(path, origin).href);
}

test.describe('Current permanent public aliases', () => {
  const aliases = [
    ['/signup', '/register'], ['/mentions-legales', '/legal/mentions'],
    ['/politique-confidentialite', '/legal/privacy'], ['/cgv', '/legal/cgv'], ['/cgu', '/legal/cgu'],
  ];
  for (const [alias, target] of aliases) {
    test(`${alias} redirects 308 to ${target}, which returns HTML 200`, async ({ request, baseURL }) => {
      expectRedirect(await request.get(alias, { maxRedirects: 0 }), baseURL!, target, 308);
      const response = await request.get(target, { maxRedirects: 0 });
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('text/html');
    });
  }
});

test.describe('Retired public flows return home without promotional state', () => {
  const paths = ['/how-it-works', '/ecosystem', '/partenariat', '/fiscal', '/financer', '/subscribe',
    '/confirmation', '/partenariat/local-fixture', '/go/midas', '/p/local-fixture', '/scan/local-fixture'];
  for (const path of paths) {
    test(`${path} clears the query and returns home`, async ({ request, baseURL }) => {
      const response = await request.get(`${path}?coupon=WELCOME50&ref=local-fixture`, { maxRedirects: 0 });
      expectRedirect(response, baseURL!, '/');
      expect(response.headers()['set-cookie'] ?? '').not.toContain('purama_promo');
      const state = await request.storageState();
      expect(state.cookies.some(cookie => cookie.name === 'purama_promo')).toBe(false);
    });
  }
});

test.describe('Retired private flows redirect to educational help first', () => {
  const paths = ['/dashboard/trading', '/dashboard/signals', '/dashboard/bots', '/dashboard/copy-trading',
    '/dashboard/earn', '/dashboard/portfolio', '/dashboard/agents', '/dashboard/analysis', '/dashboard/wealth',
    '/dashboard/settings/exchanges', '/dashboard/settings/abonnement', '/dashboard/help/connect-binance',
    '/dashboard/help/referral-wallet', '/dashboard/help/shield', '/dashboard/help/strategies',
    '/dashboard/guide', '/dashboard/referral', '/dashboard/partenaire', '/dashboard/boutique',
    '/dashboard/wallet', '/dashboard/kyc', '/dashboard/tax', '/compte/connect', '/admin/withdrawals'];
  for (const path of paths) {
    test(`${path} returns the exact NIYAMA first hop`, async ({ request, baseURL }) => {
      expectRedirect(await request.get(path, { maxRedirects: 0 }), baseURL!, '/dashboard/help');
    });
  }
});

test.describe('Anonymous access guards on retained private routes', () => {
  const paths = ['/dashboard/contest', '/dashboard/challenges', '/dashboard/share', '/dashboard/gratitude',
    '/dashboard/breathing', '/dashboard/buddies', '/dashboard/stories', '/dashboard/settings',
    '/dashboard/help', '/dashboard/help/faq', '/admin/users', '/admin/monitoring', '/admin/financement'];
  for (const path of paths) {
    test(`${path} returns login with the exact next pathname`, async ({ request, baseURL }) => {
      const target = new URL('/login', baseURL!);
      target.searchParams.set('next', path);
      expectRedirect(await request.get(path, { maxRedirects: 0 }), baseURL!, target.href);
      // A guard is not proof that the authenticated page exists or functions.
    });
  }
});

test.describe('NIYAMA API refusals replace obsolete authentication expectations', () => {
  const paths = ['/api/referral/stats', '/api/review-prompt', '/api/kyc', '/api/copy-trading', '/api/earn/positions'];
  for (const path of paths) {
    test(`GET ${path} returns the educational 403 contract`, async ({ request }) => {
      await expectJsonResponse(await request.get(path), 403,
        'MIDAS est limité à l’information générale et à la simulation éducative.');
    });
  }
  test('POST review-prompt also returns the educational refusal', async ({ request }) => {
    await expectJsonResponse(await request.post('/api/review-prompt', { data: {} }), 403,
      'MIDAS est limité à l’information générale et à la simulation éducative.');
  });
});

test.describe('Previously unqualified anonymous API branches', () => {
  const routes = [
    ['/api/gratitude', 'Non autorise'], ['/api/breathing', 'Non autorise'],
    ['/api/community/buddy', 'Non autorise'], ['/api/golden-hour', 'Non autorise'],
    ['/api/mentorship', 'Non autorise'], ['/api/community-goals', 'Non autorise'],
    ['/api/collaborative-missions', 'Non autorise'], ['/api/ceremonies', 'Non autorise'],
    ['/api/challenges', 'Non autorisé'], ['/api/share', 'Non autorisé'],
    ['/api/community/wall', 'Non autorisé'], ['/api/community/circles', 'Non autorisé'],
    ['/api/notifications/preferences', 'Non autorisé'],
  ];
  for (const [path, error] of routes) {
    test(`GET ${path} refuses anonymously with exact JSON`, async ({ request }) => {
      await expectJsonResponse(await request.get(path), 401, error);
    });
  }
  for (const path of ['/api/gratitude', '/api/breathing', '/api/cross-promo/click']) {
    test(`POST ${path} refuses before any authenticated mutation`, async ({ request }) => {
      await expectJsonResponse(await request.post(path, { data: {} }), 401, 'Non autorise');
    });
  }
});

test.describe('OAuth callback without a code is entirely local', () => {
  for (const suffix of ['', '?next=https://example.invalid/away', '?next=//example.invalid/away']) {
    test(`missing code ignores unsafe continuation ${suffix || '(absent)'}`, async ({ request, baseURL }) => {
      const response = await request.get(`/api/auth/callback${suffix}`, { maxRedirects: 0 });
      expectRedirect(response, baseURL!, '/login?error=missing_code');
    });
  }
});
