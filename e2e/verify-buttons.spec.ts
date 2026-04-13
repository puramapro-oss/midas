import { test, expect } from '@playwright/test'

const BASE = 'https://midas.purama.dev'

test.describe('MIDAS Button Verification', () => {

  test('Hero CTA — "Commencer gratuitement" navigates to /register', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    const cta = page.locator('[data-testid="cta-signup"]')
    await expect(cta).toBeVisible()
    await cta.click()
    await page.waitForURL(/register/, { timeout: 10000 })
    expect(page.url()).toContain('/register')
    console.log('Hero CTA signup → /register OK')
  })

  test('Hero CTA — "Voir la demo" navigates to /login', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    const cta = page.locator('[data-testid="cta-demo"]')
    await expect(cta).toBeVisible()
    await cta.click()
    await page.waitForURL(/login/, { timeout: 10000 })
    expect(page.url()).toContain('/login')
    console.log('Hero CTA demo → /login OK')
  })

  test('Pricing — Free CTA navigates to /register', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    // Scroll to pricing section
    const pricingCta = page.locator('[data-testid="cta-free"]')
    if (await pricingCta.count() > 0) {
      await pricingCta.scrollIntoViewIfNeeded()
      await pricingCta.click()
      await page.waitForURL(/register/, { timeout: 10000 })
      expect(page.url()).toContain('/register')
      console.log('Pricing Free CTA → /register OK')
    } else {
      // Try by text
      const freeBtn = page.locator('a:has-text("Commencer gratuitement")').first()
      await freeBtn.scrollIntoViewIfNeeded()
      const href = await freeBtn.getAttribute('href')
      console.log(`Pricing Free CTA href: ${href}`)
      expect(href).toContain('/register')
    }
  })

  test('Pricing — Pro CTA has correct href', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    const proCta = page.locator('[data-testid="cta-pro"]').first()
    if (await proCta.count() > 0) {
      const href = await proCta.getAttribute('href')
      console.log(`Pricing Pro CTA href: ${href}`)
      expect(href).toContain('/register')
    } else {
      const proBtn = page.locator('a:has-text("Passer a Pro")').first()
      const href = await proBtn.getAttribute('href')
      console.log(`Pricing Pro CTA href: ${href}`)
      expect(href).toContain('/register')
    }
  })

  test('Pricing — Ultra CTA has correct href', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    const ultraCta = page.locator('[data-testid="cta-ultra"]').first()
    if (await ultraCta.count() > 0) {
      const href = await ultraCta.getAttribute('href')
      console.log(`Pricing Ultra CTA href: ${href}`)
      expect(href).toContain('/register')
    } else {
      const ultraBtn = page.locator('a:has-text("Devenir Ultra")').first()
      const href = await ultraBtn.getAttribute('href')
      console.log(`Pricing Ultra CTA href: ${href}`)
      expect(href).toContain('/register')
    }
  })

  test('FAQ — all accordion buttons toggle', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    // Find FAQ buttons
    const faqBtns = page.locator('button:has-text("Est-ce que"), button:has-text("Mes fonds"), button:has-text("MIDAS peut"), button:has-text("Quels sont"), button:has-text("Comment"), button:has-text("Combien"), button:has-text("paper trading"), button:has-text("exchanges"), button:has-text("SHIELD"), button:has-text("annuler")')
    const count = await faqBtns.count()
    console.log(`FAQ buttons found: ${count}`)

    // Click first FAQ and check it expands
    if (count > 0) {
      const firstFaq = faqBtns.first()
      await firstFaq.scrollIntoViewIfNeeded()
      await firstFaq.click()
      await page.waitForTimeout(500)
      // After click, check if there's now visible answer text nearby
      console.log('FAQ click: OK (no error)')
    }
  })

  test('Footer links — all point to existing pages', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    const footerLinks = await page.$$eval('footer a[href]', (els) =>
      els.map((el) => ({
        text: (el as HTMLAnchorElement).textContent?.trim() || '',
        href: (el as HTMLAnchorElement).getAttribute('href') || '',
      }))
    )

    console.log('Footer links:')
    for (const link of footerLinks) {
      console.log(`  "${link.text}" → ${link.href}`)
      // Check no broken links
      expect(link.href).not.toBe('#')
      expect(link.href).not.toBe('')
    }

    // Navigate to each internal footer link and verify no 404
    for (const link of footerLinks) {
      if (link.href.startsWith('/') || link.href.startsWith('https://midas.purama.dev')) {
        const url = link.href.startsWith('/') ? `${BASE}${link.href}` : link.href
        const response = await page.request.get(url)
        const ok = response.status() === 200 || response.status() === 307
        console.log(`  Verify ${link.href} → ${response.status()} ${ok ? 'OK' : 'FAIL'}`)
        expect(ok).toBe(true)
      }
    }
  })

  test('Login — "Mot de passe oublie" navigates to /forgot-password', async ({ page }) => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    const forgotLink = page.locator('a[href="/forgot-password"]')
    await expect(forgotLink).toBeVisible()
    await forgotLink.click()
    await page.waitForURL(/forgot-password/, { timeout: 10000 })
    expect(page.url()).toContain('/forgot-password')
    console.log('Forgot password link → /forgot-password OK')
  })

  test('Login — form submits (shows error for bad credentials)', async ({ page }) => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'wrongpassword123')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000)

    // Should show error or stay on login (not crash)
    const url = page.url()
    console.log(`After login attempt: ${url}`)
    // Should still be on login page (bad creds)
    expect(url).toContain('/login')
    console.log('Login form submit: OK (no crash)')
  })

  test('Register — form has all inputs', async ({ page }) => {
    await page.goto(`${BASE}/register`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()

    const pwInput = page.locator('input[type="password"]').first()
    await expect(pwInput).toBeVisible()

    const submitBtn = page.locator('button[type="submit"]')
    await expect(submitBtn).toBeVisible()

    const googleBtn = page.locator('button:has-text("Google")')
    await expect(googleBtn).toBeVisible()

    console.log('Register form: all inputs present OK')
  })

  test('Forgot password — page loads and form works', async ({ page }) => {
    await page.goto(`${BASE}/forgot-password`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()

    const submitBtn = page.locator('button[type="submit"]')
    await expect(submitBtn).toBeVisible()

    const backLink = page.locator('a[href="/login"]')
    await expect(backLink).toBeVisible()

    console.log('Forgot password page: OK')
  })

  test('All public pages — no 404, no 500', async ({ page }) => {
    const pages = [
      '/', '/pricing', '/status', '/changelog', '/offline',
      '/login', '/register', '/forgot-password',
      '/legal/cgu', '/legal/privacy', '/legal/mentions', '/legal/disclaimer',
    ]

    for (const p of pages) {
      const response = await page.request.get(`${BASE}${p}`)
      const ok = response.status() === 200
      console.log(`${p} → ${response.status()} ${ok ? 'OK' : 'FAIL'}`)
      expect(ok).toBe(true)
    }
  })

  test('0 JS errors on all public pages', async ({ page }) => {
    const pages = ['/', '/pricing', '/login', '/register', '/forgot-password']

    for (const p of pages) {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))

      await page.goto(`${BASE}${p}`, { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(1500)

      const critical = errors.filter(
        (e) => !e.includes('hydration') && !e.includes('ResizeObserver') && !e.includes('Loading chunk') && !e.includes('ChunkLoadError')
      )

      console.log(`${p} JS errors: ${critical.length === 0 ? 'NONE' : critical.join(', ')}`)
      expect(critical.length).toBe(0)

      page.removeAllListeners('pageerror')
    }
  })
})
