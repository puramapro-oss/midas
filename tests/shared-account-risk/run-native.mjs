// Full local/CI gate. The underlying diagnostic script remains available for
// filtered investigations, but a filtered run must never satisfy this gate.
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

assert(!process.env.SHARED_RISK_TEST_FILTER,
  'The complete shared-account-risk gate does not permit SHARED_RISK_TEST_FILTER');

const root = fileURLToPath(new URL('../../', import.meta.url));
const runtime = path.resolve(process.env.SHARED_RISK_PG_RUNTIME ??
  fileURLToPath(new URL('./runtime', import.meta.url)));
const evidenceRoot = path.resolve(process.env.SHARED_RISK_EVIDENCE ??
  path.join(root, 'test-results/shared-account-risk'));
await mkdir(evidenceRoot, { recursive: true });
// Each invocation gets new receipts so an old success cannot be reused.
const evidence = await mkdtemp(path.join(evidenceRoot, 'native-'));
process.env.SHARED_RISK_PG_RUNTIME = runtime;
process.env.SHARED_RISK_EVIDENCE = evidence;

await import('./native-contract.mjs');

const results = JSON.parse(await readFile(path.join(evidence, 'native-results.json'), 'utf8'));
const receipt = JSON.parse(await readFile(path.join(evidence, 'native-runtime.json'), 'utf8'));
assert.equal(results.filter, null, 'The native contract must run without a filter');
assert.deepEqual(results.skipped, [], 'The native contract must not skip checks');
assert(results.checks.length > 0 && results.checks.every(check => check.status === 'PASS'),
  'Every native contract check must pass');
assert.equal(receipt.status, 'PASS');
assert.equal(receipt.runtime.started, true);
assert.equal(receipt.runtime.stopped, true, 'The private cluster must be stopped');
assert.equal(receipt.runtime.removed, true, 'The private cluster must be removed');
console.log(`PASS ${results.checks.length} native checks; no skips; private cluster stopped and removed`);
console.log(`Evidence: ${evidence}`);
