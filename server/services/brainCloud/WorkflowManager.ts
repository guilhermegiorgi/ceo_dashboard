import { EventEmitter } from "events";
import crypto from "crypto";
import {
  globalEventBus,
  type BrainCloudEvent,
  type BrainCloudEventType,
} from "./adapters/events.ts";
import {
  type WorkflowDefinition,
  type WorkflowTrigger,
  type WorkflowAction,
} from "./adapters/workflows.ts";
import { query as pgQuery } from "../../database/pg-pool.js";
import { logger } from "../../src/utils/logger.js";

export interface RetryPolicy {
  maxAttempts: number;
  backoff: "linear" | "exponential";
  initialDelay: number;
}

export interface WorkflowManagerConfig {
  enableExecution?: boolean;
  maxConcurrent?: number;
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  startedAt: string;
  completedAt?: string;
  duration?: number;
  context?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  retries: number;
}

export interface WorkflowFilter {
  enabled?: boolean;
  createdBy?: string;
  triggerType?: WorkflowTrigger["type"];
}

export interface WorkflowStats {
  id: string;
  name: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  lastExecutedAt?: string;
  lastStatus?: "completed" | "failed";
}

export interface WorkflowManagerHealth {
  status: "healthy" | "degraded" | "unhealthy";
  activeExecutions: number;
  totalWorkflows: number;
  enabledWorkflows: number;
  uptimeMs: number;
}

interface WorkflowRow {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  trigger: unknown;
  actions: unknown;
  settings: unknown;
  source: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ExecutionRow {
  id: string;
  workflow_id: string;
  workflow_name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration: number | null;
  context: unknown;
  result: unknown;
  error: string | null;
  retries: number;
}

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  backoff: "exponential",
  initialDelay: 1000,
};

const MAX_DEFAULT_CONCURRENT = 5;
const DEFAULT_TIMEOUT = 60_000;

export class WorkflowManager extends EventEmitter {
  private config: Required<WorkflowManagerConfig>;
  private activeExecutions: Map<string, WorkflowExecution> = new Map();
  private eventListeners: Map<
    string,
    {
      handler: (event: BrainCloudEvent) => void;
      eventType: BrainCloudEventType;
    }
  > = new Map();
  private running = false;
  private startTime = 0;
  private workflowOverview = { total: 0, enabled: 0 };

  constructor(config: WorkflowManagerConfig = {}) {
    super();

    this.config = {
      enableExecution: config.enableExecution ?? true,
      maxConcurrent: config.maxConcurrent ?? MAX_DEFAULT_CONCURRENT,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      retryPolicy: config.retryPolicy ?? DEFAULT_RETRY_POLICY,
    } as Required<WorkflowManagerConfig>;
  }

