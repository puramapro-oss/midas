import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ baseURL }) => {
  expect(process.env.MIDAS_E2E_ISOLATED).toBe('1');
  expect(baseURL).toBe('http://127.0.0.1:3000');
});

async function openPublic(page: Page, path: string) {
  await page.addInitScript(() => localStorage.setItem('midas-cookie-consent',
    JSON.stringify({ necessary: true, analytics: false, performance: false })));
  const response = await page.goto(path);
  expect(response?.status()).toBe(200);
  await expect(page.locator('h1').first()).toBeVisible();
}

test.describe('Current public links and actual CTA navigation', () => {
  for (const path of ['/', '/pricing', '/login', '/register']) {
    test(`${path} has a nonempty set of working same-origin links`, async ({ page, request, baseURL }) => {
      await openPublic(page, path);
      const links = await page.locator('a[href]').evaluateAll(elements => [...new Set(elements
        .map(element => (element as HTMLAnchorElement).href)
        .filter(href => {
          const url = new URL(href);
          return url.origin === location.origin && !url.hash;
        }))]);
      expect(links.length).toBeGreaterThan(0);
      for (const href of links) {
        expect(new URL(href).origin).toBe(baseURL);
        const response = await request.get(href, { maxRedirects: 0 });
        expect(response.status(), `${path} → ${href}`).toBe(200);
        expect(response.headers()['content-type']).toContain('text/html');
      }
    });
  }

  for (const [name, target, heading] of [
    ['Accéder à l’espace éducatif', '/register', 'MIDAS'],
    ['Lire l’avertissement', '/legal/disclaimer', 'Avertissement sur les risques'],
  ]) {
    test(`landing CTA ${name} reaches its current destination`, async ({ page, baseURL }) => {
      await openPublic(page, '/');
      await page.getByRole('link', { name, exact: true }).click();
      await expect(page).toHaveURL(`${baseURL}${target}`);
      await expect(page.locator('h1')).toHaveText(heading);
    });
  }

  test('registration keeps its three current legal destinations', async ({ page }) => {
    await openPublic(page, '/register');
    for (const [id, href] of [['cgu-link', '/legal/cgu'], ['cgv-link', '/legal/cgv'], ['privacy-link', '/legal/privacy']]) {
      await expect(page.getByTestId(id)).toBeVisible();
      await expect(page.getByTestId(id)).toHaveAttribute('href', href);
    }
  });
});

test.describe('Local forms without account creation or external messages', () => {
  test('contact validates empty and short input in French before any POST', async ({ page }) => {
    const posts: string[] = [];
    page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
    await openPublic(page, '/contact');
    await page.getByRole('button', { name: 'Envoyer le message', exact: true }).click();
    for (const message of ['Le nom est requis', "L'email est requis", 'Le sujet est requis', 'Le message est requis']) {
      await expect(page.getByText(message, { exact: true })).toBeVisible();
    }
    await page.locator('#contact-name').fill('Local fixture');
    await page.locator('#contact-email').fill('local-fixture@example.invalid');
    await page.locator('#contact-subject').fill('Validation locale');
    await page.locator('#contact-message').fill('court');
    await page.getByRole('button', { name: 'Envoyer le message', exact: true }).click();
    await expect(page.getByText('Le message doit faire au moins 10 caractères', { exact: true })).toBeVisible();
    expect(posts).toEqual([]);
  });

  test('login password visibility toggles without changing its value', async ({ page }) => {
    await openPublic(page, '/login');
    const input = page.getByTestId('password-input');
    await input.fill('local-visibility-fixture');
    await expect(input).toHaveAttribute('type', 'password');
    await page.getByTestId('toggle-password').click();
    await expect(input).toHaveAttribute('type', 'text');
    await expect(input).toHaveValue('local-visibility-fixture');
    await page.getByTestId('toggle-password').click();
    await expect(input).toHaveAttribute('type', 'password');
    await expect(input).toHaveValue('local-visibility-fixture');
  });

  test('forgot-password rejects an invalid email locally without sending recovery', async ({ page, baseURL }) => {
    const posts: string[] = [];
    page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
    await openPublic(page, '/forgot-password');
    const input = page.getByTestId('forgot-email-input');
    await expect(input).toHaveAttribute('required', '');
    await expect(page.getByTestId('forgot-submit')).toBeDisabled();
    await input.fill('not-an-email');
    expect(await input.evaluate(element => (element as HTMLInputElement).checkValidity())).toBe(false);
    await page.getByTestId('forgot-submit').click();
    await expect(page).toHaveURL(`${baseURL}/forgot-password`);
    expect(posts).toEqual([]);
    await page.locator('a[href="/login"]').first().click();
    await expect(page).toHaveURL(`${baseURL}/login`);
    await expect(page.getByTestId('login-button')).toBeVisible();
  });

  test('registration displays and stores a synthetic referral without creating an account', async ({ page }) => {
    await openPublic(page, '/register?ref=midas-local-fixture');
    await expect(page.getByText('Code de parrainage : midas-local-fixture', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('midas_referral_code'))).toBe('midas-local-fixture');
  });

  test('anonymous educational onboarding reaches login without completing an account', async ({ page, baseURL }) => {
    const completions: string[] = [];
    page.on('request', request => {
      if (new URL(request.url()).pathname === '/api/onboarding/complete') completions.push(request.method());
    });
    await openPublic(page, '/onboarding');
    await expect(page.locator('h1')).toHaveText('Comprendre les marchés avec MIDAS');
    await expect(page.locator('main')).toContainText('Aucune connexion d’exchange, aucune clé API et aucun ordre réel.');
    await expect(page.locator('input')).toHaveCount(0);
    await page.getByTestId('activate-midas').click();
    const target = new URL('/login', baseURL!);
    target.searchParams.set('next', '/dashboard');
    await expect(page).toHaveURL(target.href);
    await expect(page.getByTestId('login-button')).toBeVisible();
    await expect(page.locator('aside')).toHaveCount(0);
    expect(completions).toEqual([]);
  });
});

