# Prompt: Agent 2 - Workflow Manager & API Endpoints

**Sprint:** 2.5 (Preparação para Sprint 3)
**Agent Role:** Backend Architect
**Prioridade:** 🟡 Média-Alta
**Tempo estimado:** 3-4 horas

---

## 🎯 Objetivo

Implementar o **WorkflowManager** base e criar endpoints API para gerenciamento de workflows, preparando o sistema para automações dinâmicas no Sprint 3.

**Benefício:**
- Workflows podem ser criados via UI, API ou por agentes
- Execução automática baseada em eventos
- Persistência em banco de dados
- Base para drag-and-drop builder (Sprint 3)

---

## 📋 Tarefas

### **1. WorkflowManager Implementation** (Prioridade Máxima)

**Localização:** `server/services/brainCloud/WorkflowManager.ts`

**Dependências:**
- `WorkflowBuilder` (já existe em `adapters/workflows.ts`)
- `globalEventBus` (já existe em `adapters/events.ts`)
- Database (SQLite ou PostgreSQL)

**Funcionalidades essenciais:**

```typescript
interface WorkflowManagerConfig {
  enableExecution?: boolean;
  maxConcurrent?: number;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  storage?: WorkflowStorage;
}

interface RetryPolicy {
  maxAttempts: number;
  backoff: 'linear' | 'exponential';
  initialDelay: number;
}

interface WorkflowStorage {
  type: 'sqlite' | 'postgresql' | 'memory';
  connection?: string;
}

class WorkflowManager {
  // Gerenciamento de workflows
  async createWorkflow(definition: WorkflowDefinition): Promise<string>;
  async getWorkflow(id: string): Promise<WorkflowDefinition | null>;
  async listWorkflows(filter?: WorkflowFilter): Promise<WorkflowDefinition[]>;
  async updateWorkflow(id: string, updates: Partial<WorkflowDefinition>): Promise<void>;
  async deleteWorkflow(id: string): Promise<void>;

  // Execução
  async executeWorkflow(id: string, context?: Record<string, unknown>): Promise<WorkflowExecution>;
  async cancelExecution(executionId: string): Promise<void>;
  async getExecution(executionId: string): Promise<WorkflowExecution | null>;
  async listExecutions(workflowId: string): Promise<WorkflowExecution[]>;

  // Status e monitoramento
  async getWorkflowStats(id: string): Promise<WorkflowStats>;
  async getActiveExecutions(): Promise<WorkflowExecution[]>;
  getHealth(): WorkflowManagerHealth;

  // Lifecycle
  start(): Promise<void>;
  stop(): Promise<void>;
}
```

**Implementação sugerida:**

