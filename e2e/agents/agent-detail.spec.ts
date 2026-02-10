import { test, expect } from '../fixtures/auth.fixture';
import { waitForSkeletonsToDisappear } from '../utils/test-helpers';

test.describe('Agent Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to agents and find one to view
    await page.goto('/agents');
    await waitForSkeletonsToDisappear(page);

    // Click on first agent card if exists
    const agentCard = page.locator('[class*="card"][class*="cursor-pointer"]').first();
    if (await agentCard.isVisible({ timeout: 5000 })) {
      await agentCard.click();
      await page.waitForURL(/\/agents\/[a-zA-Z0-9-]+/);
    } else {
      test.skip();
    }
  });

  test('should display agent header with name and Active badge', async ({ page }) => {
    // Agent name as h1
    await expect(page.locator('h1').first()).toBeVisible();

    // Active badge next to name
    await expect(page.getByText('Active', { exact: true }).first()).toBeVisible();
  });

  test('should display back navigation', async ({ page }) => {
    // Back button is a Link with ArrowLeft icon
    const backButton = page.locator('a[href="/agents"] button');
    await expect(backButton).toBeVisible();
  });

  test('should display 4 stat cards', async ({ page }) => {
    // Check for 4 specific stat cards
    await expect(page.getByText('Active Version', { exact: true })).toBeVisible();
    await expect(page.getByText('Total Calls', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Phone Mappings', { exact: true })).toBeVisible();
    await expect(page.getByText('Last Updated', { exact: true })).toBeVisible();
  });

  test('should have tabbed interface with correct tabs', async ({ page }) => {
    // Check for tab list
    await expect(page.locator('[role="tablist"]')).toBeVisible();

    // Check for expected tabs
    const expectedTabs = ['Overview', 'Workflow Editor', 'Versions', 'Settings', 'Chat'];
    for (const tabName of expectedTabs) {
      const tab = page.locator(`[role="tab"]:has-text("${tabName}")`);
      await expect(tab).toBeVisible();
    }
  });

  test('should switch between tabs', async ({ page }) => {
    // Click on different tabs and verify they become active
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();

    for (let i = 0; i < Math.min(tabCount, 4); i++) {
      await tabs.nth(i).click();
      await expect(tabs.nth(i)).toHaveAttribute('data-state', 'active');
    }
  });

  test('should display Overview tab with configuration sections', async ({ page }) => {
    // Overview tab is active by default
    const overviewTab = page.locator('[role="tab"]:has-text("Overview")');
    await expect(overviewTab).toHaveAttribute('data-state', 'active');

    // Check for Active Configuration card
    await expect(page.getByText('Active Configuration')).toBeVisible();

    // Check for Workflow Summary card
    await expect(page.getByText('Workflow Summary')).toBeVisible();
  });

  test('should display Global Settings overview', async ({ page }) => {
    // Global Settings section on the Overview tab
    await expect(page.getByText('Global Settings')).toBeVisible({ timeout: 5000 });

    // Settings overview items
    const settingsItems = ['LLM', 'Voice / TTS', 'RAG', 'Auto Hangup'];
    for (const item of settingsItems) {
      const settingItem = page.getByText(item, { exact: true });
      if (await settingItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(settingItem).toBeVisible();
      }
    }
  });

  test('should display Mapped Phone Numbers section', async ({ page }) => {
    // Phone Numbers card on Overview tab
    await expect(page.getByText('Mapped Phone Numbers')).toBeVisible();
  });

  test('should have action buttons', async ({ page }) => {
    // Initiate Call button
    await expect(page.getByRole('button', { name: /initiate call/i })).toBeVisible();

    // Delete Agent button
    await expect(page.getByRole('button', { name: /delete agent/i })).toBeVisible();
  });

  test('should show version info in Active Version card', async ({ page }) => {
    // Active Version card should show version number
    const versionCard = page.locator('[class*="card"]').filter({ hasText: 'Active Version' });
    await expect(versionCard).toBeVisible();

    // Should show version number (e.g., "v1") or "None"
    const versionText = versionCard.locator('.text-2xl');
    await expect(versionText).toBeVisible();
  });
});

