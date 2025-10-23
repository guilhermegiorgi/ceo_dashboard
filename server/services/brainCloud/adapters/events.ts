/**
 * Brain Cloud Events System
 *
 * Real-time event system for Brain Cloud operations.
 * Enables UI updates, workflow triggers, and collaborative features.
 */

import { EventEmitter } from "events";

// ============================================================================
// Event Types
// ============================================================================

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

// ============================================================================
// Event Payloads
// ============================================================================

export interface FileEvent {
  type: "file:created" | "file:updated" | "file:deleted" | "file:moved";
  path: string;
  newPath?: string; // For moves
  content?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  userId?: string;
  source: "ui" | "sync" | "workflow" | "agent";
}

export interface TaskEvent {
  type: "task:created" | "task:updated" | "task:completed";
  taskId: string;
  title: string;
  status: string;
  filePath?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  userId?: string;
  source: "ui" | "sync" | "workflow" | "agent";
}

export interface NoteEvent {
  type: "note:created" | "note:updated";
  path: string;
  title: string;
  tags?: string[];
  timestamp: string;
  userId?: string;
  source: "ui" | "sync" | "workflow" | "agent";
}

export interface ConversationEvent {
  type: "conversation:saved";
  conversationId: string;
  notePath?: string;
  messageCount: number;
  timestamp: string;
  userId?: string;
}

export interface GraphEvent {
  type: "graph:updated";
  nodesAdded?: number;
  nodesRemoved?: number;
  edgesChanged?: number;
  timestamp: string;
  source: "file:created" | "file:updated" | "file:deleted" | "manual";
}

export interface FocusEvent {
  type: "focus:changed";
  dailyNote?: string;
  weeklyFocus?: string;
  timestamp: string;
  userId?: string;
}

export interface SyncEvent {
  type: "sync:started" | "sync:completed" | "sync:failed";
  filesChanged?: number;
  duration?: number;
  error?: string;
  timestamp: string;
}

export interface WorkflowEvent {
  type: "workflow:triggered" | "workflow:completed" | "workflow:failed";
  workflowId: string;
  workflowName: string;
  trigger: string;
  result?: unknown;
  error?: string;
  duration?: number;
  timestamp: string;
  userId?: string;
}

export type BrainCloudEvent =
  | FileEvent
  | TaskEvent
  | NoteEvent
  | ConversationEvent
  | GraphEvent
  | FocusEvent
  | SyncEvent
  | WorkflowEvent;

// ============================================================================
// Event Emitter Interface
// ============================================================================

export interface BrainCloudEventEmitter {
  on(
    event: BrainCloudEventType,
    listener: (data: BrainCloudEvent) => void
  ): void;
  once(
    event: BrainCloudEventType,
    listener: (data: BrainCloudEvent) => void
  ): void;
  off(
    event: BrainCloudEventType,
    listener: (data: BrainCloudEvent) => void
  ): void;
  emit(event: BrainCloudEventType, data: BrainCloudEvent): boolean;
}

// ============================================================================
// Default Event Emitter Implementation
// ============================================================================

export class BrainCloudEvents
  extends EventEmitter
  implements BrainCloudEventEmitter
{
  constructor() {
    super();
    // Increase max listeners for workflows
    this.setMaxListeners(100);
  }

  /**
   * Subscribe to Brain Cloud events
   */
  on(
    event: BrainCloudEventType,
    listener: (data: BrainCloudEvent) => void
  ): this {
    return super.on(event, listener);
  }

  /**
   * Subscribe once to Brain Cloud events
   */
  once(
    event: BrainCloudEventType,
    listener: (data: BrainCloudEvent) => void
  ): this {
    return super.once(event, listener);
  }

  /**
   * Unsubscribe from Brain Cloud events
   */
  off(
    event: BrainCloudEventType,
    listener: (data: BrainCloudEvent) => void
  ): this {
    return super.off(event, listener);
  }

  /**
   * Emit Brain Cloud event
   */
  emit(event: BrainCloudEventType, data: BrainCloudEvent): boolean {
    return super.emit(event, data);
  }
}

// ============================================================================
// Event Stream (for SSE/WebSocket)
// ============================================================================

export interface EventStream {
  /**
   * Subscribe to event stream
   */
  subscribe(filter?: {
    types?: BrainCloudEventType[];
    userId?: string;
    source?: string;
  }): AsyncIterableIterator<BrainCloudEvent>;

  /**
   * Close event stream
   */
  close(): void;
}

/**
 * Event stream implementation for SSE/WebSocket
 */
export class BrainCloudEventStream implements EventStream {
  private emitter: BrainCloudEvents;
  private listeners: Map<string, (data: BrainCloudEvent) => void>;
  private closed: boolean = false;

  constructor(emitter: BrainCloudEvents) {
    this.emitter = emitter;
    this.listeners = new Map();
  }

  async *subscribe(filter?: {
    types?: BrainCloudEventType[];
    userId?: string;
    source?: string;
  }): AsyncIterableIterator<BrainCloudEvent> {
    const queue: BrainCloudEvent[] = [];
    let resolve: ((value: BrainCloudEvent) => void) | null = null;

    const eventTypes = filter?.types || [
      "file:created",
      "file:updated",
      "file:deleted",
      "file:moved",
      "task:created",
      "task:updated",
      "task:completed",
      "note:created",
      "note:updated",
      "conversation:saved",
      "graph:updated",
      "focus:changed",
      "sync:started",
      "sync:completed",
      "sync:failed",
      "workflow:triggered",
      "workflow:completed",
      "workflow:failed",
    ];

    const listener = (data: BrainCloudEvent) => {
      // Apply filters
      if (filter?.userId && "userId" in data && data.userId !== filter.userId) {
        return;
      }
      if (filter?.source && "source" in data && data.source !== filter.source) {
        return;
      }

      if (resolve) {
        resolve(data);
        resolve = null;
      } else {
        queue.push(data);
      }
    };

    // Register listeners for all event types
    eventTypes.forEach((type) => {
      this.emitter.on(type, listener);
      this.listeners.set(type, listener);
    });

    try {
      while (!this.closed) {
        if (queue.length > 0) {
          const event = queue.shift()!;
          yield event;
        } else {
          await new Promise<BrainCloudEvent>((res) => {
            resolve = res;
          });
          if (resolve === null && queue.length > 0) {
            yield queue.shift()!;
          }
        }
      }
    } finally {
      this.close();
    }
  }

  close(): void {
    this.closed = true;
    // Remove all listeners
    this.listeners.forEach((listener, type) => {
      this.emitter.off(type as BrainCloudEventType, listener);
    });
    this.listeners.clear();
  }
}

// ============================================================================
// Singleton instance (for shared event bus)
// ============================================================================

export const globalEventBus = new BrainCloudEvents();
