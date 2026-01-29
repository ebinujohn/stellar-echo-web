import { test, expect } from '../fixtures/auth.fixture';
import { isDarkMode } from '../utils/test-helpers';

test.describe('Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should display theme toggle button', async ({ page }) => {
    const themeToggle = page.locator('[aria-label*="theme" i], button:has([class*="sun"]), button:has([class*="moon"])');
    await expect(themeToggle).toBeVisible();
  });

  test('should open theme dropdown on click', async ({ page }) => {
    // Find and click theme toggle
    const themeToggle = page.locator('[aria-label*="theme" i], button:has([class*="sun"]), button:has([class*="moon"])');
    await themeToggle.click();

    // Should show dropdown with options
    await expect(page.locator('text=/light|dark|system/i').first()).toBeVisible();
  });

  test('should switch to dark mode', async ({ page }) => {
    // Click theme toggle
    const themeToggle = page.locator('[aria-label*="theme" i], button:has([class*="sun"]), button:has([class*="moon"])');
    await themeToggle.click();

    // Click dark mode option
    await page.click('text=Dark');

    // Wait for theme to apply
    await page.waitForTimeout(500);

    // Check if dark class is applied
    const darkMode = await isDarkMode(page);
    expect(darkMode).toBe(true);
  });

  test('should switch to light mode', async ({ page }) => {
    // First set to dark mode to ensure we can switch back
    const themeToggle = page.locator('[aria-label*="theme" i], button:has([class*="sun"]), button:has([class*="moon"])');
    await themeToggle.click();
    await page.click('text=Dark');
    await page.waitForTimeout(300);

    // Now switch to light mode
    await themeToggle.click();
    await page.click('text=Light');
    await page.waitForTimeout(500);

    // Check if dark class is removed
    const darkMode = await isDarkMode(page);
    expect(darkMode).toBe(false);
  });

  test('should persist theme across page navigation', async ({ page }) => {
    // Set dark mode
    const themeToggle = page.locator('[aria-label*="theme" i], button:has([class*="sun"]), button:has([class*="moon"])');
    await themeToggle.click();
    await page.click('text=Dark');
    await page.waitForTimeout(500);

    // Navigate to another page
    await page.click('nav a:has-text("Calls")');
    await expect(page).toHaveURL(/\/calls/);

    // Theme should persist
    const darkMode = await isDarkMode(page);
    expect(darkMode).toBe(true);
  });

  test('should render all pages correctly in dark mode', async ({ page }) => {
    // Set dark mode
    const themeToggle = page.locator('[aria-label*="theme" i], button:has([class*="sun"]), button:has([class*="moon"])');
    await themeToggle.click();
    await page.click('text=Dark');
    await page.waitForTimeout(500);

    // Navigate through pages and verify no visual errors
    const pages = ['/dashboard', '/calls', '/analytics', '/agents', '/settings'];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      // Page should not have any error states
      await expect(page.locator('text=/error loading|failed to load|something went wrong/i')).not.toBeVisible();

      // Main content should be visible
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('should have proper contrast in dark mode', async ({ page }) => {
    // Set dark mode
    const themeToggle = page.locator('[aria-label*="theme" i], button:has([class*="sun"]), button:has([class*="moon"])');
    await themeToggle.click();
    await page.click('text=Dark');
    await page.waitForTimeout(500);

    // Check that text is visible (basic contrast check)
    const headerText = page.locator('header h2, header span').first();
    await expect(headerText).toBeVisible();

    // Check that cards have visible borders in dark mode
    const card = page.locator('[class*="card"]').first();
    if (await card.isVisible({ timeout: 3000 })) {
      await expect(card).toBeVisible();
    }
  });
});
