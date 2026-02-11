import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the logger module so the admin-api module can import it without side effects
vi.mock("@/lib/logger", () => ({
  loggers: {
    admin: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  },
}));

// Mock the hmac-signing module to avoid crypto dependency issues in jsdom
// and to let us verify the correct signing arguments
vi.mock("@/lib/external-apis/hmac-signing", () => ({
  generateNonce: vi.fn(() => "test-nonce-value"),
  computeSignature: vi.fn(() => "test-signature-value"),
}));

// ---------------------------------------------------------------------------
// Helper to create a fresh module import with specific env vars
// ---------------------------------------------------------------------------

async function loadModule(
  envOverrides: Record<string, string | undefined> = {},
) {
  // Reset module registry so module-level constants re-read process.env
  vi.resetModules();

  // Set environment variables BEFORE importing the module
  const defaults: Record<string, string> = {
    ADMIN_API_BASE_URL: "https://api.test.com",
    ADMIN_API_KEY: "test-api-key-for-testing",
  };
  const merged = { ...defaults, ...envOverrides };

  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  // Re-mock dependencies after resetModules
  vi.mock("@/lib/logger", () => ({
    loggers: {
      admin: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    },
  }));

  vi.mock("@/lib/external-apis/hmac-signing", () => ({
    generateNonce: vi.fn(() => "test-nonce-value"),
    computeSignature: vi.fn(() => "test-signature-value"),
  }));

  const mod = await import("../admin-api");
  return mod;
}

// ---------------------------------------------------------------------------
// Global fetch mock
// ---------------------------------------------------------------------------

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  // Clean up env vars
  delete process.env.ADMIN_API_BASE_URL;
  delete process.env.ADMIN_API_KEY;
});

// ===========================================================================
// importAgentConfig
// ===========================================================================

describe("importAgentConfig", () => {
  it("should send a POST request to /admin/agents/import with correct body", async () => {
    const { importAgentConfig } = await loadModule();

    const mockResponse = {
      success: true,
      result: {
        agent_id: "agent-123",
        agent_name: "Test Agent",
        action: "created",
        version: 1,
      },
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await importAgentConfig({
      tenantId: "tenant-1",
      agentJson: {
        agent: { name: "Test Agent" },
        workflow: { initial_node: "n1", nodes: [] },
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.test.com/admin/agents/import");
    expect(options.method).toBe("POST");

    const body = JSON.parse(options.body);
    expect(body.tenant_id).toBe("tenant-1");
    expect(body.agent_json).toBeDefined();
    expect(result.success).toBe(true);
  });

  it("should include optional parameters only when provided", async () => {
    const { importAgentConfig } = await loadModule();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, result: {} }),
    });

    await importAgentConfig({
      tenantId: "tenant-1",
      agentJson: {
        agent: { name: "A" },
        workflow: { initial_node: "n", nodes: [{}] },
      },
      phoneNumbers: ["+15551234567"],
      notes: "test import",
      createdBy: "user-42",
      dryRun: true,
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.phone_numbers).toEqual(["+15551234567"]);
    expect(body.notes).toBe("test import");
    expect(body.created_by).toBe("user-42");
    expect(body.dry_run).toBe(true);
  });

  it("should omit optional parameters when not provided", async () => {
    const { importAgentConfig } = await loadModule();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, result: {} }),
    });

    await importAgentConfig({
      tenantId: "t1",
      agentJson: {
        agent: { name: "A" },
        workflow: { initial_node: "n", nodes: [{}] },
      },
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).not.toHaveProperty("phone_numbers");
    expect(body).not.toHaveProperty("notes");
    expect(body).not.toHaveProperty("created_by");
    expect(body).not.toHaveProperty("dry_run");
  });

  it("should throw when Admin API is not configured", async () => {
    const { importAgentConfig } = await loadModule({
      ADMIN_API_BASE_URL: undefined,
      ADMIN_API_KEY: undefined,
    });

    await expect(
      importAgentConfig({
        tenantId: "t1",
        agentJson: {
          agent: { name: "A" },
          workflow: { initial_node: "n", nodes: [{}] },
        },
      }),
    ).rejects.toThrow("Admin API is not configured");
  });

  it("should throw on API error response", async () => {
    const { importAgentConfig } = await loadModule();

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ detail: "Invalid agent configuration" }),
    });

    await expect(
      importAgentConfig({
        tenantId: "t1",
        agentJson: {
          agent: { name: "A" },
          workflow: { initial_node: "n", nodes: [{}] },
        },
      }),
    ).rejects.toThrow("Invalid agent configuration");
  });

  it("should send HMAC signed headers", async () => {
    const { importAgentConfig } = await loadModule();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, result: {} }),
    });

    await importAgentConfig({
      tenantId: "t1",
      agentJson: {
        agent: { name: "A" },
        workflow: { initial_node: "n", nodes: [{}] },
      },
    });

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers["X-Timestamp"]).toBeDefined();
    expect(headers["X-Nonce"]).toBe("test-nonce-value");
    expect(headers["X-Signature"]).toBe("test-signature-value");
    expect(headers["Content-Type"]).toBe("application/json");
  });
});

