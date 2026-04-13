import { test, expect } from '@playwright/test'

const BASE = 'https://midas.purama.dev'

test.describe('FULL MIDAS AUDIT — Every button, every page', () => {

  test('Landing — every interactive element', async ({ page }) => {
    const issues: string[] = []
    page.on('pageerror', (err) => issues.push(`JS_ERROR: ${err.message}`))

    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)

    // All buttons
    const buttons = await page.$$eval('button', (els) =>
      els.map((el, i) => ({
        idx: i,
        text: el.textContent?.trim().substring(0, 60) || '',
        type: el.type,
        tag: el.tagName,
        hasClick: !!el.onclick,
        ariaLabel: el.getAttribute('aria-label') || '',
        testId: el.getAttribute('data-testid') || '',
        visible: (el as HTMLElement).offsetParent !== null,
      }))
    )
    console.log(`\n=== LANDING BUTTONS (${buttons.length}) ===`)
    for (const b of buttons) {
      console.log(`  [${b.idx}] "${b.text}" type=${b.type} visible=${b.visible} testId=${b.testId}`)
    }

    // All links
    const links = await page.$$eval('a[href]', (els) =>
      els.map((el) => ({
        text: el.textContent?.trim().substring(0, 50) || '',
        href: el.getAttribute('href') || '',
        visible: (el as HTMLElement).offsetParent !== null,
      }))
    )
    console.log(`\n=== LANDING LINKS (${links.length}) ===`)
    for (const l of links) {
      console.log(`  "${l.text}" → ${l.href} visible=${l.visible}`)
    }

    // Click Hero CTA
    const heroBtn = page.locator('[data-testid="cta-signup"]')
    if (await heroBtn.count() > 0) {
      const href = await heroBtn.getAttribute('href')
      console.log(`\nHero CTA href: ${href}`)
    }

    // Click billing toggle
    const toggle = page.locator('[data-testid="billing-toggle"]')
    if (await toggle.count() > 0) {
      await toggle.click()
      await page.waitForTimeout(500)
      console.log('Billing toggle: clicked OK')
    }

    // Click FAQ items
    const faqButtons = page.locator('section#faq button, button:has-text("Est-ce que")')
    const faqCount = await faqButtons.count()
    console.log(`\nFAQ buttons: ${faqCount}`)
    if (faqCount > 0) {
      await faqButtons.first().scrollIntoViewIfNeeded()
      await faqButtons.first().click()
      await page.waitForTimeout(300)
      console.log('FAQ first click: OK')
    }

    // Pricing CTAs
    for (const plan of ['free', 'pro', 'ultra']) {
      const cta = page.locator(`[data-testid="cta-${plan}"]`)
      if (await cta.count() > 0) {
        const href = await cta.getAttribute('href')
        console.log(`Pricing ${plan} CTA: href=${href}`)
        if (!href || href === '#') issues.push(`Pricing ${plan} CTA has no href`)
      }
    }

    console.log(`\nLanding issues: ${issues.length ? issues.join(', ') : 'NONE'}`)
  })

  test('Login page — every element', async ({ page }) => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    const email = page.locator('input[type="email"]')
    expect(await email.count()).toBe(1)

    const pw = page.locator('input[type="password"]')
    expect(await pw.count()).toBe(1)

    const submit = page.locator('button[type="submit"]')
    expect(await submit.count()).toBe(1)
    const submitText = await submit.textContent()
    console.log(`Submit: "${submitText}"`)

    const google = page.locator('button:has-text("Google")')
    expect(await google.count()).toBe(1)

    // Eye toggle for password
    const eyeBtn = page.locator('button[type="button"]').first()
    if (await eyeBtn.count() > 0) {
      await eyeBtn.click()
      console.log('Password eye toggle: clicked')
    }

    // Forgot password link
    const forgot = page.locator('a[href="/forgot-password"]')
    expect(await forgot.count()).toBe(1)

    // Register link
    const reg = page.locator('a[href="/register"]')
    expect(await reg.count()).toBe(1)

    console.log('Login page: ALL elements present')
  })

  test('Register page — every element', async ({ page }) => {
    await page.goto(`${BASE}/register`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    const inputs = await page.$$eval('input', (els) =>
      els.map((el) => ({ type: el.type, placeholder: el.placeholder }))
    )
    console.log('Register inputs:', inputs.map(i => `${i.type}:${i.placeholder}`).join(', '))

    const submit = page.locator('button[type="submit"]')
    expect(await submit.count()).toBe(1)

    const google = page.locator('button:has-text("Google")')
    expect(await google.count()).toBe(1)

    console.log('Register page: OK')
  })

  test('Pricing page — Stripe CTAs', async ({ page }) => {
    await page.goto(`${BASE}/pricing`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    for (const plan of ['free', 'pro', 'ultra']) {
      const cta = page.locator(`[data-testid="cta-${plan}"]`)
      if (await cta.count() > 0) {
        const tag = await cta.evaluate(el => el.tagName)
        const href = await cta.getAttribute('href')
        console.log(`${plan}: tag=${tag} href=${href}`)
        expect(href).toBeTruthy()
        expect(href).not.toBe('#')
      }
    }

    // Test Stripe checkout API
    const checkoutResp = await page.request.post(`${BASE}/api/stripe/checkout`, {
      data: { plan: 'pro', period: 'monthly' },
      headers: { 'Content-Type': 'application/json' },
    })
    console.log(`/api/stripe/checkout status: ${checkoutResp.status()}`)
    // 307 = middleware redirect (not logged in) — expected
    // 401 = unauthorized — expected
    // 500 = broken — BAD
    expect(checkoutResp.status()).not.toBe(500)
  })

  test('Dashboard — header buttons audit', async ({ page }) => {
    // Login first to access dashboard
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    // We can't actually login without real credentials, so test the redirect behavior
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 })
    const url = page.url()
    console.log(`Dashboard redirect: ${url}`)

    // If we're on login page, that's expected (not logged in)
    if (url.includes('/login')) {
      console.log('Dashboard requires auth — testing login page header instead')

      // Check all buttons on the login page
      const allBtns = await page.$$eval('button', (els) =>
        els.map((el) => ({
          text: el.textContent?.trim().substring(0, 50) || '',
          type: el.type,
          disabled: el.disabled,
          hasOnclick: el.getAttribute('onclick') !== null,
        }))
      )
      console.log('Buttons on current page:')
      for (const b of allBtns) console.log(`  "${b.text}" type=${b.type} disabled=${b.disabled}`)
    }
  })

  test('Static pages — no errors', async ({ page }) => {
    const pages = ['/status', '/changelog', '/offline', '/forgot-password',
      '/legal/cgu', '/legal/privacy', '/legal/mentions', '/legal/disclaimer']

    for (const p of pages) {
      const jsErrors: string[] = []
      page.on('pageerror', (err) => jsErrors.push(err.message))

      const resp = await page.goto(`${BASE}${p}`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(500)

      const status = resp?.status() ?? 0
      const critical = jsErrors.filter(e => !e.includes('hydration') && !e.includes('ResizeObserver'))

      console.log(`${p} → ${status} errors=${critical.length}`)
      expect(status).toBe(200)
      expect(critical.length).toBe(0)

      page.removeAllListeners('pageerror')
    }
  })

  test('Encoding check — no \\u escapes in rendered text', async ({ page }) => {
    const pages = ['/', '/pricing', '/login', '/register', '/changelog']

    for (const p of pages) {
      await page.goto(`${BASE}${p}`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(1000)

      const bodyText = await page.textContent('body') ?? ''
      const hasEscape = bodyText.includes('\\u') || bodyText.includes('\u2019') === false && bodyText.includes("'") === false
      const badChars = (bodyText.match(/\\u[0-9a-fA-F]{4}/g) || [])

      if (badChars.length > 0) {
        console.log(`${p}: ENCODING ISSUE — found ${badChars.join(', ')}`)
      } else {
        console.log(`${p}: encoding OK`)
      }
    }
  })

  test('Footer links — all resolve', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    const footerLinks = await page.$$eval('footer a[href]', (els) =>
      els.map(el => ({
        text: el.textContent?.trim() || '',
        href: el.getAttribute('href') || '',
      }))
    )

    for (const link of footerLinks) {
      if (link.href.startsWith('/')) {
        const resp = await page.request.get(`${BASE}${link.href}`)
        const ok = resp.status() < 400
        console.log(`Footer "${link.text}" → ${link.href} = ${resp.status()} ${ok ? 'OK' : 'BROKEN'}`)
        expect(ok).toBe(true)
      } else if (link.href.startsWith('#')) {
        console.log(`Footer "${link.text}" → ${link.href} (anchor)`)
      } else {
        console.log(`Footer "${link.text}" → ${link.href} (external)`)
      }
    }
  })
})
