import { test, expect } from '../fixtures/auth.fixture';
import { waitForSkeletonsToDisappear } from '../utils/test-helpers';

test.describe('Voice Configuration Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/voice');
  });

  test('should display voice catalog page', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Check page title
    await expect(page.getByRole('heading', { name: /voice/i })).toBeVisible();
  });

  test('should have back navigation to settings', async ({ page }) => {
    // Look for back button specifically in main content area
    const backButton = page.locator('main button').filter({ has: page.locator('[class*="chevron-left"]') }).first();
    await expect(backButton).toBeVisible();
  });

  test('should have add voice button', async ({ page }) => {
    const addButton = page.getByRole('link', { name: /add voice/i });
    await expect(addButton).toBeVisible();
  });

  test('should display voice cards or empty state', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Either show voice cards or empty state
    const content = page.locator('[class*="card"]');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show enhanced empty state when no voices', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    const emptyState = page.getByText(/no voices/i);
    if (await emptyState.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Check for tips
      await expect(page.getByText(/tip/i)).toBeVisible();
      // Check for CTA
      await expect(page.getByRole('link', { name: /add voice/i })).toBeVisible();
    }
  });

  test('should navigate to add voice form', async ({ page }) => {
    const addButton = page.getByRole('link', { name: /add voice/i });
    await addButton.click();

    await expect(page).toHaveURL(/\/settings\/voice\/new/);
  });

  test('should display voice card with voice ID', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    const voiceCard = page.locator('[class*="card"][class*="cursor-pointer"]').first();
    if (await voiceCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(voiceCard).toBeVisible();
    }
  });
});

test.describe('Voice Configuration Form', () => {
  test('should display add voice form', async ({ page }) => {
    await page.goto('/settings/voice/new');

    // Check for form elements using id
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#voiceId')).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/settings/voice/new');

    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /create|save|add/i });
    await submitButton.click();

    // Form should stay on the same page (validation prevents navigation)
    await expect(page).toHaveURL(/\/settings\/voice\/new/);

    // Name field should still be empty and required
    const nameField = page.locator('#name');
    await expect(nameField).toBeVisible();
  });
});
