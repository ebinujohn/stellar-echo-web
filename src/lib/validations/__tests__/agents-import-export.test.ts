import { describe, it, expect } from "vitest";
import {
  importAgentSchema,
  bulkImportAgentsSchema,
  exportAgentQuerySchema,
} from "../agents";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid agent JSON that satisfies importAgentSchema */
function validAgentJson() {
  return {
    agent: { name: "Test Agent" },
    workflow: {
      initial_node: "greeting",
      nodes: [{ id: "greeting", type: "standard", system_prompt: "Hello" }],
    },
  };
}

// ===========================================================================
// importAgentSchema
// ===========================================================================

describe("importAgentSchema", () => {
  it("should accept a valid minimal agent JSON", () => {
    const input = { agentJson: validAgentJson() };
    const result = importAgentSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should reject when agent.name is missing", () => {
    const input = {
      agentJson: {
        agent: {},
        workflow: {
          initial_node: "greeting",
          nodes: [{ id: "greeting" }],
        },
      },
    };
    const result = importAgentSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject when agent.name is an empty string", () => {
    const input = {
      agentJson: {
        agent: { name: "" },
        workflow: {
          initial_node: "greeting",
          nodes: [{ id: "greeting" }],
        },
      },
    };
    const result = importAgentSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject when workflow.initial_node is missing", () => {
    const input = {
      agentJson: {
        agent: { name: "Agent" },
        workflow: {
          nodes: [{ id: "greeting" }],
        },
      },
    };
    const result = importAgentSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject when workflow.initial_node is an empty string", () => {
    const input = {
      agentJson: {
        agent: { name: "Agent" },
        workflow: {
          initial_node: "",
          nodes: [{ id: "greeting" }],
        },
      },
    };
    const result = importAgentSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject when nodes array is empty", () => {
    const input = {
      agentJson: {
        agent: { name: "Agent" },
        workflow: {
          initial_node: "greeting",
          nodes: [],
        },
      },
    };
    const result = importAgentSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject when nodes is not an array", () => {
    const input = {
      agentJson: {
        agent: { name: "Agent" },
        workflow: {
          initial_node: "greeting",
          nodes: "not-an-array",
        },
      },
    };
    const result = importAgentSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should allow passthrough for extra fields on agent", () => {
    const input = {
      agentJson: {
        agent: { name: "Agent", description: "desc", customField: 123 },
        workflow: {
          initial_node: "greeting",
          nodes: [{ id: "greeting" }],
        },
      },
    };
    const result = importAgentSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.agentJson.agent).toHaveProperty("customField", 123);
    }
  });

  it("should allow passthrough for extra fields on workflow", () => {
    const input = {
      agentJson: {
        agent: { name: "Agent" },
        workflow: {
          initial_node: "greeting",
          nodes: [{ id: "greeting" }],
          history_window: 10,
          extraWorkflowField: true,
        },
      },
    };
    const result = importAgentSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.agentJson.workflow).toHaveProperty(
        "extraWorkflowField",
        true,
      );
    }
  });

  it("should allow passthrough for extra fields on root agentJson", () => {
    const input = {
      agentJson: {
        agent: { name: "Agent" },
        workflow: {
          initial_node: "greeting",
          nodes: [{ id: "greeting" }],
        },
        auto_hangup: { enabled: true },
      },
    };
    const result = importAgentSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.agentJson).toHaveProperty("auto_hangup");
    }
  });

  it("should accept optional notes field", () => {
    const input = {
      agentJson: validAgentJson(),
      notes: "Imported from production",
    };
    const result = importAgentSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBe("Imported from production");
    }
  });

  it("should reject notes exceeding 500 characters", () => {
    const input = {
      agentJson: validAgentJson(),
      notes: "x".repeat(501),
    };
    const result = importAgentSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should accept notes of exactly 500 characters", () => {
    const input = {
      agentJson: validAgentJson(),
      notes: "x".repeat(500),
    };
    const result = importAgentSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should accept optional dryRun boolean", () => {
    const input = {
      agentJson: validAgentJson(),
      dryRun: true,
    };
    const result = importAgentSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dryRun).toBe(true);
    }
  });

  it("should accept optional phoneNumbers array", () => {
    const input = {
      agentJson: validAgentJson(),
      phoneNumbers: ["+15551234567", "+15559876543"],
    };
    const result = importAgentSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phoneNumbers).toEqual([
        "+15551234567",
        "+15559876543",
      ]);
    }
  });

  it("should accept empty phoneNumbers array", () => {
    const input = {
      agentJson: validAgentJson(),
      phoneNumbers: [],
    };
    const result = importAgentSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should reject when agentJson is missing entirely", () => {
    const result = importAgentSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ===========================================================================
// bulkImportAgentsSchema
// ===========================================================================

describe("bulkImportAgentsSchema", () => {
  /** Minimal valid agent item for bulk import */
  function validBulkItem() {
    return {
      agentJson: validAgentJson(),
    };
  }

  it("should accept a valid array of 1 agent", () => {
    const input = { agents: [validBulkItem()] };
    const result = bulkImportAgentsSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should accept a valid array of multiple agents", () => {
    const input = {
      agents: [validBulkItem(), validBulkItem(), validBulkItem()],
    };
    const result = bulkImportAgentsSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.agents).toHaveLength(3);
    }
  });

  it("should reject an empty agents array (min 1)", () => {
    const input = { agents: [] };
    const result = bulkImportAgentsSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject when agents array exceeds 50 items", () => {
    const agents = Array.from({ length: 51 }, () => validBulkItem());
    const input = { agents };
    const result = bulkImportAgentsSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should accept exactly 50 agents", () => {
    const agents = Array.from({ length: 50 }, () => validBulkItem());
    const input = { agents };
    const result = bulkImportAgentsSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should validate each item has proper agent structure", () => {
    const input = {
      agents: [
        validBulkItem(),
        {
          agentJson: {
            agent: {
              /* missing name */
            },
            workflow: {
              initial_node: "greeting",
              nodes: [{ id: "greeting" }],
            },
          },
        },
      ],
    };
    const result = bulkImportAgentsSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should validate each item has workflow.nodes", () => {
    const input = {
      agents: [
        {
          agentJson: {
            agent: { name: "Agent" },
            workflow: {
              initial_node: "greeting",
              nodes: [],
            },
          },
        },
      ],
    };
    const result = bulkImportAgentsSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should accept optional notes on each item", () => {
    const input = {
      agents: [
        {
          agentJson: validAgentJson(),
          notes: "Import notes",
        },
      ],
    };
    const result = bulkImportAgentsSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.agents[0].notes).toBe("Import notes");
    }
  });

  it("should reject notes exceeding 500 characters on bulk item", () => {
    const input = {
      agents: [
        {
          agentJson: validAgentJson(),
          notes: "a".repeat(501),
        },
      ],
    };
    const result = bulkImportAgentsSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject when agents key is missing", () => {
    const result = bulkImportAgentsSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("should reject when agents is not an array", () => {
    const result = bulkImportAgentsSchema.safeParse({ agents: "not-array" });
    expect(result.success).toBe(false);
  });

  it("should allow passthrough on nested agent json", () => {
    const input = {
      agents: [
        {
          agentJson: {
            agent: { name: "Agent", extra: "field" },
            workflow: {
              initial_node: "node1",
              nodes: [{ id: "node1", customProp: true }],
            },
            auto_hangup: { enabled: true },
          },
        },
      ],
    };
    const result = bulkImportAgentsSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.agents[0].agentJson.agent).toHaveProperty(
        "extra",
        "field",
      );
    }
  });
});

