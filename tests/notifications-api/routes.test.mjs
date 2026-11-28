import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import * as notifications from '../../src/app/api/notifications/route.ts';
import * as preferences from '../../src/app/api/notifications/preferences/route.ts';
import * as signals from '../../src/app/api/signals/route.ts';
import { generateAndPersistSignals, SIGNAL_PAIRS } from '../../src/lib/signals/generate-and-persist.ts';
import { reset, state, ACCOUNT_A, ACCOUNT_B, createClient } from './fixture.mjs';

// This suite has no provider transport, credentials or trade adapter.
globalThis.fetch = async () => { throw new Error('Network access is forbidden in notification contract tests'); };
beforeEach(() => reset());

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const notification = (n, user_id = ACCOUNT_A, read = false) => ({
  id: id(n), user_id, read, title: `Notification ${n}`, created_at: new Date(1_700_000_000_000 + n * 1000).toISOString(),
});
const request = (body, account, raw = false) => new Request('http://midas.test/api/notifications', {
  method: body === undefined ? 'GET' : 'PATCH',
  headers: { 'content-type': 'application/json', ...(account === undefined ? {} : { 'x-midas-account-id': account }) },
  ...(body === undefined ? {} : { body: raw ? body : JSON.stringify(body) }),
});
const bodyOf = async (response, status) => {
  assert.equal(response.status, status);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const body = await response.json();
  assert.ok(!JSON.stringify(body).includes('PRIVATE_'), 'Raw errors must not escape');
  return body;
};

for (const [label, handler, payload] of [
  ['notification GET', notifications.GET, undefined], ['notification PATCH', notifications.PATCH, { all: true }],
  ['preferences GET', preferences.GET, undefined], ['preferences PATCH', preferences.PATCH, { email_enabled: false }],
  ['signals GET', signals.GET, undefined],
]) {
  test(`${label}: no authenticated user cannot read or mutate`, async () => {
    state.user = null;
    await bodyOf(await handler(request(payload)), 401);
    assert.deepEqual(state.calls, []);
  });
  test(`${label}: an authentication error cannot be ignored even with a user`, async () => {
    state.authError = { status: 401, message: 'PRIVATE_AUTH_ERROR' };
    await bodyOf(await handler(request(payload)), 401);
    assert.deepEqual(state.calls, []);
  });
  test(`${label}: auth outage is explicit and has no database effect`, async () => {
    state.authError = { status: 503, message: 'PRIVATE_AUTH_OUTAGE' };
    await bodyOf(await handler(request(payload)), 503);
    assert.deepEqual(state.calls, []);
  });
}

for (const [label, handler, payload] of [
  ['notification GET', notifications.GET, undefined], ['notification PATCH', notifications.PATCH, { all: true }],
  ['preferences GET', preferences.GET, undefined], ['preferences PATCH', preferences.PATCH, { email_enabled: false }],
]) {
  test(`${label}: a changed account is refused before database access`, async () => {
    await bodyOf(await handler(request(payload, ACCOUNT_B)), 409);
    assert.deepEqual(state.calls, []);
  });
}

test('notifications: latest 50 and total unread are isolated to the authenticated owner', async () => {
  state.notifications = [
    ...Array.from({ length: 60 }, (_, index) => notification(index + 1)),
    notification(100, ACCOUNT_B), notification(101, ACCOUNT_A, true),
  ];
  const body = await bodyOf(await notifications.GET(request(undefined, ACCOUNT_A)), 200);
  assert.equal(body.notifications.length, 50);
  assert.equal(body.unread, 60);
  assert.equal(body.notifications[0].id, id(101));
  assert.ok(body.notifications.every((item) => item.user_id === ACCOUNT_A));
  assert.deepEqual(state.mutations, []);
});

for (const target of ['list', 'count', 'missing-count', 'throw']) {
  test(`notifications: ${target} failure is not an empty successful inbox`, async () => {
    state.fail = (query) => target === 'list' ? !query.options.head : target === 'count' && query.options.head;
    state.countMissing = target === 'missing-count';
    state.throwQuery = target === 'throw';
    const body = await bodyOf(await notifications.GET(request()), 500);
    assert.equal(body.notifications, undefined);
    assert.equal(body.unread, undefined);
  });
}

for (const [label, payload, raw] of [
  ['empty', {}], ['all false', { all: false }], ['empty ids', { ids: [] }],
  ['both selectors', { all: true, ids: [id(1)] }], ['bad id', { ids: ['bad'] }],
  ['too many ids', { ids: Array.from({ length: 101 }, (_, index) => id(index)) }],
  ['unknown field', { all: true, execute_trade: true }], ['foreign owner injection', { all: true, user_id: ACCOUNT_B }],
  ['null', null], ['malformed JSON', '{', true],
]) {
  test(`notification PATCH rejects ${label} without database effects`, async () => {
    state.notifications = [notification(1)];
    await bodyOf(await notifications.PATCH(request(payload, undefined, raw)), 400);
    assert.deepEqual(state.calls, []);
    assert.equal(state.notifications[0].read, false);
  });
}

