import { test, expect } from '@playwright/test';

test.describe('Authentication - Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('login page loads with email and password inputs', async ({ page }) => {
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('empty form submission shows validation errors', async ({ page }) => {
    await page.locator('[data-testid="login-button"]').click();

    // Validation errors should appear for empty fields
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
  });

  test('Google OAuth button exists', async ({ page }) => {
    await expect(page.locator('[data-testid="google-button"]')).toBeVisible();
  });

  test('"Pas encore de compte" link goes to /register', async ({ page }) => {
    const registerLink = page.locator('[data-testid="register-link"]');
    await expect(registerLink).toBeVisible();
    await registerLink.click();
    await page.waitForURL('**/register');
    expect(page.url()).toContain('/register');
  });
});

test.describe('Authentication - Register', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('register page loads with name, email, password fields', async ({ page }) => {
    await expect(page.locator('[data-testid="fullname-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirm-password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-button"]')).toBeVisible();
  });

  test('empty form submission shows validation errors', async ({ page }) => {
    await page.locator('[data-testid="register-button"]').click();

    // At least the name and email errors should appear
    await expect(page.locator('[data-testid="fullname-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
  });

  test('Google OAuth button exists on register page', async ({ page }) => {
    await expect(page.locator('[data-testid="google-button"]')).toBeVisible();
  });

  test('"Deja un compte" link goes to /login', async ({ page }) => {
    const loginLink = page.locator('[data-testid="login-link"]');
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });
});
