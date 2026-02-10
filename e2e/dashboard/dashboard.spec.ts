import { test, expect } from '../fixtures/auth.fixture';
import { waitForSkeletonsToDisappear } from '../utils/test-helpers';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should display dashboard with KPI cards', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Check page title
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Check description text
    await expect(page.getByText('Overview of your call analytics and agent performance')).toBeVisible();

    // Check for 4 specific KPI cards
    const kpiTitles = ['Total Calls', 'Avg Duration', 'Avg Response Time', 'Success Rate'];
    for (const title of kpiTitles) {
      await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
    }
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
    // Dashboard link should have active styling (bg-primary/10 with border-l-2)
    const dashboardLink = page.locator('nav a:has-text("Dashboard")');
    await expect(dashboardLink).toHaveClass(/bg-primary/);
    await expect(dashboardLink).toHaveClass(/border-primary/);
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
    // Check for welcome message in header
    await expect(page.locator('header').filter({ hasText: /welcome back/i })).toBeVisible();
  });

  test('should have theme toggle in navbar', async ({ page }) => {
    // Check for theme toggle button
    const themeToggle = page.locator('button').filter({ has: page.locator('[class*="sun"], [class*="moon"]') }).first();
    await expect(themeToggle).toBeVisible();
  });

  test('should display chart sections', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Check for Call Volume chart card
    await expect(page.getByText('Call Volume')).toBeVisible();
    await expect(page.getByText('Calls over the last 7 days')).toBeVisible();

    // Check for Sentiment Distribution chart card
    await expect(page.getByText('Sentiment Distribution')).toBeVisible();
  });

  test('should display recent calls section', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Recent Calls is now a card with a specific title
    await expect(page.getByText('Recent Calls')).toBeVisible();
    await expect(page.getByText('Latest call activity')).toBeVisible();
  });

  test('should display Stellar Echo branding in sidebar', async ({ page }) => {
    // Check sidebar branding
    await expect(page.getByText('Stellar Echo').first()).toBeVisible();
  });
});
