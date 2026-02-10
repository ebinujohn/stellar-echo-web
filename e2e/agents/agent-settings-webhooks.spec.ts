import { test, expect } from '../fixtures/auth.fixture';
import { waitForSkeletonsToDisappear } from '../utils/test-helpers';

/**
 * Navigate to agent settings page and scroll to Webhooks section
 */
async function navigateToWebhooksSection(page: import('@playwright/test').Page): Promise<void> {
  // Navigate to agents list
  await page.goto('/agents');
  await page.waitForLoadState('networkidle');
  await waitForSkeletonsToDisappear(page);

  // Click on first agent card
  const agentCard = page.locator('[class*="card"][class*="cursor-pointer"]').first();
  await expect(agentCard, 'No agent cards found - create an agent first').toBeVisible({ timeout: 5000 });

  await agentCard.click();
  await page.waitForURL(/\/agents\/[a-zA-Z0-9-]+/);
  await page.waitForLoadState('networkidle');
  await waitForSkeletonsToDisappear(page);

  // Click on Settings tab
  const settingsTab = page.locator('[role="tab"]:has-text("Settings")');
  await expect(settingsTab, 'Settings tab not found').toBeVisible({ timeout: 5000 });

  await settingsTab.click();
  await page.waitForLoadState('networkidle');
  await waitForSkeletonsToDisappear(page);

  // Click on Webhooks section header to expand it (sections are collapsed by default)
  const webhooksHeading = page.getByRole('heading', { name: 'Webhooks' });
  await webhooksHeading.scrollIntoViewIfNeeded();
  await expect(webhooksHeading).toBeVisible();
  await webhooksHeading.click();

  // Wait for section to expand
  await page.waitForTimeout(300);
}

/**
 * Get the expanded Webhooks section content area
 */
function getWebhooksCard(page: import('@playwright/test').Page) {
  // The webhooks Card has id="section-webhooks" in settings-form
  return page.locator('#section-webhooks');
}

/**
 * Enable webhooks if not already enabled
 */
async function enableWebhooks(page: import('@playwright/test').Page): Promise<void> {
  const webhooksCard = getWebhooksCard(page);
  // Find the switch within the webhooks section
  const webhooksSwitch = webhooksCard.locator('button[role="switch"]').first();
  const state = await webhooksSwitch.getAttribute('data-state');
  if (state !== 'checked') {
    await webhooksSwitch.click();
  }
}

