import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fixtures from './fixtures.cjs';
import { assertIsolatedState, verifyHttpGates, snapshotChildPids, observeNewOwnedChild, inspectNewOwnedChildren } from './run-isolated.mjs';
import { assertInstalledChromeMetadata } from './prepare-fonts.mjs';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { createFixtureServer, createFetchTransport, PRICE_QUERY, ANON_KEY, validateFonts } = fixtures;
async function listen(server) {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return 'http://127.0.0.1:' + server.address().port;
}
async function close(server) {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
async function withFixture(run) {
  const directory = mkdtempSync(path.join(tmpdir(), 'midas-e2e-contract-'));
  const journal = path.join(directory, 'requests.jsonl');
  writeFileSync(journal, '');
  const fixture = createFixtureServer({ journal });
  try { await run({ origin: await listen(fixture.server), journal }); }
  finally { await fixture.close(); rmSync(directory, { recursive: true, force: true }); }
}
function loadMarketRoute() {
  const ts = require('typescript');
  const nextServer = require('next/server');
  const lock = JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  assert.equal(require('next/package.json').version, lock.packages['node_modules/next'].version);
  const source = readFileSync(path.join(root, 'src/app/api/market/prices/route.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  }}).outputText;
  const compiledModule = { exports: {} };
  new Function('require', 'exports', 'module', compiled)(name => {
    assert.equal(name, 'next/server'); return nextServer;
  }, compiledModule.exports, compiledModule);
  return compiledModule.exports.GET;
}
test('actual market route preserves the exact eight-coin synthetic HTTP contract', async () => {
  await withFixture(async ({ origin, journal }) => {
    const saved = globalThis.fetch;
    globalThis.fetch = createFetchTransport(saved, journal, origin);
    try {
      const response = await loadMarketRoute()();
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'public, s-maxage=60, stale-while-revalidate=120');
      const data = await response.json();
      assert.deepEqual(Object.keys(data), ['prices']);
      const names = ['bitcoin', 'ethereum', 'solana', 'cardano', 'polkadot', 'chainlink', 'avalanche-2', 'polygon'];
      assert.deepEqual(Object.keys(data.prices), names);
      for (const [index, name] of names.entries()) assert.deepEqual(data.prices[name],
        { usd: 100 + index, usd_24h_change: index - 3, usd_24h_vol: 1000 + index });
      const events = readFileSync(journal, 'utf8').trim().split('\n').map(JSON.parse);
      assert.deepEqual(events.map(event => event.contract), ['synthetic-public-prices']);
    } finally { globalThis.fetch = saved; }
  });
});
test('actual market route turns a real upstream HTTP failure into 502, not valid prices', async () => {
  const server = createServer((_request, response) => { response.writeHead(503); response.end('Unavailable fixture'); });
  const directory = mkdtempSync(path.join(tmpdir(), 'midas-e2e-upstream-'));
  const journal = path.join(directory, 'requests.jsonl');
  writeFileSync(journal, '');
  const saved = globalThis.fetch;
  try {
    globalThis.fetch = createFetchTransport(saved, journal, await listen(server));
    const response = await loadMarketRoute()();
    assert.equal(response.status, 502);
    const body = await response.json();
    assert.equal(body.error, 'CoinGecko API erreur: 503');
    assert(!('prices' in body));
  } finally { globalThis.fetch = saved; await close(server); rmSync(directory, { recursive: true, force: true }); }
});
test('unexpected fixture query is rejected and journalled', async () => {
  await withFixture(async ({ origin, journal }) => {
    const response = await fetch(origin + '/__e2e/coingecko/api/v3/simple/price?' + PRICE_QUERY + '&extra=true',
      { headers: { accept: 'application/json' } });
    assert.equal(response.status, 501);
    assert.equal((await response.json()).code, 'unexpected_fixture_request');
    assert.equal(JSON.parse(readFileSync(journal, 'utf8').trim()).type, 'unexpected-fixture-request');
  });
});
test('external fetch cannot invoke the underlying transport', async () => {
  await withFixture(async ({ origin, journal }) => {
    let calls = 0;
    const transport = createFetchTransport(() => { calls++; throw new Error('Must not run'); }, journal, origin);
    await assert.rejects(transport('https://example.invalid/unexpected'), /refused/);
    assert.equal(calls, 0);
    assert.equal(JSON.parse(readFileSync(journal, 'utf8').trim()).type, 'unexpected-external-fetch');
    assert.throws(() => createFetchTransport(fetch, journal, 'https://example.invalid'), /loopback/);
  });
});
test('exact Next metadata fixture is unavailable without calling any network transport', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'midas-next-metadata-'));
  const journal = path.join(directory, 'requests.jsonl');
  writeFileSync(journal, '');
  let calls = 0;
  const transport = createFetchTransport(() => { calls++; throw new Error('Must not call any transport'); }, journal);
  const url = 'https://registry.npmjs.org/-/package/next/dist-tags';
  try {
    for (const input of [url, new URL(url), new Request(url)]) {
      const response = await transport(input);
      assert.equal(response.status, 503);
      assert.equal(response.ok, false);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(await response.text(), '');
    }
    assert.equal(calls, 0);
    const events = readFileSync(journal, 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(events.length, 3);
    assert(events.every(event => event.type === 'fixture'
      && event.contract === 'next-dev-version-metadata-unavailable' && event.status === 503));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test('Next metadata fixture refuses method, body, query, path and origin variants', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'midas-next-metadata-negative-'));
  const journal = path.join(directory, 'requests.jsonl');
  writeFileSync(journal, '');
  let calls = 0;
  const transport = createFetchTransport(() => { calls++; throw new Error('Must not call any transport'); }, journal);
  const url = 'https://registry.npmjs.org/-/package/next/dist-tags';
  const variants = [
    [url, { method: 'POST' }], [url, { method: 'HEAD' }],
    [url, { body: 'unexpected-body' }],
    [url + '?extra=true'], [url + '#fragment'], [url + '/'],
    [url.replace('/next/', '/react/')], [url.replace('https:', 'http:')],
    [url.replace('registry.npmjs.org', 'registry.npmjs.org.example.invalid')],
    [url.replace('registry.npmjs.org', 'fixture-user@registry.npmjs.org')],
    [new Request(url, { method: 'POST' })],
    [new Request(url), { method: 'POST' }],
  ];
  try {
    for (const [input, init] of variants) await assert.rejects(transport(input, init), /External request refused/);
    assert.equal(calls, 0);
    const events = readFileSync(journal, 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(events.length, variants.length);
    assert(events.every(event => event.type === 'unexpected-external-fetch'));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test('locked Next consumer reports unknown version when offline metadata is unavailable', async () => {
  const lock = JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  const installed = require('next/package.json').version;
  assert.equal(installed, lock.packages['node_modules/next'].version);
  const { getVersionInfo } = require('next/dist/server/dev/hot-reloader-shared-utils');
  const directory = mkdtempSync(path.join(tmpdir(), 'midas-next-version-consumer-'));
  const journal = path.join(directory, 'requests.jsonl');
  writeFileSync(journal, '');
  const saved = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = createFetchTransport(() => { calls++; throw new Error('Must not call any transport'); }, journal);
  try {
    assert.deepEqual(await getVersionInfo(), { installed, staleness: 'unknown' });
    assert.equal(calls, 0);
    const events = readFileSync(journal, 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(events.length, 1);
    assert.equal(events[0].type, 'fixture');
    assert.equal(events[0].contract, 'next-dev-version-metadata-unavailable');
    assert.equal(events[0].status, 503);
  } finally { globalThis.fetch = saved; rmSync(directory, { recursive: true, force: true }); }
});
test('exact Supabase SDK rejects synthetic password credentials and never creates a session', async () => {
  await withFixture(async ({ origin }) => {
    const { createServerClient } = require('@supabase/ssr');
    const lock = JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
    assert.equal(require('@supabase/ssr/package.json').version, lock.packages['node_modules/@supabase/ssr'].version);
    assert.equal(require('@supabase/supabase-js/package.json').version, lock.packages['node_modules/@supabase/supabase-js'].version);
    const client = createServerClient(origin + '/__e2e/supabase', ANON_KEY,
      { cookies: { getAll: () => [], setAll: () => assert.fail('No auth cookie may be created') } });
    const result = await client.auth.signInWithPassword({ email: 'test@purama.dev', password: 'testpassword123' });
    assert.equal(result.error?.status, 400);
    assert.equal(result.error?.code, 'invalid_credentials');
    assert.equal(result.data.user, null);
    assert.equal(result.data.session, null);
  });
});
test('OAuth fixture rejects locally without an external Location', async () => {
  await withFixture(async ({ origin }) => {
    const query = new URLSearchParams({ provider: 'google', redirect_to: 'http://127.0.0.1:3000/api/auth/callback',
      code_challenge: 'synthetic', code_challenge_method: 's256' });
    const response = await fetch(origin + '/__e2e/supabase/auth/v1/authorize?' + query, { redirect: 'manual' });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('location'), null);
    assert.equal((await response.json()).code, 'provider_disabled_for_fixture');
  });
});
test('HTTP readiness accepts only the page markers and exact 401/403/403 JSON', async () => {
  let failurePath = null;
  const server = createServer((request, response) => {
    if (request.url === failurePath) {
      response.writeHead(500, { 'content-type': 'text/html' }); response.end('<h1>Server error</h1>'); return;
    }
    if (request.url === '/login') {
      response.writeHead(200, { 'content-type': 'text/html' });
      response.end('<h1 data-testid="login-logo"></h1><input data-testid="email-input"><input data-testid="password-input">');
      return;
    }
    const chat = request.url === '/api/chat';
    response.writeHead(chat ? 401 : 403, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: chat ? 'Non autorise' : 'MIDAS est limité à l’information générale et à la simulation éducative.' }));
  });
  try {
    const origin = await listen(server);
    assert.equal((await verifyHttpGates(origin)).length, 4);
    for (const pathname of ['/login', '/api/chat', '/api/trade/execute', '/api/signals/generate']) {
      failurePath = pathname;
      await assert.rejects(verifyHttpGates(origin));
    }
  } finally { await close(server); }
});
test('isolation guard rejects inherited namespace, root and retained capabilities', () => {
  const state = { namespace: 'net:[2]', uid: 1001, effectiveUid: 1001, gid: 1001,
    status: { NoNewPrivs: '1', CapEff: '0', CapPrm: '0', CapBnd: '0', CapInh: '0', CapAmb: '0' },
    interfaces: { lo: [{ address: '127.0.0.1', internal: true }] }, ipv4Routes: 'Iface Destination\n', ipv6Routes: '' };
  const expected = { parentNamespace: 'net:[1]', uid: 1001, gid: 1001 };
  assertIsolatedState(state, expected); // Policy-only synthetic metadata, not runtime namespace proof.
  assert.throws(() => assertIsolatedState({ ...state, namespace: expected.parentNamespace }, expected));
  assert.throws(() => assertIsolatedState({ ...state, uid: 0, effectiveUid: 0 }, { ...expected, uid: 0 }));
  assert.throws(() => assertIsolatedState({ ...state, status: { ...state.status, CapBnd: '1' } }, expected));
  assert.throws(() => assertIsolatedState({ ...state, interfaces: { ...state.interfaces, eth0: [] } }, expected));
});
test('font guard rejects corruption and traversal before any font server starts', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'midas-e2e-font-negative-'));
  try {
    const hash = '0'.repeat(64);
    writeFileSync(path.join(directory, hash + '.woff2'), 'corrupt');
    assert.throws(() => validateFonts(directory, { files: [{ file: hash + '.woff2', sha256: hash, bytes: 7 }] }));
    assert.throws(() => validateFonts(directory, { files: [{ file: '../outside', sha256: hash, bytes: 7 }] }));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test('owned process observation verifies a real child and refuses ambiguity or a different executable', async () => {
  let before;
  try { before = snapshotChildPids(); } catch { before = null; }
  const children = [];
  const launch = async () => {
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)', '--', '--no-sandbox', '--synthetic-private-argument=not-for-receipts'],
      { stdio: 'ignore' });
    children.push(child);
    await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
    return child;
  };
  try {
    await launch();
    const observed = inspectNewOwnedChildren(children.map(child => child.pid), [process.execPath]);
    assert.deepEqual(observed, { status: 'OBSERVÉ', identityVerified: true, sandboxFlags: ['--no-sandbox'] });
    assert(!JSON.stringify(observed).includes('not-for-receipts'));
    if (before) assert.deepEqual(observeNewOwnedChild(before, [process.execPath]), observed);
    else assert.deepEqual(observeNewOwnedChild([], [process.execPath]), { status: 'NON OBSERVÉ', reason: 'owned_child_snapshot_unavailable' });
    assert.equal(inspectNewOwnedChildren(children.map(child => child.pid), ['/not-an-allowed-executable']).reason, 'child_executable_not_verified');
    await launch();
    assert.equal(inspectNewOwnedChildren(children.map(child => child.pid), [process.execPath]).reason, 'missing_or_ambiguous_new_child');
  } finally {
    await Promise.all(children.map(child => new Promise(resolve => {
      if (child.exitCode !== null || child.signalCode !== null) return resolve();
      child.once('exit', resolve);
      child.kill('SIGTERM');
    })));
    for (const child of children) assert.throws(() => readFileSync('/proc/' + child.pid + '/status'), { code: 'ENOENT' }, 'Owned probe child must be reaped');
  }
  // Node children exercise safe observation only, not actual Chromium sandbox behavior.
});
test('installed Chrome metadata refuses substituted, writable, unowned or privileged paths', () => {
  const expected = [
    ['/', 'directory'], ['/opt', 'directory'], ['/opt/google', 'directory'], ['/opt/google/chrome', 'directory'],
    ['/opt/google/chrome/chrome', 'file'], ['/etc', 'directory'], ['/etc/apparmor.d', 'directory'], ['/etc/apparmor.d/chrome', 'file'],
  ];
  const entries = expected.map(([filename, type]) => ({ path: filename, realpath: filename, uid: 0, mode: 0o755, type }));
  assert.equal(assertInstalledChromeMetadata(entries), '/opt/google/chrome/chrome');
  assert.throws(() => assertInstalledChromeMetadata(entries.slice(0, -1)));
  for (let index = 0; index < entries.length; index++) {
    for (const changed of [{ realpath: '/tmp/substitute' }, { uid: 1001 }, { mode: 0o775 }, { mode: 0o757 }, { mode: 0o4755 }, { mode: 0o2755 }, { type: 'other' }]) {
      const modified = entries.map((entry, i) => i === index ? { ...entry, ...changed } : entry);
      assert.throws(() => assertInstalledChromeMetadata(modified), error => {
        if (changed.mode !== undefined && (changed.mode & 0o022) !== 0) {
          assert.equal(error.message.split('\n')[0], 'The installed Chrome paths must not be writable by the runner: ' +
            entries[index].path + ' (mode 0' + changed.mode.toString(8) + ')');
        }
        return true;
      });
    }
  }
  // Synthetic metadata tests this guard only. CI must observe the real installed files and owned browser.
});
