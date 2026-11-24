import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm'
import { parseStatusServices, summarizeStatusServices } from '../src/lib/status-contract.ts'

// Execute the real route modules. Only framework response construction and
// external transports are test doubles; no dependency installation or network.
async function loadRoute(path, options = {}) {
  const calls = []
  const env = {
    CRON_SECRET: 'fixture-cron-secret',
    ANTHROPIC_API_KEY: 'fixture-anthropic-key',
    STRIPE_SECRET_KEY: 'fixture-stripe-key',
    NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.invalid',
    SUPABASE_SERVICE_ROLE_KEY: 'fixture-supabase-key',
    ...options.env,
  }
  const context = createContext({
    Request, Response, AbortSignal, AbortController, Date, Error, console, setTimeout, clearTimeout,
    process: { env },
    fetch: async (url, init) => {
      calls.push({ transport: 'fetch', url, init })
      assert.ok(['https://api.binance.com/api/v3/ping', 'https://api.stripe.com/v1/balance'].includes(url))
      if (options.fetchThrows) throw new Error('fixture network unavailable')
      return { ok: !options.failedHttp?.includes(url), status: options.failedHttp?.includes(url) ? 503 : 200 }
    },
  })
  const imports = {
    'next/server': { NextResponse: Response, NextRequest: Request },
    '@supabase/supabase-js': { createClient: () => ({
      from: () => ({ select: () => ({ limit: async () => {
        calls.push({ transport: 'supabase' })
        return { error: options.databaseError ? { message: 'fixture database unavailable' } : null }
      } }) }),
    }) },
    '@/lib/circuit-breaker': {
      getCircuitBreaker: () => ({ execute: fn => fn() }),
      getServiceStatus: () => {
        if (options.internalError) throw new Error('fixture internal error')
        return {}
      },
    },
    '@/lib/cache/upstash': { redis: { ping: async () => {
      calls.push({ transport: 'redis' })
      if (options.redisError) throw new Error('fixture redis unavailable')
      return 'PONG'
    } } },
    '@/lib/integrations/registry': { getRequiredEnvironmentErrors: () => options.configurationErrors ?? [] },
  }
  const moduleCache = new Map()
  async function load(relative) {
    if (moduleCache.has(relative)) return moduleCache.get(relative)
    const url = new URL('../' + relative, import.meta.url)
    const code = stripTypeScriptTypes(await readFile(url, 'utf8'), { mode: 'strip' })
    const module = new SourceTextModule(code, { context, identifier: url.href })
    moduleCache.set(relative, module)
    await module.link(async specifier => {
      if (specifier === '@/lib/cron-auth') return load('src/lib/cron-auth.ts')
      const exports = imports[specifier]
      assert.ok(exports, `Unexpected dependency (no real transport allowed): ${specifier}`)
      return new SyntheticModule(Object.keys(exports), function () {
        for (const [key, value] of Object.entries(exports)) this.setExport(key, value)
      }, { context })
    })
    return module
  }
  const route = await load(path)
  await route.evaluate()
  return { GET: route.namespace.GET, calls }
}

const statusRoute = 'src/app/api/status/route.ts'
const cronRoute = 'src/app/api/cron/health-check/route.ts'
const request = (authorization = 'Bearer fixture-cron-secret') => new Request('http://127.0.0.1/api/cron/health-check', {
  headers: authorization ? { authorization } : {},
})

test('public status checks a fresh market response and identifies only the checked service', async () => {
  const route = await loadRoute(statusRoute)
  const response = await route.GET()
  const body = await response.json()
  assert.equal(response.status, 200)
  assert.equal(body.status, 'ok')
  assert.deepEqual(body.services, { public_market_data: 'operational' })
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(route.calls[0].init.cache, 'no-store')
})

