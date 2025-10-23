import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrainCloudService } from "../BrainCloudService";
import { RestBrainCloudAdapter } from "../adapters/RestBrainCloudAdapter";
import { McpBrainCloudAdapter } from "../adapters/McpBrainCloudAdapter";
import { mockGlobalEventBus } from "./helpers/mocks";
import { createMockAdapterContext } from "./helpers/mocks";

vi.mock("../adapters/RestBrainCloudAdapter");
vi.mock("../adapters/McpBrainCloudAdapter");
vi.mock("../adapters/events", () => ({
  globalEventBus: mockGlobalEventBus,
}));

const MockRestAdapter = RestBrainCloudAdapter as vi.MockedClass<
  typeof RestBrainCloudAdapter
>;
const MockMcpAdapter = McpBrainCloudAdapter as vi.MockedClass<
  typeof McpBrainCloudAdapter
>;

describe("BrainCloudService", () => {
  let service: BrainCloudService;
  let restAdapter: vi.Mocked<RestBrainCloudAdapter>;
  let mcpAdapter: vi.Mocked<McpBrainCloudAdapter>;

  beforeEach(() => {
    vi.clearAllMocks();

    restAdapter = {
      checkConnection: vi.fn(),
      search: vi.fn(),
      getGraphData: vi.fn(),
      getCurrentFocus: vi.fn(),
      getDueTasks: vi.fn(),
      getHistoricalContext: vi.fn(),
      saveConversation: vi.fn(),
      capabilities: vi.fn().mockReturnValue(["rest"]),
      getCapabilitiesInfo: vi.fn().mockReturnValue({ mode: "rest" }),
      withContext: vi.fn().mockReturnThis(),
    } as unknown as vi.Mocked<RestBrainCloudAdapter>;

    mcpAdapter = {
      checkConnection: vi.fn(),
      search: vi.fn(),
      getGraphData: vi.fn(),
      getCurrentFocus: vi.fn(),
      getDueTasks: vi.fn(),
      getHistoricalContext: vi.fn(),
      saveConversation: vi.fn(),
      capabilities: vi.fn().mockReturnValue(["mcp"]),
      getCapabilitiesInfo: vi.fn().mockReturnValue({ mode: "mcp" }),
      withContext: vi.fn().mockReturnThis(),
    } as unknown as vi.Mocked<McpBrainCloudAdapter>;

    MockRestAdapter.mockImplementation(() => restAdapter);
    MockMcpAdapter.mockImplementation(() => mcpAdapter);

    service = new BrainCloudService();
  });

  it("deve inicializar com adapters disponíveis", () => {
    expect(service).toBeDefined();
    expect(MockRestAdapter).toHaveBeenCalled();
    expect(MockMcpAdapter).toHaveBeenCalled();
  });

  it("deve roteear busca para REST quando contexto possui req", async () => {
    const context = createMockAdapterContext({
      req: { path: "/api/brain/search" },
    });

    restAdapter.search.mockResolvedValue({ success: true });

    const result = await service.withContext(context).search({ query: "test" });

    expect(result).toBeDefined();
    expect(restAdapter.search).toHaveBeenCalled();
    expect(service.getMode()).toBe("rest");
  });

  it("deve usar MCP quando contexto informa agentId", async () => {
    const context = createMockAdapterContext({ agentId: "agent-123" });
    mcpAdapter.search.mockResolvedValue({ success: true });

    const result = await service.withContext(context).search({ query: "test" });

    expect(result).toBeDefined();
    expect(mcpAdapter.search).toHaveBeenCalled();
    expect(service.getMode()).toBe("mcp");
  });

  it("deve realizar fallback para REST se MCP falhar", async () => {
    const context = createMockAdapterContext({ agentId: "agent-321" });
    service = new BrainCloudService({ mode: "mcp", fallbackToRest: true });
    (service as any).withContext(context); // chain to set context

    mcpAdapter.search.mockRejectedValue(new Error("fail"));
    restAdapter.search.mockResolvedValue({ success: true, results: [] });

    const result = await service.search({ query: "fail" });

    expect(result).toBeDefined();
    expect(restAdapter.search).toHaveBeenCalled();
  });

  it("deve emitir eventos globais quando disponíveis", async () => {
    const context = createMockAdapterContext({ req: { path: "/api/brain/graph" } });
    restAdapter.getGraphData.mockResolvedValue({ nodes: [], edges: [] });

    const result = await service.withContext(context).getGraphData();

    expect(result).toBeDefined();
    expect(mockGlobalEventBus.emit).toHaveBeenCalled();
  });
});
