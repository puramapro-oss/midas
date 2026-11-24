import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate as nextTurn } from 'node:timers/promises';

const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
for (const name of ['@upstash/ratelimit', '@upstash/redis']) {
  const installed = JSON.parse(readFileSync(new URL('../node_modules/' + name + '/package.json', import.meta.url), 'utf8'));
  assert.equal(installed.version.replace(/^v/, ''), lock.packages['node_modules/' + name].version);
}

let revision = 0;
async function fixture(t, transport) {
  const savedUrl = process.env.UPSTASH_REDIS_REST_URL;
  const savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.UPSTASH_REDIS_REST_URL = 'https://rate-limit-fixture.invalid';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'synthetic-no-authority';
  t.after(() => {
    if (savedUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = savedUrl;
    if (savedToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
  });
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    // No underlying transport is called: this exercises the installed SDK's
    // serialization/response/error handling, not a real Redis service.
    assert.equal(String(input), 'https://rate-limit-fixture.invalid/pipeline');
    assert.equal(init.method, 'POST');
    const commands = JSON.parse(init.body);
    calls.push(commands);
    return transport(commands);
  });
  t.mock.method(console, 'error', () => {});
  t.mock.method(console, 'warn', () => {});
  const module = await import(new URL('../src/lib/utils/rate-limiter.ts?test=' + revision++, import.meta.url));
  return { ...module, calls };
}
const serverError = commands => Response.json(commands.map(() => ({ error: 'ERR synthetic datastore unavailable' })));
const allowed = commands => Response.json(commands.map(command => ({
  result: command[0] === 'evalsha' ? [Number(command[6]) - 1, Number(command[6])] : 1,
})));
function assertUnavailable(result, limit) {
  assert.equal(result.allowed, false);
  assert.equal(result.limit, limit);
  assert.equal(result.remaining, 0);
  assert(Number.isFinite(result.reset));
  assert(result.reset >= Date.now());
}

test('global datastore error denies a costly operation without claiming remaining quota', async t => {
  const api = await fixture(t, serverError);
  assertUnavailable(await api.checkRateLimit('voice-user', 'free'), 30);
});

for (const [route, plan, limit] of [
  ['/api/ai/chat', 'free', 15], ['/api/trade/execute', 'pro', 50],
  ['/api/exchange/sync', 'free', 10], ['/api/backtest', 'pro', 10], ['/api/v1', 'ultra', 300],
  ['/api/unlisted', 'free', 30],
]) {
  test('datastore failure denies ' + route + ' through its existing contract', async t => {
    const api = await fixture(t, serverError);
    assertUnavailable(await api.checkRouteRateLimit('user', route, plan), limit);
  });
}

test('missing configuration denies before any HTTP request', async t => {
  const api = await fixture(t, allowed);
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  assertUnavailable(await api.checkRateLimit('user', 'free'), 30);
  assert.equal(api.calls.length, 0);
});

test('invalid Redis URL construction is converted to a controlled denial', async t => {
  const api = await fixture(t, allowed);
  process.env.UPSTASH_REDIS_REST_URL = 'not-an-http-url';
  assertUnavailable(await api.checkRateLimit('user', 'pro'), 120);
  assertUnavailable(await api.checkRouteRateLimit('user', '/api/ai/chat', 'pro'), 200);
  assert.equal(api.calls.length, 0);
});

for (const scoped of [false, true]) {
  test('actual SDK timeout success is denied for ' + (scoped ? 'route' : 'global') + ' limit', async t => {
    const releases = [];
    const api = await fixture(t, commands => new Promise(resolve => { releases.push(() => resolve(allowed(commands))); }));
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let resultPromise;
    try {
      resultPromise = scoped ? api.checkRouteRateLimit('timeout-user', '/api/ai/chat', 'free')
        : api.checkRateLimit('timeout-user', 'free');
      // Let the real SDK enqueue its pipeline before advancing its own deadline.
      for (let i = 0; i < 12; i++) await Promise.resolve();
      t.mock.timers.tick(5_001);
      const result = await resultPromise;
      assertUnavailable(result, scoped ? 15 : 30);
    } finally {
      t.mock.timers.reset();
      // Drain late responses/analytics without performing any external effect.
      for (let i = 0; i < 20; i++) {
        while (releases.length) releases.shift()();
        await Promise.resolve();
      }
      await resultPromise?.catch(() => {});
    }
  });
}

