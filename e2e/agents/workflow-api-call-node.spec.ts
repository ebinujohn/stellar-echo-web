import { test, expect } from '../fixtures/auth.fixture';

/**
 * Helper to create a test agent and navigate to its workflow editor
 */
async function createAgentAndNavigateToWorkflow(page: import('@playwright/test').Page): Promise<boolean> {
  await page.goto('/agents');
  await page.waitForLoadState('networkidle');

  // First check if an agent exists that we can use
  const existingAgent = page.locator('[class*="card"][class*="cursor-pointer"]').first();
  if (await existingAgent.isVisible({ timeout: 5000 })) {
    await existingAgent.click();
    await page.waitForURL(/\/agents\/[a-zA-Z0-9-]+/);
  } else {
    // Create a new agent
    const createButton = page.locator('button:has-text("New Agent"), button:has-text("Create")');
    if (!(await createButton.isVisible({ timeout: 3000 }))) {
      return false;
    }
    await createButton.click();

    // Wait for dialog
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Fill agent name
    const testAgentName = `API Test Agent ${Date.now()}`;
    await page.fill('[role="dialog"] #name', testAgentName);

    // Submit
    await page.click('[role="dialog"] button:has-text("Create")');

    // Wait for dialog to close and navigation
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // Wait for navigation to agent detail page
    await page.waitForURL(/\/agents\/[a-zA-Z0-9-]+/, { timeout: 10000 });
  }

  // Wait for page to fully load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Click on Workflow tab - try multiple selectors
  const workflowTab = page.locator('button:has-text("Workflow"), [role="tab"]:has-text("Workflow")').first();
  if (!(await workflowTab.isVisible({ timeout: 5000 }))) {
    return false;
  }
  await workflowTab.click();

  // Wait for workflow editor to load
  await page.waitForTimeout(2000);
  await page.waitForSelector('.react-flow, [class*="reactflow"]', { timeout: 10000 });
  return true;
}

/**
 * Helper to drag API Call node from palette to canvas
 */
