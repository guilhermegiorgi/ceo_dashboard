import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { loginViaUI } from './setup/auth.setup';
import { defaultCredentials } from './setup/test-data';

type AuthFixtures = {
  login: () => Promise<void>;
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  // Execute login before each test that uses this fixture
  login: async ({ page }) => {
    await loginViaUI(page);
  },
  // Setup authenticated page fixture
  authenticatedPage: async ({ page }) => {
    await loginViaUI(page);
    return page;
  },
});

export { expect } from '@playwright/test';
export const credentials = defaultCredentials;
