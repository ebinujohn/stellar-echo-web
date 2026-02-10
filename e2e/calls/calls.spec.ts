import { test, expect } from '../fixtures/auth.fixture';
import { waitForSkeletonsToDisappear } from '../utils/test-helpers';

test.describe('Calls Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calls');
  });

  test('should display calls page with title', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Check page title
    await expect(page.getByRole('heading', { name: 'Calls', exact: true })).toBeVisible();
  });

  test('should display filter controls', async ({ page }) => {
    // Check for search input with placeholder
    await expect(page.getByPlaceholder(/call id|phone/i)).toBeVisible();

    // Check for filter labels
    await expect(page.getByText('Search', { exact: true })).toBeVisible();
    await expect(page.getByText('Status', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Direction', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Agent', { exact: true }).first()).toBeVisible();
  });

  test('should have status filter dropdown', async ({ page }) => {
    // Status filter is a select element
    const statusFilter = page.locator('select').first();
    await expect(statusFilter).toBeVisible();

    // Should have status options (All + started/ongoing/ended/failed)
    await expect(statusFilter.locator('option')).toHaveCount(5);
  });

  test('should have direction filter dropdown', async ({ page }) => {
    // Direction filter is the second select
    const directionFilter = page.locator('select').nth(1);
    await expect(directionFilter).toBeVisible();

    // Should have direction options (All, Inbound, Outbound)
    const optionCount = await directionFilter.locator('option').count();
    expect(optionCount).toBe(3);
  });

  test('should have agent filter dropdown', async ({ page }) => {
    // Agent filter is the third select
    const agentFilter = page.locator('select').nth(2);
    await expect(agentFilter).toBeVisible();
  });

  test('should have apply filter button', async ({ page }) => {
    // Check for Apply button
    const applyButton = page.getByRole('button', { name: /apply/i });
    await expect(applyButton).toBeVisible();
  });

  test('should display KPI stat cards', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Check for 4 specific stat cards
    const statTitles = ['Total Calls', 'Avg Duration', 'Avg Latency', 'Success Rate'];
    for (const title of statTitles) {
      await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
    }
  });

  test('should display calls table or empty state', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Wait for the "All Calls" card to appear
    await expect(page.getByText('All Calls')).toBeVisible({ timeout: 10000 });

    // Wait for either table or empty message to appear (data loading may lag after skeletons)
    const table = page.locator('table').first();
    const emptyMessage = page.getByText('No calls found matching your filters.');
    await expect(table.or(emptyMessage)).toBeVisible({ timeout: 15000 });
  });

  test('should display table headers when calls exist', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    const table = page.locator('table').first();
    if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
      const headers = ['Call ID', 'Date/Time', 'Direction', 'Duration', 'From', 'To', 'Agent', 'Status', 'Messages'];
      for (const header of headers) {
        await expect(page.locator('th').filter({ hasText: header })).toBeVisible();
      }
    }
  });

  test('should navigate to call detail via View button', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Each call row has a "View" button
    const viewButton = page.getByRole('button', { name: /view/i }).first();

    if (await viewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewButton.click();
      await expect(page).toHaveURL(/\/calls\/[a-zA-Z0-9-]+/);
    }
  });

  test('should navigate to call detail via Call ID link', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Call ID is a clickable code element linking to detail
    const callIdLink = page.locator('table code').first();

    if (await callIdLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await callIdLink.click();
      await expect(page).toHaveURL(/\/calls\/[a-zA-Z0-9-]+/);
    }
  });

  test('should display pagination controls', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    const table = page.locator('table').first();
    if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(page.getByRole('button', { name: /previous/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /next/i })).toBeVisible();
      await expect(page.getByText(/page \d+ of \d+/i)).toBeVisible();
    }
  });

  test('should apply filters and update results', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Select a status filter
    const statusFilter = page.locator('select').first();
    await statusFilter.selectOption('ended');

    // Click Apply button and wait for data to load
    await page.getByRole('button', { name: /apply/i }).click();
    await page.waitForLoadState('networkidle');
    await waitForSkeletonsToDisappear(page);

    // Page should not show error
    await expect(page.getByText(/error loading/i)).not.toBeVisible();

    // All Calls card should still be visible
    await expect(page.getByRole('heading', { name: 'All Calls' })).toBeVisible({ timeout: 10000 });
  });

  test('should show active filter badges after applying', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Select a status filter and apply
    const statusFilter = page.locator('select').first();
    await statusFilter.selectOption('ended');
    await page.getByRole('button', { name: /apply/i }).click();

    // Active filter badge should appear
    await expect(page.getByText('Active filters:')).toBeVisible();
    await expect(page.getByText('Status: ended')).toBeVisible();
  });

  test('should use search filter', async ({ page }) => {
    // Fill in search field
    const searchInput = page.getByPlaceholder(/call id|phone/i);
    await searchInput.fill('test-search');

    // Click Apply
    await page.getByRole('button', { name: /apply/i }).click();

    // Should not show error
    await expect(page.getByText(/error loading/i)).not.toBeVisible();
  });
});

test.describe('Call Detail Page', () => {
  test('should display call detail with tabs', async ({ page }) => {
    await page.goto('/calls');
    await waitForSkeletonsToDisappear(page);

    // Click View button on first call
    const viewButton = page.getByRole('button', { name: /view/i }).first();

    if (await viewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewButton.click();
      await expect(page).toHaveURL(/\/calls\/[a-zA-Z0-9-]+/);

      // Check for tabs
      await expect(page.locator('[role="tablist"]')).toBeVisible();
      await expect(page.getByRole('tab', { name: /timeline/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /metrics/i })).toBeVisible();
    }
  });
});
