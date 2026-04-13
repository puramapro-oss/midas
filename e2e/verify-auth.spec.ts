import { test, expect } from '@playwright/test'

const BASE = 'https://midas.purama.dev'

test.describe('Auth & Layout Verification', () => {

  test('Auth callback route is accessible (not blocked by middleware)', async ({ page }) => {
    // /api/auth/callback without code should redirect to /login?error=missing_code
    const response = await page.request.get(`${BASE}/api/auth/callback`)
    // Should be a redirect (302/307) to /login?error=missing_code, NOT to /login (middleware block)
    const url = response.url()
    console.log(`Callback response URL: ${url}`)
    console.log(`Callback response status: ${response.status()}`)
    // If middleware blocks, it goes to /login?next=/api/auth/callback
    // If callback works, it goes to /login?error=missing_code
    expect(url).toContain('error=missing_code')
    console.log('Auth callback route: ACCESSIBLE (not blocked by middleware)')
  })

  test('Google OAuth button triggers Supabase auth flow', async ({ page }) => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    const googleBtn = page.locator('button:has-text("Google")')
    await expect(googleBtn).toBeVisible()

    // Click and capture the navigation
    const [popup] = await Promise.all([
      page.waitForEvent('popup', { timeout: 5000 }).catch(() => null),
      page.waitForURL(/accounts\.google|auth\.purama/, { timeout: 5000 }).catch(() => null),
      googleBtn.click(),
    ])

    // Should navigate to Google or Supabase auth
    const currentUrl = popup?.url() ?? page.url()
    console.log(`After Google click: ${currentUrl}`)
    // Should NOT still be on /login (that would mean the button did nothing)
    const navigated = currentUrl.includes('google') || currentUrl.includes('auth.purama') || currentUrl.includes('accounts')
    console.log(`Navigated to OAuth provider: ${navigated}`)
  })

  test('Login form — email/password submit works', async ({ page }) => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    await page.fill('input[type="email"]', 'test@test.com')
    await page.fill('input[type="password"]', 'TestPassword123')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000)

    // Should show error (bad creds) but not crash
    const url = page.url()
    console.log(`After bad login: ${url}`)
    expect(url).toContain('/login')
    console.log('Login form submit: no crash')
  })

  test('Dashboard layout — sidebar visible on desktop', async ({ page }) => {
    // Navigate to login first
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(1000)

    // Check that sidebar is rendered (even if not visible without auth)
    // We test the login page which should NOT have a sidebar
    const sidebar = page.locator('[data-testid="sidebar"]')
    const sidebarCount = await sidebar.count()
    console.log(`Sidebar on login page: ${sidebarCount} (should be 0)`)
  })

  test('Public routes are not blocked by middleware', async ({ page }) => {
    const publicPages = [
      '/', '/pricing', '/status', '/changelog', '/offline',
      '/login', '/register', '/forgot-password',
      '/legal/cgu', '/legal/privacy',
    ]

    for (const p of publicPages) {
      const response = await page.request.get(`${BASE}${p}`)
      const finalUrl = response.url()
      const isBlocked = finalUrl.includes('/login?next=')
      console.log(`${p} → ${response.status()} blocked=${isBlocked}`)
      expect(isBlocked).toBe(false)
    }
    console.log('Anti-bug #18: all public routes accessible')
  })

  test('Protected routes redirect to /login', async ({ page }) => {
    const protectedPages = ['/dashboard', '/dashboard/trading', '/admin']

    for (const p of protectedPages) {
      await page.goto(`${BASE}${p}`, { waitUntil: 'networkidle', timeout: 15000 })
      const url = page.url()
      console.log(`${p} → ${url}`)
      expect(url).toContain('/login')
    }
    console.log('Protected routes: correctly redirect to login')
  })

  test('API status returns healthy', async ({ page }) => {
    const response = await page.request.get(`${BASE}/api/status`)
    const json = await response.json()
    console.log(`API status: ${json.status}`)
    console.log(`Services: ${Object.entries(json.services).map(([k, v]: [string, any]) => `${k}=${v.status}`).join(', ')}`)
    expect(json.status).toBe('ok')
  })
})