test('acknowledgement is idempotent, deduplicated, owner-scoped and only changes read', async () => {
  state.notifications = [notification(1), notification(2), notification(3, ACCOUNT_B)];
  const before = structuredClone(state.notifications);
  for (let repeat = 0; repeat < 2; repeat++) {
    assert.deepEqual(await bodyOf(await notifications.PATCH(request({ ids: [id(1), id(1), id(3)] })), 200), { ok: true });
  }
  assert.deepEqual(state.notifications, [{ ...before[0], read: true }, before[1], before[2]]);
  assert.ok(state.mutations.every((query) => query.table === 'notifications' && query.action === 'update'
    && JSON.stringify(query.payload) === '{"read":true}'));
  assert.ok(state.mutations.every((query) => query.filters.some(([op, column, value]) => op === 'not.is' && column === 'read' && value === true)));
});

test('legacy nullable read state is unread in both the counter and acknowledgement', async () => {
  state.notifications = [notification(1, ACCOUNT_A, null), notification(2, ACCOUNT_B, null)];
  const before = await bodyOf(await notifications.GET(request()), 200);
  assert.equal(before.unread, 1);
  assert.equal(before.notifications[0].read, false);
  await bodyOf(await notifications.PATCH(request({ all: true })), 200);
  assert.equal(state.notifications[0].read, true);
  assert.equal(state.notifications[1].read, null);
  const after = await bodyOf(await notifications.GET(request()), 200);
  assert.equal(after.unread, 0);
});

test('mark all only affects authenticated owner, with no trading effect', async () => {
  state.notifications = [notification(1), notification(2, ACCOUNT_B)];
  await bodyOf(await notifications.PATCH(request({ all: true }, ACCOUNT_A)), 200);
  assert.equal(state.notifications[0].read, true);
  assert.equal(state.notifications[1].read, false);
  assert.deepEqual(state.mutations.map((query) => [query.schema, query.table, query.payload]), [['public', 'notifications', { read: true }]]);
});

test('failed acknowledgement retains unread state and reports failure', async () => {
  state.notifications = [notification(1)];
  state.fail = () => true;
  await bodyOf(await notifications.PATCH(request({ all: true })), 500);
  assert.equal(state.notifications[0].read, false);
});

test('missing preferences return declared defaults without writing on GET', async () => {
  const body = await bodyOf(await preferences.GET(request()), 200);
  assert.equal(body.persisted, false);
  assert.deepEqual(body.preferences.preferred_days, [1, 2, 3, 4, 5]);
  assert.equal(body.preferences.preferred_hour, 10);
  assert.equal(body.preferences.marketing, false);
  assert.equal(body.preferences.paused_until, null);
  assert.deepEqual(state.mutations, []);
});

test('existing preferences are owner-scoped and retained exactly', async () => {
  state.preferences = [{ user_id: ACCOUNT_B, email_enabled: true }, { user_id: ACCOUNT_A, email_enabled: false, paused_until: null }];
  const body = await bodyOf(await preferences.GET(request(undefined, ACCOUNT_A)), 200);
  assert.equal(body.persisted, true);
  assert.deepEqual(body.preferences, state.preferences[1]);
  assert.deepEqual(state.mutations, []);
});

test('preference lookup failure never becomes defaults or an implicit insert', async () => {
  state.fail = () => true;
  const body = await bodyOf(await preferences.GET(request()), 500);
  assert.equal(body.preferences, undefined);
  assert.deepEqual(state.mutations, []);
});

for (const [label, payload, raw] of [
  ['empty', {}], ['foreign owner', { user_id: ACCOUNT_B, email_enabled: true }],
  ['authority injection', { auto_trade_enabled: true }], ['unsupported SMS', { sms_enabled: true }],
  ['nonboolean', { email_enabled: 'false' }], ['hour out of range', { preferred_hour: 24 }],
  ['duplicate days', { preferred_days: [1, 1] }], ['invalid day', { preferred_days: [7] }],
  ['invalid date', { paused_until: 'tomorrow' }], ['impossible date', { paused_until: '2026-02-30T00:00:00Z' }],
  ['timezone missing', { paused_until: '2026-12-01T00:00:00' }], ['malformed JSON', '{', true],
]) {
  test(`preference PATCH rejects ${label} before writing`, async () => {
    await bodyOf(await preferences.PATCH(request(payload, undefined, raw)), 400);
    assert.deepEqual(state.calls, []);
  });
}

test('preference save confirms the same mutation and preserves unrelated fields', async () => {
  state.preferences = [{ user_id: ACCOUNT_A, email_enabled: true, marketing: false }, { user_id: ACCOUNT_B, email_enabled: true }];
  const body = await bodyOf(await preferences.PATCH(request({ email_enabled: false, paused_until: null, preferred_days: [] }, ACCOUNT_A)), 200);
  assert.equal(body.persisted, true);
  assert.equal(body.preferences.email_enabled, false);
  assert.equal(body.preferences.marketing, false);
  assert.equal(body.preferences.paused_until, null);
  assert.deepEqual(body.preferences.preferred_days, []);
  assert.equal(state.preferences[1].email_enabled, true);
  assert.equal(state.calls.length, 1, 'No second SELECT may mask a failed upsert');
  assert.equal(state.calls[0].action, 'upsert');
  assert.ok(Number.isFinite(Date.parse(body.preferences.updated_at)));
});