```typescript
/**
 * Workflow Manager
 *
 * Gerencia criação, armazenamento e execução de workflows automáticos.
 */

import { EventEmitter } from 'events';
import { WorkflowDefinition, WorkflowBuilder, WorkflowAction, WorkflowTrigger } from './adapters/workflows';
import { globalEventBus, BrainCloudEventType } from './adapters/events';
import Database from 'better-sqlite3';
import path from 'path';
import { logger } from '../src/utils/logger.js';

interface WorkflowManagerConfig {
  enableExecution?: boolean;
  maxConcurrent?: number;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  storage?: WorkflowStorage;
}

interface RetryPolicy {
  maxAttempts: number;
  backoff: 'linear' | 'exponential';
  initialDelay: number;
}

interface WorkflowStorage {
  type: 'sqlite' | 'postgresql' | 'memory';
  connection?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
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
  triggerType?: 'event' | 'schedule' | 'manual' | 'webhook';
  tags?: string[];
}

export interface WorkflowStats {
  id: string;
  name: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  lastExecutedAt?: string;
  lastStatus?: 'completed' | 'failed';
}

export interface WorkflowManagerHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  activeExecutions: number;
  totalWorkflows: number;
  enabledWorkflows: number;
  uptimeMs: number;
}

export class WorkflowManager extends EventEmitter {
  private config: Required<WorkflowManagerConfig>;
  private db: Database.Database | null = null;
  private activeExecutions: Map<string, WorkflowExecution> = new Map();
  private eventListeners: Map<string, (event: any) => void> = new Map();
  private running: boolean = false;
  private startTime: number = 0;

  constructor(config: WorkflowManagerConfig = {}) {
    super();

    this.config = {
      enableExecution: config.enableExecution ?? true,
      maxConcurrent: config.maxConcurrent ?? 5,
      timeout: config.timeout ?? 60000,
      retryPolicy: config.retryPolicy ?? {
        maxAttempts: 3,
        backoff: 'exponential',
        initialDelay: 1000,
      },
      storage: config.storage ?? {
        type: 'sqlite',
        connection: path.join(process.cwd(), 'data', 'workflows.db'),
      },
    };
  }

  /**
   * Inicializa o WorkflowManager
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('WorkflowManager already running');
    }

    logger.info('[WorkflowManager] Starting...');

    // Initialize database
    await this.initializeDatabase();

    // Register event listeners for all enabled workflows
    await this.registerEventListeners();

    this.running = true;
    this.startTime = Date.now();

    logger.info('[WorkflowManager] Started successfully');
    this.emit('started');
  }

  /**
   * Para o WorkflowManager
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    logger.info('[WorkflowManager] Stopping...');

    // Unregister all event listeners
    this.unregisterEventListeners();

    // Wait for active executions to complete (with timeout)
    const timeout = 10000; // 10s
    const startWait = Date.now();

    while (this.activeExecutions.size > 0 && (Date.now() - startWait) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Force cancel remaining executions
    for (const [id, execution] of this.activeExecutions.entries()) {
      await this.cancelExecution(id);
    }

    // Close database
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.running = false;

    logger.info('[WorkflowManager] Stopped');
    this.emit('stopped');
  }

  /**
   * Cria um novo workflow
   */
  async createWorkflow(definition: WorkflowDefinition): Promise<string> {
    if (!this.db) {
      throw new Error('WorkflowManager not initialized');
    }

    const id = this.generateId();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO workflows (id, name, description, enabled, trigger, actions, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      definition.name,
      definition.description || null,
      definition.enabled ? 1 : 0,
      JSON.stringify(definition.trigger),
      JSON.stringify(definition.actions),
      definition.createdBy || 'system',
      now,
      now
    );

    logger.info(`[WorkflowManager] Created workflow: ${id} (${definition.name})`);

    // Register event listener if enabled and event-triggered
    if (definition.enabled && definition.trigger.type === 'event') {
      this.registerWorkflowEventListener(id, definition);
    }

    this.emit('workflow:created', { id, definition });

    return id;
  }

  /**
   * Obtém um workflow por ID
   */
  async getWorkflow(id: string): Promise<WorkflowDefinition | null> {
    if (!this.db) {
      throw new Error('WorkflowManager not initialized');
    }

    const stmt = this.db.prepare('SELECT * FROM workflows WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return this.mapRowToWorkflow(row);
  }

  /**
   * Lista workflows com filtros opcionais
   */
  async listWorkflows(filter?: WorkflowFilter): Promise<WorkflowDefinition[]> {
    if (!this.db) {
      throw new Error('WorkflowManager not initialized');
    }

    let query = 'SELECT * FROM workflows WHERE 1=1';
    const params: any[] = [];

    if (filter?.enabled !== undefined) {
      query += ' AND enabled = ?';
      params.push(filter.enabled ? 1 : 0);
    }

    if (filter?.createdBy) {
      query += ' AND created_by = ?';
      params.push(filter.createdBy);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => this.mapRowToWorkflow(row));
  }

  /**
   * Atualiza um workflow
   */
  async updateWorkflow(id: string, updates: Partial<WorkflowDefinition>): Promise<void> {
    if (!this.db) {
      throw new Error('WorkflowManager not initialized');
    }

    const workflow = await this.getWorkflow(id);
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`);
    }

    const fields: string[] = [];
    const params: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      params.push(updates.name);
    }

    if (updates.description !== undefined) {
      fields.push('description = ?');
      params.push(updates.description);
    }

    if (updates.enabled !== undefined) {
      fields.push('enabled = ?');
      params.push(updates.enabled ? 1 : 0);

      // Re-register or unregister event listener
      if (updates.enabled) {
        this.registerWorkflowEventListener(id, { ...workflow, ...updates });
      } else {
        this.unregisterWorkflowEventListener(id);
      }
    }

    if (updates.trigger) {
      fields.push('trigger = ?');
      params.push(JSON.stringify(updates.trigger));
    }

    if (updates.actions) {
      fields.push('actions = ?');
      params.push(JSON.stringify(updates.actions));
    }

    fields.push('updated_at = ?');
    params.push(new Date().toISOString());

    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE workflows
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...params);

    logger.info(`[WorkflowManager] Updated workflow: ${id}`);
    this.emit('workflow:updated', { id, updates });
  }

  /**
   * Deleta um workflow
   */
  async deleteWorkflow(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('WorkflowManager not initialized');
    }

    // Unregister event listener
    this.unregisterWorkflowEventListener(id);

    // Delete from database
    const stmt = this.db.prepare('DELETE FROM workflows WHERE id = ?');
    stmt.run(id);

    logger.info(`[WorkflowManager] Deleted workflow: ${id}`);
    this.emit('workflow:deleted', { id });
  }

  /**
   * Executa um workflow manualmente
   */
  async executeWorkflow(
    id: string,
    context?: Record<string, unknown>
  ): Promise<WorkflowExecution> {
    if (!this.config.enableExecution) {
      throw new Error('Workflow execution is disabled');
    }

    if (this.activeExecutions.size >= this.config.maxConcurrent) {
      throw new Error('Maximum concurrent executions reached');
    }

    const workflow = await this.getWorkflow(id);
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`);
    }

    const executionId = this.generateId();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: id,
      workflowName: workflow.name,
      status: 'pending',
      startedAt: new Date().toISOString(),
      context,
      retries: 0,
    };

    this.activeExecutions.set(executionId, execution);

    // Execute asynchronously
    this.runWorkflow(executionId, workflow, context).catch((error) => {
      logger.error(`[WorkflowManager] Execution failed: ${executionId}`, error);
    });

    return execution;
  }

  /**
   * Cancela uma execução
   */
  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    execution.status = 'cancelled';
    execution.completedAt = new Date().toISOString();
    execution.duration = Date.now() - new Date(execution.startedAt).getTime();

    this.activeExecutions.delete(executionId);

    await this.saveExecution(execution);

    logger.info(`[WorkflowManager] Cancelled execution: ${executionId}`);
    this.emit('execution:cancelled', { execution });
  }

  /**
   * Obtém uma execução
   */
  async getExecution(executionId: string): Promise<WorkflowExecution | null> {
    // Check active first
    const active = this.activeExecutions.get(executionId);
    if (active) return active;

    // Check database
    if (!this.db) return null;

    const stmt = this.db.prepare('SELECT * FROM workflow_executions WHERE id = ?');
    const row = stmt.get(executionId) as any;

    if (!row) return null;

    return {
      id: row.id,
      workflowId: row.workflow_id,
      workflowName: row.workflow_name,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      duration: row.duration,
      context: row.context ? JSON.parse(row.context) : undefined,
      result: row.result ? JSON.parse(row.result) : undefined,
      error: row.error,
      retries: row.retries,
    };
  }

  /**
   * Lista execuções de um workflow
   */
  async listExecutions(workflowId: string): Promise<WorkflowExecution[]> {
    if (!this.db) {
      throw new Error('WorkflowManager not initialized');
    }

    const stmt = this.db.prepare(`
      SELECT * FROM workflow_executions
      WHERE workflow_id = ?
      ORDER BY started_at DESC
      LIMIT 100
    `);

    const rows = stmt.all(workflowId) as any[];

    return rows.map(row => ({
      id: row.id,
      workflowId: row.workflow_id,
      workflowName: row.workflow_name,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      duration: row.duration,
      context: row.context ? JSON.parse(row.context) : undefined,
      result: row.result ? JSON.parse(row.result) : undefined,
      error: row.error,
      retries: row.retries,
    }));
  }

  /**
   * Obtém estatísticas de um workflow
   */
  async getWorkflowStats(id: string): Promise<WorkflowStats> {
    if (!this.db) {
      throw new Error('WorkflowManager not initialized');
    }

    const workflow = await this.getWorkflow(id);
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`);
    }

    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        AVG(CASE WHEN duration IS NOT NULL THEN duration ELSE NULL END) as avg_duration,
        MAX(started_at) as last_executed,
        (SELECT status FROM workflow_executions WHERE workflow_id = ? ORDER BY started_at DESC LIMIT 1) as last_status
      FROM workflow_executions
      WHERE workflow_id = ?
    `);

    const row = stmt.get(id, id) as any;

    return {
      id,
      name: workflow.name,
      totalExecutions: row.total || 0,
      successfulExecutions: row.successful || 0,
      failedExecutions: row.failed || 0,
      averageDuration: row.avg_duration || 0,
      lastExecutedAt: row.last_executed,
      lastStatus: row.last_status,
    };
  }

  /**
   * Obtém execuções ativas
   */
  async getActiveExecutions(): Promise<WorkflowExecution[]> {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Retorna health check do manager
   */
  getHealth(): WorkflowManagerHealth {
    const uptime = this.running ? Date.now() - this.startTime : 0;
    const totalWorkflows = this.db ? this.db.prepare('SELECT COUNT(*) as count FROM workflows').get() as any : { count: 0 };
    const enabledWorkflows = this.db ? this.db.prepare('SELECT COUNT(*) as count FROM workflows WHERE enabled = 1').get() as any : { count: 0 };

    return {
      status: this.running ? 'healthy' : 'unhealthy',
      activeExecutions: this.activeExecutions.size,
      totalWorkflows: totalWorkflows.count,
      enabledWorkflows: enabledWorkflows.count,
      uptimeMs: uptime,
    };
  }

  // =========================================================================
  // Private methods
  // =========================================================================

  private async initializeDatabase(): Promise<void> {
    if (this.config.storage.type !== 'sqlite') {
      throw new Error('Only SQLite storage is currently supported');
    }

    const dbPath = this.config.storage.connection!;
    const dbDir = path.dirname(dbPath);

    // Ensure directory exists
    const fs = await import('fs');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath);

    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        trigger TEXT NOT NULL,
        actions TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workflow_executions (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        workflow_name TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        duration INTEGER,
        context TEXT,
        result TEXT,
        error TEXT,
        retries INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON workflow_executions(workflow_id);
      CREATE INDEX IF NOT EXISTS idx_executions_started_at ON workflow_executions(started_at);
    `);

    logger.info('[WorkflowManager] Database initialized');
  }

  private async registerEventListeners(): Promise<void> {
    const workflows = await this.listWorkflows({ enabled: true });

    for (const workflow of workflows) {
      if (workflow.trigger.type === 'event') {
        this.registerWorkflowEventListener(workflow.id!, workflow);
      }
    }

    logger.info(`[WorkflowManager] Registered ${this.eventListeners.size} event listeners`);
  }

  private registerWorkflowEventListener(id: string, workflow: WorkflowDefinition): void {
    if (workflow.trigger.type !== 'event') return;

    const eventType = workflow.trigger.eventType!;

    const listener = async (event: any) => {
      try {
        // Check if event matches filter
        if (workflow.trigger.eventFilter) {
          // Implement filter logic here
          // For now, execute all matching event types
        }

        logger.info(`[WorkflowManager] Triggering workflow ${id} on event: ${eventType}`);
        await this.executeWorkflow(id, { event });
      } catch (error) {
        logger.error(`[WorkflowManager] Failed to trigger workflow ${id}:`, error);
      }
    };

    globalEventBus.on(eventType, listener);
    this.eventListeners.set(id, listener);

    logger.debug(`[WorkflowManager] Registered event listener for ${id}: ${eventType}`);
  }

  private unregisterWorkflowEventListener(id: string): void {
    const listener = this.eventListeners.get(id);
    if (listener) {
      // We don't know which event type, so we remove from all
      globalEventBus.removeListener('*', listener);
      this.eventListeners.delete(id);
      logger.debug(`[WorkflowManager] Unregistered event listener for ${id}`);
    }
  }

  private unregisterEventListeners(): void {
    for (const [id, listener] of this.eventListeners.entries()) {
      globalEventBus.removeListener('*', listener);
    }
    this.eventListeners.clear();
  }

  private async runWorkflow(
    executionId: string,
    workflow: WorkflowDefinition,
    context?: Record<string, unknown>
  ): Promise<void> {
    const execution = this.activeExecutions.get(executionId)!;
    execution.status = 'running';

    this.emit('execution:started', { execution });

    const startTime = Date.now();

    try {
      // Execute each action sequentially
      const results: any[] = [];

      for (const action of workflow.actions) {
        const result = await this.executeAction(action, context);
        results.push(result);
      }

      // Success
      execution.status = 'completed';
      execution.result = results;
      execution.completedAt = new Date().toISOString();
      execution.duration = Date.now() - startTime;

      logger.info(`[WorkflowManager] Workflow completed: ${execution.workflowName} (${execution.duration}ms)`);

      this.emit('execution:completed', { execution });

      // Emit global event
      globalEventBus.emit('workflow:completed', {
        type: 'workflow:completed',
        workflowId: workflow.id,
        workflowName: workflow.name,
        trigger: workflow.trigger.type,
        result: results,
        duration: execution.duration,
        timestamp: execution.completedAt,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      execution.status = 'failed';
      execution.error = errorMessage;
      execution.completedAt = new Date().toISOString();
      execution.duration = Date.now() - startTime;

      logger.error(`[WorkflowManager] Workflow failed: ${execution.workflowName}`, error);

      this.emit('execution:failed', { execution, error });

      // Emit global event
      globalEventBus.emit('workflow:failed', {
        type: 'workflow:failed',
        workflowId: workflow.id,
        workflowName: workflow.name,
        trigger: workflow.trigger.type,
        error: errorMessage,
        duration: execution.duration,
        timestamp: execution.completedAt,
      });

      // Retry logic (simplified)
      if (execution.retries < this.config.retryPolicy.maxAttempts) {
        const delay = this.calculateRetryDelay(execution.retries);
        logger.info(`[WorkflowManager] Retrying workflow ${execution.workflowName} in ${delay}ms`);

        setTimeout(() => {
          execution.retries++;
          this.runWorkflow(executionId, workflow, context);
        }, delay);

        return; // Don't save yet, will retry
      }
    } finally {
      // Save to database
      await this.saveExecution(execution);

      // Remove from active
      this.activeExecutions.delete(executionId);
    }
  }

  private async executeAction(
    action: WorkflowAction,
    context?: Record<string, unknown>
  ): Promise<any> {
    logger.debug(`[WorkflowManager] Executing action: ${action.type}`);

    // Placeholder implementation
    // In Sprint 3, implement each action type properly
    switch (action.type) {
      case 'createNote':
        logger.info(`[WorkflowManager] Action: createNote - ${action.path}`);
        // TODO: Implement via brainCloudService
        return { success: true, path: action.path };

      case 'createTask':
        logger.info(`[WorkflowManager] Action: createTask - ${action.title}`);
        // TODO: Implement via task service
        return { success: true, taskId: this.generateId() };

      case 'sendEmail':
        logger.info(`[WorkflowManager] Action: sendEmail - ${action.to}`);
        // TODO: Implement email service
        return { success: true, sent: true };

      case 'notifyUser':
        logger.info(`[WorkflowManager] Action: notifyUser - ${action.message}`);
        // TODO: Implement notification service
        return { success: true, notified: true };

      default:
        logger.warn(`[WorkflowManager] Unknown action type: ${action.type}`);
        return { success: false, error: 'Unknown action type' };
    }
  }

  private async saveExecution(execution: WorkflowExecution): Promise<void> {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO workflow_executions
      (id, workflow_id, workflow_name, status, started_at, completed_at, duration, context, result, error, retries)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      execution.id,
      execution.workflowId,
      execution.workflowName,
      execution.status,
      execution.startedAt,
      execution.completedAt || null,
      execution.duration || null,
      execution.context ? JSON.stringify(execution.context) : null,
      execution.result ? JSON.stringify(execution.result) : null,
      execution.error || null,
      execution.retries
    );
  }

  private calculateRetryDelay(retryCount: number): number {
    const { backoff, initialDelay } = this.config.retryPolicy;

    if (backoff === 'linear') {
      return initialDelay * (retryCount + 1);
    } else {
      // Exponential
      return initialDelay * Math.pow(2, retryCount);
    }
  }

  private mapRowToWorkflow(row: any): WorkflowDefinition {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      enabled: row.enabled === 1,
      trigger: JSON.parse(row.trigger),
      actions: JSON.parse(row.actions),
      createdBy: row.created_by,
    };
  }

  private generateId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const workflowManager = new WorkflowManager();

