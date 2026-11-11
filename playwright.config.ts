import { defineConfig, devices } from '@playwright/test';

const isolated = process.env.MIDAS_E2E_ISOLATED === '1';
if (process.env.CI && !isolated) throw new Error('CI must use scripts/e2e/run-isolated.mjs');

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results/browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list'], ['json', { outputFile: 'test-results/e2e-isolation/playwright.json' }]],
  timeout: 30000,
  expect: { timeout: 10000 },
  use: {
    baseURL: isolated ? 'http://127.0.0.1:3000' : process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'iPhone 14',
      use: { ...devices['iPhone 14'] },
    },
  ],
  webServer: isolated ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000/login',
    reuseExistingServer: !process.env.CI,
  },
});
