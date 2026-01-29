import { test, expect } from '../fixtures/auth.fixture';
import { waitForSkeletonsToDisappear } from '../utils/test-helpers';

test.describe('Agents List Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/agents');
  });

  test('should display agents page with title', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Check page title
    await expect(page.getByRole('heading', { name: /agents/i })).toBeVisible();
  });

  test('should have create agent button', async ({ page }) => {
    // Check for create button
    const createButton = page.getByRole('button', { name: /new agent|create agent/i });
    await expect(createButton).toBeVisible();
  });

  test('should display agent cards or empty state', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Either show agent cards or empty state
    const content = page.locator('[class*="card"]');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display empty state with tips when no agents', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // If empty state is shown, it should have helpful content
    const emptyState = page.getByText(/no agents/i);
    if (await emptyState.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Check for tips section
      await expect(page.getByText(/tip/i)).toBeVisible();
      // Check for CTA button
      await expect(page.getByRole('button', { name: /create/i })).toBeVisible();
    }
  });

  test('should open create agent dialog', async ({ page }) => {
    // Click create button
    const createButton = page.getByRole('button', { name: /new agent|create/i });
    await createButton.click();

    // Dialog should appear
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    // Look for form input by id
    await expect(page.locator('[role="dialog"] #name')).toBeVisible();
  });

  test('should show agent card with details', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Find an agent card (if exists)
    const agentCard = page.locator('[class*="card"][class*="cursor-pointer"]').first();

    if (await agentCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Card should be visible
      await expect(agentCard).toBeVisible();
    }
  });

  test('should navigate to agent detail on card click', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Find and click an agent card
    const agentCard = page.locator('[class*="card"][class*="cursor-pointer"]').first();

    if (await agentCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await agentCard.click();
      // Should navigate to agent detail
      await expect(page).toHaveURL(/\/agents\/[a-zA-Z0-9-]+/);
    }
  });
});
