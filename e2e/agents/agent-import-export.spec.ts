import { test, expect } from "../fixtures/auth.fixture";
import { waitForSkeletonsToDisappear } from "../utils/test-helpers";

test.describe("Agent Import", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/agents");
    await waitForSkeletonsToDisappear(page);
  });

  test("should display Import button on agents list page", async ({ page }) => {
    // The Import button (outline variant) should be visible next to New Agent
    const importButton = page.getByRole("button", { name: /import/i });
    await expect(importButton).toBeVisible();
  });

  test("should open import dialog when Import button is clicked", async ({
    page,
  }) => {
    const importButton = page.getByRole("button", { name: /import/i });
    await importButton.click();

    // Dialog should appear with title
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Import Agent Configuration")).toBeVisible();
  });

  test("should show file upload area in import dialog", async ({ page }) => {
    const importButton = page.getByRole("button", { name: /import/i });
    await importButton.click();

    const dialog = page.locator('[role="dialog"]');
    // Should show file input area with "Choose File" button
    await expect(dialog.getByText("Choose File")).toBeVisible();
    // Should show description text
    await expect(dialog.getByText(/select a json file/i)).toBeVisible();
  });

  test("should show error for invalid JSON file", async ({ page }) => {
    const importButton = page.getByRole("button", { name: /import/i });
    await importButton.click();

    // Upload an invalid file (not valid JSON)
    const fileInput = page.locator('input[type="file"]');

    // Use a buffer to simulate a file upload with invalid JSON
    await fileInput.setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from("not valid json"),
    });

    // Should show error message
    await expect(page.getByText(/invalid json/i)).toBeVisible();
  });

  test("should show error for JSON missing required fields", async ({
    page,
  }) => {
    const importButton = page.getByRole("button", { name: /import/i });
    await importButton.click();

    const fileInput = page.locator('input[type="file"]');

    // Upload valid JSON but missing agent/workflow keys
    await fileInput.setInputFiles({
      name: "missing-fields.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ foo: "bar" })),
    });

    // Should show format error
    await expect(page.getByText(/invalid format/i)).toBeVisible();
  });

  test("should show preview step for valid agent JSON", async ({ page }) => {
    const importButton = page.getByRole("button", { name: /import/i });
    await importButton.click();

    const fileInput = page.locator('input[type="file"]');

    // Upload a valid agent JSON
    const validAgent = {
      agent: {
        id: "test-agent-id",
        name: "Test Import Agent",
        description: "Test description",
        version: "1.0.0",
      },
      workflow: {
        initial_node: "greeting",
        nodes: [
          {
            id: "greeting",
            type: "standard",
            name: "Greeting",
            proactive: true,
            static_text: "Hello!",
            transitions: [{ condition: "always", target: "end" }],
          },
          { id: "end", type: "end_call", name: "End Call" },
        ],
      },
    };

    await fileInput.setInputFiles({
      name: "test-agent.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(validAgent)),
    });

    // Should show preview with agent details
    await expect(page.getByText("Test Import Agent")).toBeVisible();
    await expect(page.getByText("2 nodes")).toBeVisible();
    await expect(page.getByText("greeting")).toBeVisible();
  });

  test("should show dry run checkbox and notes field in preview", async ({
    page,
  }) => {
    const importButton = page.getByRole("button", { name: /import/i });
    await importButton.click();

    const fileInput = page.locator('input[type="file"]');
    const validAgent = {
      agent: { id: "test", name: "Test Agent", version: "1.0.0" },
      workflow: {
        initial_node: "greet",
        nodes: [
          {
            id: "greet",
            type: "standard",
            name: "Greet",
            static_text: "Hi",
            transitions: [{ condition: "always", target: "end" }],
          },
          { id: "end", type: "end_call", name: "End" },
        ],
      },
    };

    await fileInput.setInputFiles({
      name: "test.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(validAgent)),
    });

    // Should show notes field and dry run checkbox
    await expect(page.getByLabel(/notes/i)).toBeVisible();
    await expect(page.getByLabel(/dry run/i)).toBeVisible();
    // Should show Import button
    await expect(page.getByRole("button", { name: /^import$/i })).toBeVisible();
  });

  test("should handle exported format with config_json wrapper", async ({
    page,
  }) => {
    const importButton = page.getByRole("button", { name: /import/i });
    await importButton.click();

    const fileInput = page.locator('input[type="file"]');

    // Upload in export format (config_json wrapper)
    const exportedFormat = {
      tenant_id: "some-tenant",
      agent_id: "some-agent",
      config_json: {
        agent: { id: "test", name: "Exported Agent", version: "1.0.0" },
        workflow: {
          initial_node: "start",
          nodes: [
            {
              id: "start",
              type: "standard",
              name: "Start",
              static_text: "Hello",
              transitions: [{ condition: "always", target: "end" }],
            },
            { id: "end", type: "end_call", name: "End" },
          ],
        },
      },
    };

    await fileInput.setInputFiles({
      name: "exported.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(exportedFormat)),
    });

    // Should detect export format and show preview with correct name
    await expect(page.getByText("Exported Agent")).toBeVisible();
  });

  test("should close dialog on Cancel", async ({ page }) => {
    const importButton = page.getByRole("button", { name: /import/i });
    await importButton.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("should go back from preview to upload step", async ({ page }) => {
    const importButton = page.getByRole("button", { name: /import/i });
    await importButton.click();

    const fileInput = page.locator('input[type="file"]');
    const validAgent = {
      agent: { id: "test", name: "Test", version: "1.0.0" },
      workflow: {
        initial_node: "n1",
        nodes: [
          {
            id: "n1",
            type: "standard",
            name: "N1",
            static_text: "Hi",
            transitions: [{ condition: "always", target: "end" }],
          },
          { id: "end", type: "end_call", name: "End" },
        ],
      },
    };

    await fileInput.setInputFiles({
      name: "test.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(validAgent)),
    });

    // We should be on preview step
    await expect(page.getByText("Test")).toBeVisible();

    // Click Back
    await page.getByRole("button", { name: /back/i }).click();

    // Should be back on upload step
    await expect(page.getByText("Choose File")).toBeVisible();
  });
});

test.describe("Agent Export", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/agents");
    await waitForSkeletonsToDisappear(page);

    // Navigate to first agent detail
    const agentCard = page
      .locator('[class*="card"][class*="cursor-pointer"]')
      .first();
    if (await agentCard.isVisible({ timeout: 5000 })) {
      await agentCard.click();
      await page.waitForURL(/\/agents\/[a-zA-Z0-9-]+/);
    } else {
      test.skip();
    }
  });

  test("should display Export button on agent detail page", async ({
    page,
  }) => {
    const exportButton = page.getByRole("button", { name: /export/i });
    await expect(exportButton).toBeVisible();
  });

  test("should have Export button between Initiate Call and Delete Agent", async ({
    page,
  }) => {
    // Verify button order: Initiate Call, Export, Delete Agent
    const initiateCallBtn = page.getByRole("button", {
      name: /initiate call/i,
    });
    const exportBtn = page.getByRole("button", { name: /export/i });
    const deleteBtn = page.getByRole("button", { name: /delete agent/i });

    await expect(initiateCallBtn).toBeVisible();
    await expect(exportBtn).toBeVisible();
    await expect(deleteBtn).toBeVisible();
  });
});
