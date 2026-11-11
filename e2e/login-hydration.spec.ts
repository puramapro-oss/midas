import { test, expect, type Route } from '@playwright/test';

test.use({ trace: 'retain-on-failure' });

test('login stays disabled until hydration and preserves remember=false', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('midas-cookie-consent', JSON.stringify({
      essential: true, analytics: true, marketing: true,
    }));
  });

  let releaseScripts!: () => void;
  const scriptsReleased = new Promise<void>((resolve) => { releaseScripts = resolve; });
  let blockedScripts = 0;
  const delayNextScripts = async (route: Route) => {
    if (route.request().resourceType() === 'script') {
      blockedScripts += 1;
      await scriptsReleased;
    }
    await route.continue();
  };
  await page.route('**/_next/static/**', delayNextScripts);

  const controls = [
    'email-input', 'password-input', 'toggle-password',
    'remember-me-checkbox', 'login-button', 'google-button',
  ].map((testId) => page.getByTestId(testId));
  const email = page.getByTestId('email-input');
  const password = page.getByTestId('password-input');
  const remember = page.getByTestId('remember-me-checkbox');
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  try {
    // Waiting for load/DOMContentLoaded would deadlock on the deliberately held scripts.
    await page.goto('/login', { waitUntil: 'commit' });
    await expect.poll(() => blockedScripts).toBeGreaterThan(0);
    for (const control of controls) await expect(control).toBeDisabled();
    await expect(email).toHaveValue('');
    await expect(password).toHaveValue('');
    await expect(remember).not.toBeChecked();
    expect(await page.evaluate(() => localStorage.getItem('midas_remember'))).toBeNull();

    releaseScripts();
    for (const control of controls) await expect(control).toBeEnabled();

    // Fill each field once: a value lost during hydration must fail, never be refilled.
    await email.fill('test@purama.dev');
    await password.fill('testpassword123');
    await expect(email).toHaveValue('test@purama.dev');
    await expect(password).toHaveValue('testpassword123');
    await expect(remember).not.toBeChecked();
    await page.getByTestId('login-button').click();

    await expect.poll(() => page.evaluate(() => localStorage.getItem('midas_remember'))).toBe('false');
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('midas_session_valid'))).toBe('true');
    await expect(email).toHaveValue('test@purama.dev');
    await expect(password).toHaveValue('testpassword123');
    await expect(page.getByTestId('email-error')).toHaveCount(0);
    await expect(page.getByTestId('password-error')).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  } finally {
    releaseScripts();
    await page.unrouteAll({ behavior: 'wait' });
  }
});
