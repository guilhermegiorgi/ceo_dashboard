/**
 * Unified Brain Cloud Service
 *
 * Unified service that provides auto-detection between REST and MCP adapters.
 * Implements Strategy Pattern for seamless protocol switching.
 */

import type {
  BrainCloudAdapter,
  AdapterContext,
} from "./adapters/BrainCloudAdapter.ts";
import type {
  ConnectionStatus,
  SearchParams,
  SearchResult,
  GraphOptions,
  GraphResult,
  FocusOptions,
  FocusResult,
  TasksOptions,
  TasksResult,
  ContextParams,
  ContextResult,
  ConversationPayload,
  SaveResult,
  BrainCloudCapability,
  CapabilitiesInfo,
} from "./adapters/types.ts";
import { RestBrainCloudAdapter } from "./adapters/RestBrainCloudAdapter.ts";
import { McpBrainCloudAdapter } from "./adapters/McpBrainCloudAdapter.ts";
import { globalEventBus } from "./adapters/events.ts";

export type BrainCloudMode = "auto" | "rest" | "mcp";

export interface BrainCloudServiceConfig {
  mode?: BrainCloudMode;
  preferMcp?: boolean; // When auto, prefer MCP if available
  fallbackToRest?: boolean; // Fallback to REST if MCP fails
}

/**
 * Unified Brain Cloud Service
 *
 * Provides automatic adapter selection based on context and
 * unified interface for all Brain Cloud operations.
 */
export class BrainCloudService {
  private config: BrainCloudServiceConfig;
  private restAdapter: RestBrainCloudAdapter;
  private mcpAdapter: McpBrainCloudAdapter;
  private currentMode: "rest" | "mcp" | null = null;
  private currentContext?: AdapterContext;

  constructor(config: BrainCloudServiceConfig = {}) {
    this.config = {
      mode: config.mode || "auto",
      preferMcp: config.preferMcp ?? false,
      fallbackToRest: config.fallbackToRest ?? true,
    };

    // Initialize adapters
    this.restAdapter = new RestBrainCloudAdapter();
    this.mcpAdapter = new McpBrainCloudAdapter();
  }

  /**
   * Set context for next operations
   * Auto-detects adapter based on context
   */
  withContext(context: AdapterContext): this {
    this.currentContext = context;

    // Auto-detect mode if configured
    if (this.config.mode === "auto") {
      this.currentMode = this.detectMode(context);
    }

    return this;
  }

  /**
   * Manually set operation mode
   */
  setMode(mode: BrainCloudMode): void {
    this.config.mode = mode;
    if (mode !== "auto") {
      this.currentMode = mode;
    }
  }

  /**
   * Get current active mode
   */
  getMode(): "rest" | "mcp" | null {
    return this.currentMode;
  }

  /**
   * Auto-detect adapter based on context
   */
  private detectMode(context: AdapterContext): "rest" | "mcp" {
    // If agentId is present, use MCP (agents prefer MCP protocol)
    if (context.agentId) {
      return "mcp";
    }

    // If req is present, check if it's from chat/agent endpoint
    if (context.req) {
      const path = (context.req as { path?: string }).path;
      if (path && (path.includes("/mcp") || path.includes("/chat"))) {
        return "mcp";
      }
    }

    // Default: REST for regular API calls, MCP if preferred
    return this.config.preferMcp ? "mcp" : "rest";
  }

  /**
   * Get active adapter
   */
  private getAdapter(): BrainCloudAdapter {
    const mode =
      this.currentMode || this.config.mode === "mcp" ? "mcp" : "rest";

    if (mode === "mcp") {
      return new McpBrainCloudAdapter(this.currentContext);
    }

    return new RestBrainCloudAdapter(this.currentContext);
  }

