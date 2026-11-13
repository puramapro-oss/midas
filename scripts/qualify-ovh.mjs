import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

export const COMPONENTS = Object.freeze(['app', 'watchdog', 'live-worker', 'analysis-worker'])
export const MAX_OBSERVATION_AGE_MS = 300_000
const MINIMUM_RESERVE_PERCENT = 20
const VERSION = /^(?:[a-f0-9]{40}|sha256:[a-f0-9]{64})$/
const DIGEST = /^[a-f0-9]{64}$/
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const finitePercent = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100

function recent(value, now) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return false
  const time = Date.parse(value)
  const canonical = value.includes('.')
    ? value.replace(/\.(\d{1,3})Z$/, (_, fraction) => '.' + fraction.padEnd(3, '0') + 'Z')
    : value.replace(/Z$/, '.000Z')
  return Number.isFinite(time) && new Date(time).toISOString() === canonical && time <= now && now - time <= MAX_OBSERVATION_AGE_MS
}

/**
 * Validate supplied observation evidence. This does not collect or authenticate
 * remote state, start any process, install anything, or authorize a migration.
 * Version expectations must be pinned separately for each actual component.
 */
export function evaluateOvhQualification(manifest, inventory, { now = Date.now() } = {}) {
  const errors = []
  const error = (code, path) => errors.push({ code, path })
  const evidence = (value, path) => {
    if (!isRecord(value) || typeof value.source !== 'string' || value.source.trim().length === 0 ||
        typeof value.sha256 !== 'string' || !DIGEST.test(value.sha256)) error('EVIDENCE_MISSING', path)
  }
  const observed = (value, path) => {
    if (!Number.isFinite(now) || !recent(value, now)) error('OBSERVATION_INVALID_OR_STALE', path)
  }
  if (!isRecord(manifest) || manifest.schemaVersion !== 1 || manifest.application !== 'midas') {
    error('MANIFEST_INVALID', 'manifest')
  }
  const expected = isRecord(manifest?.expectedVersions) ? manifest.expectedVersions : {}
  for (const name of COMPONENTS) {
    if (typeof expected[name] !== 'string' || !VERSION.test(expected[name])) error('EXPECTED_VERSION_MISSING', `expectedVersions.${name}`)
  }
  for (const name of Object.keys(expected)) {
    if (!COMPONENTS.includes(name)) error('UNEXPECTED_COMPONENT', `expectedVersions.${name}`)
  }
  const reserve = manifest?.minimumHostingerReservePercent
  if (!finitePercent(reserve) || reserve < MINIMUM_RESERVE_PERCENT) error('RESERVE_POLICY_INVALID', 'minimumHostingerReservePercent')

  if (!isRecord(inventory) || inventory.schemaVersion !== 1 || inventory.environment !== 'ovh') {
    error('OVH_INVENTORY_MISSING', 'inventory')
  }
  observed(inventory?.capturedAt, 'inventory.capturedAt')
  evidence(inventory?.evidence, 'inventory.evidence')
  if (inventory?.safety?.liveEnabled !== false || inventory?.safety?.realOrdersEnabled !== false) {
    error('LIVE_SAFETY_UNPROVEN', 'inventory.safety')
  }

  const components = Array.isArray(inventory?.components) ? inventory.components : []
  const names = new Set()
  for (const component of components) {
    if (!isRecord(component) || !COMPONENTS.includes(component.name)) {
      error('UNEXPECTED_COMPONENT', 'inventory.components')
      continue
    }
    const name = component.name
    const path = `inventory.components.${name}`
    if (names.has(name)) error('DUPLICATE_COMPONENT', path)
    names.add(name)
    observed(component.observedAt, `${path}.observedAt`)
    evidence(component.evidence, `${path}.evidence`)
    if (typeof component.effectiveVersion !== 'string' || !VERSION.test(component.effectiveVersion)) {
      error('EFFECTIVE_VERSION_MISSING', `${path}.effectiveVersion`)
    } else if (component.effectiveVersion !== expected[name]) {
      error('VERSION_MISMATCH', `${path}.effectiveVersion`)
    }
    // LIVE may remain stopped/disabled; qualification must never require enabling it.
    const safelyInactive = name === 'live-worker' && ['stopped', 'disabled'].includes(component.processState)
    if (!safelyInactive) {
      if (component.processState !== 'running') error('PROCESS_NOT_READY', `${path}.processState`)
      if (component.health?.status !== 'healthy') error('HEALTH_UNPROVEN', `${path}.health.status`)
      observed(component.health?.observedAt, `${path}.health.observedAt`)
    }
  }
  for (const name of COMPONENTS) if (!names.has(name)) error('COMPONENT_MISSING', `inventory.components.${name}`)

  const capacity = inventory?.hostinger
  if (!isRecord(capacity) || capacity.provider !== 'hostinger') error('HOSTINGER_CAPACITY_MISSING', 'inventory.hostinger')
  observed(capacity?.capturedAt, 'inventory.hostinger.capturedAt')
  evidence(capacity?.evidence, 'inventory.hostinger.evidence')
  for (const name of ['cpu', 'memory', 'disk']) {
    const resource = capacity?.resources?.[name]
    const path = `inventory.hostinger.resources.${name}`
    if (!finitePercent(resource?.usedPercent) || !finitePercent(resource?.additionalPeakPercent)) {
      error('CAPACITY_INVALID', path)
    } else if (100 - resource.usedPercent - resource.additionalPeakPercent < Math.max(MINIMUM_RESERVE_PERCENT, finitePercent(reserve) ? reserve : MINIMUM_RESERVE_PERCENT)) {
      error('HOSTINGER_RESERVE_INSUFFICIENT', path)
    }
  }

  return {
    status: errors.length === 0 ? 'PASS' : 'BLOCKED',
    scope: 'supplied-inventory-contract-only',
    migrationAuthorized: false,
    errors,
  }
}

async function main(args) {
  let manifestPath = new URL('../deploy/ovh-qualification.json', import.meta.url)
  let inventoryPath
  const seen = new Set()
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i]
    if (!['--manifest', '--inventory'].includes(flag) || !args[i + 1] || seen.has(flag)) throw new Error('INVALID_ARGUMENTS')
    seen.add(flag)
    if (flag === '--manifest') manifestPath = args[i + 1]
    else inventoryPath = args[i + 1]
  }
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const inventory = inventoryPath ? JSON.parse(await readFile(inventoryPath, 'utf8')) : undefined
  const result = evaluateOvhQualification(manifest, inventory)
  process.stdout.write(JSON.stringify(result, null, 2) + '\n')
  process.exitCode = result.status === 'PASS' ? 0 : 2
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(() => {
    process.stdout.write(JSON.stringify({ status: 'BLOCKED', migrationAuthorized: false, errors: [{ code: 'INPUT_UNREADABLE_OR_INVALID' }] }) + '\n')
    process.exitCode = 2
  })
}