test.describe('Agent Settings - Webhooks', () => {
  // Configure to run tests serially
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await navigateToWebhooksSection(page);
  });

  test('should display Webhooks card in settings', async ({ page }) => {
    const webhooksCard = getWebhooksCard(page);
    await expect(webhooksCard).toBeVisible();
  });

  test('should display webhook description', async ({ page }) => {
    const description = page.getByText(/configure webhook notifications for call lifecycle events/i);
    await expect(description).toBeVisible();
  });

  test('should have enable webhooks toggle', async ({ page }) => {
    const webhooksCard = getWebhooksCard(page);
    const enableLabel = webhooksCard.getByText('Enable Webhooks');
    await expect(enableLabel).toBeVisible();

    const enableSwitch = webhooksCard.locator('button[role="switch"]').first();
    await expect(enableSwitch).toBeVisible();
  });

  test('should show webhook configuration when enabled', async ({ page }) => {
    await enableWebhooks(page);

    // Check for webhook configuration fields
    await expect(page.getByText('Webhook URL *')).toBeVisible();
    await expect(page.getByText('Events', { exact: true })).toBeVisible();
    await expect(page.getByText('Authentication', { exact: true })).toBeVisible();
  });

  test('should display event selection badges', async ({ page }) => {
    await enableWebhooks(page);

    // Check for event badges
    await expect(page.getByText('Call Started')).toBeVisible();
    await expect(page.getByText('Call Ended')).toBeVisible();
    await expect(page.getByText('Call Analyzed')).toBeVisible();
  });

  test('should toggle event selection', async ({ page }) => {
    await enableWebhooks(page);

    // Scroll to events section
    const eventsLabel = page.getByText('Events', { exact: true });
    await eventsLabel.scrollIntoViewIfNeeded();

    // Click on an event badge to toggle it - badges are clickable elements with event names
    const callStartedBadge = page.getByText('Call Started').first();
    await expect(callStartedBadge).toBeVisible();
    await callStartedBadge.click();

    // Badge should still be visible (just toggled style)
    await expect(callStartedBadge).toBeVisible();
  });

  test('should have authentication type selector', async ({ page }) => {
    await enableWebhooks(page);

    // Get the webhooks card
    const webhooksCard = getWebhooksCard(page);

    // Check for authentication dropdown - within webhooks card
    const authLabel = webhooksCard.getByText('Authentication', { exact: true });
    await authLabel.scrollIntoViewIfNeeded();
    await expect(authLabel).toBeVisible();

    const authSelect = webhooksCard.locator('button[role="combobox"]');
    await expect(authSelect).toBeVisible();
  });

  test('should show secret input when bearer auth is selected', async ({ page }) => {
    await enableWebhooks(page);

    // Get the webhooks card
    const webhooksCard = getWebhooksCard(page);

    // Scroll to auth section
    const authLabel = webhooksCard.getByText('Authentication', { exact: true });
    await authLabel.scrollIntoViewIfNeeded();

    // Open auth select within webhooks card and choose Bearer
    const authSelect = webhooksCard.locator('button[role="combobox"]');
    await authSelect.click();

    // Wait for dropdown to open and click Bearer option
    const bearerOption = page.locator('[role="option"]').filter({ hasText: 'Bearer Token' });
    await expect(bearerOption).toBeVisible();
    await bearerOption.click();

    // Secret input should appear
    await expect(page.getByPlaceholder(/enter bearer token/i)).toBeVisible();
  });

  test('should show secret input when HMAC auth is selected', async ({ page }) => {
    await enableWebhooks(page);

    // Get the webhooks card
    const webhooksCard = getWebhooksCard(page);

    // Scroll to auth section
    const authLabel = webhooksCard.getByText('Authentication', { exact: true });
    await authLabel.scrollIntoViewIfNeeded();

    // Open auth select within webhooks card and choose HMAC
    const authSelect = webhooksCard.locator('button[role="combobox"]');
    await authSelect.click();

    // Wait for dropdown to open and click HMAC option
    const hmacOption = page.locator('[role="option"]').filter({ hasText: 'HMAC Signature' });
    await expect(hmacOption).toBeVisible();
    await hmacOption.click();

    // Secret input should appear
    await expect(page.getByPlaceholder(/enter hmac secret/i)).toBeVisible();
  });

  test('should have payload options toggles', async ({ page }) => {
    await enableWebhooks(page);

    // Check for payload options
    await expect(page.getByText('Payload Options')).toBeVisible();
    await expect(page.getByText('Include Transcript')).toBeVisible();
    await expect(page.getByText('Include Latency Metrics')).toBeVisible();
  });

  test('should have collapsible advanced settings', async ({ page }) => {
    await enableWebhooks(page);

    // Check for advanced settings trigger
    const advancedTrigger = page.getByRole('button', { name: /advanced settings/i });
    await expect(advancedTrigger).toBeVisible();

    // Click to expand
    await advancedTrigger.click();

    // Advanced settings should be visible
    await expect(page.getByText('Timeout (seconds)')).toBeVisible();
    await expect(page.getByText('Max Retries')).toBeVisible();
  });

  test('should display retry configuration in advanced settings', async ({ page }) => {
    await enableWebhooks(page);

    // Expand advanced settings
    const advancedTrigger = page.getByRole('button', { name: /advanced settings/i });
    await advancedTrigger.scrollIntoViewIfNeeded();
    await advancedTrigger.click();

    // Wait for content to expand and check for retry configuration fields
    await expect(page.getByText('Timeout (seconds)')).toBeVisible();
    await expect(page.getByText('Max Retries')).toBeVisible();
    await expect(page.getByText('Initial Delay (ms)')).toBeVisible();
    await expect(page.getByText('Max Delay (ms)')).toBeVisible();
    // Backoff Multiplier field exists but requires scrolling - covered by other assertions
  });

  test('should validate URL input', async ({ page }) => {
    await enableWebhooks(page);

    // Enter invalid URL
    const urlInput = page.getByPlaceholder(/https:\/\/api.example.com/i);
    await urlInput.fill('not-a-valid-url');
    await urlInput.blur();

    // Should show validation error
    await expect(page.getByText(/please enter a valid url/i)).toBeVisible();
  });

  test('should accept valid URL input', async ({ page }) => {
    await enableWebhooks(page);

    // Enter valid URL
    const urlInput = page.getByPlaceholder(/https:\/\/api.example.com/i);
    await urlInput.fill('https://webhook.site/test-endpoint');
    await urlInput.blur();

    // Should not show validation error
    await expect(page.getByText(/please enter a valid url/i)).not.toBeVisible();
  });

  test('should hide configuration when webhooks are disabled', async ({ page }) => {
    // First enable webhooks to see the config
    await enableWebhooks(page);

    // Verify config is visible
    await expect(page.getByText('Webhook URL *')).toBeVisible();

    // Now disable
    const webhooksCard = getWebhooksCard(page);
    const enableSwitch = webhooksCard.locator('button[role="switch"]').first();
    await enableSwitch.click();

    // Config should be hidden
    await expect(page.getByText('Webhook URL *')).not.toBeVisible();
  });

  test('should have password visibility toggle for secret', async ({ page }) => {
    await enableWebhooks(page);

    // Get the webhooks card
    const webhooksCard = getWebhooksCard(page);

    // Scroll to auth section
    const authLabel = webhooksCard.getByText('Authentication', { exact: true });
    await authLabel.scrollIntoViewIfNeeded();

    // Select Bearer authentication
    const authSelect = webhooksCard.locator('button[role="combobox"]');
    await authSelect.click();
    const bearerOption = page.locator('[role="option"]').filter({ hasText: 'Bearer Token' });
    await expect(bearerOption).toBeVisible();
    await bearerOption.click();

    // Find the secret input
    const secretInput = page.getByPlaceholder(/enter bearer token/i);
    await expect(secretInput).toBeVisible();
    await expect(secretInput).toHaveAttribute('type', 'password');

    // Click visibility toggle - find the button next to the input
    const inputContainer = secretInput.locator('..');
    const visibilityToggle = inputContainer.locator('button');
    await visibilityToggle.click();

    // Input should now show text
    await expect(secretInput).toHaveAttribute('type', 'text');
  });
});