  /**
   * Execute operation with fallback support
   */
  private async executeWithFallback<T>(
    operation: (adapter: BrainCloudAdapter) => Promise<T>
  ): Promise<T> {
    const adapter = this.getAdapter();
    const mode = this.currentMode || "rest";

    try {
      const result = await operation(adapter);

      // Emit workflow event for successful operations
      globalEventBus.emit("workflow:completed", {
        type: "workflow:completed",
        workflowId: "brain-cloud-operation",
        workflowName: "Brain Cloud Operation",
        trigger: mode,
        result,
        duration: 0,
        timestamp: new Date().toISOString(),
        userId: this.currentContext?.req?.user?.id,
      });

      return result;
    } catch (error) {
      // Try fallback to REST if MCP fails and fallback is enabled
      if (mode === "mcp" && this.config.fallbackToRest) {
        try {
          const fallbackAdapter = new RestBrainCloudAdapter(
            this.currentContext
          );
          const result = await operation(fallbackAdapter);

          // Emit warning about fallback
          globalEventBus.emit("workflow:completed", {
            type: "workflow:completed",
            workflowId: "brain-cloud-fallback",
            workflowName: "Brain Cloud Fallback to REST",
            trigger: "mcp_failure",
            result,
            duration: 0,
            timestamp: new Date().toISOString(),
          });

          return result;
        } catch (fallbackError) {
          // Both failed
          const errorMessage =
            fallbackError instanceof Error
              ? fallbackError.message
              : String(fallbackError);
          globalEventBus.emit("workflow:failed", {
            type: "workflow:failed",
            workflowId: "brain-cloud-operation",
            workflowName: "Brain Cloud Operation",
            trigger: mode,
            error: errorMessage,
            duration: 0,
            timestamp: new Date().toISOString(),
          });
          throw fallbackError;
        }
      }

      // Emit failure event
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      globalEventBus.emit("workflow:failed", {
        type: "workflow:failed",
        workflowId: "brain-cloud-operation",
        workflowName: "Brain Cloud Operation",
        trigger: mode,
        error: errorMessage,
        duration: 0,
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  }

  // ============================================================================
  // Public API - delegates to active adapter
  // ============================================================================

  async checkConnection(): Promise<ConnectionStatus> {
    return this.executeWithFallback((adapter) => adapter.checkConnection());
  }

  async search(params: SearchParams): Promise<SearchResult> {
    return this.executeWithFallback((adapter) => adapter.search(params));
  }

  async getGraphData(options?: GraphOptions): Promise<GraphResult> {
    return this.executeWithFallback((adapter) => adapter.getGraphData(options));
  }

  async getCurrentFocus(options?: FocusOptions): Promise<FocusResult> {
    return this.executeWithFallback((adapter) =>
      adapter.getCurrentFocus(options)
    );
  }

  async getDueTasks(options?: TasksOptions): Promise<TasksResult> {
    return this.executeWithFallback((adapter) => adapter.getDueTasks(options));
  }

  async getHistoricalContext(params: ContextParams): Promise<ContextResult> {
    return this.executeWithFallback((adapter) =>
      adapter.getHistoricalContext(params)
    );
  }

  async saveConversation(payload: ConversationPayload): Promise<SaveResult> {
    return this.executeWithFallback((adapter) =>
      adapter.saveConversation(payload)
    );
  }

  /**
   * Search conversations (uses search with conversation-specific params)
   */
  async searchConversations(params: {
    query: string;
    limit?: number;
    return_full_context?: boolean;
    filters?: Record<string, unknown>;
  }): Promise<SearchResult> {
    // Map to search params - conversations are stored as files
    return this.executeWithFallback((adapter) =>
      adapter.search({
        query: params.query,
        limit: params.limit || 5,
        // Additional filters can be handled by the underlying adapter
      })
    );
  }

  /**
   * Get capabilities of active adapter
   */
  capabilities(): BrainCloudCapability[] {
    const adapter = this.getAdapter();
    return adapter.capabilities();
  }

  /**
   * Get detailed capabilities info
   */
  getCapabilitiesInfo(): CapabilitiesInfo {
    const adapter = this.getAdapter();
    return adapter.getCapabilitiesInfo();
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      mode: this.config.mode,
      currentMode: this.currentMode,
      preferMcp: this.config.preferMcp,
      fallbackToRest: this.config.fallbackToRest,
      restCapabilities: this.restAdapter.capabilities().length,
      mcpCapabilities: this.mcpAdapter.capabilities().length,
    };
  }

  /**
   * Get service information (compatible with brainCloudHybrid.getInfo())
   */
  getInfo() {
    const currentAdapter = this.getAdapter();
    const capabilitiesInfo = currentAdapter.getCapabilitiesInfo();

    return {
      service: "Brain Cloud Unified Service",
      version: "2.0.0",
      mode: this.config.mode,
      currentMode: this.currentMode,
      fallbackEnabled: this.config.fallbackToRest,
      adapters: {
        rest: {
          name: "REST Adapter",
          description: "HTTP REST API client for Brain Cloud",
          capabilities: this.restAdapter.capabilities(),
          bestFor: ["Dashboard", "Web applications", "HTTP requests"],
        },
        mcp: {
          name: "MCP Adapter",
          description: "Model Context Protocol client for AI agents",
          capabilities: this.mcpAdapter.capabilities(),
          bestFor: ["AI agents", "Claude", "Semantic operations"],
        },
      },
      activeAdapter: {
        type: this.currentMode || (this.config.mode === "mcp" ? "mcp" : "rest"),
        mode: capabilitiesInfo.mode,
        capabilities: capabilitiesInfo.capabilities,
        endpoint: capabilitiesInfo.endpoint,
        version: capabilitiesInfo.version,
      },
      routing: {
        auto: "Automatically detects protocol based on request context",
        rest: "Forces REST API usage",
        mcp: "Forces MCP protocol usage",
      },
    };
  }
}

/**
 * Create a new BrainCloudService instance
 */
export function createBrainCloudService(
  config?: BrainCloudServiceConfig
): BrainCloudService {
  return new BrainCloudService(config);
}

/**
 * Singleton instance for shared usage
 */
export const brainCloudService = new BrainCloudService({
  mode: "auto",
  fallbackToRest: true,
});

export default BrainCloudService;
