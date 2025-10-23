/**
 * MCP Brain Cloud Adapter
 *
 * Implements BrainCloudAdapter interface using MCP protocol (brainCloudService).
 * Emits events for all operations to enable real-time UI updates.
 */

import BrainCloudService from "../../brainCloudService.js";
import type { BrainCloudAdapter, AdapterContext } from "./BrainCloudAdapter.ts";
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
  SearchResultItem,
  GraphNode,
  GraphEdge,
  DailyNote,
  TaskItem,
  ContextItem,
} from "./types.ts";
import { ConnectionError } from "./types.ts";
import { globalEventBus } from "./events.ts";

/**
 * MCP adapter for Brain Cloud operations
 */
export class McpBrainCloudAdapter implements BrainCloudAdapter {
  private context?: AdapterContext;
  private service = BrainCloudService;

  constructor(context?: AdapterContext) {
    this.context = context;
  }

  /**
   * Check MCP connection status
   */
  async checkConnection(): Promise<ConnectionStatus> {
    try {
      // Initialize MCP session if not already done
      if (!this.service.initialized) {
        await this.service.initialize();
      }

      const status = await this.service.getVaultStatus();

      if (!status || typeof status !== "object") {
        throw new ConnectionError("Invalid response from vault status");
      }

      return {
        connected: Boolean(status.vault_path || status.initialized),
        mode: "mcp",
        vaultPath: String(status.vault_path || ""),
        sessionId: this.service.sessionId || undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        connected: false,
        mode: "mcp",
        error: errorMessage,
      };
    }
  }

