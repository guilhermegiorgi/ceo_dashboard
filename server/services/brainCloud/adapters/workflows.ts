/**
 * Brain Cloud Workflows System
 *
 * Dynamic workflow system for automations created via UI or during interactions.
 * Supports both native workflows and runtime-generated workflows.
 */

import type { BrainCloudAdapter, AdapterContext } from "./BrainCloudAdapter.ts";
import type {
  BrainCloudEvents,
  BrainCloudEventType,
  BrainCloudEvent,
} from "./events.ts";

// ============================================================================
// Workflow Definition Types
// ============================================================================

export type WorkflowTriggerType =
  | "event" // Triggered by Brain Cloud events
  | "schedule" // Triggered by cron schedule
  | "manual" // Triggered manually via UI/API
  | "webhook"; // Triggered by external webhook

export type WorkflowActionType =
  | "create_note" // Create a note in the vault
  | "update_note" // Update existing note
  | "create_task" // Create a task
  | "complete_task" // Mark task as complete
  | "send_notification" // Send notification to user
  | "run_agent" // Execute an AI agent
  | "search" // Search the vault
  | "analyze_graph" // Analyze knowledge graph
  | "http_request" // Make HTTP request
  | "conditional" // Conditional branching
  | "loop" // Loop over items
  | "transform_data"; // Transform data using JavaScript

export interface WorkflowTrigger {
  type: WorkflowTriggerType;

  // Event trigger config
  eventType?: BrainCloudEventType;
  eventFilter?: {
    source?: "ui" | "sync" | "workflow" | "agent";
    userId?: string;
    path?: string; // File path pattern (glob)
  };

  // Schedule trigger config
  schedule?: {
    cron: string;
    timezone?: string;
  };

  // Webhook trigger config
  webhook?: {
    path: string;
    method?: "GET" | "POST" | "PUT" | "DELETE";
    secret?: string;
  };
}

export interface WorkflowAction {
  id: string;
  type: WorkflowActionType;
  name?: string;
  config: Record<string, unknown>;

  // Conditional execution
  condition?: {
    expression: string; // JavaScript expression
    context?: string[]; // Variables from previous steps
  };

  // Error handling
  onError?: "stop" | "continue" | "retry";
  retryConfig?: {
    maxAttempts: number;
    delayMs: number;
  };
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;

  // Workflow metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  source: "native" | "ui" | "agent"; // How was this workflow created

  // Trigger configuration
  trigger: WorkflowTrigger;

  // Actions to execute
  actions: WorkflowAction[];

  // Workflow settings
  settings?: {
    timeout?: number; // Max execution time (ms)
    maxConcurrent?: number; // Max concurrent executions
    rateLimitPerHour?: number;
  };

  // Storage for workflow-specific data
  state?: Record<string, unknown>;
}

// ============================================================================
// Workflow Execution Types
// ============================================================================

export interface WorkflowExecutionContext {
  workflowId: string;
  executionId: string;
  trigger: {
    type: WorkflowTriggerType;
    event?: BrainCloudEvent;
    data?: unknown;
  };
  userId?: string;
  adapter: BrainCloudAdapter;
  adapterContext?: AdapterContext;
  variables: Record<string, unknown>;
}

export interface WorkflowExecutionResult {
  executionId: string;
  workflowId: string;
  status: "success" | "failed" | "partial";
  startedAt: string;
  completedAt: string;
  duration: number;

  // Results from each action
  actionResults: Array<{
    actionId: string;
    status: "success" | "failed" | "skipped";
    result?: unknown;
    error?: string;
  }>;

  // Overall result
  output?: unknown;
  error?: string;
}

// ============================================================================
// Workflow Registry Interface
// ============================================================================

export interface WorkflowRegistry {
  /**
   * Register a new workflow
   */
  register(workflow: WorkflowDefinition): Promise<void>;

  /**
   * Unregister a workflow
   */
  unregister(workflowId: string): Promise<void>;

  /**
   * Get workflow by ID
   */
  get(workflowId: string): Promise<WorkflowDefinition | null>;

  /**
   * List all workflows
   */
  list(filter?: {
    enabled?: boolean;
    source?: "native" | "ui" | "agent";
    createdBy?: string;
  }): Promise<WorkflowDefinition[]>;

  /**
   * Update workflow
   */
  update(
    workflowId: string,
    updates: Partial<WorkflowDefinition>
  ): Promise<void>;

  /**
   * Enable/disable workflow
   */
  setEnabled(workflowId: string, enabled: boolean): Promise<void>;
}

// ============================================================================
// Workflow Executor Interface
// ============================================================================

