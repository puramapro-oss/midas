import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('/dashboard redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/login**');
    expect(page.url()).toContain('/login');
  });

  test('/dashboard/chat redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard/chat');
    await page.waitForURL('**/login**');
    expect(page.url()).toContain('/login');
  });

  test('/admin redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL('**/login**');
    expect(page.url()).toContain('/login');
  });
});
