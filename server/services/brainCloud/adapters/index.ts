/**
 * Brain Cloud Adapters Module
 *
 * Unified Brain Cloud integration with Strategy Pattern, real-time events, and dynamic workflows.
 *
 * @module brain-cloud-adapters
 */

// ============================================================================
// Core Adapter Interface
// ============================================================================

export type {
  BrainCloudAdapter,
  AdapterContext,
  AdapterFactory,
} from "./BrainCloudAdapter.ts";

// ============================================================================
// Types
// ============================================================================

export type {
  // Connection
  ConnectionStatus,

  // Search
  SearchParams,
  SearchResult,
  SearchResultItem,

  // Graph
  GraphOptions,
  GraphResult,
  GraphNode,
  GraphEdge,

  // Focus
  FocusOptions,
  FocusResult,
  DailyNote,

  // Tasks
  TasksOptions,
  TasksResult,
  TaskItem,

  // Context
  ContextParams,
  ContextResult,
  ContextItem,

  // Conversations
  ConversationMessage,
  ConversationPayload,
  SaveResult,

  // Capabilities
  BrainCloudCapability,
  CapabilitiesInfo,
} from "./types.ts";

// ============================================================================
// Errors
// ============================================================================

export {
  BrainCloudError,
  CapabilityNotSupportedError,
  ConnectionError,
} from "./types.ts";

// ============================================================================
// Events System
// ============================================================================

export type {
  BrainCloudEventType,
  BrainCloudEvent,
  BrainCloudEventEmitter,
  FileEvent,
  TaskEvent,
  NoteEvent,
  ConversationEvent,
  GraphEvent,
  FocusEvent,
  SyncEvent,
  WorkflowEvent,
  EventStream,
} from "./events.ts";

export {
  BrainCloudEvents,
  BrainCloudEventStream,
  globalEventBus,
} from "./events.ts";

// ============================================================================
// Workflows System
// ============================================================================

export type {
  WorkflowTriggerType,
  WorkflowActionType,
  WorkflowTrigger,
  WorkflowAction,
  WorkflowDefinition,
  WorkflowExecutionContext,
  WorkflowExecutionResult,
  WorkflowRegistry,
  WorkflowExecutor,
  WorkflowManager,
  WorkflowTemplate,
} from "./workflows.ts";

export { WorkflowBuilder } from "./workflows.ts";

// ============================================================================
// Adapters Implementation
// ============================================================================

export {
  RestBrainCloudAdapter,
  createRestAdapter,
} from "./RestBrainCloudAdapter.ts";

export {
  McpBrainCloudAdapter,
  createMcpAdapter,
} from "./McpBrainCloudAdapter.ts";
