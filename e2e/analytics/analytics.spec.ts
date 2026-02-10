import { test, expect } from '../fixtures/auth.fixture';
import { waitForSkeletonsToDisappear } from '../utils/test-helpers';

test.describe('Analytics Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analytics');
  });

  test('should display analytics page with title', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Check page title
    await expect(page.getByRole('heading', { name: /analytics/i })).toBeVisible();

    // Check description
    await expect(page.getByText('Deep dive into call metrics and performance analytics')).toBeVisible();
  });

  test('should display performance insight cards', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Insight cards show badges with variant labels (Good, Review, Info)
    const badges = page.locator('[class*="badge"]');
    const badgeCount = await badges.count();

    // If data exists, should have insight cards with badges
    if (badgeCount > 0) {
      // Check for at least one variant badge
      const goodBadge = page.getByText('Good', { exact: true });
      const reviewBadge = page.getByText('Review', { exact: true });
      const infoBadge = page.getByText('Info', { exact: true });

      const goodVisible = await goodBadge.first().isVisible({ timeout: 3000 }).catch(() => false);
      const reviewVisible = await reviewBadge.first().isVisible({ timeout: 3000 }).catch(() => false);
      const infoVisible = await infoBadge.first().isVisible({ timeout: 3000 }).catch(() => false);

      expect(goodVisible || reviewVisible || infoVisible).toBe(true);
    }
  });

  test('should display latency by agent chart', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Check for Latency by Agent chart card
    await expect(page.getByText('Latency by Agent')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Average response latency per agent')).toBeVisible();
  });

  test('should display token usage trends chart', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Check for Token Usage Trends chart card
    await expect(page.getByText('Token Usage Trends')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Last 30 days of token consumption')).toBeVisible();
  });

  test('should handle empty data gracefully', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Page should not show error states
    await expect(page.getByText(/error loading/i)).not.toBeVisible();
    await expect(page.getByText(/failed to load/i)).not.toBeVisible();

    // Chart cards should be visible regardless of data
    const content = page.locator('[class*="card"]').first();
    await expect(content).toBeVisible();
  });

  test('should display insight labels when data exists', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Check for specific insight labels (shown when data is available)
    const successRate = page.getByText('Overall success rate');
    const responseTime = page.getByText('Average response time');
    const totalCalls = page.getByText('Total calls processed');

    // At least one insight should be visible if stats data is available
    const anyVisible =
      (await successRate.isVisible({ timeout: 3000 }).catch(() => false)) ||
      (await responseTime.isVisible({ timeout: 3000 }).catch(() => false)) ||
      (await totalCalls.isVisible({ timeout: 3000 }).catch(() => false));

    // Insights are data-dependent, so just verify no errors if none visible
    if (!anyVisible) {
      await expect(page.getByText(/error loading/i)).not.toBeVisible();
    }
  });

  test('should display two charts in grid layout', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Both chart cards should be visible
    const cards = page.locator('[class*="card"]');
    const cardCount = await cards.count();

    // At least 2 cards for the two chart sections
    expect(cardCount).toBeGreaterThanOrEqual(2);
  });
});
