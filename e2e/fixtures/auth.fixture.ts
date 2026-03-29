import { test as base, expect } from '@playwright/test';

export const test = base.extend<{
  authenticatedPage: ReturnType<typeof base.extend>;
}>({});

export { expect };
