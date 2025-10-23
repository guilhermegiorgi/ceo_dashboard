/**
 * Brain Cloud Adapter Interface
 *
 * Unified interface for REST and MCP Brain Cloud implementations.
 * Implements Strategy Pattern to allow runtime switching between protocols.
 */

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
} from "./types";

/**
 * Base adapter interface for Brain Cloud operations.
 *
 * All adapters (REST, MCP, Proxy) must implement this interface
 * to ensure consistent behavior across different protocols.
 */
export interface BrainCloudAdapter {
  /**
   * Check connection status and health of the Brain Cloud instance
   */
  checkConnection(): Promise<ConnectionStatus>;

  /**
   * Search for content in the vault
   * @param params Search parameters (query, limit, filters)
   */
  search(params: SearchParams): Promise<SearchResult>;

  /**
   * Get knowledge graph data (nodes and edges)
   * @param options Graph retrieval options
   */
  getGraphData(options?: GraphOptions): Promise<GraphResult>;

  /**
   * Get current focus (daily notes + weekly focus)
   * @param options Focus retrieval options
   */
  getCurrentFocus(options?: FocusOptions): Promise<FocusResult>;

  /**
   * Get due tasks with optional filters
   * @param options Task filtering options
   */
  getDueTasks(options?: TasksOptions): Promise<TasksResult>;

  /**
   * Get historical context via semantic search
   * @param params Context query parameters
   */
  getHistoricalContext(params: ContextParams): Promise<ContextResult>;

  /**
   * Save conversation history to vault and vector database
   * @param payload Conversation data to persist
   */
  saveConversation(payload: ConversationPayload): Promise<SaveResult>;

  /**
   * Get capabilities supported by this adapter
   * @returns List of supported operations
   */
  capabilities(): BrainCloudCapability[];

  /**
   * Get detailed capabilities info including mode and endpoint
   */
  getCapabilitiesInfo(): CapabilitiesInfo;
}

/**
 * Context object passed to adapters for request-specific data
 */
export interface AdapterContext {
  /**
   * HTTP request object (for REST adapters)
   */
  req?: {
    headers?: Record<string, string | string[] | undefined>;
    user?: {
      id: string;
      email?: string;
      tenantId?: string;
    };
  };

  /**
   * Agent ID (for MCP adapters)
   */
  agentId?: string;

  /**
   * Tenant ID override
   */
  tenantId?: string;

  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Factory function type for creating adapters with context
 */
export type AdapterFactory = (context?: AdapterContext) => BrainCloudAdapter;
