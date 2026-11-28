import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const [toolsDirectory, fontDirectory, mode] = process.argv.slice(2);
assert(['gain', 'all'].includes(mode));
assert.notEqual(process.getuid(), 0);
assert.deepEqual(Object.keys(networkInterfaces()), ['lo']);
assert.match(readFileSync('/proc/self/status', 'utf8'), /^NoNewPrivs:\s+1$/m);
assert.match(readFileSync('/proc/self/status', 'utf8'), /^CapEff:\s+0+$/m);

const support = path.join(toolsDirectory, 'scripts/e2e');
const { default: fixtures } = await import(pathToFileURL(path.join(support, 'fixtures.cjs')));
const { loadPreparedFonts } = await import(pathToFileURL(path.join(support, 'prepare-fonts.mjs')));
const { fonts } = loadPreparedFonts(fontDirectory);
const journal = path.join(process.env.TMPDIR, mode + '-providers.jsonl');
writeFileSync(journal, '', { flag: 'wx' });
const fixture = fixtures.createFixtureServer({ journal, fonts });
const env = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: '1',
  MIDAS_E2E_ISOLATED: '1',
  MIDAS_E2E_JOURNAL: journal,
  NEXT_PUBLIC_SUPABASE_URL: fixtures.ORIGIN + '/__e2e/supabase',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: fixtures.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: fixtures.SERVICE_KEY,
  UPSTASH_REDIS_REST_URL: fixtures.ORIGIN + '/__e2e/redis',
  UPSTASH_REDIS_REST_TOKEN: fixtures.REDIS_KEY,
  STRIPE_SECRET_KEY: 'sk_test_midas_fixture_no_authority',
  STRIPE_WEBHOOK_SECRET: 'whsec_midas_fixture_invalid_signatures_only',
  NEXT_FONT_GOOGLE_MOCKED_RESPONSES: path.join(fontDirectory, 'responses.cjs'),
  NODE_OPTIONS: '--require=' + path.join(support, 'preload.cjs'),
};
const groups = [];
function run(args) {
  const child = spawn(process.execPath, args, { env, stdio: 'inherit', detached: true });
  groups.push(child);
  return child;
}
function stop() {
  for (const child of groups) {
    if (!child.pid || child.exitCode !== null || child.signalCode) continue;
    try { process.kill(-child.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
}
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, stop);
try {
  await new Promise((resolve, reject) => {
    fixture.server.once('error', reject);
    fixture.server.listen(3000, '127.0.0.1', resolve);
  });
  const next = run(['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3001']);
  const deadline = Date.now() + 110_000;
  let ready = false;
  while (!ready && Date.now() < deadline) {
    assert.equal(next.exitCode, null, 'Next exited before readiness.');
    try {
      const response = await fetch('http://127.0.0.1:3001/pricing', { signal: AbortSignal.timeout(30_000) });
      if (response.status === 200) {
        assert.match(await response.text(), /Simuler mes frais et répartir mon gain/);
        ready = true;
      } else {
        throw new Error('Unexpected /pricing readiness response: ' + response.status);
      }
    } catch (error) {
      if (error.cause?.code !== 'ECONNREFUSED' && error.name !== 'TimeoutError') throw error;
      await delay(500);
    }
  }
  assert(ready, 'The candidate /pricing route did not become ready.');
  fixture.markReady();
  const args = ['node_modules/@playwright/test/cli.js', 'test', '-c', '.github/ci/playwright.config.ts'];
  if (mode === 'gain') args.push('gain-allocation.spec.ts');
  const tests = run(args);
  const code = await new Promise((resolve, reject) => {
    tests.once('error', reject);
    tests.once('close', resolve);
  });
  assert.equal(code, 0, 'Playwright campaign failed.');
} finally {
  stop();
  await fixture.close();
}
