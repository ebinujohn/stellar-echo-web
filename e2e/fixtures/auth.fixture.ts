import { test as base, expect } from '@playwright/test';

/**
 * Extended test fixture - uses global storageState from config for authenticated tests
 */
export const test = base;

export { expect };

/**
 * Test fixture for unauthenticated scenarios (login page tests, etc.)
 */
export const unauthenticatedTest = base.extend({
  // Clear any stored state
  storageState: { cookies: [], origins: [] },
});
