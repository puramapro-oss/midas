import { test as base, expect, type Page, type Route } from '@playwright/test';

const ACCOUNT_A = 'a0000000-0000-4000-8000-000000000001';
const ACCOUNT_B = 'b0000000-0000-4000-8000-000000000002';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
type Notice = { id: string; title: string; body: string | null; read: boolean; created_at: string };
const notice = (n: number, title = `Alerte ${n}`, read = false): Notice => ({
  id: id(n), title, body: 'Analyse à examiner. Décision manuelle.', read,
  created_at: '2026-11-28T00:00:00.000Z',
});
type Preferences = { email_enabled: boolean; push_enabled: boolean; trading_signals: boolean; community_updates: boolean; marketing: boolean };
const defaults = (): Preferences => ({ email_enabled: true, push_enabled: true, trading_signals: true, community_updates: true, marketing: false });
type Call = { path: string; method: string; account: string; body?: Record<string, unknown> };
type Override = (route: Route, call: Call) => Promise<void>;
function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function holdResponse(json: unknown, status = 200) {
  const started = deferred();
  const release = deferred();
  const finished = deferred();
  return {
    started: started.promise,
    release: () => release.resolve(),
    finished: finished.promise,
    handle: async (route: Route) => {
      started.resolve();
      await release.promise;
      // AbortController may already have cancelled the original HTTP request.
      try { await route.fulfill({ status, json }); } finally { finished.resolve(); }
    },
  };
}

class MockServer {
  calls: Call[] = [];
  forbidden: string[] = [];
  notices: Record<string, Notice[]> = { [ACCOUNT_A]: [notice(1)], [ACCOUNT_B]: [notice(2, 'Compte B')] };
  preferences: Record<string, { preferences: Preferences; persisted: boolean }> = {
    [ACCOUNT_A]: { preferences: defaults(), persisted: true },
    [ACCOUNT_B]: { preferences: { ...defaults(), push_enabled: false }, persisted: true },
  };
  notificationGet?: Override;
  notificationPatch?: Override;
  preferenceGet?: Override;
  preferencePatch?: Override;

  snapshot(account: string) {
    const notifications = structuredClone(this.notices[account] ?? []);
    return { notifications, unread: notifications.filter((item) => !item.read).length };
  }
  acknowledge(call: Call) {
    this.notices[call.account] = (this.notices[call.account] ?? []).map((item) => (
      call.body?.all === true || (call.body?.ids as string[] | undefined)?.includes(item.id)
        ? { ...item, read: true } : item
    ));
  }
  save(call: Call) {
    const existing = this.preferences[call.account] ?? { preferences: defaults(), persisted: false };
    this.preferences[call.account] = { preferences: { ...existing.preferences, ...call.body } as Preferences, persisted: true };
    return structuredClone(this.preferences[call.account]);
  }
  async install(page: Page, initialAccount: string | null = ACCOUNT_A) {
    await page.addInitScript((account) => { (window as unknown as { __midasTestInitialAccount: string | null }).__midasTestInitialAccount = account; }, initialAccount);
    await page.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== 'http://127.0.0.1:3092') {
        this.forbidden.push(`${request.method()} ${url.origin}${url.pathname}`);
        await route.abort(); return;
      }
      if (!url.pathname.startsWith('/api/')) { await route.continue(); return; }
      if (!['/api/notifications', '/api/notifications/preferences'].includes(url.pathname)) {
        this.forbidden.push(`${request.method()} ${url.pathname}`);
        await route.abort(); return;
      }
      const call: Call = { path: url.pathname, method: request.method(), account: request.headers()['x-midas-account-id'] ?? '' };
      if (call.method === 'PATCH') call.body = request.postDataJSON();
      this.calls.push(call);
      if (!call.account || ![ACCOUNT_A, ACCOUNT_B].includes(call.account)) {
        await route.fulfill({ status: 409, json: { error: 'Wrong account' } }); return;
      }
      if (call.path === '/api/notifications' && call.method === 'GET') {
        if (this.notificationGet) { await this.notificationGet(route, call); return; }
        await route.fulfill({ json: this.snapshot(call.account) }); return;
      }
      if (call.path === '/api/notifications' && call.method === 'PATCH') {
        if (this.notificationPatch) { await this.notificationPatch(route, call); return; }
        this.acknowledge(call);
        await route.fulfill({ json: { ok: true } }); return;
      }
      if (call.path.endsWith('/preferences') && call.method === 'GET') {
        if (this.preferenceGet) { await this.preferenceGet(route, call); return; }
        await route.fulfill({ json: this.preferences[call.account] }); return;
      }
      if (call.path.endsWith('/preferences') && call.method === 'PATCH') {
        if (this.preferencePatch) { await this.preferencePatch(route, call); return; }
        await route.fulfill({ json: this.save(call) }); return;
      }
      this.forbidden.push(`${call.method} ${call.path}`);
      await route.abort();
    });
  }
}

