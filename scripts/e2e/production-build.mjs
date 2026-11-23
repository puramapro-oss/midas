import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { appendFileSync, existsSync, lstatSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import fixtures from './fixtures.cjs';
import { loadPreparedFonts, assertFontRuntime } from './prepare-fonts.mjs';

const { ORIGIN, ANON_KEY, SERVICE_KEY, REDIS_KEY, createFixtureServer } = fixtures;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const inputNames = ['package.json', 'package-lock.json', 'tooling/shared-packages.lock.json', 'tsconfig.json', 'next.config.ts'];

export function assertProductionInputs(root) {
  // Next loads these files even with an otherwise allowlisted child environment.
  // lstat also refuses dangling symlinks without reading their contents.
  for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    let present = false;
    try { lstatSync(path.join(root, name)); present = true; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    assert(!present, 'Production qualification refuses a loadable environment file: ' + name);
  }
  assert.equal(JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).scripts.build, 'next build',
    'The qualification must execute the complete canonical next build command');
  assert(!existsSync(path.join(root, '.next')), 'A fresh qualification checkout must have no previous Next output');
  return Object.fromEntries(inputNames.map(name => [name, hash(readFileSync(path.join(root, name)))]));
}

export function productionEnvironment({ root, temporaryHome, fontDirectory, journal }) {
  // Never spread process.env: no provider, SSH, Git, proxy or npm credentials.
  return {
    PATH: path.dirname(process.execPath) + ':/usr/sbin:/usr/bin:/sbin:/bin',
    HOME: temporaryHome, TMPDIR: temporaryHome, LANG: 'C.UTF-8',
    CI: 'true', NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
    MIDAS_E2E_ISOLATED: '1', MIDAS_E2E_JOURNAL: journal,
    NEXT_PUBLIC_SUPABASE_URL: ORIGIN + '/__e2e/supabase',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
    UPSTASH_REDIS_REST_URL: ORIGIN + '/__e2e/redis', UPSTASH_REDIS_REST_TOKEN: REDIS_KEY,
    STRIPE_SECRET_KEY: 'sk_test_midas_fixture_no_authority',
    STRIPE_WEBHOOK_SECRET: 'whsec_midas_fixture_invalid_signatures_only',
    NEXT_PUBLIC_APP_URL: ORIGIN, NEXT_PUBLIC_SITE_URL: ORIGIN,
    NEXT_FONT_GOOGLE_MOCKED_RESPONSES: path.join(fontDirectory, 'responses.cjs'),
    NODE_OPTIONS: '--require=' + path.join(root, 'scripts/e2e/preload.cjs'),
  };
}