  async start(): Promise<void> {
    if (this.running) {
      logger.warn("[WorkflowManager] Attempted to start when already running");
      return;
    }

    logger.info("[WorkflowManager] Starting...");

    try {
      await this.initializeDatabase();
      await this.registerEventListeners();
      await this.updateWorkflowMetrics();

      this.running = true;
      this.startTime = Date.now();
      this.emit("started");

      logger.info("[WorkflowManager] Started successfully");
    } catch (error) {
      logger.error("[WorkflowManager] Failed to start:", error);
      logger.warn("[WorkflowManager] Starting in degraded mode without database");

      // Start anyway in degraded mode
      this.running = true;
      this.startTime = Date.now();
      this.emit("started");
    }
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    logger.info("[WorkflowManager] Stopping...");

    this.unregisterEventListeners();

    const waitStart = Date.now();
    const timeout = 10_000;

    while (this.activeExecutions.size > 0 && Date.now() - waitStart < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    for (const executionId of this.activeExecutions.keys()) {
      try {
        await this.cancelExecution(executionId);
      } catch (error) {
        logger.error(
          `[WorkflowManager] Failed to cancel execution ${executionId}:`,
          error
        );
      }
    }

    this.running = false;
    this.emit("stopped");

    logger.info("[WorkflowManager] Stopped");
  }

  async createWorkflow(definition: WorkflowDefinition): Promise<string> {
    const id = this.generateWorkflowId();
    const now = new Date().toISOString();

    await pgQuery(
      `INSERT INTO workflows (
        id,
        name,
        description,
        enabled,
        trigger,
        actions,
        settings,
        source,
        created_by,
        created_at,
        updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        id,
        definition.name,
        definition.description ?? null,
        definition.enabled ?? true,
        JSON.stringify(definition.trigger),
        JSON.stringify(definition.actions),
        definition.settings ? JSON.stringify(definition.settings) : null,
        definition.source ?? "ui",
        definition.createdBy ?? "system",
        definition.createdAt ?? now,
        definition.updatedAt ?? now,
      ]
    );

    logger.info(
      `[WorkflowManager] Created workflow ${id} (${definition.name})`
    );

    if (definition.enabled && definition.trigger?.type === "event") {
      this.registerWorkflowEventListener(id, definition);
    }

    this.emit("workflow:created", { id, definition });
    await this.updateWorkflowMetrics();

    return id;
  }

  async getWorkflow(id: string): Promise<WorkflowDefinition | null> {
    const result = await pgQuery<WorkflowRow>(
      "SELECT * FROM workflows WHERE id = $1",
      [id]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapRowToWorkflow(row);
  }

  async listWorkflows(filter?: WorkflowFilter): Promise<WorkflowDefinition[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (filter?.enabled !== undefined) {
      params.push(filter.enabled);
      clauses.push(`enabled = $${params.length}`);
    }

    if (filter?.createdBy) {
      params.push(filter.createdBy);
      clauses.push(`created_by = $${params.length}`);
    }

    if (filter?.triggerType) {
      params.push(filter.triggerType);
      clauses.push(`(trigger->>'type') = $${params.length}`);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

    const result = await pgQuery<WorkflowRow>(
      `SELECT * FROM workflows ${where} ORDER BY created_at DESC`,
      params
    );

    return result.rows.map((row) => this.mapRowToWorkflow(row));
  }

  async updateWorkflow(
    id: string,
    updates: Partial<WorkflowDefinition>
  ): Promise<void> {
    const workflow = await this.getWorkflow(id);
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`);
    }

    const assignments: string[] = [];
    const params: unknown[] = [];

    const pushField = (field: string, value: unknown) => {
      params.push(value);
      assignments.push(`${field} = $${params.length}`);
    };

    if (updates.name !== undefined) {
      pushField("name", updates.name);
    }
    if (updates.description !== undefined) {
      pushField("description", updates.description ?? null);
    }
    if (updates.enabled !== undefined) {
      pushField("enabled", updates.enabled);
    }
    if (updates.trigger !== undefined) {
      pushField("trigger", JSON.stringify(updates.trigger));
    }
    if (updates.actions !== undefined) {
      pushField("actions", JSON.stringify(updates.actions));
    }
    if (updates.settings !== undefined) {
      pushField(
        "settings",
        updates.settings ? JSON.stringify(updates.settings) : null
      );
    }
    if (updates.source !== undefined) {
      pushField("source", updates.source);
    }

    if (assignments.length === 0) {
      return;
    }

    pushField("updated_at", new Date().toISOString());
    params.push(id);

    await pgQuery(
      `UPDATE workflows SET ${assignments.join(", ")} WHERE id = $${params.length
      }`,
      params
    );

    const newDefinition = await this.getWorkflow(id);
    if (!newDefinition) {
      return;
    }

    const wasEnabled = workflow.enabled;
    const isEnabled = updates.enabled ?? workflow.enabled;
    const triggerChanged = updates.trigger !== undefined;

    if (triggerChanged || wasEnabled !== isEnabled) {
      this.unregisterWorkflowEventListener(id);
      if (isEnabled && newDefinition.trigger?.type === "event") {
        this.registerWorkflowEventListener(id, newDefinition);
      }
    }

    this.emit("workflow:updated", { id, updates });
    await this.updateWorkflowMetrics();
  }

  async deleteWorkflow(id: string): Promise<void> {
    await pgQuery("DELETE FROM workflows WHERE id = $1", [id]);
    this.unregisterWorkflowEventListener(id);
    this.emit("workflow:deleted", { id });
    logger.info(`[WorkflowManager] Deleted workflow ${id}`);
    await this.updateWorkflowMetrics();
  }

  async executeWorkflow(
    id: string,
    context?: Record<string, unknown>
  ): Promise<WorkflowExecution> {
    if (!this.config.enableExecution) {
      throw new Error("Workflow execution is disabled by configuration");
    }

    if (this.activeExecutions.size >= this.config.maxConcurrent) {
      throw new Error("Maximum concurrent workflow executions reached");
    }

    const workflow = await this.getWorkflow(id);
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`);
    }

    const executionId = this.generateExecutionId();
    const startedAt = new Date().toISOString();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: "running",
      startedAt,
      context,
      retries: 0,
    };

    await pgQuery(
      `INSERT INTO workflow_executions (
        id,
        workflow_id,
        workflow_name,
        status,
        started_at,
        context,
        retries,
        created_at,
        updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        executionId,
        workflow.id,
        workflow.name,
        "running",
        startedAt,
        context ? JSON.stringify(context) : null,
        0,
        startedAt,
        startedAt,
      ]
    );

