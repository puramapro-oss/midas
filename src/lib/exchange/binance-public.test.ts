import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { fetchKlinesWithSource, fetchCoinGeckoOhlc } from './binance-public.ts';

const originalFetch = globalThis.fetch;
const originalRelay = process.env.MIDAS_BINANCE_PROXY_URL;
const originalToken = process.env.MIDAS_BINANCE_PROXY_TOKEN;
const start = Math.floor(1700000000000 / 60000) * 60000;
const rows = (step = 60000, count = 2): unknown[][] => Array.from({ length: count }, (_, i) => {
  const timestamp = Math.floor(start / step) * step + i * step;
  return [timestamp, '100', '110', '90', '105', '42', timestamp + step - 1];
});
let calls: Array<{ url: string; init?: RequestInit }> = [];
let respond: (url: string, init?: RequestInit) => Promise<Response>;
beforeEach(() => {
  calls = [];
  delete process.env.MIDAS_BINANCE_PROXY_URL;
  delete process.env.MIDAS_BINANCE_PROXY_TOKEN;
  respond = async () => Response.json(rows());
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return respond(String(input), init);
  };
});
after(() => {
  globalThis.fetch = originalFetch;
  if (originalRelay === undefined) delete process.env.MIDAS_BINANCE_PROXY_URL;
  else process.env.MIDAS_BINANCE_PROXY_URL = originalRelay;
  if (originalToken === undefined) delete process.env.MIDAS_BINANCE_PROXY_TOKEN;
  else process.env.MIDAS_BINANCE_PROXY_TOKEN = originalToken;
});
function relay() {
  process.env.MIDAS_BINANCE_PROXY_URL = 'https://relay.example.test/market';
  process.env.MIDAS_BINANCE_PROXY_TOKEN = 'test-only-token';
}

test('market candles preserve the exact requested pair, interval and provenance', async () => {
  const result = await fetchKlinesWithSource(' btc/usdt ', '1m', 10);
  assert.equal(result.source, 'binance');
  assert.equal(result.pair, 'BTC/USDT');
  assert.equal(result.interval, '1m');
  assert.equal(result.timestamp_basis, 'open');
  assert.equal(result.volume_available, true);
  assert.equal(result.candles[0].volume, 42);
  assert.equal(new URL(calls[0].url).searchParams.get('symbol'), 'BTCUSDT');
});

test('invalid OHLC, volume, ordering and interval data never become usable candles', async () => {
  const invalid: unknown[][][] = [];
  for (const [column, value] of [[1, null], [2, '99'], [3, '106'], [4, 'NaN'], [5, '-1'], [6, start + 123]]) {
    const data = rows(); data[0][column as number] = value; invalid.push(data);
  }
  invalid.push([rows()[0], rows()[0]], rows().reverse(), rows(300000), []);
  const gap = rows(); gap[1][0] = start + 120000; gap[1][6] = start + 179999; invalid.push(gap);
  for (const data of invalid) {
    respond = async () => Response.json(data);
    const result = await fetchKlinesWithSource('BTC/USDT', '1m', 10);
    assert.equal(result.source, 'none');
    assert.deepEqual(result.candles, []);
  }
});

test('a transient outage can use an authorized HTTPS relay with the same contract', async () => {
  relay();
  respond = async url => new URL(url).hostname === 'api.binance.com'
    ? new Response(null, { status: 503 }) : Response.json(rows());
  const result = await fetchKlinesWithSource('BTC/USDT', '1m', 10);
  assert.equal(result.source, 'vps_proxy');
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, 'https://relay.example.test/market/klines?symbol=BTCUSDT&interval=1m&limit=10');
  assert.equal(new Headers(calls[1].init?.headers).get('X-Midas-Token'), 'test-only-token');
  assert.equal(calls[1].init?.redirect, 'error');
});

test('provider refusals and quotas are not retried through a relay', async () => {
  relay();
  for (const status of [400, 401, 403, 418, 429, 451]) {
    calls = [];
    respond = async () => new Response(null, { status });
    const result = await fetchKlinesWithSource('BTC/USDT', '1m', 10);
    assert.equal(result.unavailable_reason, `provider_http_${status}`);
    assert.equal(calls.length, 1);
  }
});

test('an unsafe relay URL never receives its credential', async () => {
  relay();
  respond = async () => new Response(null, { status: 500 });
  for (const url of ['http://relay.example.test', 'https://user:pass@relay.example.test', 'https://relay.example.test?key=x']) {
    calls = []; process.env.MIDAS_BINANCE_PROXY_URL = url;
    assert.equal((await fetchKlinesWithSource('BTC/USDT', '1m', 10)).unavailable_reason, 'invalid_relay_configuration');
    assert.equal(calls.length, 1);
  }
});

test('an exchange outage never silently substitutes USD observations for USDT candles', async () => {
  respond = async () => new Response(null, { status: 503 });
  const result = await fetchKlinesWithSource('BTC/USDT', '1m', 10);
  assert.equal(result.source, 'none');
  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0].url).hostname, 'api.binance.com');
});

test('simultaneous identical requests share one in-flight provider read', async () => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  respond = async () => { await gate; return Response.json(rows()); };
  const pending = [fetchKlinesWithSource('BTC/USDT', '1m', 10), fetchKlinesWithSource(' btc/usdt ', '1m', 10)];
  await Promise.resolve();
  assert.equal(calls.length, 1);
  release();
  const [a, b] = await Promise.all(pending);
  assert.deepEqual(a, b);
});

test('invalid request parameters are rejected before network access', async () => {
  await assert.rejects(fetchKlinesWithSource('BTC/USDT&limit=1000', '1m', 10));
  await assert.rejects(fetchKlinesWithSource('BTC/USDT', '2m' as '1m', 10));
  for (const limit of [0, -1, NaN, 1.5, 1001]) await assert.rejects(fetchKlinesWithSource('BTC/USDT', '1m', limit));
  assert.equal(calls.length, 0);
});

test('the provider deadline aborts an outstanding request', { timeout: 6000 }, async () => {
  let aborted = false;
  respond = async (_url, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')); }, { once: true });
  });
  const result = await fetchKlinesWithSource('BTC/USDT', '1m', 10);
  assert.equal(aborted, true);
  assert.equal(result.source, 'none');
});

test('explicit indicative observations disclose USD, actual duration, close-time conversion and missing volume', async () => {
  const step = 14400000;
  const closeTime = Math.floor(start / step) * step;
  respond = async () => Response.json([[closeTime, 100, 110, 90, 105], [closeTime + step, 105, 112, 100, 108]]);
  const result = await fetchCoinGeckoOhlc('BTC/USDT', '1h');
  assert.ok(result);
  assert.equal(result.requested_pair, 'BTC/USDT');
  assert.equal(result.pair, 'BTC/USD');
  assert.equal(result.interval, '4h');
  assert.equal(result.candles[0].timestamp, closeTime - step);
  assert.equal(result.volume_available, false);
  assert.equal(result.candles[0].volume, null);
});
