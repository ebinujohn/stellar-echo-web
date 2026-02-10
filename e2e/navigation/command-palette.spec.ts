import { test, expect } from '../fixtures/auth.fixture';

test.describe('Command Palette (Cmd+K)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should open command palette with Cmd+K', async ({ page }) => {
    // Trigger Cmd+K (Meta+K on Mac, Ctrl+K on others)
    await page.keyboard.press('Meta+k');

    // Command dialog should appear
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Search input should be visible
    await expect(page.getByPlaceholder(/type a command or search/i)).toBeVisible();
  });

  test('should open command palette with Ctrl+K', async ({ page }) => {
    // Ctrl+K also works
    await page.keyboard.press('Control+k');

    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('should close command palette with Escape', async ({ page }) => {
    // Open palette
    await page.keyboard.press('Meta+k');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should toggle command palette on repeated Cmd+K', async ({ page }) => {
    // Open
    await page.keyboard.press('Meta+k');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Toggle close
    await page.keyboard.press('Meta+k');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should display Navigation group', async ({ page }) => {
    await page.keyboard.press('Meta+k');

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Navigation group heading
    await expect(dialog.getByText('Navigation')).toBeVisible();

    // Navigation items (scoped to dialog to avoid matching sidebar)
    await expect(dialog.getByText('Dashboard')).toBeVisible();
    await expect(dialog.getByText('Calls')).toBeVisible();
    await expect(dialog.getByText('Analytics')).toBeVisible();
    await expect(dialog.getByText('Agents')).toBeVisible();
  });

  test('should display Settings group', async ({ page }) => {
    await page.keyboard.press('Meta+k');

    // Settings group heading
    await expect(page.getByText('Settings').last()).toBeVisible();

    // Settings items
    await expect(page.getByText('RAG Settings')).toBeVisible();
    await expect(page.getByText('Voice Settings')).toBeVisible();
    await expect(page.getByText('Phone Settings')).toBeVisible();
    await expect(page.getByText('General Settings')).toBeVisible();
  });

  test('should navigate to page when item is selected', async ({ page }) => {
    // Open palette
    await page.keyboard.press('Meta+k');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Click on "Calls" command item
    const callsItem = page.locator('[cmdk-item]').filter({ hasText: 'Calls' });
    await callsItem.click();

    // Should navigate to calls page
    await expect(page).toHaveURL(/\/calls/);

    // Dialog should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.keyboard.press('Meta+k');

    // Click on RAG Settings
    const ragItem = page.locator('[cmdk-item]').filter({ hasText: 'RAG Settings' });
    await ragItem.click();

    await expect(page).toHaveURL(/\/settings\/rag/);
  });

  test('should filter results by search text', async ({ page }) => {
    await page.keyboard.press('Meta+k');

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Type in search
    await page.getByPlaceholder(/type a command or search/i).fill('agent');

    // Should show Agents in results (scoped to dialog to avoid matching sidebar)
    await expect(dialog.getByText('Agents')).toBeVisible();

    // Navigation items that don't match should be hidden or filtered
  });

  test('should show "No results found" for unmatched search', async ({ page }) => {
    await page.keyboard.press('Meta+k');

    // Type something that won't match
    await page.getByPlaceholder(/type a command or search/i).fill('xyznonexistent');

    // Should show no results message
    await expect(page.getByText('No results found.')).toBeVisible();
  });
});
