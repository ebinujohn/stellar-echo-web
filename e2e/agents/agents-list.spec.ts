import { test, expect } from '../fixtures/auth.fixture';
import { waitForSkeletonsToDisappear } from '../utils/test-helpers';

test.describe('Agents List Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/agents');
  });

  test('should display agents page with title', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Check page title and description
    await expect(page.getByRole('heading', { name: /agents/i })).toBeVisible();
    await expect(page.getByText('Manage voice AI agent configurations')).toBeVisible();
  });

  test('should have create agent button', async ({ page }) => {
    // Button text is "New Agent" with Plus icon
    const createButton = page.getByRole('button', { name: /new agent/i });
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

    // Empty state now shows "No agents yet" text
    const emptyState = page.getByText('No agents yet');
    if (await emptyState.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Check for tips (EmptyState component renders tips)
      await expect(page.getByText(/start with a simple workflow/i)).toBeVisible();

      // Check for CTA button
      await expect(page.getByRole('button', { name: /create first agent/i })).toBeVisible();
    }
  });

  test('should display search bar when agents exist', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Search bar appears only when agents exist
    const searchInput = page.getByPlaceholder(/search agents/i);
    const agentCard = page.locator('[class*="card"][class*="cursor-pointer"]').first();

    if (await agentCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(searchInput).toBeVisible();
    }
  });

  test('should filter agents by search query', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    const searchInput = page.getByPlaceholder(/search agents/i);
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Type a search query
      await searchInput.fill('nonexistent-agent-xyz');

      // Should show "No agents match" message
      await expect(page.getByText(/no agents match/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should open create agent dialog', async ({ page }) => {
    // Click New Agent button
    const createButton = page.getByRole('button', { name: /new agent/i });
    await createButton.click();

    // Dialog should appear
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('[role="dialog"] #name')).toBeVisible();
  });

  test('should show agent card with Active badge and version', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Agent cards have border-l-4 styling and cursor-pointer
    const agentCard = page.locator('[class*="card"][class*="cursor-pointer"]').first();

    if (await agentCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Card should show Active badge
      await expect(agentCard.getByText('Active')).toBeVisible();

      // Card should show Total Calls label
      await expect(agentCard.getByText('Total Calls')).toBeVisible();
    }
  });

  test('should have edit and delete buttons on agent cards', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    const agentCard = page.locator('[class*="card"][class*="cursor-pointer"]').first();

    if (await agentCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Edit button (ghost variant with Edit icon)
      const editButton = agentCard.locator('button').filter({ has: page.locator('[class*="lucide-edit"], [class*="lucide-pencil"]') });
      await expect(editButton).toBeVisible();

      // Delete button (ghost variant with Trash icon, destructive text)
      const deleteButton = agentCard.locator('button').filter({ has: page.locator('[class*="lucide-trash"]') });
      await expect(deleteButton).toBeVisible();
    }
  });

  test('should navigate to agent detail on card click', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Agent cards are clickable
    const agentCard = page.locator('[class*="card"][class*="cursor-pointer"]').first();

    if (await agentCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await agentCard.click();
      await expect(page).toHaveURL(/\/agents\/[a-zA-Z0-9-]+/);
    }
  });

  test('should show delete confirmation dialog', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    const agentCard = page.locator('[class*="card"][class*="cursor-pointer"]').first();

    if (await agentCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Click the delete button on the card
      const deleteButton = agentCard.locator('button').filter({ has: page.locator('[class*="lucide-trash"]') });
      await deleteButton.click();

      // Delete confirmation dialog should appear
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    }
  });
});
