import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import net from 'node:net'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// A separate exact public installation may be used for bounded negative controls.
// Normal CI resolves the application's installed dependency graph.
const applicationRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const dependencyRoot = resolve(process.env.MIDAS_DEPENDENCY_TEST_ROOT ?? applicationRoot)
const dependencyRequire = createRequire(resolve(dependencyRoot, 'package.json'))
let originalConnect

before(() => {
  originalConnect = net.Socket.prototype.connect
  net.Socket.prototype.connect = function (...args) {
    const normalized = Array.isArray(args[0]) ? args[0] : args
    const first = normalized[0]
    const options = typeof first === 'object' && first !== null
      ? first
      : { port: first, host: typeof normalized[1] === 'string' ? normalized[1] : 'localhost' }
    const host = options.host ?? options.hostname ?? 'localhost'
    assert.ok(!options.path && ['127.0.0.1', '::1'].includes(host), 'Dependency tests refuse every non-loopback transport')
    return originalConnect.apply(this, args)
  }
})

after(() => {
  net.Socket.prototype.connect = originalConnect
})

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  return `http://127.0.0.1:${server.address().port}`
}

async function close(server) {
  server.closeAllConnections()
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  assert.equal(server.listening, false)
}

test('dependency transports refuse a non-loopback destination before connecting', () => {
  assert.throws(() => net.connect({ host: 'provider.example.invalid', port: 443 }), /refuse every non-loopback transport/)
})

test('source-map-js rejects unsafe section offsets in a bounded child and preserves valid maps', { timeout: 15000 }, () => {
  const code = `
    const assert = require('node:assert/strict');
    const { createRequire } = require('node:module');
    const { resolve } = require('node:path');
    const r = createRequire(resolve(process.argv[1], 'package.json'));
    const { SourceMapConsumer } = r('source-map-js');
    const section = (line, column = 0) => ({ version: 3, sections: [{ offset: { line, column }, map: {
      version: 3, sources: ['fixture.ts'], names: [], mappings: 'AAAA', sourcesContent: ['fixture']
    }}] });
    for (const value of [10000001, -1, NaN, Infinity, '1']) {
      assert.throws(() => new SourceMapConsumer(section(value)), /offset|integer|number|exceed|finite/i);
    }
    for (const value of [-1, NaN, Infinity, '1']) {
      assert.throws(() => new SourceMapConsumer(section(0, value)), /offset|integer|number|finite/i);
    }
    const consumer = new SourceMapConsumer(section(2, 3));
    const original = consumer.originalPositionFor({ line: 3, column: 4 });
    assert.equal(original.source, 'fixture.ts');
    assert.equal(original.line, 1);
    assert.equal(original.column, 0);
    process.stdout.write('SAFE_OFFSETS_AND_VALID_MAP_PASS\\n');
  `
  const result = spawnSync(process.execPath, ['--max-old-space-size=64', '-e', code, dependencyRoot], {
    encoding: 'utf8', timeout: 5000, maxBuffer: 64 * 1024,
    env: { PATH: process.env.PATH ?? '', LANG: 'C' },
  })
  assert.equal(result.error, undefined, result.error?.message)
  assert.equal(result.signal, null)
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /^SAFE_OFFSETS_AND_VALID_MAP_PASS\n$/)
})

test('PostCSS keeps producing usable source maps with the corrected consumer', async () => {
  const postcss = dependencyRequire('postcss')
  const { SourceMapConsumer } = dependencyRequire('source-map-js')
  const result = await postcss([]).process('a { color: red; }', {
    from: 'fixture.css', to: 'output.css', map: { inline: false, annotation: false },
  })
  assert.equal(result.css, 'a { color: red; }')
  const consumer = new SourceMapConsumer(result.map.toJSON())
  assert.equal(consumer.originalPositionFor({ line: 1, column: 0 }).source, 'fixture.css')
})

test('the real CCXT client and its own Undici Agent preserve loopback JSON, headers, gzip and errors', { timeout: 15000 }, async () => {
  const imported = await import(pathToFileURL(resolve(applicationRoot, 'src/lib/exchange/ccxt-client.ts')).href)
  const { createExchangeClient, getSupportedExchanges } = imported.default ?? imported
  const requests = []
  const value = { fixture: true, amount: 0, kind: 'transport-only' }
  const server = createServer((req, res) => {
    requests.push({ method: req.method, url: req.url, fixture: req.headers['x-midas-fixture'], authorization: !!req.headers.authorization })
    if (req.url === '/reset') return res.destroy()
    if (!['/json', '/gzip'].includes(req.url)) { res.writeHead(404); res.end(); return }
    const body = Buffer.from(JSON.stringify(value))
    const payload = req.url === '/gzip' ? gzipSync(body) : body
    res.writeHead(200, { 'content-type': 'application/json', 'content-length': payload.length,
      ...(req.url === '/gzip' ? { 'content-encoding': 'gzip' } : {}) })
    res.end(payload)
  })
  const origin = await listen(server)
  const clients = []
  try {
    for (const name of getSupportedExchanges()) clients.push(createExchangeClient(name, { apiKey: '', secret: '' }))
    const client = clients[0]
    client.timeout = 1000 // Only this ephemeral loopback fixture; product defaults remain unchanged.
    assert.deepEqual(await client.fetch(`${origin}/json`, 'GET', { 'x-midas-fixture': 'bounded' }), value)
    assert.deepEqual(await client.fetch(`${origin}/gzip`, 'GET', { 'x-midas-fixture': 'bounded' }), value)
    await assert.rejects(client.fetch(`${origin}/reset`, 'GET', { 'x-midas-fixture': 'bounded' }))
    assert.deepEqual(requests.map(row => row.url), ['/json', '/gzip', '/reset'])
    assert.ok(requests.every(row => row.method === 'GET' && row.fixture === 'bounded' && !row.authorization))
  } finally {
    try {
      await Promise.all(clients.map(client => client.close()))
    } finally {
      await close(server)
    }
  }
})

test('Undici verifies SRI even when metadata begins with a tab', { timeout: 15000 }, async () => {
  const { fetch, Agent } = dependencyRequire('undici')
  const body = 'MIDAS bounded integrity fixture'
  const server = createServer((_req, res) => { res.writeHead(200, { 'content-type': 'text/plain' }); res.end(body) })
  const origin = await listen(server)
  const dispatcher = new Agent()
  try {
    const digest = createHash('sha256').update(body).digest('base64')
    const valid = await fetch(origin, { dispatcher, integrity: `\tsha256-${digest}`, signal: AbortSignal.timeout(3000) })
    assert.equal(await valid.text(), body)
    await assert.rejects(fetch(origin, {
      dispatcher, integrity: `\tsha256-${Buffer.alloc(32).toString('base64')}`, signal: AbortSignal.timeout(3000),
    }), error => error instanceof TypeError && /integrity mismatch/i.test(String(error.cause?.message)))
  } finally {
    try {
      await dispatcher.close()
    } finally {
      await close(server)
    }
  }
})
