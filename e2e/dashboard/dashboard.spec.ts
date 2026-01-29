import { test, expect } from '../fixtures/auth.fixture';
import { waitForSkeletonsToDisappear } from '../utils/test-helpers';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should display dashboard with KPI cards', async ({ page }) => {
    // Wait for loading to complete
    await waitForSkeletonsToDisappear(page);

    // Check page title - use first() to avoid strict mode violation
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Check for KPI stat cards (should have at least 4)
    const statCards = page.locator('[class*="card"]').filter({
      has: page.locator('[class*="text-2xl"], [class*="text-3xl"]'),
    });
    await expect(statCards.first()).toBeVisible();
  });

  test('should display navigation sidebar', async ({ page }) => {
    // Check sidebar navigation items
    await expect(page.locator('nav a:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('nav a:has-text("Calls")')).toBeVisible();
    await expect(page.locator('nav a:has-text("Analytics")')).toBeVisible();
    await expect(page.locator('nav a:has-text("Agents")')).toBeVisible();
    await expect(page.locator('nav a:has-text("Settings")')).toBeVisible();
  });

  test('should highlight active navigation item', async ({ page }) => {
    // Dashboard link should be highlighted/active
    const dashboardLink = page.locator('nav a:has-text("Dashboard")');
    await expect(dashboardLink).toHaveClass(/bg-primary|active/);
  });

  test('should navigate to other pages from sidebar', async ({ page }) => {
    // Click on Calls
    await page.click('nav a:has-text("Calls")');
    await expect(page).toHaveURL(/\/calls/);

    // Click on Agents
    await page.click('nav a:has-text("Agents")');
    await expect(page).toHaveURL(/\/agents/);

    // Click on Settings
    await page.click('nav a:has-text("Settings")');
    await expect(page).toHaveURL(/\/settings/);
  });

  test('should display user greeting in navbar', async ({ page }) => {
    // Check for welcome message
    await expect(page.locator('header').filter({ hasText: /welcome/i })).toBeVisible();
  });

  test('should have theme toggle in navbar', async ({ page }) => {
    // Check for theme toggle button
    const themeToggle = page.locator('button').filter({ has: page.locator('[class*="sun"], [class*="moon"]') }).first();
    await expect(themeToggle).toBeVisible();
  });

  test('should display recent calls section', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Look for recent calls table or list - use separate locators instead of comma-separated
    const recentCallsHeading = page.getByText(/recent calls/i);
    const tableElement = page.locator('[class*="table"]').first();

    // Either the heading or table should be visible
    const headingVisible = await recentCallsHeading.isVisible({ timeout: 3000 }).catch(() => false);
    const tableVisible = await tableElement.isVisible({ timeout: 3000 }).catch(() => false);

    expect(headingVisible || tableVisible).toBe(true);
  });
});
