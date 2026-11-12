import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { assertProductionInputs, productionEnvironment, executeStage,
  assertProductionOutput, assertProductionJournal } from './production-build.mjs';

async function owned(run) {
  const root = mkdtempSync(path.join(tmpdir(), 'midas-build-contract-'));
  try { await run(root); } finally { rmSync(root, { recursive: true, force: true }); }
}
function json(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value));
}
function inputs(root) {
  for (const name of ['package-lock.json', 'tsconfig.json', 'tooling/shared-packages.lock.json']) json(path.join(root, name), {});
  json(path.join(root, 'package.json'), { scripts: { build: 'next build' } });
  writeFileSync(path.join(root, 'next.config.ts'), 'export default {};');
}

test('build refuses production env files, dangling env symlinks, stale output and filtered build commands', async () => {
  await owned(async root => {
    inputs(root);
    const original = assertProductionInputs(root);
    assert.equal(Object.keys(original).length, 5);
    for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
      const file = path.join(root, name);
      writeFileSync(file, 'UNTRUSTED_VALUE=not-a-secret');
      assert.throws(() => assertProductionInputs(root), /loadable environment file/);
      rmSync(file);
      symlinkSync(path.join(root, 'absent-target'), file);
      assert.throws(() => assertProductionInputs(root), /loadable environment file/);
      rmSync(file);
    }
    mkdirSync(path.join(root, '.next'));
    assert.throws(() => assertProductionInputs(root), /previous Next output/);
    rmSync(path.join(root, '.next'), { recursive: true });
    json(path.join(root, 'package.json'), { scripts: { build: 'next build --debug-build-paths=src/app/page.tsx' } });
    assert.throws(() => assertProductionInputs(root), /complete canonical/);
  });
});

