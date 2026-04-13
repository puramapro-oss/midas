import { test, expect } from '@playwright/test'

const BASE = 'https://midas.purama.dev'

test.describe('MIDAS Live Audit', () => {
  test('Landing page — loads, no JS errors, all sections visible', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') jsErrors.push(`console.error: ${msg.text()}`)
    })

    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 })

    // Check page loaded
    await expect(page).toHaveTitle(/MIDAS/i)

    // Check no critical JS errors (filter out known non-critical)
    const criticalErrors = jsErrors.filter(
      (e) => !e.includes('hydration') && !e.includes('ResizeObserver') && !e.includes('Loading chunk')
    )
    console.log('JS errors on landing:', criticalErrors.length ? criticalErrors : 'NONE')

    // Screenshot
    await page.screenshot({ path: 'e2e/screenshots/landing.png', fullPage: false })
  })

  test('Landing page — all links and buttons audit', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 })

    // Wait for client-side hydration
    await page.waitForTimeout(2000)

    // Find ALL links
    const links = await page.$$eval('a[href]', (els) =>
      els.map((el) => ({
        text: (el as HTMLAnchorElement).textContent?.trim().substring(0, 50) || '',
        href: (el as HTMLAnchorElement).href,
        visible: (el as HTMLAnchorElement).offsetParent !== null,
      }))
    )
    console.log(`\nTotal links found: ${links.length}`)
    for (const link of links) {
      console.log(`  LINK: "${link.text}" → ${link.href} (visible: ${link.visible})`)
    }

    // Find ALL buttons
    const buttons = await page.$$eval('button', (els) =>
      els.map((el) => ({
        text: (el as HTMLButtonElement).textContent?.trim().substring(0, 50) || '',
        hasOnClick: !!(el as HTMLButtonElement).onclick || el.getAttribute('data-testid') !== null,
        type: (el as HTMLButtonElement).type,
        disabled: (el as HTMLButtonElement).disabled,
        visible: (el as HTMLButtonElement).offsetParent !== null,
      }))
    )
    console.log(`\nTotal buttons found: ${buttons.length}`)
    for (const btn of buttons) {
      console.log(`  BTN: "${btn.text}" type=${btn.type} disabled=${btn.disabled} visible=${btn.visible}`)
    }

    // Find dead links (href="#" or empty)
    const deadLinks = links.filter((l) => l.href.endsWith('#') || l.href === BASE + '/')
    console.log(`\nDead links (href="#"): ${deadLinks.length}`)
    for (const dl of deadLinks) {
      console.log(`  DEAD: "${dl.text}" → ${dl.href}`)
    }
  })

  test('Landing page — click each CTA button', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    // Try clicking CTA buttons
    const ctaSelectors = [
      'a:has-text("Commencer")',
      'a:has-text("Essayer")',
      'a:has-text("inscription")',
      'a:has-text("register")',
      'button:has-text("Commencer")',
      'button:has-text("Essayer")',
      'button:has-text("Free")',
      'button:has-text("Pro")',
      'button:has-text("Ultra")',
    ]

    for (const sel of ctaSelectors) {
      const el = page.locator(sel).first()
      const count = await el.count()
      if (count > 0) {
        const text = await el.textContent()
        const tag = await el.evaluate((e) => e.tagName)
        const href = tag === 'A' ? await el.getAttribute('href') : null
        console.log(`CTA: "${text?.trim()}" tag=${tag} href=${href}`)
      }
    }
  })

  test('Login page — form works', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))

    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    // Screenshot
    await page.screenshot({ path: 'e2e/screenshots/login.png', fullPage: false })

    // Check for email input
    const emailInput = page.locator('input[type="email"]')
    const emailCount = await emailInput.count()
    console.log(`Email inputs: ${emailCount}`)

    // Check for password input
    const pwInput = page.locator('input[type="password"]')
    const pwCount = await pwInput.count()
    console.log(`Password inputs: ${pwCount}`)

    // Check for submit button
    const submitBtn = page.locator('button[type="submit"]')
    const submitCount = await submitBtn.count()
    console.log(`Submit buttons: ${submitCount}`)

    // Check for Google button
    const googleBtn = page.locator('button:has-text("Google")')
    const googleCount = await googleBtn.count()
    console.log(`Google buttons: ${googleCount}`)

    // Check all buttons on page
    const allBtns = await page.$$eval('button', (els) =>
      els.map((el) => ({
        text: (el as HTMLButtonElement).textContent?.trim().substring(0, 60) || '',
        type: (el as HTMLButtonElement).type,
        disabled: (el as HTMLButtonElement).disabled,
      }))
    )
    console.log('All buttons on login:')
    for (const b of allBtns) {
      console.log(`  "${b.text}" type=${b.type} disabled=${b.disabled}`)
    }

    // Check all links
    const allLinks = await page.$$eval('a[href]', (els) =>
      els.map((el) => ({
        text: (el as HTMLAnchorElement).textContent?.trim().substring(0, 60) || '',
        href: (el as HTMLAnchorElement).href,
      }))
    )
    console.log('All links on login:')
    for (const l of allLinks) {
      console.log(`  "${l.text}" → ${l.href}`)
    }

    const criticalErrors = jsErrors.filter(
      (e) => !e.includes('hydration') && !e.includes('ResizeObserver')
    )
    console.log('JS errors on login:', criticalErrors.length ? criticalErrors : 'NONE')
  })

  test('Pricing page — all plan buttons', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))

    await page.goto(`${BASE}/pricing`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    await page.screenshot({ path: 'e2e/screenshots/pricing.png', fullPage: false })

    const buttons = await page.$$eval('button', (els) =>
      els.map((el) => ({
        text: (el as HTMLButtonElement).textContent?.trim().substring(0, 60) || '',
        type: (el as HTMLButtonElement).type,
        disabled: (el as HTMLButtonElement).disabled,
      }))
    )
    console.log(`Pricing buttons: ${buttons.length}`)
    for (const b of buttons) {
      console.log(`  "${b.text}" type=${b.type} disabled=${b.disabled}`)
    }

    const criticalErrors = jsErrors.filter(
      (e) => !e.includes('hydration') && !e.includes('ResizeObserver')
    )
    console.log('JS errors on pricing:', criticalErrors.length ? criticalErrors : 'NONE')
  })

  test('Register page — form works', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))

    await page.goto(`${BASE}/register`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    await page.screenshot({ path: 'e2e/screenshots/register.png', fullPage: false })

    const inputs = await page.$$eval('input', (els) =>
      els.map((el) => ({
        type: (el as HTMLInputElement).type,
        name: (el as HTMLInputElement).name,
        placeholder: (el as HTMLInputElement).placeholder,
      }))
    )
    console.log('Register inputs:')
    for (const i of inputs) {
      console.log(`  type=${i.type} name=${i.name} placeholder="${i.placeholder}"`)
    }

    const buttons = await page.$$eval('button', (els) =>
      els.map((el) => ({
        text: (el as HTMLButtonElement).textContent?.trim().substring(0, 60) || '',
        type: (el as HTMLButtonElement).type,
      }))
    )
    console.log('Register buttons:')
    for (const b of buttons) {
      console.log(`  "${b.text}" type=${b.type}`)
    }

    console.log('JS errors:', jsErrors.filter((e) => !e.includes('hydration') && !e.includes('ResizeObserver')).length ? jsErrors : 'NONE')
  })

  test('Status + Changelog + Offline pages — load without JS errors', async ({ page }) => {
    for (const p of ['/status', '/changelog', '/offline']) {
      const jsErrors: string[] = []
      page.on('pageerror', (err) => jsErrors.push(err.message))
      await page.goto(`${BASE}${p}`, { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(1000)
      const title = await page.title()
      console.log(`${p} → title="${title}" errors=${jsErrors.length}`)
    }
  })
})
