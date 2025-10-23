/**
 * Types for Brain Cloud Adapter Interface
 *
 * Unified type definitions for REST and MCP adapters
 */

// ============================================================================
// Connection & Status
// ============================================================================

export interface ConnectionStatus {
  connected: boolean;
  mode: "rest" | "mcp" | "proxy";
  vaultPath?: string;
  endpoint?: string;
  sessionId?: string;
  error?: string;
}

// ============================================================================
// Search
// ============================================================================

export interface SearchParams {
  query: string;
  limit?: number;
  fileExtensions?: string[];
  caseSensitive?: boolean;
}

export interface SearchResultItem {
  path: string;
  title?: string;
  excerpt?: string;
  score?: number;
  modified?: string;
  size?: number;
}

export interface SearchResult {
  success: boolean;
  results: SearchResultItem[];
  total?: number;
  error?: string;
}

// ============================================================================
// Knowledge Graph
// ============================================================================

export interface GraphOptions {
  directory?: string;
  includeOrphans?: boolean;
  includeUnresolved?: boolean;
  maxNodes?: number;
  maxEdges?: number;
}

export interface GraphNode {
  id: string;
  title: string;
  path: string;
  type?: string;
  tags?: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
  type?: string;
}

export interface GraphResult {
  success: boolean;
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats?: {
    totalNodes: number;
    totalEdges: number;
    orphans?: number;
  };
  error?: string;
}

// ============================================================================
// Focus & Context
// ============================================================================

export interface FocusOptions {
  dailyLimit?: number;
  includeWeekly?: boolean;
  dailyDirectory?: string;
  weeklyPath?: string;
}

export interface DailyNote {
  path: string;
  title: string;
  date: string;
  content?: string;
}

export interface FocusResult {
  success: boolean;
  dailyNotes: DailyNote[];
  weeklyFocus?: string;
  error?: string;
}

// ============================================================================
// Tasks
// ============================================================================

export interface TasksOptions {
  window?: "all" | "overdue" | "today" | "week" | "month";
  priority?: string;
  status?: string;
  limit?: number;
  includeCompleted?: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  status: string;
  due?: string;
  priority?: string;
  project?: string;
  tags?: string[];
  filePath?: string;
}

export interface TasksResult {
  success: boolean;
  tasks: TaskItem[];
  total?: number;
  summary?: {
    overdue: number;
    today: number;
    upcoming: number;
  };
  error?: string;
}

// ============================================================================
// Historical Context
// ============================================================================

export interface ContextParams {
  query: string;
  limit?: number;
  minScore?: number;
}

export interface ContextItem {
  path: string;
  excerpt: string;
  score: number;
  timestamp?: string;
}

export interface ContextResult {
  success: boolean;
  context: ContextItem[];
  error?: string;
}

// ============================================================================
// Conversation Persistence
// ============================================================================

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
  }>;
}

export interface ConversationPayload {
  conversationId: string;
  source: string;
  messages: ConversationMessage[];
  metadata?: Record<string, unknown>;
  autoTag?: boolean;
  saveToVault?: boolean;
}

export interface SaveResult {
  success: boolean;
  conversationId: string;
  notePath?: string;
  chunksCreated?: number;
  error?: string;
}

// ============================================================================
// Capabilities
// ============================================================================

export type BrainCloudCapability =
  | "search"
  | "semantic_search"
  | "graph_data"
  | "graph_analysis"
  | "current_focus"
  | "due_tasks"
  | "historical_context"
  | "conversation_persistence"
  | "vault_tree"
  | "file_operations"
  | "template_rendering";

export interface CapabilitiesInfo {
  mode: "rest" | "mcp" | "proxy";
  capabilities: BrainCloudCapability[];
  endpoint?: string;
  version?: string;
}

// ============================================================================
// Errors
// ============================================================================

export class BrainCloudError extends Error {
  code?: string;
  details?: unknown;

  constructor(message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "BrainCloudError";
    this.code = code;
    this.details = details;
  }
}

export class CapabilityNotSupportedError extends BrainCloudError {
  constructor(capability: string, mode: string) {
    super(
      `Capability '${capability}' is not supported in ${mode} mode`,
      "CAPABILITY_NOT_SUPPORTED",
      { capability, mode }
    );
    this.name = "CapabilityNotSupportedError";
  }
}

export class ConnectionError extends BrainCloudError {
  constructor(message: string, details?: unknown) {
    super(message, "CONNECTION_ERROR", details);
    this.name = "ConnectionError";
  }
}