// ===========================================================================
// bulkImportAgentConfigs
// ===========================================================================

describe("bulkImportAgentConfigs", () => {
  it("should send a POST request to /admin/agents/import/bulk", async () => {
    const { bulkImportAgentConfigs } = await loadModule();

    const mockResponse = {
      total: 2,
      succeeded: 2,
      failed: 0,
      results: [],
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await bulkImportAgentConfigs({
      agents: [
        {
          tenantId: "t1",
          agentJson: {
            agent: { name: "A1" },
            workflow: { initial_node: "n", nodes: [{}] },
          },
          notes: "first",
        },
        {
          tenantId: "t1",
          agentJson: {
            agent: { name: "A2" },
            workflow: { initial_node: "n", nodes: [{}] },
          },
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.test.com/admin/agents/import/bulk");
    expect(result.total).toBe(2);
  });

  it("should map tenantId to tenant_id and agentJson to agent_json in request body", async () => {
    const { bulkImportAgentConfigs } = await loadModule();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ total: 1, succeeded: 1, failed: 0, results: [] }),
    });

    await bulkImportAgentConfigs({
      agents: [
        {
          tenantId: "tenant-abc",
          agentJson: {
            agent: { name: "Agent" },
            workflow: { initial_node: "n", nodes: [{}] },
          },
          notes: "note-text",
        },
      ],
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.agents[0].tenant_id).toBe("tenant-abc");
    expect(body.agents[0].agent_json).toBeDefined();
    expect(body.agents[0].notes).toBe("note-text");
  });

  it("should throw when Admin API is not configured", async () => {
    const { bulkImportAgentConfigs } = await loadModule({
      ADMIN_API_BASE_URL: undefined,
      ADMIN_API_KEY: undefined,
    });

    await expect(
      bulkImportAgentConfigs({
        agents: [
          {
            tenantId: "t1",
            agentJson: {
              agent: { name: "A" },
              workflow: { initial_node: "n", nodes: [{}] },
            },
          },
        ],
      }),
    ).rejects.toThrow("Admin API is not configured");
  });

  it("should handle API error responses", async () => {
    const { bulkImportAgentConfigs } = await loadModule();

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ detail: "Internal server error" }),
    });

    await expect(
      bulkImportAgentConfigs({
        agents: [
          {
            tenantId: "t1",
            agentJson: {
              agent: { name: "A" },
              workflow: { initial_node: "n", nodes: [{}] },
            },
          },
        ],
      }),
    ).rejects.toThrow("Internal server error");
  });
});

// ===========================================================================
// exportAgentConfig
// ===========================================================================

describe("exportAgentConfig", () => {
  it("should send a GET request to the correct path", async () => {
    const { exportAgentConfig } = await loadModule();

    const mockResponse = {
      tenant_id: "t1",
      agent_id: "a1",
      agent_name: "Agent",
      version: 3,
      config_json: {},
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await exportAgentConfig({
      tenantId: "tenant-xyz",
      agentId: "agent-abc",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://api.test.com/admin/agents/tenant-xyz/agent-abc/export",
    );
    expect(options.method).toBe("GET");
    expect(result.agent_name).toBe("Agent");
  });

  it("should append version query parameter when provided", async () => {
    const { exportAgentConfig } = await loadModule();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ version: 2 }),
    });

    await exportAgentConfig({
      tenantId: "t1",
      agentId: "a1",
      version: 2,
    });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://api.test.com/admin/agents/t1/a1/export?version=2",
    );
  });

  it("should not append version query parameter when not provided", async () => {
    const { exportAgentConfig } = await loadModule();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await exportAgentConfig({
      tenantId: "t1",
      agentId: "a1",
    });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.test.com/admin/agents/t1/a1/export");
    expect(url).not.toContain("?");
  });

  it("should throw when Admin API is not configured", async () => {
    const { exportAgentConfig } = await loadModule({
      ADMIN_API_BASE_URL: undefined,
      ADMIN_API_KEY: undefined,
    });

    await expect(
      exportAgentConfig({ tenantId: "t1", agentId: "a1" }),
    ).rejects.toThrow("Admin API is not configured");
  });

  it("should handle API error responses with detail message", async () => {
    const { exportAgentConfig } = await loadModule();

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ detail: "Agent not found" }),
    });

    await expect(
      exportAgentConfig({ tenantId: "t1", agentId: "nonexistent" }),
    ).rejects.toThrow("Agent not found");
  });

  it("should handle API error responses when json parsing fails", async () => {
    const { exportAgentConfig } = await loadModule();

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.reject(new Error("not json")),
    });

    await expect(
      exportAgentConfig({ tenantId: "t1", agentId: "a1" }),
    ).rejects.toThrow("Internal Server Error");
  });
});
