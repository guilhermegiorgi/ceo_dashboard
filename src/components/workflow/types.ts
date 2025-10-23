import type { LucideIcon } from "lucide-react";

export type BuilderNodeKind = "trigger" | "action";

export type NodeCategory =
  | "Triggers"
  | "Actions"
  | "Conditionals"
  | "Loops"
  | "Utilities";

export type NodeInputType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "multiselect"
  | "toggle"
  | "json"
  | "cron"
  | "code";

export interface NodeInputOption {
  value: string;
  label: string;
  description?: string;
}

export interface NodeInput {
  id: string;
  label: string;
  type: NodeInputType;
  placeholder?: string;
  required?: boolean;
  options?: NodeInputOption[];
  defaultValue?: unknown;
  min?: number;
  max?: number;
  helpText?: string;
}

export interface NodeDefinition {
  id: string;
  label: string;
  description: string;
  kind: BuilderNodeKind;
  category: NodeCategory;
  color: string;
  icon: LucideIcon;
  badge?: string;
  inputs: NodeInput[];
  createConfig: () => Record<string, unknown>;
  serializeTrigger?: (config: Record<string, unknown>) => WorkflowTrigger;
  serializeAction?: (
    config: Record<string, unknown>,
    nodeId: string
  ) => WorkflowAction;
}

export interface BuilderNode {
  id: string;
  definitionId: string;
  kind: BuilderNodeKind;
  label: string;
  config: Record<string, unknown>;
}

export type WorkflowTriggerType = "event" | "schedule" | "manual" | "webhook";

export type WorkflowActionType =
  | "create_note"
  | "update_note"
  | "move_file"
  | "create_task"
  | "complete_task"
  | "send_notification"
  | "run_agent"
  | "search"
  | "analyze_graph"
  | "http_request"
  | "conditional"
  | "loop"
  | "transform_data"
  | "emit_event"
  | "delay";

export type BrainCloudEventType =
  | "file:created"
  | "file:updated"
  | "file:deleted"
  | "file:moved"
  | "task:created"
  | "task:updated"
  | "task:completed"
  | "note:created"
  | "note:updated"
  | "conversation:saved"
  | "graph:updated"
  | "focus:changed"
  | "sync:started"
  | "sync:completed"
  | "sync:failed"
  | "workflow:triggered"
  | "workflow:completed"
  | "workflow:failed";

export interface WorkflowTrigger {
  type: WorkflowTriggerType;
  eventType?: BrainCloudEventType;
  eventFilter?: {
    source?: "ui" | "sync" | "workflow" | "agent";
    userId?: string;
    path?: string;
  };
  schedule?: {
    cron: string;
    timezone?: string;
  };
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
  condition?: {
    expression: string;
    context?: string[];
  };
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
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  source: "native" | "ui" | "agent";
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  settings?: {
    timeout?: number;
    maxConcurrent?: number;
    rateLimitPerHour?: number;
  };
  state?: Record<string, unknown>;
}

export type BuilderStatus = "idle" | "saving" | "testing" | "success" | "error";

export interface ValidationError {
  nodeId: string;
  fieldId: string;
  message: string;
}

export interface WorkflowBuilderState {
  workflowName: string;
  workflowDescription: string;
  trigger: BuilderNode | null;
  actions: BuilderNode[];
  selectedNodeId: string | null;
}