  /**
   * Search vault using MCP protocol
   */
  async search(params: SearchParams): Promise<SearchResult> {
    try {
      if (!this.service.initialized) {
        await this.service.initialize();
      }

      // MCP has semantic search by default
      const response = await this.service.semanticSearch(
        params.query,
        params.limit || 10
      );

      if (!response || typeof response !== "object") {
        throw new Error("Invalid search response");
      }

      const results: SearchResultItem[] = (response.results || []).map(
        (item: Record<string, unknown>) => ({
          path: String(item.path || ""),
          title: item.title ? String(item.title) : undefined,
          excerpt:
            item.excerpt || item.text
              ? String(item.excerpt || item.text)
              : undefined,
          score: typeof item.score === "number" ? item.score : undefined,
          modified: item.modified ? String(item.modified) : undefined,
          size: typeof item.size === "number" ? item.size : undefined,
        })
      );

      // Emit events
      results.forEach((result) => {
        if (result.path) {
          globalEventBus.emit("file:updated", {
            type: "file:updated",
            path: result.path,
            timestamp: new Date().toISOString(),
            source: this.context?.agentId ? "agent" : "ui",
            userId: this.context?.req?.user?.id,
          });
        }
      });

      return {
        success: true,
        results,
        total: results.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        results: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Get knowledge graph data via MCP
   */
  async getGraphData(options?: GraphOptions): Promise<GraphResult> {
    try {
      if (!this.service.initialized) {
        await this.service.initialize();
      }

      const response = await this.service.getGraphData(
        options?.directory || "",
        options?.includeOrphans ?? true
      );

      if (!response || typeof response !== "object") {
        throw new Error("Invalid graph data response");
      }

      const nodes: GraphNode[] = (response.nodes || []).map(
        (node: Record<string, unknown>) => ({
          id: String(node.id || ""),
          title: String(node.title || node.name || ""),
          path: String(node.path || node.id || ""),
          type: node.type ? String(node.type) : undefined,
          tags: Array.isArray(node.tags) ? node.tags.map(String) : undefined,
        })
      );

      const edges: GraphEdge[] = (response.edges || response.links || []).map(
        (edge: Record<string, unknown>) => ({
          source: String(edge.source || ""),
          target: String(edge.target || ""),
          type: edge.type ? String(edge.type) : undefined,
        })
      );

      // Emit graph updated event
      globalEventBus.emit("graph:updated", {
        type: "graph:updated",
        nodesAdded: nodes.length,
        edgesChanged: edges.length,
        timestamp: new Date().toISOString(),
        source: "manual",
      });

      return {
        success: true,
        nodes,
        edges,
        stats: {
          totalNodes: nodes.length,
          totalEdges: edges.length,
          orphans: response.orphans ? Number(response.orphans) : undefined,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        nodes: [],
        edges: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Get current focus via MCP
   */
  async getCurrentFocus(_options?: FocusOptions): Promise<FocusResult> {
    try {
      if (!this.service.initialized) {
        await this.service.initialize();
      }

      const response = await this.service.getCurrentFocus();

      if (!response || typeof response !== "object") {
        throw new Error("Invalid focus response");
      }

      const dailyNotes: DailyNote[] = (
        response.daily_notes ||
        response.dailyNotes ||
        []
      ).map((note: Record<string, unknown>) => ({
        path: String(note.path || ""),
        title: String(note.title || ""),
        date: String(note.date || ""),
        content: note.content ? String(note.content) : undefined,
      }));

      const weeklyFocus = response.weekly_focus || response.weeklyFocus;

      return {
        success: true,
        dailyNotes,
        weeklyFocus: weeklyFocus ? String(weeklyFocus) : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        dailyNotes: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Get due tasks via MCP
   */
  async getDueTasks(options?: TasksOptions): Promise<TasksResult> {
    try {
      if (!this.service.initialized) {
        await this.service.initialize();
      }

      const response = await this.service.getDueTasks(
        options?.window || "all",
        options?.includeCompleted ?? false
      );

      if (!response || typeof response !== "object") {
        throw new Error("Invalid tasks response");
      }

      const tasks: TaskItem[] = (response.tasks || []).map(
        (task: Record<string, unknown>) => ({
          id: String(task.id || task.task_id || Math.random()),
          title: String(task.title || task.content || ""),
          status: String(task.status || "pending"),
          due:
            task.due || task.dueDate
              ? String(task.due || task.dueDate)
              : undefined,
          priority: task.priority ? String(task.priority) : undefined,
          project: task.project ? String(task.project) : undefined,
          tags: Array.isArray(task.tags) ? task.tags.map(String) : undefined,
          filePath:
            task.filePath || task.file_path
              ? String(task.filePath || task.file_path)
              : undefined,
        })
      );

      return {
        success: true,
        tasks,
        total: tasks.length,
        summary: response.summary
          ? {
              overdue: Number(response.summary.overdue || 0),
              today: Number(response.summary.today || 0),
              upcoming: Number(response.summary.upcoming || 0),
            }
          : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        tasks: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Get historical context via MCP semantic search
   */
  async getHistoricalContext(params: ContextParams): Promise<ContextResult> {
    try {
      if (!this.service.initialized) {
        await this.service.initialize();
      }

      const response = await this.service.getHistoricalContext(
        params.query,
        params.limit || 5
      );

      if (!response || typeof response !== "object") {
        throw new Error("Invalid context response");
      }

      const context: ContextItem[] = (
        response.context ||
        response.results ||
        []
      ).map((item: Record<string, unknown>) => ({
        path: String(item.path || ""),
        excerpt: String(item.excerpt || item.text || ""),
        score: typeof item.score === "number" ? item.score : 0,
        timestamp: item.timestamp ? String(item.timestamp) : undefined,
      }));

      return {
        success: true,
        context,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        context: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Save conversation via MCP
   */
  async saveConversation(payload: ConversationPayload): Promise<SaveResult> {
    try {
      if (!this.service.initialized) {
        await this.service.initialize();
      }

      const response = await this.service.saveConversation(
        payload.conversationId,
        payload.messages,
        payload.metadata || {}
      );

      if (!response || typeof response !== "object") {
        throw new Error("Invalid save conversation response");
      }

      // Emit conversation saved event
      globalEventBus.emit("conversation:saved", {
        type: "conversation:saved",
        conversationId: payload.conversationId,
        notePath: response.note_path || response.notePath,
        messageCount: payload.messages.length,
        timestamp: new Date().toISOString(),
        userId: this.context?.req?.user?.id,
      });

      return {
        success: true,
        conversationId: payload.conversationId,
        notePath: response.note_path || response.notePath,
        chunksCreated: response.chunks_created || response.chunksCreated,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        conversationId: payload.conversationId,
        error: errorMessage,
      };
    }
  }

  /**
   * Get supported capabilities (MCP has more advanced features)
   */
  capabilities(): BrainCloudCapability[] {
    return [
      "search",
      "semantic_search",
      "graph_data",
      "graph_analysis",
      "current_focus",
      "due_tasks",
      "historical_context",
      "conversation_persistence",
      "file_operations",
      "vault_tree",
      "template_rendering",
    ];
  }

  /**
   * Get detailed capabilities info
   */
  getCapabilitiesInfo(): CapabilitiesInfo {
    return {
      mode: "mcp",
      capabilities: this.capabilities(),
      endpoint: this.service.mcpUrl,
      version: "1.0.0",
    };
  }
}

/**
 * Factory function for creating MCP adapter with context
 */
export function createMcpAdapter(
  context?: AdapterContext
): McpBrainCloudAdapter {
  return new McpBrainCloudAdapter(context);
}

export default McpBrainCloudAdapter;