test('public status returns 503 for a degraded HTTP dependency', async () => {
  const route = await loadRoute(statusRoute, { failedHttp: ['https://api.binance.com/api/v3/ping'] })
  const response = await route.GET()
  assert.equal(response.status, 503)
  assert.equal((await response.json()).status, 'degraded')
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('public status returns 503 after timeout or transport rejection', async () => {
  const route = await loadRoute(statusRoute, { fetchThrows: true })
  const response = await route.GET()
  assert.equal(response.status, 503)
  assert.equal((await response.json()).services.public_market_data, 'degraded')
})

test('configuration alone never claims a verified Anthropic service', async () => {
  const route = await loadRoute(cronRoute)
  const response = await route.GET(request())
  const body = await response.json()
  assert.equal(body.services.configuration.status, 'up')
  assert.equal(body.services.binance.status, 'up')
  assert.equal(body.services.claude.status, 'unverified')
  assert.equal(body.services.claude.verification, 'configuration-only')
  assert.equal(body.status, 'degraded')
  assert.equal(body.success, false)
  assert.equal(response.status, 503)
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('partial cron failures are not HTTP or JSON successes', async () => {
  const route = await loadRoute(cronRoute, { failedHttp: ['https://api.stripe.com/v1/balance'] })
  const response = await route.GET(request())
  const body = await response.json()
  assert.equal(body.services.stripe.status, 'down')
  assert.equal(body.status, 'degraded')
  assert.equal(body.success, false)
  assert.equal(response.status, 503)
})

test('complete cron failure is unsuccessful and unavailable', async () => {
  const route = await loadRoute(cronRoute, {
    fetchThrows: true, redisError: true, databaseError: true,
    configurationErrors: ['fixture'], env: { ANTHROPIC_API_KEY: undefined, STRIPE_SECRET_KEY: undefined },
  })
  const response = await route.GET(request())
  const body = await response.json()
  assert.equal(body.status, 'unhealthy')
  assert.equal(body.success, false)
  assert.equal(response.status, 503)
})

test('missing cron secret refuses before every external transport', async () => {
  const route = await loadRoute(cronRoute, { env: { CRON_SECRET: undefined } })
  assert.equal((await route.GET(request())).status, 503)
  assert.deepEqual(route.calls, [])
})

test('incorrect cron authorization refuses before every external transport', async () => {
  const route = await loadRoute(cronRoute)
  assert.equal((await route.GET(request('Bearer incorrect'))).status, 401)
  assert.deepEqual(route.calls, [])
})

test('unexpected cron failure is not cacheable or successful', async () => {
  const route = await loadRoute(cronRoute, { internalError: true })
  const response = await route.GET(request())
  assert.equal(response.status, 500)
  assert.equal((await response.json()).success, false)
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('the status page parser accepts the actual API response without showing a false outage', async () => {
  const route = await loadRoute(statusRoute)
  const payload = await (await route.GET()).json()
  assert.deepEqual(parseStatusServices(payload), [{ name: 'Données de marché publiques', status: 'operational' }])
})

test('the status page parser preserves a degraded API response', async () => {
  const route = await loadRoute(statusRoute, { fetchThrows: true })
  const payload = await (await route.GET()).json()
  assert.deepEqual(parseStatusServices(payload), [{ name: 'Données de marché publiques', status: 'degraded' }])
})

test('missing or malformed service evidence never invents healthy providers', () => {
  for (const payload of [null, {}, { status: 'ok' }, { services: null }, { services: [] }, { services: {} }]) {
    assert.deepEqual(parseStatusServices(payload), [{ name: 'API', status: 'unknown' }])
  }
})

test('the earlier object-shaped response remains compatible', () => {
  assert.deepEqual(parseStatusServices({ services: { api: { status: 'ok', latency: 12 } } }), [
    { name: 'Api', status: 'operational', latency: 12 },
  ])
})

test('unknown states remain unverified rather than turning into healthy or stopped services', () => {
  for (const status of [null, undefined, true, 1, 'configured', 'starting', 'unverified']) {
    assert.deepEqual(parseStatusServices({ services: { api: { status } } }), [{ name: 'Api', status: 'unknown' }])
  }
})

test('invalid latency is omitted instead of presented as a measurement', () => {
  for (const latency of [-1, NaN, Infinity, '12', null]) {
    assert.deepEqual(parseStatusServices({ services: { api: { status: 'degraded', latency } } }), [
      { name: 'Api', status: 'degraded' },
    ])
  }
})

test('a confirmed outage takes priority over unknown services and a refresh', () => {
  const down = { name: 'API', status: 'down' }
  const unknown = { name: 'Worker', status: 'unknown' }
  for (const services of [[down, unknown], [unknown, down]]) {
    for (const loading of [false, true]) assert.equal(summarizeStatusServices(services, loading), 'down')
  }
})