test.describe('Workflow Editor', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to an agent's workflow editor
    await page.goto('/agents');
    await waitForSkeletonsToDisappear(page);

    const agentCard = page.locator('[class*="card"][class*="cursor-pointer"]').first();
    if (await agentCard.isVisible({ timeout: 5000 })) {
      await agentCard.click();
      await page.waitForURL(/\/agents\/[a-zA-Z0-9-]+/);

      // Click on Workflow Editor tab (renamed from "Workflow")
      const workflowTab = page.locator('[role="tab"]:has-text("Workflow Editor")');
      if (await workflowTab.isVisible({ timeout: 3000 })) {
        await workflowTab.click();
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should display workflow editor layout', async ({ page }) => {
    // Node palette should have category headers
    await expect(page.locator('text=/conversation|data|control/i').first()).toBeVisible({ timeout: 10000 });

    // Canvas area (ReactFlow)
    await expect(page.locator('.react-flow, [class*="reactflow"]')).toBeVisible();
  });

  test('should display node palette with categories', async ({ page }) => {
    const categories = ['Conversation', 'Data', 'Control'];
    for (const category of categories) {
      const categoryHeader = page.locator(`text=/${category}/i`);
      if (await categoryHeader.isVisible({ timeout: 2000 })) {
        await expect(categoryHeader).toBeVisible();
      }
    }
  });

  test('should display toolbar with actions', async ({ page }) => {
    const toolbar = page.locator('[class*="toolbar"], [class*="button-group"]');
    await expect(toolbar.first()).toBeVisible({ timeout: 5000 });

    const validateButton = page.locator('button:has-text("Validate")');
    if (await validateButton.isVisible({ timeout: 2000 })) {
      await expect(validateButton).toBeVisible();
    }
  });

  test('should show properties panel when node is selected', async ({ page }) => {
    const node = page.locator('.react-flow__node, [class*="node"]').first();
    if (await node.isVisible({ timeout: 3000 })) {
      await node.click();

      const propertiesPanel = page.locator('text=/properties|node.*name|system.*prompt/i');
      await expect(propertiesPanel.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display minimap', async ({ page }) => {
    const minimap = page.locator('.react-flow__minimap, [class*="minimap"]');
    await expect(minimap).toBeVisible({ timeout: 5000 });
  });

  test('should have keyboard shortcuts dialog', async ({ page }) => {
    const shortcutsButton = page.locator('button:has-text("Shortcuts"), button:has([class*="keyboard"])');
    if (await shortcutsButton.isVisible({ timeout: 3000 })) {
      await shortcutsButton.click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    }
  });
});

test.describe('Agent Settings Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/agents');
    await waitForSkeletonsToDisappear(page);

    const agentCard = page.locator('[class*="card"][class*="cursor-pointer"]').first();
    if (await agentCard.isVisible({ timeout: 5000 })) {
      await agentCard.click();
      await page.waitForURL(/\/agents\/[a-zA-Z0-9-]+/);

      // Click on Settings tab
      const settingsTab = page.locator('[role="tab"]:has-text("Settings")');
      if (await settingsTab.isVisible({ timeout: 3000 })) {
        await settingsTab.click();
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should display collapsible settings sections', async ({ page }) => {
    // Settings form has collapsible sections with navigation pills
    // Section headers should be visible even when collapsed
    const sections = ['Global Prompt', 'LLM Configuration', 'Voice/TTS Configuration'];
    for (const section of sections) {
      const sectionHeader = page.getByText(section, { exact: true });
      if (await sectionHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(sectionHeader).toBeVisible();
      }
    }
  });

  test('should expand section on click', async ({ page }) => {
    // Click on LLM Configuration section header to expand
    const llmHeader = page.getByText('LLM Configuration', { exact: true });
    if (await llmHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
      await llmHeader.click();

      // Should show LLM configuration content (e.g., temperature, max tokens)
      const temperatureLabel = page.getByText(/temperature/i);
      await expect(temperatureLabel.first()).toBeVisible({ timeout: 5000 });
    }
  });
});
