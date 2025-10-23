import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AdapterContext } from "../BrainCloudAdapter";

// Mock inline (Vitest requirement - no external variables)
vi.mock("../../brainCloudClient.js", () => ({
  default: {
    search: vi.fn(),
    getFileContents: vi.fn(),
    getGraphData: vi.fn(),
    getCurrentFocus: vi.fn(),
    getDueTasks: vi.fn(),
    getHistoricalContext: vi.fn(),
    saveConversation: vi.fn(),
    vaultStatus: vi.fn(),
  },
}));

vi.mock("../events", () => ({
  globalEventBus: {
    emit: vi.fn(),
  },
}));

import { RestBrainCloudAdapter } from "../RestBrainCloudAdapter";
import brainCloudClient from "../../brainCloudClient.js";
import { globalEventBus } from "../events";

describe("RestBrainCloudAdapter", () => {
  let adapter: RestBrainCloudAdapter;
  let mockContext: AdapterContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      req: {
        user: { id: "user-123", email: "test@example.com" },
        headers: { authorization: "Bearer token" },
        path: "/api/brain/search",
      },
      source: "test",
    } as AdapterContext;

    adapter = new RestBrainCloudAdapter(mockContext);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("search()", () => {
    it("deve realizar busca e retornar resultados", async () => {
      const mockResponse = {
        results: [{ path: "note1.md", title: "Note 1", excerpt: "Content 1" }],
      };
      vi.mocked(brainCloudClient.search).mockResolvedValue(mockResponse);

      const result = await adapter.search({ query: "test" });

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      expect(brainCloudClient.search).toHaveBeenCalledWith({
        query: "test",
        case_sensitive: false,
      });
    });
  });

  describe("getGraphData()", () => {
    it("deve retornar dados do grafo", async () => {
      const mockGraph = {
        nodes: [{ id: "note1", label: "Note 1" }],
        edges: [],
      };
      vi.mocked(brainCloudClient.getGraphData).mockResolvedValue(mockGraph);

      const result = await adapter.getGraphData();

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      expect(globalEventBus.emit).toHaveBeenCalled();
    });
  });

  describe("getCurrentFocus()", () => {
    it("deve retornar foco atual", async () => {
      const mockFocus = {
        daily: [{ path: "daily/2025-01-20.md" }],
        weekly: { path: "weekly/W03-2025.md" },
      };
      vi.mocked(brainCloudClient.getCurrentFocus).mockResolvedValue(mockFocus);

      const result = await adapter.getCurrentFocus({ dailyLimit: 3 });

      expect(result).toBeDefined();
      expect(brainCloudClient.getCurrentFocus).toHaveBeenCalled();
    });
  });

  describe("getDueTasks()", () => {
    it("deve retornar tarefas", async () => {
      const mockTasks = {
        tasks: [{ id: "task-1", title: "Task 1" }],
      };
      vi.mocked(brainCloudClient.getDueTasks).mockResolvedValue(mockTasks);

      const result = await adapter.getDueTasks({ window: "week" });

      expect(result).toBeDefined();
      expect(brainCloudClient.getDueTasks).toHaveBeenCalled();
    });
  });

  describe("saveConversation()", () => {
    it("deve salvar conversa", async () => {
      const mockPayload = {
        source: "dashboard",
        conversation_id: "conv-123",
        messages: [],
      };
      const mockResult = { success: true, path: "conversations/conv-123.md" };
      vi.mocked(brainCloudClient.saveConversation).mockResolvedValue(
        mockResult
      );

      const result = await adapter.saveConversation(mockPayload);

      expect(result).toBeDefined();
      expect(brainCloudClient.saveConversation).toHaveBeenCalledWith(
        expect.objectContaining(mockPayload)
      );
      expect(globalEventBus.emit).toHaveBeenCalledWith(
        "conversation:saved",
        expect.any(Object)
      );
    });
  });
});
