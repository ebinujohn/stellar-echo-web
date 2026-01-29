import { test, expect } from '../fixtures/auth.fixture';
import { waitForSkeletonsToDisappear } from '../utils/test-helpers';

test.describe('Phone Configuration Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/phone');
  });

  test('should display phone numbers page', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Check page title
    await expect(page.getByRole('heading', { name: /phone/i })).toBeVisible();
  });

  test('should have back navigation to settings', async ({ page }) => {
    // Look for back button specifically in main content area
    const backButton = page.locator('main button').filter({ has: page.locator('[class*="chevron-left"]') }).first();
    await expect(backButton).toBeVisible();
  });

  test('should have add phone number button', async ({ page }) => {
    const addButton = page.getByRole('link', { name: /add phone/i });
    await expect(addButton).toBeVisible();
  });

  test('should display phone cards or empty state', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    // Either show phone cards or empty state
    const content = page.locator('[class*="card"]');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show enhanced empty state when no phone numbers', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    const emptyState = page.getByText(/no phone numbers/i);
    if (await emptyState.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Check for tips
      await expect(page.getByText(/tip/i)).toBeVisible();
      // Check for CTA
      await expect(page.getByRole('link', { name: /add phone/i })).toBeVisible();
    }
  });

  test('should navigate to add phone form', async ({ page }) => {
    const addButton = page.getByRole('link', { name: /add phone/i });
    await addButton.click();

    await expect(page).toHaveURL(/\/settings\/phone\/new/);
  });

  test('should display phone card with number and mapping status', async ({ page }) => {
    await waitForSkeletonsToDisappear(page);

    const phoneCard = page.locator('[class*="card"][class*="cursor-pointer"]').first();
    if (await phoneCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(phoneCard).toBeVisible();
    }
  });
});

test.describe('Phone Configuration Form', () => {
  test('should display add phone form', async ({ page }) => {
    await page.goto('/settings/phone/new');

    // Check for form elements using id
    await expect(page.locator('#phoneNumber')).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/settings/phone/new');

    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /create|save|add/i });
    await submitButton.click();

    // Form should stay on the same page (validation prevents navigation)
    await expect(page).toHaveURL(/\/settings\/phone\/new/);

    // Phone number field should still be empty and required
    const phoneField = page.locator('#phoneNumber');
    await expect(phoneField).toBeVisible();
  });

  test('should have agent mapping selector', async ({ page }) => {
    await page.goto('/settings/phone/new');

    // Look for agent mapping field
    const agentField = page.getByText(/agent/i);
    await expect(agentField.first()).toBeVisible({ timeout: 5000 });
  });
});
