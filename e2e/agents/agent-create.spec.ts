import { test, expect } from '../fixtures/auth.fixture';

test.describe('Create Agent Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/agents');
  });

  test('should open create agent dialog', async ({ page }) => {
    // Click create button
    await page.click('button:has-text("New Agent"), button:has-text("Create")');

    // Dialog should be visible
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    // Open dialog
    await page.click('button:has-text("New Agent"), button:has-text("Create")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Try to submit without filling required fields
    await page.click('[role="dialog"] button:has-text("Create")');

    // Should show validation error - look for specific error text
    const errorText = page.getByText(/required/i);
    await expect(errorText.first()).toBeVisible();
  });

  test('should create agent with name and description', async ({ page }) => {
    // Open dialog
    await page.click('button:has-text("New Agent"), button:has-text("Create")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Fill form using id selectors
    const testAgentName = `Test Agent ${Date.now()}`;
    await page.fill('[role="dialog"] #name', testAgentName);

    // Try to fill description if it exists
    const descField = page.locator('[role="dialog"] #description');
    if (await descField.isVisible({ timeout: 1000 }).catch(() => false)) {
      await descField.fill('Test agent description');
    }

    // Submit
    await page.click('[role="dialog"] button:has-text("Create")');

    // Dialog should close and we should see success toast or navigate to agent
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 10000 });
  });

  test('should close dialog on cancel', async ({ page }) => {
    // Open dialog
    await page.click('button:has-text("New Agent"), button:has-text("Create")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Click cancel or close
    const closeButton = page.locator('[role="dialog"] button:has-text("Cancel")');
    if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeButton.click();
    } else {
      // Try escape key
      await page.keyboard.press('Escape');
    }

    // Dialog should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should close dialog on escape key', async ({ page }) => {
    // Open dialog
    await page.click('button:has-text("New Agent"), button:has-text("Create")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Press escape
    await page.keyboard.press('Escape');

    // Dialog should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });
});