export interface WorkflowExecutor {
  /**
   * Execute a workflow manually
   */
  execute(
    workflowId: string,
    context: Partial<WorkflowExecutionContext>
  ): Promise<WorkflowExecutionResult>;

  /**
   * Execute workflow action
   */
  executeAction(
    action: WorkflowAction,
    context: WorkflowExecutionContext
  ): Promise<{ result?: unknown; error?: string }>;

  /**
   * Get execution history
   */
  getExecutions(
    workflowId: string,
    limit?: number
  ): Promise<WorkflowExecutionResult[]>;
}

// ============================================================================
// Workflow Manager (combines registry + executor)
// ============================================================================

export interface WorkflowManager extends WorkflowRegistry, WorkflowExecutor {
  /**
   * Initialize workflow manager with event bus
   */
  initialize(eventBus: BrainCloudEvents, adapter: BrainCloudAdapter): void;

  /**
   * Shutdown workflow manager
   */
  shutdown(): Promise<void>;

  /**
   * Get manager statistics
   */
  getStats(): {
    totalWorkflows: number;
    enabledWorkflows: number;
    totalExecutions: number;
    successRate: number;
  };
}

// ============================================================================
// Native Workflow Templates
// ============================================================================

/**
 * Pre-built workflow templates that can be instantiated
 */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: "productivity" | "automation" | "integration" | "analysis";
  icon?: string;

  // Template function that generates workflow definition
  create(params: Record<string, unknown>): WorkflowDefinition;

  // Parameters required by this template
  parameters: Array<{
    name: string;
    type: "string" | "number" | "boolean" | "array" | "object";
    required: boolean;
    description: string;
    default?: unknown;
  }>;
}

// ============================================================================
// Workflow Builder (for UI/Agent creation)
// ============================================================================

/**
 * Fluent API for building workflows programmatically
 */
export class WorkflowBuilder {
  private workflow: Partial<WorkflowDefinition>;

  constructor(name: string, source: "native" | "ui" | "agent" = "ui") {
    this.workflow = {
      id: `wf_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name,
      enabled: true,
      source,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      actions: [],
    };
  }

  description(desc: string): this {
    this.workflow.description = desc;
    return this;
  }

  triggeredBy(trigger: WorkflowTrigger): this {
    this.workflow.trigger = trigger;
    return this;
  }

  onEvent(
    eventType: BrainCloudEventType,
    filter?: WorkflowTrigger["eventFilter"]
  ): this {
    this.workflow.trigger = {
      type: "event",
      eventType,
      eventFilter: filter,
    };
    return this;
  }

  onSchedule(cron: string, timezone?: string): this {
    this.workflow.trigger = {
      type: "schedule",
      schedule: { cron, timezone },
    };
    return this;
  }

  addAction(action: WorkflowAction): this {
    this.workflow.actions = [...(this.workflow.actions || []), action];
    return this;
  }

  createNote(path: string, content: string, condition?: string): this {
    return this.addAction({
      id: `action_${this.workflow.actions?.length || 0}`,
      type: "create_note",
      config: { path, content },
      condition: condition ? { expression: condition } : undefined,
    });
  }

  runAgent(agentId: string, params?: Record<string, unknown>): this {
    return this.addAction({
      id: `action_${this.workflow.actions?.length || 0}`,
      type: "run_agent",
      config: { agentId, params },
    });
  }

  withSettings(settings: WorkflowDefinition["settings"]): this {
    this.workflow.settings = settings;
    return this;
  }

  build(): WorkflowDefinition {
    if (!this.workflow.trigger) {
      throw new Error("Workflow must have a trigger");
    }
    if (!this.workflow.actions || this.workflow.actions.length === 0) {
      throw new Error("Workflow must have at least one action");
    }
    return this.workflow as WorkflowDefinition;
  }
}

// ============================================================================
// Example Usage
// ============================================================================

/*
// Create workflow via builder (UI or programmatic)
const workflow = new WorkflowBuilder('Auto-save conversations', 'ui')
  .description('Automatically save chat conversations to daily note')
  .onEvent('conversation:saved')
  .createNote(
    '5 - INSIGHTS-IA/Daily/{{date}}.md',
    '## Chat: {{conversation.title}}\n\n{{conversation.summary}}'
  )
  .withSettings({ timeout: 30000 })
  .build();

// Register workflow
await workflowManager.register(workflow);

// Execute manually
const result = await workflowManager.execute(workflow.id, {
  userId: 'user-123',
  variables: { date: '2025-10-20', conversation: { title: 'Planning', summary: '...' } }
});
*/