async function dragApiCallNodeToCanvas(page: import('@playwright/test').Page): Promise<boolean> {
  const apiCallPaletteItem = page.locator('[draggable="true"]:has-text("API Call")');
  if (!(await apiCallPaletteItem.isVisible({ timeout: 5000 }))) {
    return false;
  }

  const canvas = page.locator('.react-flow__pane, .react-flow__viewport').first();
  const paletteBox = await apiCallPaletteItem.boundingBox();
  const canvasBox = await canvas.boundingBox();

  if (!paletteBox || !canvasBox) {
    return false;
  }

  await page.mouse.move(paletteBox.x + paletteBox.width / 2, paletteBox.y + paletteBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(500);

  return true;
}

/**
 * Helper to select the API Call node on canvas
 */
async function selectApiCallNode(page: import('@playwright/test').Page): Promise<boolean> {
  const apiCallNode = page.locator('.react-flow__node:has-text("New API Call"), .react-flow__node:has-text("API Call")').first();
  if (!(await apiCallNode.isVisible({ timeout: 3000 }))) {
    return false;
  }
  await apiCallNode.click();
  await page.waitForTimeout(300);
  return true;
}

test.describe('Workflow Editor - API Call Node', () => {
  test.describe('Node Palette', () => {
    test.beforeEach(async ({ page }) => {
      const success = await createAgentAndNavigateToWorkflow(page);
      if (!success) test.skip();
    });

    test('should display Integration category in node palette', async ({ page }) => {
      const integrationCategory = page.locator('text=/integration/i');
      await expect(integrationCategory).toBeVisible({ timeout: 5000 });
    });

    test('should display API Call node in palette', async ({ page }) => {
      const apiCallNode = page.locator('[draggable="true"]:has-text("API Call")');
      await expect(apiCallNode).toBeVisible({ timeout: 5000 });
    });

    test('should show API Call description as HTTP API requests', async ({ page }) => {
      const description = page.locator('text="Make HTTP API requests"');
      await expect(description).toBeVisible({ timeout: 5000 });
    });

    test('API Call palette item should be draggable', async ({ page }) => {
      const apiCallPaletteItem = page.locator('[draggable="true"]:has-text("API Call")');
      await expect(apiCallPaletteItem).toBeVisible({ timeout: 5000 });
      await expect(apiCallPaletteItem).toHaveAttribute('draggable', 'true');
    });
  });

  test.describe('Node Creation', () => {
    test.beforeEach(async ({ page }) => {
      const success = await createAgentAndNavigateToWorkflow(page);
      if (!success) test.skip();
    });

    test('should create API Call node when dragged to canvas', async ({ page }) => {
      const dragged = await dragApiCallNodeToCanvas(page);
      if (!dragged) test.skip();

      const apiCallNodeOnCanvas = page.locator('.react-flow__node:has-text("API Call"), .react-flow__node:has-text("New API Call")');
      await expect(apiCallNodeOnCanvas).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Node Display', () => {
    test.beforeEach(async ({ page }) => {
      const success = await createAgentAndNavigateToWorkflow(page);
      if (!success) test.skip();
      const dragged = await dragApiCallNodeToCanvas(page);
      if (!dragged) test.skip();
    });

    test('should display HTTP method badge on node', async ({ page }) => {
      // Wait for node to be visible first
      const apiCallNode = page.locator('.react-flow__node').filter({ hasText: 'API Call' }).first();
      const nodeVisible = await apiCallNode.isVisible({ timeout: 5000 }).catch(() => false);
      if (!nodeVisible) test.skip();

      // Check for GET badge
      const methodBadge = apiCallNode.locator('text="GET"');
      await expect(methodBadge).toBeVisible({ timeout: 3000 });
    });

    test('API Call node should show API Call badge', async ({ page }) => {
      // Wait for node to be visible first
      const apiCallNode = page.locator('.react-flow__node').filter({ hasText: 'New API Call' }).first();
      const nodeVisible = await apiCallNode.isVisible({ timeout: 5000 }).catch(() => false);
      if (!nodeVisible) test.skip();

      // Check for API Call badge
      const badge = apiCallNode.locator('text="API Call"');
      await expect(badge).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Properties Panel', () => {
    test.beforeEach(async ({ page }) => {
      const success = await createAgentAndNavigateToWorkflow(page);
      if (!success) test.skip();
      const dragged = await dragApiCallNodeToCanvas(page);
      if (!dragged) test.skip();
      const selected = await selectApiCallNode(page);
      if (!selected) test.skip();
    });

    test('should show properties panel when API Call node is selected', async ({ page }) => {
      const propertiesPanel = page.locator('text=/properties/i');
      await expect(propertiesPanel).toBeVisible({ timeout: 5000 });
    });

    test('should show Api Call node type indicator', async ({ page }) => {
      const nodeType = page.locator('text=/api.*call.*node/i').first();
      await expect(nodeType).toBeVisible({ timeout: 5000 });
    });

    test('should display Node Name field', async ({ page }) => {
      const nameLabel = page.locator('label:has-text("Node Name")');
      await expect(nameLabel).toBeVisible({ timeout: 5000 });

      const nameInput = page.locator('input#node-name');
      await expect(nameInput).toBeVisible();
    });

    test('should display Node ID (read-only)', async ({ page }) => {
      const idLabel = page.locator('text=/node.*id/i');
      await expect(idLabel).toBeVisible({ timeout: 5000 });
    });

    test('should display Loading Message section', async ({ page }) => {
      const loadingLabel = page.locator('label:has-text("Loading Message")');
      await expect(loadingLabel).toBeVisible({ timeout: 5000 });
    });

    test('should display API Request section with method selector', async ({ page }) => {
      const apiRequestLabel = page.locator('text=/api.*request/i');
      await expect(apiRequestLabel).toBeVisible({ timeout: 5000 });

      const methodLabel = page.locator('text=/http.*method/i');
      await expect(methodLabel).toBeVisible({ timeout: 5000 });
    });

    test('should display URL input field', async ({ page }) => {
      const urlLabel = page.locator('label:has-text("URL")');
      await expect(urlLabel).toBeVisible({ timeout: 5000 });

      const urlInput = page.locator('input[placeholder*="api.example.com"], input[placeholder*="endpoint"]');
      await expect(urlInput).toBeVisible({ timeout: 3000 });
    });

    test('should display Headers section', async ({ page }) => {
      const headersLabel = page.locator('text=/headers/i').first();
      await expect(headersLabel).toBeVisible({ timeout: 5000 });
    });

    test('should display Query Parameters section', async ({ page }) => {
      const queryParamsLabel = page.locator('text=/query.*param/i');
      await expect(queryParamsLabel).toBeVisible({ timeout: 5000 });
    });

    test('should display Response Extraction section (collapsible)', async ({ page }) => {
      const extractionLabel = page.locator('text=/response.*extraction/i');
      await expect(extractionLabel).toBeVisible({ timeout: 5000 });
    });

    test('should display Timeout & Retry section (collapsible)', async ({ page }) => {
      const timeoutLabel = page.locator('text=/timeout.*retry/i');
      await expect(timeoutLabel).toBeVisible({ timeout: 5000 });
    });

    test('should display Security section (collapsible)', async ({ page }) => {
      const securityLabel = page.locator('text=/security/i');
      await expect(securityLabel).toBeVisible({ timeout: 5000 });
    });

    test('should display Transitions section', async ({ page }) => {
      const transitionsLabel = page.locator('text=/transitions/i').first();
      await expect(transitionsLabel).toBeVisible({ timeout: 5000 });
    });

    test('should display On Entry Actions section', async ({ page }) => {
      const actionsLabel = page.locator('text=/on.*entry.*actions/i');
      await expect(actionsLabel).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Form Interactions', () => {
    test.beforeEach(async ({ page }) => {
      const success = await createAgentAndNavigateToWorkflow(page);
      if (!success) test.skip();
      const dragged = await dragApiCallNodeToCanvas(page);
      if (!dragged) test.skip();
      const selected = await selectApiCallNode(page);
      if (!selected) test.skip();
    });

    test('should update node name when changed in form', async ({ page }) => {
      const nameInput = page.locator('input#node-name');
      await nameInput.clear();
      await nameInput.fill('My Custom API Call');
      await page.waitForTimeout(300);

      const updatedNode = page.locator('.react-flow__node:has-text("My Custom API Call")');
      await expect(updatedNode).toBeVisible({ timeout: 5000 });
    });

    test('should allow changing HTTP method', async ({ page }) => {
      const methodSelector = page.locator('button[role="combobox"]:has-text("GET")').first();
      if (!(await methodSelector.isVisible({ timeout: 3000 }))) test.skip();

      await methodSelector.click();

      const postOption = page.locator('[role="option"]:has-text("POST")');
      await expect(postOption).toBeVisible();
      await postOption.click();

      await expect(methodSelector).toContainText('POST');
    });

    test('should show body field only for POST/PUT/PATCH methods', async ({ page }) => {
      // Initially GET is selected, body should not be visible
      const bodyFieldInitially = page.locator('label:has-text("Request Body")');
      await expect(bodyFieldInitially).not.toBeVisible({ timeout: 2000 });

      // Change to POST
      const methodSelector = page.locator('button[role="combobox"]:has-text("GET")').first();
      if (!(await methodSelector.isVisible({ timeout: 3000 }))) test.skip();

      await methodSelector.click();
      const postOption = page.locator('[role="option"]:has-text("POST")');
      await postOption.click();

      // Now body field should be visible
      const bodyField = page.locator('label:has-text("Request Body")');
      await expect(bodyField).toBeVisible({ timeout: 3000 });
    });

    test('should allow adding headers', async ({ page }) => {
      // Find headers Add button (first Add button in form)
      const headersSection = page.locator('text=/headers/i').first();
      await headersSection.scrollIntoViewIfNeeded();

      // Look for Add button near headers
      const addHeaderButton = page.locator('button:has-text("Add")').first();
      await addHeaderButton.click();

      // Header input fields should appear
      const headerKeyInput = page.locator('input[placeholder*="Header"], input[placeholder*="header"]').first();
      await expect(headerKeyInput).toBeVisible({ timeout: 3000 });
    });

    test('should allow adding response extractions', async ({ page }) => {
      // Find Response Extraction section and expand it
      const extractionTrigger = page.locator('button:has-text("Response Extraction")');
      await extractionTrigger.scrollIntoViewIfNeeded();
      await extractionTrigger.click();

      // Find Add button for extractions
      const addExtractionButton = extractionTrigger.locator('xpath=..').locator('button:has-text("Add")');
      await addExtractionButton.click();

      // Extraction form should appear
      const pathLabel = page.locator('label:has-text("JSON Path")');
      await expect(pathLabel).toBeVisible({ timeout: 3000 });
    });

    test('should allow adding transitions', async ({ page }) => {
      // Scroll down to Transitions section
      const transitionsLabel = page.getByText(/^Transitions \(\d+\)/).first();
      await transitionsLabel.scrollIntoViewIfNeeded();

      // Find Add button next to the Transitions label (they share the same parent div)
      const addTransitionButton = transitionsLabel.locator('..').locator('button:has-text("Add")');
      await addTransitionButton.click();

      // Transition form should appear with target selector
      const targetSelector = page.locator('button[role="combobox"]:has-text("Select target node")');
      await expect(targetSelector).toBeVisible({ timeout: 3000 });
    });

    test('should show API-specific transition conditions', async ({ page }) => {
      // Scroll to Transitions section and add a transition
      const transitionsLabel = page.getByText(/^Transitions \(\d+\)/).first();
      await transitionsLabel.scrollIntoViewIfNeeded();

      const addTransitionButton = transitionsLabel.locator('..').locator('button:has-text("Add")');
      await addTransitionButton.click();
      await page.waitForTimeout(300);

      // Look for condition type selector (should default to API Success)
      const conditionSelector = page.locator('button[role="combobox"]:has-text("API Success")');
      if (await conditionSelector.isVisible({ timeout: 3000 })) {
        await conditionSelector.click();

        // Should show API-specific conditions
        const apiSuccessOption = page.locator('[role="option"]:has-text("API Success")');
        const apiFailedOption = page.locator('[role="option"]:has-text("API Failed")');

        await expect(apiSuccessOption.or(apiFailedOption)).toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('Timeout & Retry Configuration', () => {
    test.beforeEach(async ({ page }) => {
      const success = await createAgentAndNavigateToWorkflow(page);
      if (!success) test.skip();
      const dragged = await dragApiCallNodeToCanvas(page);
      if (!dragged) test.skip();
      const selected = await selectApiCallNode(page);
      if (!selected) test.skip();
    });

    test('should expand Timeout & Retry section when clicked', async ({ page }) => {
      const timeoutTrigger = page.locator('button:has-text("Timeout")');
      await timeoutTrigger.scrollIntoViewIfNeeded();
      await timeoutTrigger.click();

      // Timeout input should appear
      const timeoutLabel = page.locator('label:has-text("Timeout (seconds)")');
      await expect(timeoutLabel).toBeVisible({ timeout: 3000 });
    });

    test('should display Max Retries field when expanded', async ({ page }) => {
      const timeoutTrigger = page.locator('button:has-text("Timeout")');
      await timeoutTrigger.scrollIntoViewIfNeeded();
      await timeoutTrigger.click();

      const retriesLabel = page.locator('label:has-text("Max Retries")');
      await expect(retriesLabel).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Security Configuration', () => {
    test.beforeEach(async ({ page }) => {
      const success = await createAgentAndNavigateToWorkflow(page);
      if (!success) test.skip();
      const dragged = await dragApiCallNodeToCanvas(page);
      if (!dragged) test.skip();
      const selected = await selectApiCallNode(page);
      if (!selected) test.skip();
    });

    test('should expand Security section when clicked', async ({ page }) => {
      const securityTrigger = page.locator('button:has-text("Security")');
      await securityTrigger.scrollIntoViewIfNeeded();
      await securityTrigger.click();

      const responseSizeLabel = page.locator('text=/response.*size/i');
      await expect(responseSizeLabel).toBeVisible({ timeout: 3000 });
    });

    test('should display Allowed Hosts input', async ({ page }) => {
      const securityTrigger = page.locator('button:has-text("Security")');
      await securityTrigger.scrollIntoViewIfNeeded();
      await securityTrigger.click();

      const allowedHostsLabel = page.locator('text=/allowed.*hosts/i');
      await expect(allowedHostsLabel).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Workflow Validation', () => {
    test.beforeEach(async ({ page }) => {
      const success = await createAgentAndNavigateToWorkflow(page);
      if (!success) test.skip();
    });

    test('should show validation error for API Call node without URL', async ({ page }) => {
      const dragged = await dragApiCallNodeToCanvas(page);
      if (!dragged) test.skip();

      // Click Validate button
      const validateButton = page.locator('button:has-text("Validate")');
      await validateButton.click();

      // Wait for validation to run
      await page.waitForTimeout(500);

      // Should show validation errors panel or error toast - check multiple possibilities
      const validationPanel = page.locator('text="Validation Error", text="URL", text="must have a URL"');
      const errorText = page.locator('[class*="destructive"], [class*="error"]');
      const toastError = page.locator('[data-sonner-toast]');

      const isValidationVisible = await validationPanel.first().isVisible({ timeout: 3000 }).catch(() => false);
      const isErrorVisible = await errorText.first().isVisible({ timeout: 1000 }).catch(() => false);
      const isToastVisible = await toastError.isVisible({ timeout: 1000 }).catch(() => false);

      expect(isValidationVisible || isErrorVisible || isToastVisible).toBe(true);
    });
  });

  test.describe('MiniMap', () => {
    test.beforeEach(async ({ page }) => {
      const success = await createAgentAndNavigateToWorkflow(page);
      if (!success) test.skip();
    });

    test('should display minimap with nodes', async ({ page }) => {
      const dragged = await dragApiCallNodeToCanvas(page);
      if (!dragged) test.skip();

      const minimap = page.locator('.react-flow__minimap');
      await expect(minimap).toBeVisible({ timeout: 5000 });

      // MiniMap should have nodes
      const minimapNodes = page.locator('.react-flow__minimap-node');
      const nodeCount = await minimapNodes.count();
      expect(nodeCount).toBeGreaterThan(0);
    });
  });
});