export default WorkflowManager;
```

---

### **2. API Endpoints** (Prioridade Alta)

**Localização:** `server/routes/workflows.js`

**Endpoints necessários:**

```javascript
import express from 'express';
import { workflowManager } from '../services/brainCloud/WorkflowManager.js';
import { authenticateJWT } from '../middleware/auth.js';
import { logger } from '../src/utils/logger.js';

const router = express.Router();

/**
 * GET /api/workflows
 * Lista todos os workflows
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const { enabled, createdBy } = req.query;

    const workflows = await workflowManager.listWorkflows({
      enabled: enabled !== undefined ? enabled === 'true' : undefined,
      createdBy: createdBy ? String(createdBy) : undefined,
    });

    res.json({
      success: true,
      workflows,
      total: workflows.length,
    });
  } catch (error) {
    logger.error('Error listing workflows:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/workflows/:id
 * Obtém um workflow por ID
 */
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const workflow = await workflowManager.getWorkflow(id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
    }

    res.json({
      success: true,
      workflow,
    });
  } catch (error) {
    logger.error('Error getting workflow:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/workflows
 * Cria um novo workflow
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const { name, description, enabled, trigger, actions } = req.body;

    if (!name || !trigger || !actions) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, trigger, actions',
      });
    }

    const definition = {
      name,
      description,
      enabled: enabled !== undefined ? enabled : true,
      trigger,
      actions,
      createdBy: req.user.id,
    };

    const id = await workflowManager.createWorkflow(definition);

    res.status(201).json({
      success: true,
      id,
      message: 'Workflow created successfully',
    });
  } catch (error) {
    logger.error('Error creating workflow:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PATCH /api/workflows/:id
 * Atualiza um workflow
 */
router.patch('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    await workflowManager.updateWorkflow(id, updates);

    res.json({
      success: true,
      message: 'Workflow updated successfully',
    });
  } catch (error) {
    logger.error('Error updating workflow:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/workflows/:id
 * Deleta um workflow
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    await workflowManager.deleteWorkflow(id);

    res.json({
      success: true,
      message: 'Workflow deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting workflow:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/workflows/:id/execute
 * Executa um workflow manualmente
 */
router.post('/:id/execute', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { context } = req.body;

    const execution = await workflowManager.executeWorkflow(id, context);

    res.json({
      success: true,
      execution,
    });
  } catch (error) {
    logger.error('Error executing workflow:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/workflows/:id/executions
 * Lista execuções de um workflow
 */
router.get('/:id/executions', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const executions = await workflowManager.listExecutions(id);

    res.json({
      success: true,
      executions,
      total: executions.length,
    });
  } catch (error) {
    logger.error('Error listing executions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/workflows/:id/stats
 * Obtém estatísticas de um workflow
 */
router.get('/:id/stats', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const stats = await workflowManager.getWorkflowStats(id);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('Error getting workflow stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/workflows/health
 * Health check do workflow manager
 */
router.get('/system/health', authenticateJWT, async (req, res) => {
  try {
    const health = workflowManager.getHealth();

    res.json({
      success: true,
      health,
    });
  } catch (error) {
    logger.error('Error getting health:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
```

**Registrar rotas em `server/routes/index.js`:**

```javascript
import workflowsRouter from './workflows.js';

// ...

router.use('/workflows', authenticateToken, workflowsRouter);
```

---

### **3. Deprecation Warnings** (Prioridade Média)

Adicionar warnings nos serviços antigos para encorajar migração:

**`server/services/brainCloudHybrid.js`:**

```javascript
import { logger } from "../src/utils/logger.js";

// No início do arquivo
logger.warn(
  '[DEPRECATED] brainCloudHybrid is deprecated. ' +
  'Use server/services/brainCloud/BrainCloudService.ts instead. ' +
  'See docs/BRAIN_CLOUD_MIGRATION_GUIDE.md for migration instructions.'
);

// No construtor
constructor() {
  this.restService = brainCloudREST;
  this.mcpService = brainCloudMCP;
  this.preferredMode = "auto";

  console.warn(
    '\n⚠️  WARNING: You are using a deprecated service!\n' +
    '   brainCloudHybrid will be removed in Sprint 4.\n' +
    '   Migrate to BrainCloudService v2.0\n' +
    '   Guide: docs/BRAIN_CLOUD_MIGRATION_GUIDE.md\n'
  );
}
```

Similar para `brainCloudREST.js` e `brainCloudMCP.js`.

---

### **4. Inicializar WorkflowManager no Server** (Prioridade Alta)

**`server/server.js`:**

```javascript
import { workflowManager } from './services/brainCloud/WorkflowManager.js';

// Após inicializar o app

// Start workflow manager
workflowManager.start().then(() => {
  logger.info('Workflow Manager initialized');
}).catch((error) => {
  logger.error('Failed to initialize Workflow Manager:', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await workflowManager.stop();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
```

---

## 📊 Critérios de Sucesso

### **Funcional:**
- ✅ WorkflowManager inicializa com banco SQLite
- ✅ CRUD de workflows funciona via API
- ✅ Workflows podem ser executados manualmente
- ✅ Event-triggered workflows funcionam
- ✅ Execuções são persistidas no banco
- ✅ Health check retorna status correto

### **Qualidade:**
- ✅ 0 TypeScript errors
- ✅ 0 ESLint warnings
- ✅ Logging adequado
- ✅ Error handling robusto

### **Performance:**
- ✅ < 100ms para criar workflow
- ✅ < 50ms para listar workflows
- ✅ Execução de workflow não bloqueia event loop

---

## 🧪 Testes Manuais

```bash
# 1. Iniciar servidor
npm run dev

# 2. Criar workflow via API
curl -X POST http://localhost:3000/api/workflows \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Auto-save conversations",
    "description": "Automatically saves conversations to vault",
    "enabled": true,
    "trigger": {
      "type": "event",
      "eventType": "conversation:saved"
    },
    "actions": [
      {
        "type": "createNote",
        "path": "Conversas/{{date}}_{{id}}.md",
        "content": "{{content}}"
      }
    ]
  }'

# 3. Listar workflows
curl http://localhost:3000/api/workflows \
  -H "Authorization: Bearer TOKEN"

# 4. Executar workflow manualmente
curl -X POST http://localhost:3000/api/workflows/WORKFLOW_ID/execute \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"context": {"test": true}}'

# 5. Verificar execuções
curl http://localhost:3000/api/workflows/WORKFLOW_ID/executions \
  -H "Authorization: Bearer TOKEN"

# 6. Health check
curl http://localhost:3000/api/workflows/system/health \
  -H "Authorization: Bearer TOKEN"
```

---

## ✅ Checklist de Entrega

- [ ] WorkflowManager.ts implementado
- [ ] Database schemas criados
- [ ] API endpoints criados (9 rotas)
- [ ] Rotas registradas em index.js
- [ ] WorkflowManager inicializado em server.js
- [ ] Deprecation warnings adicionados
- [ ] Testes manuais realizados
- [ ] 0 TypeScript errors
- [ ] Documentação atualizada

---

## 🎯 Resultado Esperado

**Após completar:**

```
✅ Sistema de workflows operacional
✅ Workflows podem ser criados via API
✅ Event-triggered workflows funcionam
✅ Persistência em SQLite
✅ Base para Sprint 3 (UI builder)

Exemplo de workflow funcional:
{
  "name": "Auto-save chats",
  "trigger": { "type": "event", "eventType": "conversation:saved" },
  "actions": [{ "type": "createNote", "path": "..." }],
  "enabled": true
}
```

**Tempo estimado:** 3-4 horas
**Prioridade:** 🟡 Média-Alta
**Complexidade:** Média-Alta

**Boa sorte!** 🚀
