import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, realpathSync, readlinkSync, rmSync } from 'node:fs';
import { createServer, connect } from 'node:net';
import { networkInterfaces, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import fixtures from './fixtures.cjs';
import { loadPreparedFonts, assertFontRuntime, fontGate } from './prepare-fonts.mjs';
export { snapshotChildPids, observeNewOwnedChild, inspectNewOwnedChildren } from './prepare-fonts.mjs';

const { ORIGIN, ANON_KEY, SERVICE_KEY, REDIS_KEY, createFixtureServer } = fixtures;
const script = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(script), '../..');
const reportDirectory = path.join(root, 'test-results/e2e-isolation');
const journal = path.join(reportDirectory, 'requests.jsonl');
const systemPath = '/usr/sbin:/usr/bin:/sbin:/bin';

function receipt(name, value) {
  mkdirSync(reportDirectory, { recursive: true });
  writeFileSync(path.join(reportDirectory, name), JSON.stringify({ at: new Date().toISOString(), ...value }, null, 2) + '\n');
}
function currentState() {
  const status = Object.fromEntries(readFileSync('/proc/self/status', 'utf8').split('\n')
    .filter(line => line.includes(':')).map(line => {
      const at = line.indexOf(':'); return [line.slice(0, at), line.slice(at + 1).trim()];
    }));
  return { namespace: readlinkSync('/proc/self/ns/net'), uid: process.getuid(), gid: process.getgid(),
    effectiveUid: process.geteuid(), status, interfaces: networkInterfaces(),
    ipv4Routes: readFileSync('/proc/net/route', 'utf8'),
    ipv6Routes: readFileSync('/proc/net/ipv6_route', 'utf8') };
}
export function assertIsolatedState(state, expected) {
  assert.notEqual(state.namespace, expected.parentNamespace, 'Must enter a distinct network namespace');
  assert.equal(state.uid, expected.uid);
  assert.equal(state.effectiveUid, expected.uid);
  assert.notEqual(state.uid, 0, 'Application runner must not be root');
  assert.equal(state.gid, expected.gid);
  assert.equal(state.status.NoNewPrivs, '1');
  for (const key of ['CapEff', 'CapPrm', 'CapBnd', 'CapInh', 'CapAmb']) {
    assert.match(state.status[key], /^0+$/, key + ' must be empty');
  }
  assert.deepEqual(Object.keys(state.interfaces), ['lo']);
  assert(state.interfaces.lo.some(item => item.address === '127.0.0.1' && item.internal));
  assert(state.interfaces.lo.every(item => item.internal && ['127.0.0.1', '::1'].includes(item.address)));
  assert(state.ipv4Routes.trim().split('\n').slice(1).every(line => !line || line.split(/\s+/)[0] === 'lo'));
  assert(state.ipv6Routes.trim().split('\n').every(line => !line || line.trim().split(/\s+/).at(-1) === 'lo'));
}
async function unreachable(host) {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port: 9 });
    socket.setTimeout(1000);
    socket.once('connect', () => { socket.destroy(); reject(new Error('Unexpected non-loopback connection')); });
    socket.once('timeout', () => { socket.destroy(); reject(new Error('No immediate no-route proof')); });
    socket.once('error', error => {
      if (!['ENETUNREACH', 'EHOSTUNREACH', 'EAFNOSUPPORT'].includes(error.code)) return reject(error);
      resolve({ host, code: error.code });
    });
  });
}
async function proveLoopback() {
  const nonce = randomBytes(16).toString('hex');
  const server = createServer(socket => socket.once('data', data => socket.end(data)));
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  try {
    await new Promise((resolve, reject) => {
      const socket = connect(server.address().port, '127.0.0.1', () => socket.write(nonce));
      socket.setTimeout(1000, () => { socket.destroy(); reject(new Error('Loopback echo timed out')); });
      let received = '';
      socket.on('data', data => { received += data; });
      socket.once('end', () => {
        try { assert.equal(received, nonce); resolve(); } catch (error) { reject(error); }
      });
      socket.once('error', reject);
    });
  } finally { await new Promise(resolve => server.close(resolve)); }
}
async function getPage(url, timeout = 10000) {
  return fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(timeout) });
}
export async function verifyHttpGates(origin = ORIGIN) {
  const login = await getPage(origin + '/login');
  assert.equal(login.status, 200, '/login must return HTTP 200, never a redirect or HTML 500');
  assert.match(login.headers.get('content-type') ?? '', /text\/html/);
  const html = await login.text();
  for (const marker of ['data-testid="login-logo"', 'data-testid="email-input"', 'data-testid="password-input"']) {
    assert(html.includes(marker), 'Missing /login content: ' + marker);
  }
  const gates = [{ path: '/login', status: 200, expectedContentPresent: true }];
  for (const [url, expectedStatus, error, data] of [
    ['/api/chat', 401, 'Non autorise', { message: 'test' }],
    ['/api/trade/execute', 403, 'MIDAS est limité à l’information générale et à la simulation éducative.', { pair: 'BTC/USDT', side: 'buy', amount: 100 }],
    ['/api/signals/generate', 403, 'MIDAS est limité à l’information générale et à la simulation éducative.', {}],
  ]) {
    const response = await fetch(origin + url, { method: 'POST', redirect: 'manual',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify(data), signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, expectedStatus);
    assert.match(response.headers.get('content-type') ?? '', /application\/json/);
    assert.deepEqual(await response.json(), { error });
    gates.push({ path: url, status: expectedStatus, exactJson: true });
  }
  return gates;
}
function start(command, args, env, log) {
  const child = spawn(command, args, { cwd: root, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  const capture = chunk => {
    process.stdout.write(chunk);
    output += chunk.toString();
    if (output.length > 8 * 1024 * 1024) output = output.slice(-8 * 1024 * 1024);
  };
  child.stdout.on('data', capture);
  child.stderr.on('data', capture);
  const completion = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      writeFileSync(path.join(reportDirectory, log), output);
      resolve({ code, signal });
    });
  });
  return { child, completion };
}
async function stopGroup(processInfo) {
  if (!processInfo?.child.pid) return;
  const pid = processInfo.child.pid;
  const send = signal => { try { process.kill(-pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; } };
  send('SIGTERM');
  await Promise.race([processInfo.completion.catch(() => {}), delay(5000, undefined, { ref: false })]);
  send('SIGKILL');
  await processInfo.completion.catch(() => {});
  const deadline = Date.now() + 1000;
  while (Date.now() < deadline) {
    try { process.kill(-pid, 0); }
    catch (error) { if (error.code === 'ESRCH') return; throw error; }
    await delay(50);
  }
  throw new Error('An owned child process group still exists after cleanup');
}
async function inside(args) {
  const [parentNamespace, fontDirectory, temporaryHome, browserDirectory, uid, gid] = args;
  const state = currentState();
  assertIsolatedState(state, { parentNamespace, uid: Number(uid), gid: Number(gid) });
  const noEgress = await Promise.all([unreachable('203.0.113.1'), unreachable('2001:db8::1')]);
  await proveLoopback();
  receipt('isolation.json', { status: 'PASS', namespace: state.namespace, parentNamespace,
    uid: state.uid, effectiveUid: state.effectiveUid, gid: state.gid,
    capabilities: Object.fromEntries(['CapEff', 'CapPrm', 'CapBnd', 'CapInh', 'CapAmb', 'NoNewPrivs'].map(key => [key, state.status[key]])),
    interfaces: state.interfaces, ipv4Routes: state.ipv4Routes, ipv6Routes: state.ipv6Routes,
    loopbackNonceEcho: 'PASS', noEgress, servicesStartedBeforeProof: 0 });
  console.log(JSON.stringify({ isolation: 'PASS', uid: state.uid, namespace: state.namespace, noEgress }));
  const { manifest, fonts } = loadPreparedFonts(fontDirectory);
  assertFontRuntime(manifest);
  const fontResponses = path.join(fontDirectory, 'responses.cjs');
  const env = {
    PATH: path.dirname(process.execPath) + ':' + systemPath,
    HOME: temporaryHome, TMPDIR: temporaryHome, LANG: 'C.UTF-8',
    CI: 'true', NEXT_TELEMETRY_DISABLED: '1',
    MIDAS_E2E_ISOLATED: '1', MIDAS_E2E_JOURNAL: journal,
    NEXT_PUBLIC_SUPABASE_URL: ORIGIN + '/__e2e/supabase',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
    UPSTASH_REDIS_REST_URL: ORIGIN + '/__e2e/redis', UPSTASH_REDIS_REST_TOKEN: REDIS_KEY,
    STRIPE_SECRET_KEY: 'sk_test_midas_fixture_no_authority',
    STRIPE_WEBHOOK_SECRET: 'whsec_midas_fixture_invalid_signatures_only',
    PLAYWRIGHT_BROWSERS_PATH: browserDirectory,
    NEXT_FONT_GOOGLE_MOCKED_RESPONSES: fontResponses,
    NODE_OPTIONS: '--require=' + path.join(root, 'scripts/e2e/preload.cjs'),
  };
  writeFileSync(journal, '');
  const fixture = createFixtureServer({ journal, fonts });
  let next;
  let tests;
  let interrupted = null;
  const interrupt = signal => {
    interrupted = signal;
    for (const item of [tests, next]) {
      if (item?.child.pid) {
        try { process.kill(-item.child.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') console.error(error.code); }
      }
    }
  };
  const onTerm = () => interrupt('SIGTERM');
  const onInt = () => interrupt('SIGINT');
  process.once('SIGTERM', onTerm);
  process.once('SIGINT', onInt);
  const result = { status: 'FAIL', phase: 'startup', sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() };
  try {
    await new Promise((resolve, reject) => { fixture.server.once('error', reject); fixture.server.listen(3000, '127.0.0.1', resolve); });
    next = start(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3001'], env, 'next.log');
    const deadline = Date.now() + 60000; // Preserve Playwright's existing default server-start budget.
    let available = false;
    while (Date.now() < deadline) {
      assert.equal(interrupted, null, 'Interrupted before readiness');
      if (next.child.exitCode !== null) throw new Error('Next exited before readiness');
      try {
        const response = await getPage(ORIGIN + '/login', Math.max(1, deadline - Date.now()));
        if (response.status !== 502) {
          assert.equal(response.status, 200, 'Next returned non-200 during readiness');
          available = true;
          break;
        }
      } catch (error) {
        if (!['ECONNREFUSED', 'UND_ERR_CONNECT_TIMEOUT'].includes(error.cause?.code)) throw error;
      }
      await delay(250);
    }
    assert(available, 'Existing 60-second server readiness budget exceeded');
    fixture.markReady();
    result.phase = 'strict-http-gates';
    result.httpGates = await verifyHttpGates();
    receipt('readiness.json', { status: 'PASS', gates: result.httpGates });
    console.log(JSON.stringify({ httpGates: 'PASS', gates: result.httpGates }));
    result.phase = 'font-decode';
    result.fonts = await fontGate(manifest, env, browserDirectory);
    receipt('fonts.json', { status: 'PASS', decoded: result.fonts, inputs: manifest.files });
    result.phase = 'playwright';
    tests = start(process.execPath, ['node_modules/@playwright/test/cli.js', 'test'], env, 'playwright.log');
    result.playwright = await tests.completion;
    assert.equal(interrupted, null, 'Isolated qualification interrupted');
    const events = readFileSync(journal, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
    result.fixtureCounts = events.reduce((counts, event) => {
      const key = event.contract ?? event.type;
      counts[key] = (counts[key] ?? 0) + 1; return counts;
    }, {});
    result.unexpected = events.filter(event => !['fixture', 'startup-wait'].includes(event.type));
    assert.equal(result.playwright.code, 0, 'Existing Playwright campaign failed');
    assert.equal(result.unexpected.length, 0, 'Unexpected fixture, external fetch or application 5xx observed');
    result.status = 'PASS';
  } catch (error) {
    result.error = error.message;
    throw error;
  } finally {
    const cleanup = await Promise.allSettled([stopGroup(tests), stopGroup(next), fixture.close()]);
    process.removeListener('SIGTERM', onTerm);
    process.removeListener('SIGINT', onInt);
    result.cleanup = {
      ownedNextAndPlaywrightGroupsStopped: cleanup[0].status === 'fulfilled' && cleanup[1].status === 'fulfilled',
      ownedHttpServerClosed: cleanup[2].status === 'fulfilled',
      errors: cleanup.filter(item => item.status === 'rejected').map(item => item.reason.message),
    };
    if (result.cleanup.errors.length) result.status = 'PARTIEL';
    if (interrupted) {
      result.status = 'PARTIEL';
      result.interruptedBy = interrupted;
      result.error ??= 'Isolated qualification interrupted during cleanup';
    }
    receipt('result.json', result);
    assert.equal(result.cleanup.errors.length, 0, 'Owned cleanup failed');
    assert.equal(interrupted, null, 'Interrupted qualification cannot exit successfully');
  }
}
async function outside(fontDirectory) {
  assert.equal(process.platform, 'linux', 'This launcher requires a Linux CI runner');
  assert.notEqual(process.getuid(), 0, 'Start the launcher as the ordinary runner user');
  const fonts = realpathSync(fontDirectory);
  assert.equal(JSON.parse(readFileSync(path.join(fonts, 'prepared.json'), 'utf8')).status, 'PASS');
  const browserDirectory = realpathSync(process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME, '.cache/ms-playwright'));
  const temporaryHome = mkdtempSync(path.join(process.env.RUNNER_TEMP || tmpdir(), 'midas-e2e-home-'));
  const parentNamespace = readlinkSync('/proc/self/ns/net');
  mkdirSync(reportDirectory, { recursive: true });
  const command = [
    'set -eu',
    'test "$(readlink /proc/self/ns/net)" != "$1"',
    '/usr/sbin/ip link set dev lo up',
    'exec /usr/bin/setpriv --reuid "$2" --regid "$3" --clear-groups --bounding-set=-all --inh-caps=-all --ambient-caps=-all --no-new-privs "$4" "$5" --inside "$1" "$6" "$7" "$8" "$2" "$3"',
  ].join('\n');
  let outcome;
  let child;
  let interrupted = null;
  const onTerm = () => { interrupted = 'SIGTERM'; child?.kill('SIGTERM'); };
  const onInt = () => { interrupted = 'SIGINT'; child?.kill('SIGINT'); };
  process.once('SIGTERM', onTerm);
  process.once('SIGINT', onInt);
  try {
    child = spawn('/usr/bin/sudo', ['-n', '--', '/usr/bin/unshare', '--net', '--',
      '/bin/sh', '-c', command, 'midas-e2e', parentNamespace, String(process.getuid()), String(process.getgid()),
      process.execPath, script, fonts, temporaryHome, browserDirectory],
    { cwd: root, env: { PATH: systemPath, LANG: 'C.UTF-8' }, stdio: 'inherit' });
    outcome = await new Promise((resolve, reject) => {
      child.once('error', reject); child.once('exit', (code, signal) => resolve({ code, signal }));
    });
    assert.equal(outcome.code, 0, 'Isolated CI qualification failed');
  } finally {
    process.removeListener('SIGTERM', onTerm);
    process.removeListener('SIGINT', onInt);
    rmSync(temporaryHome, { recursive: true, force: true });
    receipt('launcher.json', { status: interrupted ? 'PARTIEL' : outcome?.code === 0 ? 'PASS' : 'FAIL', outcome, interruptedBy: interrupted,
      parentNamespace, privateHomeRemoved: true, productionConfigurationInherited: false });
    assert.equal(interrupted, null, 'Interrupted launcher cannot exit successfully');
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === script) {
  try {
    if (process.argv[2] === '--inside') await inside(process.argv.slice(3));
    else await outside(process.argv[2]);
  } catch (error) {
    receipt('fatal.json', { status: 'FAIL', message: error.message });
    console.error(error.message);
    process.exitCode = 1;
  }
}
