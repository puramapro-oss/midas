import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { gzipSync } from 'node:zlib'
import { resolve, sep } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

// The optional root permits reproducible negative controls against a separate
// original installation. Normal runs resolve the application's own packages.
const dependencyRoot = resolve(process.env.MIDAS_DEPENDENCY_TEST_ROOT ?? fileURLToPath(new URL('..', import.meta.url)))
const dependencyRequire = createRequire(resolve(dependencyRoot, 'package.json'))
const { z } = dependencyRequire('zod')

async function listen(server) {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  return `http://127.0.0.1:${server.address().port}`
}
async function close(server) {
  server.closeAllConnections()
  await new Promise(resolve => server.close(resolve))
}

test('Next sends a fetched decoded response with valid HTTP framing and the complete body', { timeout: 15000 }, async t => {
  const { sendResponse } = dependencyRequire('next/dist/server/send-response.js')
  const { NodeNextResponse } = dependencyRequire('next/dist/server/base-http/node.js')
  const expected = 'MIDAS isolated response framing fixture. '.repeat(80)
  const compressed = gzipSync(expected)
  const upstream = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain', 'content-encoding': 'gzip', 'content-length': compressed.length,
      'x-fixture': 'preserved', 'set-cookie': ['fixture_a=1; HttpOnly', 'fixture_b=2; HttpOnly'] })
    res.end(compressed)
  })
  const upstreamUrl = await listen(upstream)
  t.after(() => close(upstream))
  const downstream = createServer(async (req, res) => {
    try {
      const response = await fetch(upstreamUrl, { signal: AbortSignal.timeout(5000) })
      await sendResponse(req, new NodeNextResponse(res), response)
    } catch (error) { res.destroy(error) }
  })
  const downstreamUrl = await listen(downstream)
  t.after(() => close(downstream))
  const response = await fetch(downstreamUrl, { signal: AbortSignal.timeout(5000) })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-encoding'), null, 'decoded data must not retain upstream compression framing')
  assert.equal(response.headers.get('content-length'), null, 'the compressed byte length cannot frame the decoded body')
  assert.equal(response.headers.get('x-fixture'), 'preserved')
  assert.equal(response.headers.getSetCookie().length, 2)
  assert.equal(await response.text(), expected)
})

test('Zod rejects an oversized constrained collection before parsing its elements', async () => {
  let syncItems = 0, asyncItems = 0
  const sync = z.array(z.string().transform(value => { syncItems++; return value.trim() })).max(3)
  const async = z.array(z.string().transform(async value => { asyncItems++; return value.trim() })).max(3)
  assert.equal(sync.safeParse(Array(128).fill(' fixture ')).success, false)
  assert.equal((await async.safeParseAsync(Array(128).fill(' fixture '))).success, false)
  assert.equal(syncItems, 0)
  assert.equal(asyncItems, 0)
})

test('Zod preserves valid transforms and per-element validation below the collection limit', () => {
  const schema = z.array(z.string().min(1).transform(value => value.trim())).max(3)
  assert.deepEqual(schema.parse([' fixture ', 'valid']), ['fixture', 'valid'])
  assert.equal(schema.safeParse(['']).success, false)
  assert.deepEqual(schema.parse([]), [])
})

test('the Sharp dependency actually resolved by Next can render a bounded SVG to PNG', async () => {
  const nextRequire = createRequire(dependencyRequire.resolve('next/package.json'))
  assert.ok(nextRequire.resolve('sharp').startsWith(resolve(dependencyRoot, 'node_modules') + sep), 'Sharp must belong to this installation, not an ambient ancestor package')
  const sharp = nextRequire('sharp')
  const { data, info } = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="3"><rect width="2" height="3" fill="red"/></svg>')).png().toBuffer({ resolveWithObject: true })
  assert.deepEqual([...data.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  assert.equal(info.width, 2)
  assert.equal(info.height, 3)
})

test('the actual annual PDF generator still produces a readable document using synthetic values', async () => {
  const imported = await import(pathToFileURL(resolve(dependencyRoot, 'src/app/api/cron/fiscal-annual-pdf/fiscal-pdf-generator.ts')).href)
  const { buildAnnualPdfBase64 } = imported.default ?? imported
  const result = await buildAnnualPdfBase64({ fullName: 'Fixture', email: 'fixture@example.invalid', year: 2025,
    totals: { primes: 1, parrainage: 2, nature: 3, marketplace: 4, missions: 5, other: 6, annuel: 21 } })
  assert.match(result, /^data:application\/pdf;[^,]*base64,/)
  const bytes = Buffer.from(result.slice(result.indexOf(',') + 1), 'base64')
  const { PDFDocument } = dependencyRequire('pdf-lib')
  const document = await PDFDocument.load(bytes)
  assert.equal(document.getPageCount(), 1)
  assert.ok(bytes.subarray(0, 5).equals(Buffer.from('%PDF-')))
})
