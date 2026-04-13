import { test, expect, type Page } from '@playwright/test'

// Comprehensive 100% audit against live URL
// Run: PLAYWRIGHT_BASE_URL=https://midas.purama.dev npx playwright test e2e/audit-100.spec.ts --project="Desktop Chrome" --reporter=list

const PUBLIC_PAGES = [
  '/',
  '/pricing',
  '/login',
  '/register',
  '/forgot-password',
  '/onboarding',
  '/status',
  '/changelog',
  '/offline',
  '/partenariat',
  '/legal/cgu',
  '/legal/cgv',
  '/legal/cookies',
  '/legal/disclaimer',
  '/legal/mentions',
  '/legal/privacy',
]

async function captureConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      // Ignore known noise: hydration warnings from third-party, font preload, favicon
      if (text.includes('favicon') || text.includes('manifest.json')) return
      errors.push(text)
    }
  })
  page.on('pageerror', (err) => {
    errors.push(`PAGEERROR: ${err.message}`)
  })
  return errors
}

test.describe('AUDIT 100% — Pages publiques', () => {
  for (const path of PUBLIC_PAGES) {
    test(`page ${path} → 200, content, 0 console error`, async ({ page }) => {
      const errors = await captureConsoleErrors(page)
      const response = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 25000 })
      expect(response?.status(), `${path} HTTP status`).toBeLessThan(400)

      // Has visible content (not just empty white page)
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.length, `${path} body text length`).toBeGreaterThan(50)

      // No "undefined" / "NaN" / "Loading…" stuck
      expect(bodyText, `${path} no raw undefined`).not.toContain('undefined undefined')
      expect(bodyText, `${path} no Lorem ipsum`).not.toContain('Lorem ipsum')

      await page.waitForTimeout(800)
      expect(errors, `${path} console errors:\n${errors.join('\n')}`).toHaveLength(0)
    })
  }
})

test.describe('AUDIT 100% — Responsive', () => {
  test('Landing 375px (mobile) — pas d\'overflow horizontal', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } })
    const page = await ctx.newPage()
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const overflowX = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(overflowX, 'mobile horizontal overflow').toBe(false)
    await ctx.close()
  })

  test('Landing 1920px (desktop) — affiche correctement', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
    const page = await ctx.newPage()
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const h1 = await page.locator('h1').first().textContent()
    expect(h1?.trim().length || 0).toBeGreaterThan(0)
    await ctx.close()
  })
})

test.describe('AUDIT 100% — Boutons & liens landing', () => {
  test('Landing — tous les liens internes répondent < 400', async ({ page, request }) => {
    await page.goto('/')
    const hrefs = await page.$$eval('a[href]', (els) =>
      Array.from(new Set(els.map((e) => (e as HTMLAnchorElement).getAttribute('href') || '')))
        .filter((h) => h.startsWith('/') && !h.startsWith('//') && h.length > 1)
    )
    const failures: string[] = []
    for (const href of hrefs.slice(0, 30)) {
      try {
        const res = await request.get(href, { maxRedirects: 0, failOnStatusCode: false })
        if (res.status() >= 400) failures.push(`${href} → ${res.status()}`)
      } catch (e) {
        failures.push(`${href} → ERR ${(e as Error).message}`)
      }
    }
    expect(failures, `Broken links:\n${failures.join('\n')}`).toHaveLength(0)
  })

  test('Landing — CTA "Commencer gratuitement" pointe vers /register ou /signup', async ({ page }) => {
    await page.goto('/')
    const cta = page.locator('a[href*="/register"], a[href*="/signup"]').first()
    await expect(cta).toBeVisible({ timeout: 10000 })
  })
})

test.describe('AUDIT 100% — Auth flow', () => {
  test('/login → champ email + champ password + bouton submit', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.locator('button[type="submit"]').first()).toBeVisible()
  })

  test('/register → form complet', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

  test('Dashboard sans auth → redirect /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('AUDIT 100% — APIs publiques', () => {
  test('/api/status → JSON ok', async ({ request }) => {
    const res = await request.get('/api/status')
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('ok')
    expect(json.app).toBe('midas')
  })

  test('/api/wallet sans auth → 401', async ({ request }) => {
    const res = await request.get('/api/wallet')
    expect(res.status()).toBe(401)
  })

  test('/api/market/candles?pair=BTC/USDT → 200 candles réelles', async ({ request }) => {
    const res = await request.get('/api/market/candles?pair=BTC/USDT&timeframe=1h&limit=50')
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.candles)).toBe(true)
    expect(json.candles.length).toBeGreaterThan(0)
    expect(json.source).not.toBe('mock')
  })
})