test('healthy SDK result preserves the existing quota and headers', async t => {
  const api = await fixture(t, allowed);
  const result = await api.checkRouteRateLimit('user', '/api/ai/chat', 'pro');
  assert.equal(result.allowed, true);
  assert.equal(result.limit, 200);
  assert.equal(result.remaining, 199);
  const headers = api.rateLimitHeaders(result);
  assert.equal(headers['X-RateLimit-Limit'], '200');
  assert.equal(headers['X-RateLimit-Remaining'], '199');
  assert(!('Retry-After' in headers));
});

test('an exhausted SDK quota stays denied with zero remaining', async t => {
  const api = await fixture(t, commands => Response.json(commands.map(command => ({
    result: command[0] === 'evalsha' ? [-1, Number(command[6])] : 1,
  }))));
  const result = await api.checkRateLimit('exhausted', 'free');
  assert.equal(result.allowed, false);
  assert.equal(result.remaining, 0);
  assert.equal(result.limit, 30);
});

test('same cached limiter recovers after a datastore error without a fail-open result', async t => {
  let healthy = false;
  const api = await fixture(t, commands => healthy ? allowed(commands) : serverError(commands));
  assertUnavailable(await api.checkRateLimit('user', 'free'), 30);
  healthy = true;
  const result = await api.checkRateLimit('user', 'free');
  assert.equal(result.allowed, true);
  assert.equal(result.remaining, 29);
});

test('plan-excluded operations remain denied without accessing Redis or emitting negative Retry-After', async t => {
  const api = await fixture(t, allowed);
  for (const [route, plan] of [['/api/backtest', 'free'], ['/api/v1', 'free'], ['/api/v1', 'pro']]) {
    const result = await api.checkRouteRateLimit('user', route, plan);
    assert.deepEqual(result, { allowed: false, limit: 0, remaining: 0, reset: 0 });
    assert.equal(api.rateLimitHeaders(result)['Retry-After'], '0');
  }
  assert.equal(api.calls.length, 0);
});

test('Retry-After is nonnegative for elapsed/reset and malformed deadlines, rounded up for future ones', async t => {
  const api = await fixture(t, allowed);
  t.mock.method(Date, 'now', () => 10_000);
  for (const reset of [0, 9_000, 10_000, NaN, Infinity, -Infinity]) {
    assert.equal(api.rateLimitHeaders({ allowed: false, limit: 30, remaining: 0, reset })['Retry-After'], '0');
  }
  assert.equal(api.rateLimitHeaders({ allowed: false, limit: 30, remaining: 0, reset: 10_001 })['Retry-After'], '1');
});

test('analytics failure is handled by the SDK without undoing a confirmed quota admission', async t => {
  const api = await fixture(t, commands => commands.some(command => command[0] === 'zincrby')
    ? serverError(commands) : allowed(commands));
  const result = await api.checkRateLimit('user', 'free');
  assert.equal(result.allowed, true);
  assert.equal(result.remaining, 29);
  for (let i = 0; i < 5; i++) await nextTurn();
  assert(api.calls.some(commands => commands.some(command => command[0] === 'zincrby')));
  assert.equal(console.warn.mock.calls.length, 1);
});

test('a late datastore rejection after SDK timeout remains denied and is not unhandled', async t => {
  const releases = [];
  const api = await fixture(t, commands => commands.some(command => command[0] === 'evalsha')
    ? new Promise(resolve => { releases.push(() => resolve(serverError(commands))); }) : allowed(commands));
  t.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const pending = api.checkRateLimit('late-user', 'free');
    for (let i = 0; i < 12; i++) await Promise.resolve();
    t.mock.timers.tick(5_001);
    assertUnavailable(await pending, 30);
  } finally {
    t.mock.timers.reset();
    for (let i = 0; i < 5; i++) {
      while (releases.length) releases.shift()();
      await nextTurn();
    }
  }
});

test('unrecognized or inherited plan keys cannot authorize or access Redis', async t => {
  const api = await fixture(t, allowed);
  for (const plan of ['unknown', '__proto__', 'constructor', 'toString']) {
    assertUnavailable(await api.checkRateLimit('user', plan), 0);
    assertUnavailable(await api.checkRouteRateLimit('user', '/api/ai/chat', plan), 0);
  }
  assert.equal(api.calls.length, 0);
});