test('production child configuration does not inherit provider, SSH, proxy, NODE_OPTIONS or npm credentials', () => {
  const injected = { ANTHROPIC_API_KEY: 'forbidden-inherited-value', OPENAI_API_KEY: 'forbidden-inherited-value',
    STRIPE_SECRET_KEY: 'forbidden-inherited-value', SUPABASE_SERVICE_ROLE_KEY: 'forbidden-inherited-value',
    SSH_AUTH_SOCK: '/forbidden-agent', HTTPS_PROXY: 'http://forbidden.invalid',
    NODE_OPTIONS: '--require=/forbidden.cjs', npm_config_userconfig: '/forbidden-npmrc', GITHUB_TOKEN: 'forbidden-inherited-value' };
  const previous = Object.fromEntries(Object.keys(injected).map(key => [key, process.env[key]]));
  try {
    Object.assign(process.env, injected);
    const env = productionEnvironment({ root: '/owned/midas', temporaryHome: '/owned/home', fontDirectory: '/owned/fonts', journal: '/owned/requests.jsonl' });
    assert.equal(env.NODE_ENV, 'production');
    assert.equal(env.HOME, '/owned/home');
    assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, 'http://127.0.0.1:3000/__e2e/supabase');
    assert.match(env.STRIPE_SECRET_KEY, /^sk_test_.*no_authority$/);
    assert.match(env.SUPABASE_SERVICE_ROLE_KEY, /no-authority$/);
    assert.equal(env.NODE_OPTIONS, '--require=/owned/midas/scripts/e2e/preload.cjs');
    assert(!JSON.stringify(env).includes('forbidden'));
    for (const key of ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'SSH_AUTH_SOCK', 'HTTPS_PROXY', 'npm_config_userconfig', 'GITHUB_TOKEN']) assert(!(key in env));
  } finally {
    for (const [key, value] of Object.entries(previous)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

test('real child failure and signal propagate; a timeout terminates the owned process group', { timeout: 15000 }, async () => {
  await owned(async root => {
    const stages = {};
    const children = new Set();
    const options = name => ({ cwd: root, env: { PATH: path.dirname(process.execPath) },
      log: path.join(root, name + '.log'), timeoutMs: 2000, stages, children });
    await executeStage('ok', process.execPath, ['-e', 'process.exit(0)'], options('ok'));
    assert.equal(stages.ok.code, 0);
    await assert.rejects(executeStage('build', process.execPath, ['-e', 'process.exit(19)'], options('failure')), /build failed/);
    assert.equal(stages.build.code, 19);
    await assert.rejects(executeStage('signal', process.execPath, ['-e', "process.kill(process.pid, 'SIGTERM')"], options('signal')), /was interrupted/);
    assert.equal(stages.signal.signal, 'SIGTERM');
    const pidFile = path.join(root, 'child.pid');
    await assert.rejects(executeStage('timeout', process.execPath, ['-e',
      "require('node:fs').writeFileSync(process.argv[1], String(process.pid)); process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)", pidFile],
    { ...options('timeout'), timeoutMs: 1000 }), /timed out/);
    assert.equal(stages.timeout.timedOut, true);
    const pid = Number(readFileSync(pidFile, 'utf8'));
    assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
    assert.equal(children.size, 0);
  });
});

test('successful command exit cannot replace complete production artifacts or disabled type checks', async () => {
  await owned(async root => {
    const next = path.join(root, '.next');
    mkdirSync(next);
    assert.throws(() => assertProductionOutput(root), { code: 'ENOENT' });
    writeFileSync(path.join(next, 'BUILD_ID'), '');
    const config = { typescript: { ignoreBuildErrors: false, tsconfigPath: 'tsconfig.json' }, distDir: '.next' };
    json(path.join(next, 'required-server-files.json'), { config });
    const routes = Object.fromEntries(['/login/page', '/api/chat/route', '/api/trade/execute/route', '/api/signals/generate/route']
      .map(route => [route, 'app' + route + '.js']));
    json(path.join(next, 'server/app-paths-manifest.json'), routes);
    assert.throws(() => assertProductionOutput(root), /must not be empty/);
    writeFileSync(path.join(next, 'BUILD_ID'), 'synthetic-artifact-contract-only');
    assert.throws(() => assertProductionOutput(root), { code: 'ENOENT' });
    for (const filename of Object.values(routes)) {
      mkdirSync(path.dirname(path.join(next, 'server', filename)), { recursive: true });
      writeFileSync(path.join(next, 'server', filename), '// synthetic test artifact, never Next output');
    }
    assert.equal(assertProductionOutput(root).compiledAppRoutes, 4);
    config.typescript.ignoreBuildErrors = true;
    json(path.join(next, 'required-server-files.json'), { config });
    assert.throws(() => assertProductionOutput(root), /must remain enabled/);
    config.typescript.ignoreBuildErrors = false;
    json(path.join(next, 'required-server-files.json'), { config });
    routes['/login/page'] = '../../../outside.js';
    json(path.join(next, 'server/app-paths-manifest.json'), routes);
    assert.throws(() => assertProductionOutput(root), /escaped/);
    assert(!existsSync(path.join(root, 'outside.js')));
  });
});

test('cancellation cleans up a SIGTERM-resistant child before its long stage timeout', { timeout: 10000 }, async () => {
  await owned(async root => {
    const controller = new AbortController();
    const stages = {};
    const children = new Set();
    const pidFile = path.join(root, 'cancel-child.pid');
    const outcome = executeStage('cancelled-build', process.execPath, ['-e',
      "process.on('SIGTERM', () => {}); require('node:fs').writeFileSync(process.argv[1], String(process.pid)); setInterval(() => {}, 1000)", pidFile],
    { cwd: root, env: { PATH: path.dirname(process.execPath) }, log: path.join(root, 'cancel.log'),
      timeoutMs: 60000, stages, children, signal: controller.signal }).then(() => null, error => error);
    const readyDeadline = Date.now() + 2000;
    while (!existsSync(pidFile) && Date.now() < readyDeadline) await delay(10);
    const started = Date.now();
    controller.abort('SIGTERM');
    const error = await outcome;
    assert.match(error?.message ?? '', /was interrupted/);
    assert(Date.now() - started < 5000, 'Cancellation must not wait for the 60-second stage timeout');
    assert.equal(stages['cancelled-build'].interruptedBy, 'SIGTERM');
    assert.equal(stages['cancelled-build'].signal, 'SIGKILL');
    const pid = Number(readFileSync(pidFile, 'utf8'));
    assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
    assert.equal(children.size, 0);
  });
});

test('provider or application failure remains fatal even if the command otherwise succeeded', async () => {
  await owned(async root => {
    const journal = path.join(root, 'requests.jsonl');
    const allowed = [{ type: 'fixture', contract: 'pinned-woff2' }, { type: 'startup-wait' }];
    writeFileSync(journal, allowed.map(value => JSON.stringify(value)).join('\n'));
    assert.equal(assertProductionJournal(journal).unexpected, 0);
    for (const event of [
      { type: 'unexpected-external-fetch', origin: 'https://provider.invalid' },
      { type: 'application-5xx', status: 500 }, { type: 'application-proxy-error' },
      { type: 'fixture', contract: 'in-memory-contact-insert' },
      { type: 'fixture', contract: 'synthetic-public-prices' },
    ]) {
      writeFileSync(journal, [...allowed, event].map(value => JSON.stringify(value)).join('\n'));
      assert.throws(() => assertProductionJournal(journal), /Unexpected fixture/);
    }
  });
});