    this.activeExecutions.set(executionId, execution);

    globalEventBus.emit("workflow:triggered", {
      type: "workflow:triggered",
      workflowId: workflow.id,
      workflowName: workflow.name,
      trigger: workflow.trigger?.type ?? "manual",
      timestamp: startedAt,
      userId: context?.userId as string | undefined,
    });

    try {
      const actionResults = await this.executeActions(workflow.actions, {
        workflow,
        executionId,
        context,
      });

      const completedAt = new Date().toISOString();
      const duration =
        new Date(completedAt).getTime() - new Date(startedAt).getTime();

      execution.status = "completed";
      execution.completedAt = completedAt;
      execution.duration = duration;
      execution.result = { actionResults };

      await pgQuery(
        `UPDATE workflow_executions
         SET status = $1, completed_at = $2, duration = $3, result = $4, updated_at = $5
         WHERE id = $6`,
        [
          "completed",
          completedAt,
          duration,
          JSON.stringify({ actionResults }),
          completedAt,
          executionId,
        ]
      );

      globalEventBus.emit("workflow:completed", {
        type: "workflow:completed",
        workflowId: workflow.id,
        workflowName: workflow.name,
        trigger: workflow.trigger?.type ?? "manual",
        result: { actionResults },
        duration,
        timestamp: completedAt,
        userId: context?.userId as string | undefined,
      });

      return execution;
    } catch (error) {
      const failureTime = new Date().toISOString();
      const message = error instanceof Error ? error.message : String(error);

      execution.status = "failed";
      execution.completedAt = failureTime;
      execution.error = message;

      await pgQuery(
        `UPDATE workflow_executions
         SET status = $1, completed_at = $2, error = $3, updated_at = $4
         WHERE id = $5`,
        ["failed", failureTime, message, failureTime, executionId]
      );

      globalEventBus.emit("workflow:failed", {
        type: "workflow:failed",
        workflowId: workflow.id,
        workflowName: workflow.name,
        trigger: workflow.trigger?.type ?? "manual",
        error: message,
        duration: 0,
        timestamp: failureTime,
        userId: context?.userId as string | undefined,
      });

      throw error;
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  async cancelExecution(executionId: string): Promise<void> {
    const execution = await this.getExecution(executionId);
    if (!execution || execution.status !== "running") {
      return;
    }

    const now = new Date().toISOString();
    await pgQuery(
      `UPDATE workflow_executions
       SET status = 'cancelled', completed_at = $1, updated_at = $2
       WHERE id = $3`,
      [now, now, executionId]
    );

    this.activeExecutions.delete(executionId);
    logger.warn(`[WorkflowManager] Execution cancelled: ${executionId}`);
  }

  async getExecution(executionId: string): Promise<WorkflowExecution | null> {
    const result = await pgQuery<ExecutionRow>(
      "SELECT * FROM workflow_executions WHERE id = $1",
      [executionId]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapRowToExecution(row);
  }

  async listExecutions(workflowId: string): Promise<WorkflowExecution[]> {
    const result = await pgQuery<ExecutionRow>(
      `SELECT * FROM workflow_executions
       WHERE workflow_id = $1
       ORDER BY started_at DESC
       LIMIT 100`,
      [workflowId]
    );

    return result.rows.map((row) => this.mapRowToExecution(row));
  }

  async getWorkflowStats(id: string): Promise<WorkflowStats> {
    const workflow = await this.getWorkflow(id);
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`);
    }

    const result = await pgQuery(
      `SELECT
          COUNT(*)::int AS total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::int AS success,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::int AS failed,
          AVG(duration)::float AS avg_duration,
          (SELECT status FROM workflow_executions WHERE workflow_id = $1 ORDER BY started_at DESC LIMIT 1) AS last_status,
          (SELECT started_at FROM workflow_executions WHERE workflow_id = $1 ORDER BY started_at DESC LIMIT 1) AS last_executed_at
        FROM workflow_executions
        WHERE workflow_id = $1`,
      [id]
    );

    const aggregates = result.rows[0] as
      | {
        total: number;
        success: number;
        failed: number;
        avg_duration: number | null;
        last_status: string | null;
        last_executed_at: string | null;
      }
      | undefined;

    return {
      id: workflow.id,
      name: workflow.name,
      totalExecutions: aggregates?.total ?? 0,
      successfulExecutions: aggregates?.success ?? 0,
      failedExecutions: aggregates?.failed ?? 0,
      averageDuration: aggregates?.avg_duration ?? 0,
      lastExecutedAt: aggregates?.last_executed_at ?? undefined,
      lastStatus: aggregates?.last_status as "completed" | "failed" | undefined,
    };
  }

  async getActiveExecutions(): Promise<WorkflowExecution[]> {
    return Array.from(this.activeExecutions.values());
  }

  getHealth(): WorkflowManagerHealth {
    return {
      status: this.running ? "healthy" : "unhealthy",
      activeExecutions: this.activeExecutions.size,
      totalWorkflows: this.workflowOverview.total,
      enabledWorkflows: this.workflowOverview.enabled,
      uptimeMs: this.running ? Date.now() - this.startTime : 0,
    };
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // Drop existing tables and types to fix schema incompatibility (UUID -> TEXT)
      await pgQuery(`DROP TABLE IF EXISTS workflow_executions CASCADE`);
      await pgQuery(`DROP TABLE IF EXISTS workflows CASCADE`);
      await pgQuery(`DROP TYPE IF EXISTS workflows CASCADE`);
      await pgQuery(`DROP TYPE IF EXISTS workflow_executions CASCADE`);

      await pgQuery(`
        CREATE TABLE workflows (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          enabled BOOLEAN NOT NULL DEFAULT TRUE,
          trigger JSONB NOT NULL,
          actions JSONB NOT NULL,
          settings JSONB,
          source TEXT NOT NULL DEFAULT 'ui',
          created_by TEXT,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        )
      `);

      await pgQuery(`
        CREATE TABLE workflow_executions (
          id TEXT PRIMARY KEY,
          workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
          workflow_name TEXT NOT NULL,
          status TEXT NOT NULL,
          started_at TIMESTAMPTZ NOT NULL,
          completed_at TIMESTAMPTZ,
          duration INTEGER,
          context JSONB,
          result JSONB,
          error TEXT,
          retries INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        )
      `);

      logger.info("[WorkflowManager] Database schema ready");
    } catch (error) {
      logger.error("[WorkflowManager] Failed to initialize database schema:", error);
      logger.warn("[WorkflowManager] Continuing without workflow database - workflows will be disabled");
      // Don't throw - allow server to start without workflows
    }
  }

  private async registerEventListeners(): Promise<void> {
    try {
      const workflows = await this.listWorkflows({
        enabled: true,
        triggerType: "event",
      });

      workflows.forEach((workflow) => {
        this.registerWorkflowEventListener(workflow.id, workflow);
      });

      logger.info(
        `[WorkflowManager] Registered ${this.eventListeners.size} workflow listeners`
      );
    } catch (error) {
      logger.error("[WorkflowManager] Failed to register event listeners:", error);
      logger.warn("[WorkflowManager] Continuing without workflow event listeners");
      // Don't throw - allow server to start without workflow listeners
    }
  }

  private unregisterEventListeners(): void {
    for (const [workflowId, entry] of Array.from(
      this.eventListeners.entries()
    )) {
      globalEventBus.off(entry.eventType, entry.handler);
      this.eventListeners.delete(workflowId);
    }
  }

  private registerWorkflowEventListener(
    workflowId: string,
    workflow: WorkflowDefinition
  ): void {
    if (workflow.trigger?.type !== "event" || !workflow.trigger.eventType) {
      return;
    }

    this.unregisterWorkflowEventListener(workflowId);

    const handler = (event: BrainCloudEvent) => {
      this.handleEventTrigger(workflow, event).catch((error) => {
        logger.error(
          `[WorkflowManager] Failed to execute workflow ${workflowId} for event ${workflow.trigger?.eventType}:`,
          error
        );
      });
    };

    globalEventBus.on(workflow.trigger.eventType, handler);
    this.eventListeners.set(workflowId, {
      handler,
      eventType: workflow.trigger.eventType,
    });

    logger.info(
      `[WorkflowManager] Registered event listener for workflow ${workflowId} (${workflow.trigger.eventType})`
    );
  }

  private unregisterWorkflowEventListener(workflowId: string): void {
    const entry = this.eventListeners.get(workflowId);
    if (!entry) {
      return;
    }

    globalEventBus.off(entry.eventType, entry.handler);
    this.eventListeners.delete(workflowId);
  }

  private async handleEventTrigger(
    workflow: WorkflowDefinition,
    event: BrainCloudEvent
  ): Promise<void> {
    if (!workflow.enabled) {
      return;
    }

    if (workflow.trigger?.eventType !== event.type) {
      return;
    }

    const filter = workflow.trigger?.eventFilter;
    if (filter) {
      if (
        filter.source &&
        (event as { source?: string }).source !== filter.source
      ) {
        return;
      }

      if (
        filter.userId &&
        (event as { userId?: string }).userId !== filter.userId
      ) {
        return;
      }

      if (filter.path) {
        const eventPath = (event as { path?: string }).path;
        if (eventPath && !this.pathMatchesFilter(eventPath, filter.path)) {
          return;
        }
      }
    }

    const context: Record<string, unknown> = {
      trigger: {
        type: "event",
        event,
      },
    };

    await this.executeWorkflow(workflow.id, context);
  }

  private async executeActions(
    actions: WorkflowAction[],
    _options: {
      workflow: WorkflowDefinition;
      executionId: string;
      context?: Record<string, unknown>;
    }
  ): Promise<
    Array<{
      actionId: string;
      status: "success" | "failed";
      result?: unknown;
      error?: string;
    }>
  > {
    const results: Array<{
      actionId: string;
      status: "success" | "failed";
      result?: unknown;
      error?: string;
    }> = [];

    for (const action of actions) {
      const actionStart = Date.now();
      try {
        results.push({
          actionId: action.id,
          status: "success",
          result: {
            message: `Action ${action.type} executed (stub)`,
            durationMs: Date.now() - actionStart,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          actionId: action.id,
          status: "failed",
          error: message,
        });

        if (action.onError !== "continue") {
          throw error;
        }
      }
    }

    return results;
  }

  private mapRowToWorkflow(row: WorkflowRow): WorkflowDefinition {
    const triggerValue = this.normalizeJson<WorkflowTrigger>(row.trigger, {
      type: "manual",
    });
    const actionsValue = this.normalizeJson<WorkflowAction[]>(row.actions, []);
    const settingsValue = row.settings
      ? this.normalizeJson<Record<string, unknown>>(row.settings, undefined)
      : undefined;

    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      enabled: Boolean(row.enabled),
      trigger: triggerValue,
      actions: actionsValue,
      settings: settingsValue,
      source: row.source ?? "ui",
      createdBy: row.created_by ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as WorkflowDefinition;
  }

  private mapRowToExecution(row: ExecutionRow): WorkflowExecution {
    return {
      id: row.id,
      workflowId: row.workflow_id,
      workflowName: row.workflow_name,
      status: row.status as WorkflowExecution["status"],
      startedAt: row.started_at,
      completedAt: row.completed_at ?? undefined,
      duration: row.duration ?? undefined,
      context: this.normalizeJson<Record<string, unknown>>(
        row.context,
        undefined
      ),
      result: this.normalizeJson<unknown>(row.result, undefined),
      error: row.error ?? undefined,
      retries: row.retries,
    };
  }

  private async updateWorkflowMetrics(): Promise<void> {
    try {
      const result = await pgQuery(
        `SELECT
          COUNT(*)::int AS total,
          SUM(CASE WHEN enabled THEN 1 ELSE 0 END)::int AS enabled
        FROM workflows`
      );

      const row = result.rows[0] as
        | { total: number; enabled: number }
        | undefined;

      this.workflowOverview = {
        total: row?.total ?? 0,
        enabled: row?.enabled ?? 0,
      };
    } catch (error) {
      logger.error("[WorkflowManager] Failed to update workflow metrics:", error);
      // Don't throw - metrics are not critical
    }
  }

  private pathMatchesFilter(value: string, pattern: string): boolean {
    if (pattern === value) {
      return true;
    }

    if (!pattern.includes("*")) {
      return pattern === value;
    }

    const escapedSegments = pattern
      .split("*")
      .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(`^${escapedSegments.join(".*")}$`);
    return regex.test(value);
  }

  private normalizeJson<T>(value: unknown, fallback: T): T {
    if (value === null || value === undefined) {
      return fallback;
    }

    if (typeof value === "string") {
      try {
        return JSON.parse(value) as T;
      } catch (error) {
        logger.error("[WorkflowManager] Failed to parse JSON string", {
          value,
          error,
        });
        return fallback;
      }
    }

    if (typeof value === "object") {
      return value as T;
    }

    return fallback;
  }

  private generateWorkflowId(): string {
    return `wf_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  }
}

export const workflowManager = new WorkflowManager();

export default WorkflowManager;
