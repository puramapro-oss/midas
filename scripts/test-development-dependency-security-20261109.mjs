import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const dependencyRoot = resolve(process.env.MIDAS_DEPENDENCY_TEST_ROOT ?? fileURLToPath(new URL('..', import.meta.url)))
const dependencyRequire = createRequire(resolve(dependencyRoot, 'package.json'))
const estreeRequire = createRequire(resolve(dependencyRoot, 'node_modules/@typescript-eslint/typescript-estree/package.json'))
const { minimatch, Minimatch } = estreeRequire('minimatch')
const bidiEntry = dependencyRequire.resolve('chromium-bidi')
const bidiRequire = createRequire(bidiEntry)
const parserModule = await import(pathToFileURL(resolve(dirname(bidiEntry), 'protocol-parser/protocol-parser.js')).href)
const protocolParser = parserModule.default ?? parserModule

test('minimatch keeps amplified glob preprocessing within the configured budget', () => {
  let rowsBeforePairwiseProcessing = 0
  class ObservedMinimatch extends Minimatch {
    secondPhasePreProcess(parts) {
      rowsBeforePairwiseProcessing = parts.length
      return super.secondPhasePreProcess(parts)
    }
  }
  // Five repetitions are deliberately small even on the vulnerable version.
  new ObservedMinimatch('**/../a/b/'.repeat(5) + 'fixture.ts', { optimizationLevel: 2, braceExpandMax: 8 })
  assert.ok(rowsBeforePairwiseProcessing > 0)
  assert.ok(rowsBeforePairwiseProcessing <= 8, 'preprocessing exceeded braceExpandMax before pairwise work: ' + rowsBeforePairwiseProcessing)
})

test('the minimatch API used by typescript-estree preserves dotfiles, braces and exclusions', () => {
  const options = { dot: true }
  assert.equal(minimatch('src/.fixture.ts', 'src/*.{ts,tsx}', options), true)
  assert.equal(minimatch('src/view.tsx', 'src/*.{ts,tsx}', options), true)
  assert.equal(minimatch('src/view.js', 'src/*.{ts,tsx}', options), false)
  assert.equal(minimatch('src/view.test.ts', 'src/!(*.test).ts', options), false)
  assert.equal(minimatch('src/view.ts', 'src/!(*.test).ts', options), true)
})

test('the real BiDi parser rejects an oversized collection before evaluating its elements', () => {
  const { z } = bidiRequire('zod')
  let parsedElements = 0
  const schema = z.array(z.string().transform(value => { parsedElements++; return value.trim() })).max(3)
  assert.throws(() => protocolParser.parseObject(Array(128).fill(' fixture '), schema))
  assert.equal(parsedElements, 0)
  assert.deepEqual(protocolParser.parseObject([' fixture '], schema), ['fixture'])
})

test('BiDi navigation validation preserves valid commands and rejects invalid input', () => {
  const valid = { context: 'fixture-context', url: 'http://127.0.0.1/', wait: 'complete' }
  assert.deepEqual(protocolParser.BrowsingContext.parseNavigateParams(valid), valid)
  assert.throws(() => protocolParser.BrowsingContext.parseNavigateParams({ url: valid.url }))
  assert.throws(() => protocolParser.BrowsingContext.parseNavigateParams({ ...valid, wait: 'invalid-state' }))
})

test('Lighthouse and Puppeteer cooperate with a real local browser and an isolated page', { timeout: 60000 }, async t => {
  const executablePath = process.env.MIDAS_CHROMIUM_PATH ?? dependencyRequire('@playwright/test').chromium.executablePath()
  assert.ok(existsSync(executablePath), 'Provide MIDAS_CHROMIUM_PATH or install the project Playwright browser before this test; no automatic download is performed')
  const html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MIDAS compatibility fixture</title><style>body{font-family:Arial,sans-serif;color:#111;background:#fff}button{font-size:18px}</style></head><body><main><h1>Fixture MIDAS</h1><button id="action">Action</button><p id="result" role="status">0</p></main><script>document.querySelector("#action").addEventListener("click",()=>{document.querySelector("#result").textContent="1"})</script></body></html>'
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
    res.end(html)
  })
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) })
  const url = 'http://127.0.0.1:' + server.address().port + '/'
  const puppeteer = dependencyRequire('puppeteer-core')
  const browser = await puppeteer.launch({ executablePath, headless: true, timeout: 15000, protocolTimeout: 15000,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] })
  t.after(() => browser.close())
  const page = await browser.newPage()
  await page.goto(url, { waitUntil: 'load', timeout: 10000 })
  await page.click('#action')
  assert.equal(await page.$eval('#result', element => element.textContent), '1')
  await page.close()
  const { default: lighthouse } = await import(pathToFileURL(dependencyRequire.resolve('lighthouse')).href)
  const result = await lighthouse(url, { port: Number(new URL(browser.wsEndpoint()).port), logLevel: 'error',
    onlyCategories: ['accessibility'], throttlingMethod: 'provided', disableFullPageScreenshot: true,
    enableErrorReporting: false, maxWaitForLoad: 15000 })
  assert.ok(result?.lhr)
  assert.equal(result.lhr.runtimeError, undefined)
  assert.equal(result.lhr.finalDisplayedUrl, url)
  assert.equal(result.lhr.audits['document-title'].score, 1)
  assert.equal(result.lhr.categories.accessibility.score, 1)
})
