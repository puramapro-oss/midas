import { defineConfig } from '@playwright/test';
import path from 'node:path';

export default defineConfig({
  testDir: __dirname,
  testMatch: 'notifications.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  outputDir: path.join(__dirname, 'test-results'),
  reporter: [['list'], ['json', { outputFile: path.join(__dirname, 'test-results/results.json') }]],
  use: {
    baseURL: 'http://127.0.0.1:3092',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      ...(process.env.MIDAS_CHROMIUM_PATH ? { executablePath: process.env.MIDAS_CHROMIUM_PATH } : {}),
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
  },
  projects: [
    { name: 'mobile-375', use: { browserName: 'chromium', viewport: { width: 375, height: 812 } } },
    { name: 'desktop-1280', use: { browserName: 'chromium', viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: 'node node_modules/next/dist/bin/next start tests/notifications-ui/fixture --hostname 127.0.0.1 --port 3092',
    cwd: path.resolve(__dirname, '../..'),
    url: 'http://127.0.0.1:3092',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
