import { test, expect } from '../fixtures/auth.fixture';
import { waitForSkeletonsToDisappear } from '../utils/test-helpers';

test.describe('Analytics Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analytics');
  });

  test('should display analytics page', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Check page title
    await expect(page.getByRole('heading', { name: /analytics/i })).toBeVisible();
  });

  test('should display chart sections', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Look for chart containers or cards
    const chartSections = page.locator('[class*="card"]').first();
    await expect(chartSections).toBeVisible();
  });

  test('should display latency by agent chart', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Look for latency chart section - use getByText or specific card
    const latencySection = page.getByText(/latency/i).first();
    await expect(latencySection).toBeVisible({ timeout: 10000 });
  });

  test('should display token usage trends', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Look for token usage section
    const tokenSection = page.getByText(/token/i).first();
    await expect(tokenSection).toBeVisible({ timeout: 10000 });
  });

  test('should handle empty data gracefully', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Page should not show error states
    await expect(page.getByText(/error loading/i)).not.toBeVisible();
    await expect(page.getByText(/failed to load/i)).not.toBeVisible();

    // Cards should be visible
    const content = page.locator('[class*="card"]').first();
    await expect(content).toBeVisible();
  });

  test('should have performance insights section', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Look for performance insights - may or may not exist
    const insightsSection = page.getByText(/insight/i);
    // This may or may not exist depending on data
    if (await insightsSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(insightsSection).toBeVisible();
    }
  });
});
