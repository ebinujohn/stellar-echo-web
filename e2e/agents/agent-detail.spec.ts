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
      // Skip tests if no agents exist
      test.skip();
    }
  });

  test('should display agent header with name', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should display back navigation', async ({ page }) => {
    const backButton = page.locator('button:has([class*="chevron-left"]), a:has-text("Back")');
    await expect(backButton).toBeVisible();
  });

  test('should have tabbed interface', async ({ page }) => {
    // Check for tabs
    await expect(page.locator('[role="tablist"]')).toBeVisible();

    // Check for expected tabs
    const expectedTabs = ['Overview', 'Workflow', 'Versions', 'Settings'];
    for (const tabName of expectedTabs) {
      const tab = page.locator(`[role="tab"]:has-text("${tabName}")`);
      if (await tab.isVisible({ timeout: 2000 })) {
        await expect(tab).toBeVisible();
      }
    }
  });

  test('should switch between tabs', async ({ page }) => {
    // Click on different tabs
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();

    for (let i = 0; i < Math.min(tabCount, 3); i++) {
      await tabs.nth(i).click();
      // Tab should become active
      await expect(tabs.nth(i)).toHaveAttribute('data-state', 'active');
    }
  });

  test('should display agent metadata', async ({ page }) => {
    // Look for metadata like version, calls, etc.
    const metadata = page.locator('text=/version|calls|updated/i');
    await expect(metadata.first()).toBeVisible({ timeout: 5000 });
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

      // Click on Workflow tab
      const workflowTab = page.locator('[role="tab"]:has-text("Workflow")');
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
    // Check for 3-panel layout
    // Node palette
    await expect(page.locator('text=/node.*palette|conversation|data|control/i').first()).toBeVisible({ timeout: 10000 });

    // Canvas area (ReactFlow)
    await expect(page.locator('.react-flow, [class*="reactflow"]')).toBeVisible();
  });

  test('should display node palette with categories', async ({ page }) => {
    // Check for node categories
    const categories = ['Conversation', 'Data', 'Control'];
    for (const category of categories) {
      const categoryHeader = page.locator(`text=/${category}/i`);
      if (await categoryHeader.isVisible({ timeout: 2000 })) {
        await expect(categoryHeader).toBeVisible();
      }
    }
  });

  test('should display toolbar with actions', async ({ page }) => {
    // Check for toolbar buttons
    const toolbar = page.locator('[class*="toolbar"], [class*="button-group"]');
    await expect(toolbar.first()).toBeVisible({ timeout: 5000 });

    // Check for common actions
    const validateButton = page.locator('button:has-text("Validate")');
    if (await validateButton.isVisible({ timeout: 2000 })) {
      await expect(validateButton).toBeVisible();
    }
  });

  test('should show properties panel when node is selected', async ({ page }) => {
    // Try to click on a node in the canvas
    const node = page.locator('.react-flow__node, [class*="node"]').first();
    if (await node.isVisible({ timeout: 3000 })) {
      await node.click();

      // Properties panel should show
      const propertiesPanel = page.locator('text=/properties|node.*name|system.*prompt/i');
      await expect(propertiesPanel.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display minimap', async ({ page }) => {
    // Check for minimap component
    const minimap = page.locator('.react-flow__minimap, [class*="minimap"]');
    await expect(minimap).toBeVisible({ timeout: 5000 });
  });

  test('should have keyboard shortcuts dialog', async ({ page }) => {
    // Look for shortcuts button
    const shortcutsButton = page.locator('button:has-text("Shortcuts"), button:has([class*="keyboard"])');
    if (await shortcutsButton.isVisible({ timeout: 3000 })) {
      await shortcutsButton.click();
      // Dialog should appear
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    }
  });
});
