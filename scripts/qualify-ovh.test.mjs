import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { COMPONENTS, MAX_OBSERVATION_AGE_MS, evaluateOvhQualification } from './qualify-ovh.mjs'

const now = Date.parse('2026-11-10T12:00:00.000Z')
const stamp = new Date(now).toISOString()
const evidence = () => ({ source: 'synthetic-fixture-only.json', sha256: 'a'.repeat(64) })
function fixture() {
  // Synthetic observations test the validator; they are never deployment evidence.
  const versions = Object.fromEntries(COMPONENTS.map((name, i) => [name, String(i + 1).repeat(40)]))
  return {
    manifest: { schemaVersion: 1, application: 'midas', minimumHostingerReservePercent: 20, expectedVersions: versions },
    inventory: {
      schemaVersion: 1, environment: 'ovh', capturedAt: stamp, evidence: evidence(),
      safety: { liveEnabled: false, realOrdersEnabled: false },
      components: COMPONENTS.map(name => ({
        name, effectiveVersion: versions[name], observedAt: stamp, evidence: evidence(),
        processState: name === 'live-worker' ? 'disabled' : 'running',
        health: { status: 'healthy', observedAt: stamp },
      })),
      hostinger: {
        provider: 'hostinger', capturedAt: stamp, evidence: evidence(),
        resources: Object.fromEntries(['cpu', 'memory', 'disk'].map(name => [name, { usedPercent: 50, additionalPeakPercent: 30 }])),
      },
    },
  }
}
const evaluate = ({ manifest, inventory }) => evaluateOvhQualification(manifest, inventory, { now })
const has = (result, code) => result.errors.some(error => error.code === code)

test('four independently pinned observations pass with LIVE disabled and exactly 20 percent reserve', () => {
  const result = evaluate(fixture())
  assert.equal(result.status, 'PASS')
  assert.equal(result.migrationAuthorized, false)
  assert.deepEqual(result.errors, [])
})

test('the checked-in manifest cannot qualify fabricated component versions or missing OVH evidence', async () => {
  const manifest = JSON.parse(await readFile(new URL('../deploy/ovh-qualification.json', import.meta.url), 'utf8'))
  const result = evaluateOvhQualification(manifest, undefined, { now })
  assert.equal(result.status, 'BLOCKED')
  assert.equal(result.errors.filter(error => error.code === 'EXPECTED_VERSION_MISSING').length, 4)
  assert.ok(has(result, 'OVH_INVENTORY_MISSING'))
})

test('every component is mandatory and independently version checked', () => {
  for (const name of COMPONENTS) {
    const missing = fixture()
    missing.inventory.components = missing.inventory.components.filter(component => component.name !== name)
    assert.ok(has(evaluate(missing), 'COMPONENT_MISSING'), name)
    const changed = fixture()
    changed.inventory.components.find(component => component.name === name).effectiveVersion = 'f'.repeat(40)
    assert.ok(has(evaluate(changed), 'VERSION_MISMATCH'), name)
  }
})

test('duplicate or unrecognized components cannot stand in for a required worker', () => {
  const duplicate = fixture()
  duplicate.inventory.components.push({ ...duplicate.inventory.components[0] })
  assert.ok(has(evaluate(duplicate), 'DUPLICATE_COMPONENT'))
  const unknown = fixture()
  unknown.inventory.components[1].name = 'next-cron'
  assert.ok(has(evaluate(unknown), 'UNEXPECTED_COMPONENT'))
  assert.ok(has(evaluate(unknown), 'COMPONENT_MISSING'))
})

test('missing, floating and malformed effective versions do not qualify', () => {
  for (const effectiveVersion of [undefined, null, '', 'latest', 'v1.2.3', 123, 'a'.repeat(39)]) {
    const data = fixture()
    data.inventory.components[0].effectiveVersion = effectiveVersion
    assert.ok(has(evaluate(data), 'EFFECTIVE_VERSION_MISSING'))
  }
})

test('an immutable image digest may pin a worker independently of the app commit', () => {
  const data = fixture()
  data.manifest.expectedVersions.watchdog = 'sha256:' + 'b'.repeat(64)
  data.inventory.components[1].effectiveVersion = data.manifest.expectedVersions.watchdog
  assert.equal(evaluate(data).status, 'PASS')
})