function start(command, args, { cwd, env, log }) {
  writeFileSync(log, '', { flag: 'wx', mode: 0o600 });
  const child = spawn(command, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let bytes = 0;
  let overflow = false;
  const capture = chunk => {
    bytes += chunk.length;
    if (bytes > 8 * 1024 * 1024) {
      overflow = true;
      try { process.kill(-child.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
      return;
    }
    appendFileSync(log, chunk);
    process.stdout.write(chunk);
  };
  child.stdout.on('data', capture);
  child.stderr.on('data', capture);
  let spawnError;
  child.once('error', error => { spawnError = error.code ?? error.name; });
  const completion = new Promise(resolve => child.once('close', (code, signal) =>
    resolve({ code, signal, spawnError, logOverflow: overflow })));
  return { child, completion };
}

async function stop(processInfo) {
  if (!processInfo?.child.pid) return;
  const pid = processInfo.child.pid;
  const signal = name => { try { process.kill(-pid, name); } catch (error) { if (error.code !== 'ESRCH') throw error; } };
  signal('SIGTERM');
  await Promise.race([processInfo.completion, delay(3000, undefined, { ref: false })]);
  signal('SIGKILL');
  const reaped = await Promise.race([processInfo.completion.then(() => true), delay(3000, false, { ref: false })]);
  assert(reaped, 'Owned production process did not terminate');
  const deadline = Date.now() + 1000;
  while (Date.now() < deadline) {
    try { process.kill(-pid, 0); }
    catch (error) { if (error.code === 'ESRCH') return; throw error; }
    await delay(25);
  }
  throw new Error('An owned production process group remains after cleanup');
}

export async function executeStage(stage, command, args, options) {
  assert(!options.signal?.aborted, stage + ' was interrupted before starting');
  const task = start(command, args, options);
  options.children?.add(task);
  let timer;
  let onAbort;
  let result;
  try {
    const timeout = new Promise(resolve => { timer = setTimeout(() => resolve({ timedOut: true }), options.timeoutMs); });
    const cancellation = new Promise(resolve => {
      onAbort = () => resolve({ interruptedBy: options.signal.reason ?? 'aborted' });
      if (options.signal?.aborted) onAbort();
      else options.signal?.addEventListener('abort', onAbort, { once: true });
    });
    result = await Promise.race([task.completion, timeout, cancellation]);
  } finally {
    clearTimeout(timer);
    if (onAbort) options.signal?.removeEventListener('abort', onAbort);
    await stop(task);
    options.children?.delete(task);
  }
  const receipt = { ...await task.completion, ...result, logSha256: hash(readFileSync(options.log)) };
  options.stages[stage] = receipt;
  assert.equal(result.interruptedBy, undefined, stage + ' was interrupted');
  assert.equal(result.timedOut, undefined, stage + ' timed out');
  assert.equal(result.spawnError, undefined, stage + ' could not start');
  assert.equal(result.logOverflow, false, stage + ' exceeded the bounded log budget');
  assert.equal(result.signal, null, stage + ' was interrupted');
  assert.equal(result.code, 0, stage + ' failed');
  return receipt;
}

export function assertProductionOutput(root) {
  const next = path.join(root, '.next');
  const required = ['BUILD_ID', 'required-server-files.json', 'server/app-paths-manifest.json'];
  const hashes = {};
  for (const name of required) {
    const filename = path.join(next, name);
    assert(lstatSync(filename).isFile(), 'Missing or substituted complete build output: ' + name);
    hashes[name] = hash(readFileSync(filename));
  }
  assert(readFileSync(path.join(next, 'BUILD_ID'), 'utf8').trim(), 'Production BUILD_ID must not be empty');
  const server = JSON.parse(readFileSync(path.join(next, 'required-server-files.json'), 'utf8'));
  assert(!server.config.experimental?.runtimeServerDeploymentId,
    'A filtered runtime config cannot attest production TypeScript settings');
  assert.equal(server.config.typescript.ignoreBuildErrors, false, 'Build type checking must remain enabled');
  // Next 16.4.5 config-shared defaults this to undefined, which JSON omits.
  // verify-typescript-setup resolves that default to the canonical project.
  const typeScriptProject = server.config.typescript.tsconfigPath === undefined
    ? 'tsconfig.json' : server.config.typescript.tsconfigPath;
  assert.equal(typeScriptProject, 'tsconfig.json', 'The effective production TypeScript project must remain canonical');
  assert.equal(server.config.distDir, '.next');
  const routes = JSON.parse(readFileSync(path.join(next, 'server/app-paths-manifest.json'), 'utf8'));
  for (const route of ['/login/page', '/api/chat/route', '/api/trade/execute/route', '/api/signals/generate/route']) {
    assert.equal(typeof routes[route], 'string', 'Missing compiled smoke route: ' + route);
    const filename = path.resolve(next, 'server', routes[route]);
    assert(filename.startsWith(path.join(next, 'server') + path.sep), 'Compiled route escaped the build');
    assert(lstatSync(filename).isFile(), 'Compiled route must be a regular file');
  }
  return { hashes, compiledAppRoutes: Object.keys(routes).length, typeCheckingEnabled: true, typeScriptProject };
}

export function assertProductionJournal(journal) {
  const events = readFileSync(journal, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  const unexpected = events.filter(event => !(event.type === 'startup-wait'
    || (event.type === 'fixture' && event.contract === 'pinned-woff2')));
  assert.equal(unexpected.length, 0, 'Unexpected fixture, provider fetch or application error during production qualification');
  return { events: events.length, pinnedFontRequests: events.filter(event => event.contract === 'pinned-woff2').length,
    unexpected: unexpected.length };
}

export async function runProductionQualification({ root, fontDirectory, temporaryHome, reportDirectory, verifyHttpGates }) {
  const journal = path.join(reportDirectory, 'requests.jsonl');
  const result = { status: 'FAIL', scope: 'synthetic-production-build-not-a-deployment', deployableArtifact: false,
    phase: 'preflight', stages: Object.fromEntries(['typegen', 'tsc', 'build', 'artifacts', 'start', 'smoke'].map(name => [name, { status: 'NON TESTÉ' }])) };
  const children = new Set();
  const cancellation = new AbortController();
  let fixture;
  let interrupted = null;
  const interrupt = signal => {
    interrupted = signal;
    cancellation.abort(signal);
    for (const { child } of children) if (child.pid) {
      try { process.kill(-child.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') console.error(error.code); }
    }
  };
  const onTerm = () => interrupt('SIGTERM');
  const onInt = () => interrupt('SIGINT');
  process.once('SIGTERM', onTerm);
  process.once('SIGINT', onInt);
  try {
    result.inputs = assertProductionInputs(root);
    result.sourceHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    result.sourceTree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: root, encoding: 'utf8' }).trim();
    execFileSync('git', ['diff', '--exit-code', 'HEAD', '--', ...inputNames, 'src', 'scripts/e2e'], { cwd: root, stdio: 'pipe' });
    const { manifest, fonts } = loadPreparedFonts(fontDirectory);
    assertFontRuntime(manifest);
    result.fontLockSha256 = manifest.lockSha256;
    const env = productionEnvironment({ root, temporaryHome, fontDirectory, journal });
    writeFileSync(journal, '', { flag: 'wx', mode: 0o600 });
    fixture = createFixtureServer({ journal, fonts });
    await new Promise((resolve, reject) => { fixture.server.once('error', reject); fixture.server.listen(3000, '127.0.0.1', resolve); });
    const run = async (stage, command, args, timeoutMs) => {
      assert.equal(interrupted, null, 'Production qualification was interrupted');
      result.phase = stage;
      await executeStage(stage, command, args, { cwd: root, env, log: path.join(reportDirectory, stage + '.log'),
        timeoutMs, children, stages: result.stages, signal: cancellation.signal });
      result.stages[stage].status = 'PASS';
    };
    await run('typegen', process.execPath, ['node_modules/next/dist/bin/next', 'typegen'], 120000);
    const require = createRequire(path.join(root, 'package.json'));
    const ts = require('typescript');
    const parsed = ts.getParsedCommandLineOfConfigFile(path.join(root, 'tsconfig.json'), {}, {
      ...ts.sys, onUnRecoverableConfigFileDiagnostic() { throw new Error('Canonical TypeScript configuration is invalid'); },
    });
    assert(parsed && parsed.errors.length === 0);
    assert.equal(parsed.options.strict, true);
    assert(parsed.fileNames.some(file => file.startsWith(path.join(root, '.next/types') + path.sep)),
      'Generated route types must participate in the full project check');
    result.typeScope = { project: 'tsconfig.json', rootFiles: parsed.fileNames.length,
      generatedRouteFiles: parsed.fileNames.filter(file => file.startsWith(path.join(root, '.next/types') + path.sep)).length };
    await run('tsc', process.execPath, ['node_modules/typescript/bin/tsc', '--project', 'tsconfig.json', '--noEmit', '--incremental', 'false', '--pretty', 'false'], 180000);
    await run('build', 'npm', ['run', 'build'], 600000);
    result.phase = 'artifacts';
    result.output = assertProductionOutput(root);
    assert.deepEqual(Object.fromEntries(inputNames.map(name => [name, hash(readFileSync(path.join(root, name)))])), result.inputs,
      'Build must not change canonical config, manifests or dependency locks');
    result.network = assertProductionJournal(journal);
    result.stages.artifacts = { status: 'PASS' };
    result.phase = 'start';
    const next = start(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3001'],
      { cwd: root, env, log: path.join(reportDirectory, 'start.log') });
    children.add(next);
    const deadline = Date.now() + 60000;
    let available = false;
    while (Date.now() < deadline) {
      assert.equal(interrupted, null, 'Interrupted before production readiness');
      assert.equal(next.child.exitCode, null, 'Production Next exited before readiness');
      assert.equal(next.child.signalCode, null, 'Production Next was signalled before readiness');
      const response = await fetch(ORIGIN + '/login', { redirect: 'manual', signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())) });
      if (response.status !== 502) {
        assert.equal(response.status, 200, 'Production login must return 200');
        const csp = response.headers.get('content-security-policy') ?? '';
        assert(csp.includes('upgrade-insecure-requests') && !csp.includes("'unsafe-eval'"), 'The production CSP must be active');
        available = true;
        await response.body?.cancel();
        break;
      }
      await response.body?.cancel();
      await delay(250);
    }
    assert(available, 'Production server exceeded the existing 60-second readiness budget');
    fixture.markReady();
    result.stages.start = { status: 'PASS', readinessStatus: 200, productionCsp: true };
    result.phase = 'smoke';
    result.stages.smoke = { status: 'PASS', gates: await verifyHttpGates() };
    result.network = assertProductionJournal(journal);
    assert.equal(interrupted, null, 'Production qualification was interrupted');
    assert.equal(next.child.exitCode, null, 'Production server exited during smoke verification');
    assert.equal(next.child.signalCode, null, 'Production server was signalled during smoke verification');
    result.status = 'PASS';
  } catch (error) {
    result.error = error.message;
    if (result.stages[result.phase]) result.stages[result.phase].status = 'FAIL';
    throw error;
  } finally {
    const cleanup = await Promise.allSettled([...children].map(stop).concat(fixture ? [fixture.close()] : []));
    process.removeListener('SIGTERM', onTerm);
    process.removeListener('SIGINT', onInt);
    result.cleanup = { ownedGroupsAndFixtureStopped: cleanup.every(item => item.status === 'fulfilled'),
      errors: cleanup.filter(item => item.status === 'rejected').map(item => item.reason.message) };
    if (result.cleanup.errors.length || interrupted) result.status = 'PARTIEL';
    result.interruptedBy = interrupted;
    writeFileSync(path.join(reportDirectory, 'result.json'), JSON.stringify({ at: new Date().toISOString(), ...result }, null, 2) + '\n');
    assert.equal(result.cleanup.errors.length, 0, 'Owned production cleanup failed');
    assert.equal(interrupted, null, 'Interrupted production qualification cannot pass');
  }
}
