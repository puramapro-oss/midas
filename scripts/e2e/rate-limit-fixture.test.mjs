import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setImmediate as nextTurn } from 'node:timers/promises';
import fixtures from './fixtures.cjs';

const { createFixtureServer, REDIS_KEY } = fixtures;
async function withFixture(t, run) {
  const directory = mkdtempSync(path.join(tmpdir(), 'midas-quota-fixture-'));
  const journal = path.join(directory, 'requests.jsonl');
  writeFileSync(journal, '');
  const fixture = createFixtureServer({ journal });
  await new Promise((resolve, reject) => {
    fixture.server.once('error', reject);
    fixture.server.listen(0, '127.0.0.1', resolve);
  });
  const origin = 'http://127.0.0.1:' + fixture.server.address().port;
  const originalFetch = globalThis.fetch;
  const requests = [];
  t.mock.method(globalThis, 'fetch', (input, init) => {
    assert.equal(new URL(String(input)).origin, origin, 'Only this owned loopback fixture is allowed');
    const pending = originalFetch(input, init);
    requests.push(pending);
    return pending;
  });
  try { await run({ origin, journal }); }
  finally {
    for (let i = 0; i < 10; i++) {
      await Promise.allSettled(requests);
      await nextTurn();
    }
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
}

test('actual SDK reaches the explicit contact quota fixture and rejects request 31', async t => {
  await withFixture(t, async ({ origin, journal }) => {
    const savedUrl = process.env.UPSTASH_REDIS_REST_URL;
    const savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.UPSTASH_REDIS_REST_URL = origin + '/__e2e/redis';
    process.env.UPSTASH_REDIS_REST_TOKEN = REDIS_KEY;
    t.after(() => {
      if (savedUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
      else process.env.UPSTASH_REDIS_REST_URL = savedUrl;
      if (savedToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
      else process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
    });
    // Freeze a mid-window timestamp so the 31 calls cannot straddle a boundary.
    const now = Math.floor(Date.now() / 60000) * 60000 + 30000;
    t.mock.method(Date, 'now', () => now);
    const { checkRateLimit } = await import('../../src/lib/utils/rate-limiter.ts?http-fixture');
    for (let i = 1; i <= 30; i++) {
      const result = await checkRateLimit('contact:unknown', 'free');
      assert.equal(result.allowed, true);
      assert.equal(result.limit, 30);
      assert.equal(result.remaining, 30 - i);
    }
    const blocked = await checkRateLimit('contact:unknown', 'free');
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
    const events = readFileSync(journal, 'utf8').trim().split('\n').map(JSON.parse);
    assert(events.length >= 31);
    assert(events.every(event => event.type === 'fixture' && event.contract === 'synthetic-contact-quota'));
  });
});

test('synthetic quota fixture refuses unexpected authentication, scripts, quotas, keys and queries', async t => {
  await withFixture(t, async ({ origin, journal }) => {
    const now = Date.now();
    const window = Math.floor(now / 60000);
    const command = ['evalsha', '977fb636fb5ceb7e98a96d1b3a1272ba018efdae', 3,
      'midas:rl:global:free:contact:unknown:' + window,
      'midas:rl:global:free:contact:unknown:' + (window - 1), '', 30, now, 60000, 1];
    const changed = (index, value) => command.map((entry, i) => i === index ? value : entry);
    const variants = [
      { auth: 'Bearer wrong' }, { query: '?unexpected=1' }, { data: [] }, { data: {} },
      { data: [changed(0, 'eval')] }, { data: [changed(1, 'unknown-script')] },
      { data: [changed(3, 'midas:rl:global:free:other:' + window)] },
      { data: [changed(6, 10000)] }, { data: [changed(8, 3600000)] }, { data: [changed(9, -1)] },
      { data: [['zincrby', 'midas:rl:global:free:events:0', 1, '{"identifier":"other","success":true}']] },
    ];
    for (const item of variants) {
      const response = await fetch(origin + '/__e2e/redis/pipeline' + (item.query ?? ''), {
        method: 'POST', headers: { authorization: item.auth ?? 'Bearer ' + REDIS_KEY, 'content-type': 'application/json' },
        body: JSON.stringify(item.data ?? [command]),
      });
      assert.equal(response.status, 501);
      assert.equal((await response.json()).code, 'unexpected_fixture_request');
    }
    const events = readFileSync(journal, 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(events.length, variants.length);
    assert(events.every(event => event.type === 'unexpected-fixture-request'));
  });
});
