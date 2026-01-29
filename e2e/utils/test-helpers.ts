import { Page, expect } from '@playwright/test';

/**
 * Wait for page to be fully loaded (no network activity)
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for and click an element
 */
export async function clickAndWait(page: Page, selector: string, waitForNav = false) {
  await page.click(selector);
  if (waitForNav) {
    await page.waitForLoadState('networkidle');
  }
}

/**
 * Fill a form field and verify value
 */
export async function fillField(page: Page, selector: string, value: string) {
  await page.fill(selector, value);
  await expect(page.locator(selector)).toHaveValue(value);
}

/**
 * Check if an element is visible with retry
 */
export async function isVisible(page: Page, selector: string, timeout = 5000): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all visible text content from a list of elements
 */
export async function getListTexts(page: Page, selector: string): Promise<string[]> {
  const elements = page.locator(selector);
  const count = await elements.count();
  const texts: string[] = [];
  for (let i = 0; i < count; i++) {
    const text = await elements.nth(i).textContent();
    if (text) texts.push(text.trim());
  }
  return texts;
}

/**
 * Wait for toast notification and verify message
 */
export async function expectToast(page: Page, message: string | RegExp) {
  const toast = page.locator('[data-sonner-toast]');
  await expect(toast).toBeVisible({ timeout: 10000 });
  if (typeof message === 'string') {
    await expect(toast).toContainText(message);
  } else {
    await expect(toast.locator('div')).toHaveText(message);
  }
}

/**
 * Wait for skeleton loaders to disappear
 */
export async function waitForSkeletonsToDisappear(page: Page) {
  await page.waitForFunction(() => {
    const skeletons = document.querySelectorAll('[class*="skeleton"]');
    return skeletons.length === 0;
  }, { timeout: 10000 });
}

/**
 * Check if page is in dark mode
 */
export async function isDarkMode(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.classList.contains('dark'));
}

/**
 * Toggle theme to specified mode
 */
export async function setTheme(page: Page, theme: 'light' | 'dark' | 'system') {
  // Click theme toggle button
  await page.click('[aria-label*="theme"], [aria-label*="Toggle theme"]');
  // Click the theme option
  await page.click(`text=${theme.charAt(0).toUpperCase() + theme.slice(1)}`);
}

/**
 * Take a labeled screenshot
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
}

/**
 * Mobile viewport helper
 */
export const mobileViewport = {
  width: 375,
  height: 667,
};

/**
 * Tablet viewport helper
 */
export const tabletViewport = {
  width: 768,
  height: 1024,
};

/**
 * Desktop viewport helper
 */
export const desktopViewport = {
  width: 1280,
  height: 720,
};