// ===========================================================================
// exportAgentQuerySchema
// ===========================================================================

describe("exportAgentQuerySchema", () => {
  it("should accept a valid version number", () => {
    const result = exportAgentQuerySchema.safeParse({ version: 3 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe(3);
    }
  });

  it("should accept undefined version (optional)", () => {
    const result = exportAgentQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBeUndefined();
    }
  });

  it("should coerce a string to number", () => {
    const result = exportAgentQuerySchema.safeParse({ version: "5" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe(5);
    }
  });

  it("should reject a negative number", () => {
    const result = exportAgentQuerySchema.safeParse({ version: -1 });
    expect(result.success).toBe(false);
  });

  it("should reject zero", () => {
    const result = exportAgentQuerySchema.safeParse({ version: 0 });
    expect(result.success).toBe(false);
  });

  it("should accept version 1 (minimum positive integer)", () => {
    const result = exportAgentQuerySchema.safeParse({ version: 1 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe(1);
    }
  });

  it("should accept a large version number", () => {
    const result = exportAgentQuerySchema.safeParse({ version: 9999 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe(9999);
    }
  });

  it("should reject a floating-point version number", () => {
    const result = exportAgentQuerySchema.safeParse({ version: 2.5 });
    expect(result.success).toBe(false);
  });

  it("should coerce a string float that is an integer to number", () => {
    const result = exportAgentQuerySchema.safeParse({ version: "10" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe(10);
    }
  });

  it("should reject non-numeric string", () => {
    const result = exportAgentQuerySchema.safeParse({ version: "abc" });
    expect(result.success).toBe(false);
  });

  it("should reject negative string", () => {
    const result = exportAgentQuerySchema.safeParse({ version: "-3" });
    expect(result.success).toBe(false);
  });

  it("should accept an empty object (version is optional)", () => {
    const result = exportAgentQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
