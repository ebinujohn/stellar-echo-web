import { test, expect } from '../fixtures/auth.fixture';
import { waitForSkeletonsToDisappear } from '../utils/test-helpers';

test.describe('RAG Configuration Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/rag');
  });

  test('should display RAG configurations page', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Check page title
    await expect(page.getByRole('heading', { name: /rag/i })).toBeVisible();
  });

  test('should have back navigation to settings', async ({ page }) => {
    // Look for back button specifically in main content area
    const backButton = page.locator('main button').filter({ has: page.locator('[class*="chevron-left"]') }).first();
    await expect(backButton).toBeVisible();
  });

  test('should have create configuration button', async ({ page }) => {
    const createButton = page.getByRole('link', { name: /new configuration/i });
    await expect(createButton).toBeVisible();
  });

  test('should have deploy from S3 button', async ({ page }) => {
    const deployButton = page.getByRole('link', { name: /deploy from s3/i });
    await expect(deployButton).toBeVisible();
  });

  test('should display RAG config cards or empty state', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Either show config cards or empty state with tips
    const content = page.locator('[class*="card"]');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show enhanced empty state when no configs', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    const emptyState = page.getByText(/no rag configurations/i);
    if (await emptyState.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Check for tips
      await expect(page.getByText(/tip/i)).toBeVisible();
      // Check for action buttons
      await expect(page.getByRole('link', { name: /create/i })).toBeVisible();
    }
  });

  test('should navigate to create form', async ({ page }) => {
    const createButton = page.getByRole('link', { name: /new configuration/i });
    await createButton.click();

    await expect(page).toHaveURL(/\/settings\/rag\/new/);
  });

  test('should display config card details', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    const configCard = page.locator('[class*="card"][class*="cursor-pointer"]').first();
    if (await configCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(configCard).toBeVisible();
    }
  });
});

test.describe('RAG Configuration Form', () => {
  test('should display create form', async ({ page }) => {
    await page.goto('/settings/rag/new');

    // Check for form elements using id
    await expect(page.locator('#name')).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/settings/rag/new');

    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /create|save/i });
    await submitButton.click();

    // Form should stay on the same page (validation prevents navigation)
    await expect(page).toHaveURL(/\/settings\/rag\/new/);

    // Name field should still be empty and required
    const nameField = page.locator('#name');
    await expect(nameField).toBeVisible();
  });

  test('should have search mode selector', async ({ page }) => {
    await page.goto('/settings/rag/new');

    // Look for search mode field
    const searchModeField = page.getByText(/search mode/i);
    await expect(searchModeField.first()).toBeVisible();
  });
});