test('valid zoned pause timestamp is saved without modification', async () => {
  const pause = '2026-12-01T10:30:00+01:00';
  const body = await bodyOf(await preferences.PATCH(request({ paused_until: pause })), 200);
  assert.equal(body.preferences.paused_until, pause);
});

for (const target of ['error', 'missing-returning-row', 'throw']) {
  test(`preference ${target} cannot produce a successful save`, async () => {
    state.fail = () => target === 'error';
    state.noRow = target === 'missing-returning-row';
    state.throwQuery = target === 'throw';
    const body = await bodyOf(await preferences.PATCH(request({ email_enabled: false })), 500);
    assert.equal(body.preferences, undefined);
    assert.equal(body.persisted, undefined);
    assert.equal(state.calls.length, 1);
  });
}

test('signals exclude inactive, expired and unspecified expiry rows at read time', async () => {
  state.signals = [
    { id: 'future', is_active: true, expires_at: '2099-01-01T00:00:00.000Z' },
    { id: 'expired', is_active: true, expires_at: '2000-01-01T00:00:00.000Z' },
    { id: 'inactive', is_active: false, expires_at: '2099-01-01T00:00:00.000Z' },
    { id: 'unknown', is_active: true, expires_at: null },
  ];
  const body = await bodyOf(await signals.GET(request()), 200);
  assert.deepEqual(body.signals.map((item) => item.id), ['future']);
  assert.deepEqual(state.mutations, []);
});

test('signals database errors stay explicit and sanitized', async () => {
  state.fail = () => true;
  await bodyOf(await signals.GET(request()), 500);
});

for (const [label, returned] of [['null', null], ['object', {}]]) {
  test(`signals: ${label} list receipt cannot appear as a successful empty list`, async () => {
    state.transformData = () => returned;
    const body = await bodyOf(await signals.GET(request()), 500);
    assert.equal(body.signals, undefined);
    assert.deepEqual(state.mutations, []);
  });
}

test('signals: an actual empty array remains a successful empty list', async () => {
  const body = await bodyOf(await signals.GET(request()), 200);
  assert.deepEqual(body.signals, []);
  assert.deepEqual(state.mutations, []);
});

test('expiration failure stops generation before analysis or insertion', async () => {
  state.fail = (query) => query.action === 'update';
  await assert.rejects(generateAndPersistSignals(await createClient()), { message: 'Impossible de désactiver les signaux expirés.' });
  assert.deepEqual(state.analyzed, []);
  assert.equal(state.calls.length, 1);
  assert.deepEqual(state.mutations, []);
});

test('shared pipeline expires stale rows and persists successful analyses once', async () => {
  state.signals = [{ id: 'old', is_active: true, expires_at: '2000-01-01T00:00:00.000Z' }];
  state.analysisFailures = [SIGNAL_PAIRS[1]];
  const result = await generateAndPersistSignals(await createClient());
  assert.equal(result.ok, true);
  assert.equal(result.generated, 2);
  assert.deepEqual(state.analyzed, [...SIGNAL_PAIRS]);
  assert.equal(state.signals[0].is_active, false);
  assert.equal(result.failures[0].pair, SIGNAL_PAIRS[1]);
  assert.equal(state.mutations.filter((query) => query.action === 'insert').length, 1);
});

test('failed signal insertion has no successful generation receipt or raw database error', async () => {
  state.fail = (query) => query.action === 'insert';
  await assert.rejects(generateAndPersistSignals(await createClient()), { message: 'Résultat de l’enregistrement des signaux non confirmé.' });
});

for (const [label, receipt] of [
  ['null', () => null],
  ['empty', () => []],
  ['partial', (rows) => rows.slice(0, -1)],
  ['too many', (rows) => [...rows, { id: id(99) }]],
  ['duplicate IDs', (rows) => [rows[0], rows[0], rows[2]]],
  ['case-equivalent IDs', (rows) => [rows[0], { ...rows[0], id: rows[0].id.toUpperCase() }, rows[2]]],
  ['missing ID', (rows) => [{}, ...rows.slice(1)]],
  ['invalid ID', (rows) => [{ id: 'not-a-uuid' }, ...rows.slice(1)]],
  ['lost transport response', () => { throw new Error('PRIVATE_DATABASE_RESPONSE_LOST'); }],
]) {
  test(`signal insertion: ${label} receipt stays unconfirmed without retrying a committed write`, async () => {
    state.transformData = (query, data) => query.action === 'insert' ? receipt(data) : data;
    await assert.rejects(generateAndPersistSignals(await createClient()), { message: 'Résultat de l’enregistrement des signaux non confirmé.' });
    assert.equal(state.signals.length, SIGNAL_PAIRS.length, 'The write may already have committed despite an invalid receipt');
    assert.equal(state.mutations.filter((query) => query.action === 'insert').length, 1, 'An uncertain insertion must not be retried');
    assert.equal(state.calls.length, 2, 'Only expiration and the original insertion are submitted');
  });
}
