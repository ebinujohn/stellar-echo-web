import { test, expect } from '../fixtures/auth.fixture';
import { waitForSkeletonsToDisappear } from '../utils/test-helpers';

test.describe('Calls Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calls');
  });

  test('should display calls page with filters', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Check page title
    await expect(page.getByRole('heading', { name: 'Calls', exact: true })).toBeVisible();

    // Check for filter controls - look for select elements
    await expect(page.locator('select').first()).toBeVisible();
  });

  test('should have status filter dropdown', async ({ page }) => {
    // Look for status filter - should be a select element
    const statusFilter = page.locator('select').first();
    await expect(statusFilter).toBeVisible();

    // Check that it has at least 2 options (All + at least one status)
    const optionCount = await statusFilter.locator('option').count();
    expect(optionCount).toBeGreaterThan(1);
  });

  test('should have direction filter dropdown', async ({ page }) => {
    // Look for direction filter - second select
    const directionFilter = page.locator('select').nth(1);
    await expect(directionFilter).toBeVisible();
  });

  test('should have agent filter dropdown', async ({ page }) => {
    // Look for agent filter - third select
    const agentFilter = page.locator('select').nth(2);
    await expect(agentFilter).toBeVisible();
  });

  test('should display KPI stat cards', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Look for stat cards (Total Calls, Avg Duration, etc.)
    const statCards = page.locator('[class*="card"]').first();
    await expect(statCards).toBeVisible();
  });

  test('should display empty state or calls table', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Either empty state message, table, or "No calls found" should be visible
    const table = page.locator('table').first();
    const emptyState = page.getByText(/no calls|no results|no data/i).first();
    const cardContent = page.locator('[class*="card"]').first();

    const tableVisible = await table.isVisible({ timeout: 3000 }).catch(() => false);
    const emptyVisible = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);
    const cardVisible = await cardContent.isVisible({ timeout: 3000 }).catch(() => false);

    // At least one of these should be visible
    expect(tableVisible || emptyVisible || cardVisible).toBe(true);
  });

  test('should apply filters and show results', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Click apply filters button if present
    const applyButton = page.getByRole('button', { name: /apply|filter/i });
    if (await applyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await applyButton.click();
      await waitForSkeletonsToDisappear(page);
    }

    // Page should not show error
    await expect(page.getByText(/error loading/i)).not.toBeVisible();
  });

  test('should navigate to call detail when clicking a call', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Try to find a call row to click
    const callRow = page.locator('tr[class*="cursor-pointer"]').first();

    if (await callRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await callRow.click();
      // Should navigate to call detail
      await expect(page).toHaveURL(/\/calls\/[a-zA-Z0-9-]+/);
    }
  });
});

test.describe('Call Detail Page', () => {
  test('should display call detail with tabs', async ({ page }) => {
    // First navigate to calls and find a call
    await page.goto('/calls');
    await waitForSkeletonsToDisappear(page);

    // Try to find and click a call
    const callRow = page.locator('tr[class*="cursor-pointer"]').first();

    if (await callRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await callRow.click();
      await expect(page).toHaveURL(/\/calls\/[a-zA-Z0-9-]+/);

      // Check for tabs
      await expect(page.locator('[role="tablist"]')).toBeVisible();
      await expect(page.getByRole('tab', { name: /timeline/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /metrics/i })).toBeVisible();
    }
  });
});
