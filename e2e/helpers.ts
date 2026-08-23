import type { Page } from '@playwright/test';

/**
 * Dismiss cookie banner by pre-setting consent in localStorage
 */
export async function dismissCookies(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem('midas-cookie-consent', JSON.stringify({ essential: true, analytics: true, marketing: true }));
  });
  // Reload so the banner doesn't appear
  await page.reload({ waitUntil: 'domcontentloaded' });
}

/**
 * Collect JS errors from page
 */
export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/**
 * Public pages that should be accessible without auth
 */
export const PUBLIC_PAGES = [
  { path: '/', name: 'Landing' },
  { path: '/login', name: 'Login' },
  { path: '/register', name: 'Register' },
  { path: '/pricing', name: 'Pricing' },
  { path: '/status', name: 'Status' },
  { path: '/changelog', name: 'Changelog' },
  { path: '/offline', name: 'Offline' },
  { path: '/onboarding', name: 'Onboarding' },
  { path: '/forgot-password', name: 'Forgot Password' },
  { path: '/legal/mentions', name: 'Mentions Legales' },
  { path: '/legal/privacy', name: 'Politique Confidentialite' },
  { path: '/legal/cgu', name: 'CGU' },
  { path: '/legal/cgv', name: 'CGV' },
  { path: '/legal/cookies', name: 'Cookies' },
  { path: '/legal/disclaimer', name: 'Disclaimer' },
];

/**
 * Legal pages that should have meaningful content
 */
export const LEGAL_PAGES = [
  { path: '/legal/mentions', name: 'Mentions', minLength: 200 },
  { path: '/legal/privacy', name: 'Privacy', minLength: 300 },
  { path: '/legal/cgu', name: 'CGU', minLength: 300 },
  { path: '/legal/cgv', name: 'CGV', minLength: 300 },
  { path: '/legal/cookies', name: 'Cookies', minLength: 200 },
];