test.describe('Current public appearance contracts', () => {
  for (const path of ['/', '/pricing', '/login', '/status']) {
    test(`${path} renders without the retired particle canvases`, async ({ page }) => {
      await openPublic(page, path);
      await expect(page.locator('#midas-particles, #midas-particles-dashboard, #tsparticles')).toHaveCount(0);
    });
  }

  for (const [theme, variable, background] of [
    ['dark', '#06080F', 'rgb(6, 8, 15)'], ['oled', '#000000', 'rgb(0, 0, 0)'],
    ['light', '#F5F5F0', 'rgb(245, 245, 240)'],
  ]) {
    test(`saved ${theme} theme initializes the actual CSS variables`, async ({ page }) => {
      await page.addInitScript(value => localStorage.setItem('midas-theme', value), theme);
      await openPublic(page, '/login');
      const readBackground = () => page.evaluate(() => getComputedStyle(document.documentElement)
        .getPropertyValue('--bg-primary').trim().toUpperCase());
      await expect.poll(readBackground).toBe(variable);
      expect(await page.locator('html').getAttribute('data-theme')).toBe(theme === 'dark' ? null : theme);
      await expect(page.locator('div.min-h-screen').first()).toHaveCSS('background-color', background);
      await page.reload();
      await expect.poll(readBackground).toBe(variable);
    });
  }

  test('the landing retains its explicit dark background and visible educational copy', async ({ page }) => {
    await openPublic(page, '/');
    await expect(page.locator('main')).toHaveCSS('background-color', 'rgb(6, 8, 15)');
    expect(await page.locator('main').innerText()).not.toMatch(/Lorem ipsum|TODO|\\u[0-9a-f]{4}/i);
  });
});

test.describe('Current legal copy is rendered, without legal certification', () => {
  const pages = [
    { path: '/legal/mentions', heading: 'Mentions Legales', fragments: ['PURAMA SASU', 'SIRET : 941 200 105 00011', 'contact@purama.dev'] },
    { path: '/legal/privacy', heading: 'Politique de Confidentialité', fragments: ['PURAMA SASU', 'rectification, effacement', 'CNIL', 'aucune clé'] },
    { path: '/legal/cgu', heading: 'Conditions Générales d’Utilisation', fragments: ['PURAMA SASU', 'aucune exécution', 'aucun abonnement propre'] },
    { path: '/legal/cgv', heading: 'Conditions Générales de Vente', fragments: ['PURAMA SASU', 'Aucun abonnement MIDAS distinct', 'simulation éducative'] },
  ];
  for (const { path, heading, fragments } of pages) {
    test(`${path} displays the current publisher and service statements`, async ({ page }) => {
      await openPublic(page, path);
      const actualHeading = (await page.locator('h1').innerText()).replaceAll("'", '’');
      expect(actualHeading).toBe(heading);
      const visibleText = await page.locator('body').innerText();
      for (const fragment of fragments) expect(visibleText).toContain(fragment);
    });
  }
});

test.describe('Real cookie choices persist only the local anonymous preference', () => {
  const choices = [
    { choice: 'accept', analytics: true, performance: true },
    { choice: 'refuse', analytics: false, performance: false },
    { choice: 'custom', analytics: true, performance: false },
  ];
  for (const { choice, analytics, performance } of choices) {
    test(`${choice} persists the exact preferences and remains dismissed after reload`, async ({ page, baseURL }) => {
      await page.goto('/');
      await expect(page.getByTestId('cookie-banner')).toBeVisible();
      const synced = page.waitForResponse(response => response.request().method() === 'POST' &&
        response.url() === `${baseURL}/api/legal/cookie-consent`);
      if (choice === 'custom') {
        await page.getByTestId('cookie-customize-toggle').click();
        await page.getByTestId('cookie-analytics-toggle').click();
        await page.getByTestId('cookie-save-custom').click();
      } else {
        await page.getByTestId(`cookie-${choice}`).click();
      }
      const response = await synced;
      expect(response.request().postDataJSON()).toEqual({ mesure: analytics, marketing: performance });
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({ ok: true, synced: false });
      await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('midas-cookie-consent')!)))
        .toEqual({ necessary: true, analytics, performance });
      await expect(page.getByTestId('cookie-banner')).toHaveCount(0);
      await page.reload();
      // The component intentionally waits 1000ms before showing a missing choice.
      await page.waitForTimeout(1250);
      await expect(page.getByTestId('cookie-banner')).toHaveCount(0);
    });
  }
});
