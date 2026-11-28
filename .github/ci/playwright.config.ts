import path from 'node:path';
import { defineConfig } from '@playwright/test';
import original from '../../playwright.config';

// Preserve every project and spec. The isolated launcher already owns the server.
export default defineConfig({
  ...original,
  testDir: path.resolve('e2e'),
  use: { ...original.use, baseURL: 'http://127.0.0.1:3000' },
  webServer: undefined,
});