const test = base.extend<{ server: MockServer }>({
  // Isolate browser resources per scenario and record the executable's actual
  // version instead of inferring it from a package name or a temporary path.
  context: async ({ playwright }, use, testInfo) => {
    const browser = await playwright.chromium.launch({
      ...(process.env.MIDAS_CHROMIUM_PATH ? { executablePath: process.env.MIDAS_CHROMIUM_PATH } : {}),
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    try {
      testInfo.annotations.push({ type: 'browser-version', description: browser.version() });
      const context = await browser.newContext({
        baseURL: 'http://127.0.0.1:3092', viewport: testInfo.project.use.viewport,
      });
      // Playwright's configured trace recorder also instruments this context.
      await use(context);
    } finally {
      await browser.close();
    }
  },
  server: async ({}, use) => {
    const server = new MockServer();
    await use(server);
    expect(server.forbidden, 'No trading endpoint or external transport may be contacted').toEqual([]);
  },
});
const bell = (page: Page) => page.getByTestId('notification-bell');
const panel = (page: Page) => page.getByTestId('notification-panel');
const prefs = (page: Page) => page.getByTestId('settings-notifications');
const email = (page: Page) => prefs(page).getByRole('switch', { name: /^Email/ });
const save = (page: Page) => page.getByTestId('notification-preferences-save');
async function ready(page: Page) {
  await page.goto('/');
  await expect(bell(page)).toBeEnabled();
  await expect(prefs(page).getByRole('switch')).toHaveCount(5);
}
async function openInbox(page: Page) {
  await bell(page).click();
  await expect(panel(page)).toBeVisible();
}
async function changeAccount(page: Page, account: string | null) {
  await page.evaluate((next) => {
    const control = (window as unknown as { __midasTestAccount?: (id: string | null) => void }).__midasTestAccount;
    if (!control) throw new Error('Auth fixture not initialized');
    control(next);
  }, account);
}

test('failed inbox GET is not an empty inbox and retry recovers', async ({ page, server }) => {
  server.notificationGet = async (route) => { await route.fulfill({ status: 500, json: { error: 'Unavailable' } }); };
  await server.install(page); await ready(page); await openInbox(page);
  await expect(panel(page).getByRole('alert')).toContainText('Impossible de charger');
  await expect(page.getByTestId('notification-empty')).toHaveCount(0);
  server.notificationGet = undefined;
  await panel(page).getByRole('button', { name: 'Réessayer', exact: true }).click();
  await expect(panel(page).getByText('Alerte 1', { exact: true })).toBeVisible();
  await expect(panel(page).getByRole('alert')).toHaveCount(0);
});

test('failed acknowledgement preserves unread state and offers retry', async ({ page, server }) => {
  server.notificationPatch = async (route) => { await route.fulfill({ status: 500, json: { error: 'Unavailable' } }); };
  await server.install(page); await ready(page); await openInbox(page);
  await panel(page).getByRole('button', { name: 'Marquer lu : Alerte 1', exact: true }).click();
  await expect(panel(page).getByRole('alert')).toContainText('La lecture n’a pas pu être confirmée');
  await expect(page.getByTestId('notification-badge')).toHaveText('1');
  await expect(panel(page).getByRole('button', { name: 'Marquer lu : Alerte 1', exact: true })).toBeEnabled();
});

test('two immediate clicks send one PATCH and re-read a newly arrived alert', async ({ page, server }) => {
  const pending = holdResponse({ ok: true });
  server.notificationPatch = async (route, call) => {
    server.acknowledge(call);
    server.notices[ACCOUNT_A].push(notice(3, 'Nouvelle alerte'));
    await pending.handle(route);
  };
  await server.install(page); await ready(page); await openInbox(page);
  await page.getByTestId('notification-mark-all').evaluate((element: HTMLButtonElement) => { element.click(); element.click(); });
  await pending.started;
  expect(server.calls.filter((call) => call.method === 'PATCH')).toHaveLength(1);
  await expect(page.getByTestId('notification-mark-all')).toBeDisabled();
  pending.release(); await pending.finished;
  await expect(panel(page).getByText('Nouvelle alerte', { exact: true })).toBeVisible();
  await expect(page.getByTestId('notification-badge')).toHaveText('1');
  await expect(panel(page).getByRole('button', { name: 'Marquer lu : Alerte 1', exact: true })).toHaveCount(0);
  await expect(panel(page).getByRole('button', { name: 'Marquer lu : Nouvelle alerte', exact: true })).toBeVisible();
});

test('an older polling GET cannot undo a confirmed acknowledgement', async ({ page, server }) => {
  await page.clock.install();
  const stale = holdResponse({ notifications: [notice(1)], unread: 1 });
  let reads = 0;
  server.notificationGet = async (route, call) => {
    reads += 1;
    if (reads === 2) { await stale.handle(route); return; }
    await route.fulfill({ json: server.snapshot(call.account) });
  };
  await server.install(page); await ready(page); await openInbox(page);
  await expect(page.getByTestId('notification-badge')).toHaveText('1');
  await page.clock.runFor(30_000); await stale.started;
  await page.getByTestId('notification-mark-all').click();
  await expect(page.getByTestId('notification-badge')).toHaveCount(0);
  stale.release(); await stale.finished;
  await page.clock.runFor(200);
  await expect(page.getByTestId('notification-badge')).toHaveCount(0);
  await expect(panel(page).getByRole('button', { name: 'Marquer lu : Alerte 1', exact: true })).toHaveCount(0);
});

test('confirmed acknowledgement plus failed refresh has an honest intermediate message', async ({ page, server }) => {
  let reads = 0;
  server.notificationGet = async (route, call) => {
    reads += 1;
    await route.fulfill(reads === 2 ? { status: 500, json: { error: 'Unavailable' } } : { json: server.snapshot(call.account) });
  };
  await server.install(page); await ready(page); await openInbox(page);
  await page.getByTestId('notification-mark-all').click();
  await expect(panel(page).getByRole('alert')).toContainText('Lecture enregistrée. Impossible d’actualiser');
  await expect(page.getByTestId('notification-badge')).toHaveText('1');
  await panel(page).getByRole('button', { name: 'Réessayer', exact: true }).click();
  await expect(page.getByTestId('notification-badge')).toHaveCount(0);
  await expect(panel(page).getByRole('alert')).toHaveCount(0);
});

test('A to B to A discards an old response from the first A session', async ({ page, server }) => {
  const oldA = holdResponse({ notifications: [notice(10, 'Ancien compte A')], unread: 1 });
  let firstA = true;
  server.notificationGet = async (route, call) => {
    if (call.account === ACCOUNT_A && firstA) { firstA = false; await oldA.handle(route); return; }
    await route.fulfill({ json: server.snapshot(call.account) });
  };
  await server.install(page); await ready(page); await oldA.started;
  await changeAccount(page, ACCOUNT_B); await openInbox(page);
  await expect(panel(page).getByText('Compte B', { exact: true })).toBeVisible();
  server.notices[ACCOUNT_A] = [notice(11, 'Retour au compte A')];
  await changeAccount(page, ACCOUNT_A); await openInbox(page);
  await expect(panel(page).getByText('Retour au compte A', { exact: true })).toBeVisible();
  oldA.release(); await oldA.finished;
  await expect(panel(page).getByText('Ancien compte A', { exact: true })).toHaveCount(0);
  await expect(panel(page).getByText('Compte B', { exact: true })).toHaveCount(0);
  expect(server.calls.filter((call) => call.path === '/api/notifications').map((call) => call.account)).toEqual([ACCOUNT_A, ACCOUNT_B, ACCOUNT_A]);
});

test('signed-out session makes no notification request and removes account data', async ({ page, server }) => {
  await server.install(page, null); await page.goto('/');
  await expect(bell(page)).toBeDisabled();
  await expect(page.getByRole('region', { name: 'Préférences de notification' }).getByRole('alert')).toContainText('Connectez-vous');
  expect(server.calls).toHaveLength(0);
  await changeAccount(page, ACCOUNT_A);
  await expect(prefs(page).getByRole('switch')).toHaveCount(5);
  await expect(page.getByTestId('notification-badge')).toHaveText('1');
  await openInbox(page); await changeAccount(page, null);
  await expect(bell(page)).toBeDisabled();
  await expect(page.getByTestId('notification-badge')).toHaveCount(0);
  await expect(panel(page)).toHaveCount(0);
  await expect(page.getByRole('switch')).toHaveCount(0);
});

test('malformed inbox and acknowledgement payloads do not create a false success', async ({ page, server }) => {
  server.notificationGet = async (route) => { await route.fulfill({ json: { notifications: [], unread: '0' } }); };
  await server.install(page); await ready(page); await openInbox(page);
  await expect(panel(page).getByRole('alert')).toContainText('Impossible de charger');
  await expect(page.getByTestId('notification-empty')).toHaveCount(0);
  server.notificationGet = undefined;
  await panel(page).getByRole('button', { name: 'Réessayer', exact: true }).click();
  await expect(page.getByTestId('notification-badge')).toHaveText('1');
  server.notificationPatch = async (route) => { await route.fulfill({ json: { ok: false } }); };
  await page.getByTestId('notification-mark-all').click();
  await expect(panel(page).getByRole('alert')).toContainText('La lecture n’a pas pu être confirmée');
  await expect(page.getByTestId('notification-badge')).toHaveText('1');
});

test('failed preferences GET has no editable defaults and retry recovers', async ({ page, server }) => {
  server.preferenceGet = async (route) => { await route.fulfill({ status: 500, json: { error: 'Unavailable' } }); };
  await server.install(page); await page.goto('/');
  await expect(prefs(page).getByRole('alert')).toContainText('Impossible de charger');
  await expect(prefs(page).getByRole('switch')).toHaveCount(0);
  await expect(save(page)).toHaveCount(0);
  server.preferenceGet = undefined;
  await prefs(page).getByRole('button', { name: 'Réessayer le chargement' }).click();
  await expect(prefs(page).getByRole('switch')).toHaveCount(5);
});

test('unsaved defaults become persisted only after save and survive reload', async ({ page, server }) => {
  server.preferences[ACCOUNT_A].persisted = false;
  await server.install(page); await ready(page);
  await expect(page.getByTestId('notification-preferences-defaults')).toContainText('Réglages par défaut');
  await email(page).click();
  await save(page).click();
  await expect(prefs(page).getByRole('status')).toHaveText('Préférences enregistrées.');
  await expect(page.getByTestId('notification-preferences-defaults')).toHaveCount(0);
  const writes = server.calls.filter((call) => call.method === 'PATCH');
  expect(writes).toHaveLength(1);
  expect(Object.keys(writes[0].body ?? {}).sort()).toEqual(Object.keys(defaults()).sort());
  await page.reload();
  await expect(email(page)).toHaveAttribute('aria-checked', 'false');
  await expect(save(page)).toBeDisabled();
});

test('failed preferences PATCH preserves choices without success', async ({ page, server }) => {
  server.preferencePatch = async (route) => { await route.fulfill({ status: 500, json: { error: 'Unavailable' } }); };
  await server.install(page); await ready(page);
  await email(page).click(); await save(page).click();
  await expect(prefs(page).getByRole('alert')).toContainText('La sauvegarde n’a pas pu être confirmée');
  await expect(email(page)).toHaveAttribute('aria-checked', 'false');
  await expect(save(page)).toBeEnabled();
  await expect(prefs(page).getByRole('status')).toHaveCount(0);
});

test('save sends only changed fields and the expected account header', async ({ page, server }) => {
  await server.install(page); await ready(page);
  await email(page).click();
  server.preferences[ACCOUNT_A].preferences.marketing = true;
  await save(page).click();
  await expect(prefs(page).getByRole('status')).toHaveText('Préférences enregistrées.');
  const write = server.calls.find((call) => call.method === 'PATCH');
  expect(write?.account).toBe(ACCOUNT_A);
  expect(write?.body).toEqual({ email_enabled: false });
  await expect(prefs(page).getByRole('switch', { name: /^Offres et nouveautés/ })).toHaveAttribute('aria-checked', 'true');
});

test('a pending save cannot display its success in another account', async ({ page, server }) => {
  const pending = holdResponse({ preferences: { ...defaults(), email_enabled: false }, persisted: true });
  server.preferencePatch = pending.handle;
  await server.install(page); await ready(page);
  await email(page).click(); await save(page).click(); await pending.started;
  await changeAccount(page, ACCOUNT_B);
  await expect(email(page)).toHaveAttribute('aria-checked', 'true');
  await expect(prefs(page).getByRole('switch', { name: /^Push/ })).toHaveAttribute('aria-checked', 'false');
  pending.release(); await pending.finished;
  await expect(prefs(page).getByRole('status')).toHaveCount(0);
  await expect(email(page)).toHaveAttribute('aria-checked', 'true');
  await expect(save(page)).toBeDisabled();
});

test('malformed preference GET does not expose a form', async ({ page, server }) => {
  server.preferenceGet = async (route) => { await route.fulfill({ json: { preferences: { email_enabled: true }, persisted: true } }); };
  await server.install(page); await page.goto('/');
  await expect(prefs(page).getByRole('alert')).toContainText('Impossible de charger');
  await expect(prefs(page).getByRole('switch')).toHaveCount(0);
});

test('unconfirmed preference response cannot display saved status', async ({ page, server }) => {
  server.preferencePatch = async (route) => { await route.fulfill({ json: { preferences: defaults(), persisted: false } }); };
  await server.install(page); await ready(page);
  await email(page).click(); await save(page).click();
  await expect(prefs(page).getByRole('alert')).toContainText('La sauvegarde n’a pas pu être confirmée');
  await expect(email(page)).toHaveAttribute('aria-checked', 'false');
  await expect(prefs(page).getByRole('status')).toHaveCount(0);
});

test('lost save response requires reconfirmation even after reverting to the old value', async ({ page, server }) => {
  let attempts = 0;
  server.preferencePatch = async (route, call) => {
    attempts += 1;
    const result = server.save(call);
    await route.fulfill(attempts === 1 ? { status: 500, json: { error: 'Response lost after write' } } : { json: result });
  };
  await server.install(page); await ready(page);
  await email(page).click(); await save(page).click();
  await expect(prefs(page).getByRole('alert')).toContainText('La sauvegarde n’a pas pu être confirmée');
  expect(server.preferences[ACCOUNT_A].preferences.email_enabled).toBe(false);
  await email(page).click();
  await expect(email(page)).toHaveAttribute('aria-checked', 'true');
  await expect(save(page)).toBeEnabled();
  await expect(prefs(page).getByText('Préférences enregistrées pour ce compte.', { exact: true })).toHaveCount(0);
  await save(page).click();
  await expect(prefs(page).getByRole('status')).toHaveText('Préférences enregistrées.');
  expect(server.preferences[ACCOUNT_A].preferences.email_enabled).toBe(true);
  expect(server.calls.filter((call) => call.method === 'PATCH').map((call) => call.body)).toEqual([
    { email_enabled: false }, { email_enabled: true },
  ]);
});

test('HTTP 409 removes stale notification state before another account can act', async ({ page, server }) => {
  server.notificationPatch = async (route) => { await route.fulfill({ status: 409, json: { error: 'Session changed' } }); };
  await server.install(page); await ready(page); await openInbox(page);
  await page.getByTestId('notification-mark-all').click();
  await expect(panel(page).getByRole('alert')).toBeVisible();
  await expect(page.getByTestId('notification-badge')).toHaveCount(0);
  await expect(page.getByTestId('notification-item')).toHaveCount(0);
  await expect(page.getByTestId('notification-mark-all')).toHaveCount(0);
});

test('HTTP 409 removes stale editable preferences and asks to reload the session', async ({ page, server }) => {
  server.preferencePatch = async (route) => { await route.fulfill({ status: 409, json: { error: 'Session changed' } }); };
  await server.install(page); await ready(page);
  await email(page).click(); await save(page).click();
  await expect(prefs(page).getByRole('alert')).toContainText('Votre session a changé');
  await expect(prefs(page).getByRole('switch')).toHaveCount(0);
  await expect(save(page)).toHaveCount(0);
  await expect(prefs(page).getByRole('button', { name: 'Réessayer le chargement' })).toBeEnabled();
});

test('keyboard, escape focus, light theme and viewport remain usable', async ({ page, server }, testInfo) => {
  server.notices[ACCOUNT_A] = [notice(1, 'Une alerte avec un titre suffisamment long pour vérifier son retour à la ligne sur un petit écran')];
  await server.install(page); await ready(page);
  await bell(page).focus(); await page.keyboard.press('Enter');
  await expect(panel(page)).toBeVisible();
  await expect(panel(page)).toHaveCSS('opacity', '1');
  await page.screenshot({ path: testInfo.outputPath('notifications-dark.png'), fullPage: true });
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  await expect(bell(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(panel(page).getByText('Marquer une alerte comme lue n’ouvre, ne modifie et ne ferme aucun ordre.')).toBeVisible();
  const geometry = await page.evaluate(() => {
    const panel = document.querySelector('[data-testid="notification-panel"]')!;
    const box = panel.getBoundingClientRect();
    return { left: box.left, right: box.right, width: innerWidth, scroll: document.documentElement.scrollWidth,
      foreground: getComputedStyle(panel.querySelector('h3')!).color, background: getComputedStyle(panel).backgroundColor };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.width + 1);
  expect(geometry.scroll).toBeLessThanOrEqual(geometry.width + 1);
  expect(geometry.foreground).toBe('rgb(26, 26, 46)');
  expect(geometry.background).toBe('rgb(245, 245, 240)');
  await page.keyboard.press('Escape');
  await expect(panel(page)).toHaveCount(0);
  await expect(bell(page)).toBeFocused();
  await expect(bell(page)).toHaveAttribute('aria-expanded', 'false');
  await email(page).click();
  await expect(save(page)).toBeEnabled();
  await expect(email(page)).toHaveCSS('background-color', 'rgb(250, 250, 245)');
  const contrast = await page.evaluate(() => {
    const off = document.querySelector('[role="switch"][aria-checked="false"]')!;
    const button = document.querySelector('[data-testid="notification-preferences-save"]')!;
    const canvas = document.createElement('canvas'); canvas.width = 1; canvas.height = 1;
    const context = canvas.getContext('2d')!;
    const rgba = (color: string) => {
      context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data];
    };
    const composite = (foreground: number[], background: number[]) => foreground.slice(0, 3)
      .map((value, i) => value * foreground[3] / 255 + background[i] * (1 - foreground[3] / 255));
    const luminance = (color: number[]) => color.slice(0, 3).map((value) => {
      const component = value / 255; return component <= 0.04045 ? component / 12.92 : ((component + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const ratio = (a: number[], b: number[]) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
    const track = rgba(getComputedStyle(off).backgroundColor);
    const knob = rgba(getComputedStyle(off.firstElementChild!).backgroundColor);
    const border = composite(rgba(getComputedStyle(off).borderColor), track);
    const background = rgba(getComputedStyle(document.body).backgroundColor);
    const buttonBackground = rgba(getComputedStyle(button).backgroundColor);
    const buttonText = rgba(getComputedStyle(button).color);
    return { offKnob: ratio(knob, track), offBoundary: ratio(border, background), saveText: ratio(buttonText, buttonBackground) };
  });
  expect(contrast.offKnob).toBeGreaterThanOrEqual(3);
  expect(contrast.offBoundary).toBeGreaterThanOrEqual(3);
  expect(contrast.saveText).toBeGreaterThanOrEqual(4.5);
  await testInfo.attach('light-contrast', { body: JSON.stringify(contrast), contentType: 'application/json' });
  await page.screenshot({ path: testInfo.outputPath('preferences-light.png'), fullPage: true });
});