test('missing, stale, future and impossible observation times cannot qualify', () => {
  for (const capturedAt of [undefined, null, 'invalid', 0, '2026-02-31T12:00:00Z',
    new Date(now - MAX_OBSERVATION_AGE_MS - 1).toISOString(), new Date(now + 1).toISOString()]) {
    const data = fixture()
    data.inventory.capturedAt = capturedAt
    assert.ok(has(evaluate(data), 'OBSERVATION_INVALID_OR_STALE'))
  }
})

test('fresh inventory cannot hide a stale component, health result or Hostinger measurement', () => {
  const stale = new Date(now - MAX_OBSERVATION_AGE_MS - 1).toISOString()
  for (const change of [
    data => { data.inventory.components[0].observedAt = stale },
    data => { data.inventory.components[0].health.observedAt = stale },
    data => { data.inventory.hostinger.capturedAt = stale },
  ]) {
    const data = fixture(); change(data)
    assert.ok(has(evaluate(data), 'OBSERVATION_INVALID_OR_STALE'))
  }
})

test('every observation requires an evidence reference and SHA-256', () => {
  for (const target of ['inventory', 'component', 'capacity']) {
    const data = fixture()
    if (target === 'inventory') delete data.inventory.evidence
    if (target === 'component') delete data.inventory.components[2].evidence
    if (target === 'capacity') delete data.inventory.hostinger.evidence
    assert.ok(has(evaluate(data), 'EVIDENCE_MISSING'))
  }
})

test('unknown, degraded or stopped required processes cannot qualify as healthy', () => {
  for (const health of [undefined, null, { status: 'degraded', observedAt: stamp }, { status: 'unknown', observedAt: stamp }]) {
    const data = fixture(); data.inventory.components[0].health = health
    assert.ok(has(evaluate(data), 'HEALTH_UNPROVEN'))
  }
  const stopped = fixture(); stopped.inventory.components[1].processState = 'stopped'
  assert.ok(has(evaluate(stopped), 'PROCESS_NOT_READY'))
})

test('LIVE may remain stopped; running it never relaxes its safety or health conditions', () => {
  const stopped = fixture(); stopped.inventory.components[2].processState = 'stopped'; delete stopped.inventory.components[2].health
  assert.equal(evaluate(stopped).status, 'PASS')
  const running = fixture(); running.inventory.components[2].processState = 'running'
  assert.equal(evaluate(running).status, 'PASS')
  running.inventory.components[2].health.status = 'unknown'
  assert.ok(has(evaluate(running), 'HEALTH_UNPROVEN'))
  for (const unsafe of [undefined, {}, { liveEnabled: true, realOrdersEnabled: false }, { liveEnabled: false, realOrdersEnabled: true }]) {
    const data = fixture(); data.inventory.safety = unsafe
    assert.ok(has(evaluate(data), 'LIVE_SAFETY_UNPROVEN'))
  }
})

test('each Hostinger resource retains at least 20 percent after projected peak additions', () => {
  for (const resource of ['cpu', 'memory', 'disk']) {
    const data = fixture(); data.inventory.hostinger.resources[resource].additionalPeakPercent = 30.001
    assert.ok(has(evaluate(data), 'HOSTINGER_RESERVE_INSUFFICIENT'), resource)
  }
})

test('missing, negative, nonnumeric, NaN or infinite capacities fail closed', () => {
  for (const value of [undefined, null, '', '50', -1, NaN, Infinity, 101]) {
    for (const field of ['usedPercent', 'additionalPeakPercent']) {
      const data = fixture(); data.inventory.hostinger.resources.memory[field] = value
      assert.ok(has(evaluate(data), 'CAPACITY_INVALID'), `${field}: ${String(value)}`)
    }
  }
})

test('the reserve policy cannot be relaxed below 20 percent or made nonfinite', () => {
  for (const reserve of [undefined, null, 0, 19.999, NaN, Infinity, 101]) {
    const data = fixture(); data.manifest.minimumHostingerReservePercent = reserve
    assert.ok(has(evaluate(data), 'RESERVE_POLICY_INVALID'))
  }
  const stricter = fixture(); stricter.manifest.minimumHostingerReservePercent = 25
  assert.ok(has(evaluate(stricter), 'HOSTINGER_RESERVE_INSUFFICIENT'))
})

test('command without inventory exits blocked, never silently successful', () => {
  const result = spawnSync(process.execPath, [new URL('./qualify-ovh.mjs', import.meta.url).pathname], { encoding: 'utf8' })
  assert.equal(result.status, 2)
  const body = JSON.parse(result.stdout)
  assert.equal(body.status, 'BLOCKED')
  assert.equal(body.migrationAuthorized, false)
  assert.ok(has(body, 'OVH_INVENTORY_MISSING'))
})
