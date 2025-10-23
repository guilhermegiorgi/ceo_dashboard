/**
 * workflowExecutionService.js
 * Manages pre-built workflow execution, scheduling, and monitoring
 */

class WorkflowExecutionService {
  static workflows = new Map();
  static executions = new Map();
  static executionTimers = new Map();

  /**
   * Register pre-built workflows
   */
  static registerDefaultWorkflows() {
    // Daily Review - 07:30
    this.registerWorkflow({
      id: "daily-review-0730",
      name: "Daily Review",
      description: "Resumo diário de tarefas, inbox e insights",
      schedule: "0 7 * * *", // 07:30
      tasks: [
        {
          id: "task-1",
          name: "Fetch Daily Focus",
          action: "summary",
          params: { type: "daily" },
        },
        {
          id: "task-2",
          name: "Fetch Overdue Tasks",
          action: "search",
          params: { query: "status:overdue" },
        },
        {
          id: "task-3",
          name: "Generate Daily Email",
          action: "email",
          params: { template: "daily-review" },
        },
      ],
      enabled: true,
      tags: ["daily", "review"],
    });

    // Weekly Review - Sunday 18:00
    this.registerWorkflow({
      id: "weekly-review-sunday",
      name: "Weekly Review",
      description: "Revisão semanal com insights e planejamento",
      schedule: "0 18 * * 0", // Sunday 18:00
      tasks: [
        {
          id: "task-1",
          name: "Fetch Weekly Focus",
          action: "summary",
          params: { type: "weekly" },
        },
        {
          id: "task-2",
          name: "Generate Graph Insights",
          action: "graph",
          params: { depth: 2 },
        },
        {
          id: "task-3",
          name: "Send Weekly Report",
          action: "email",
          params: { template: "weekly-review" },
        },
      ],
      enabled: true,
      tags: ["weekly", "review", "insights"],
    });

    // Daily Sync - 06:00
    this.registerWorkflow({
      id: "daily-sync-0600",
      name: "Daily Sync",
      description: "Sincronizar vault com Brain Cloud",
      schedule: "0 6 * * *", // 06:00
      tasks: [
        {
          id: "task-1",
          name: "Sync Vault",
          action: "sync",
          params: { depth: "full" },
          timeout: 300000, // 5 minutes
        },
      ],
      enabled: true,
      tags: ["sync", "maintenance"],
    });

    // Weekly Embeddings Update - Monday 02:00
    this.registerWorkflow({
      id: "weekly-embeddings-monday",
      name: "Weekly Embeddings Update",
      description: "Atualizar embeddings semanais",
      schedule: "0 2 * * 1", // Monday 02:00
      tasks: [
        {
          id: "task-1",
          name: "Update Embeddings",
          action: "embeddings",
          params: { scope: "vault" },
          timeout: 600000, // 10 minutes
        },
      ],
      enabled: true,
      tags: ["embeddings", "maintenance"],
    });
  }

  /**
   * Register a workflow
   */
  static registerWorkflow(workflow) {
    this.workflows.set(workflow.id, workflow);
  }

  /**
   * Get all workflows
   */
  static getWorkflows() {
    return Array.from(this.workflows.values());
  }

  /**
   * Get workflow by ID
   */
  static getWorkflow(id) {
    return this.workflows.get(id);
  }

  /**
   * Execute workflow
   */
  static async executeWorkflow(workflowId, userId) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (!workflow.enabled) {
      throw new Error(`Workflow ${workflowId} is disabled`);
    }

    const execution = {
      id: `exec-${Date.now()}`,
      workflowId,
      startedAt: new Date().toISOString(),
      status: "running",
    };

    this.executions.set(execution.id, execution);

    try {
      const results = {};

      for (const task of workflow.tasks) {
        try {
          results[task.id] = await this.executeTask(task);
        } catch (error) {
          execution.error = String(error);
          execution.status = "failed";
          break;
        }
      }

      if (execution.status !== "failed") {
        execution.status = "completed";
        execution.results = results;
      }

      execution.completedAt = new Date().toISOString();
      execution.duration = new Date(execution.completedAt).getTime() -
        new Date(execution.startedAt).getTime();

      // Update workflow last run
      workflow.lastRun = execution.completedAt;

      return execution;
    } catch (error) {
      execution.status = "failed";
      execution.error = String(error);
      execution.completedAt = new Date().toISOString();
      return execution;
    }
  }

  /**
   * Execute individual task
   */
  static async executeTask(task) {
    switch (task.action) {
      case "search":
        return this.taskSearch(task);
      case "graph":
        return this.taskGraph(task);
      case "sync":
        return this.taskSync(task);
      case "embeddings":
        return this.taskEmbeddings(task);
      case "summary":
        return this.taskSummary(task);
      case "email":
        return this.taskEmail(task);
      default:
        throw new Error(`Unknown action: ${task.action}`);
    }
  }

  static async taskSearch(task) {
    const query = task.params?.query || "";
    // Call Brain Cloud search API
    return { type: "search", query, results: [] };
  }

  static async taskGraph(task) {
    const depth = task.params?.depth || 1;
    // Call Brain Cloud graph API
    return { type: "graph", depth, nodes: 0, edges: 0 };
  }

  static async taskSync(task) {
    // Call sync API
    return { type: "sync", synced: true, timestamp: new Date().toISOString() };
  }

  static async taskEmbeddings(task) {
    // Call embeddings update API
    return { type: "embeddings", updated: true, count: 0 };
  }

  static async taskSummary(task) {
    const type = task.params?.type || "daily";
    // Generate summary
    return { type: "summary", summaryType: type, content: "" };
  }

  static async taskEmail(task) {
    const template = task.params?.template || "default";
    // Send email
    return { type: "email", template, sent: true };
  }

  /**
   * Get execution history
   */
  static getExecutions(workflowId, limit = 20) {
    const execs = Array.from(this.executions.values());
    let filtered = execs;

    if (workflowId) {
      filtered = execs.filter((e) => e.workflowId === workflowId);
    }

    return filtered.sort((a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    ).slice(0, limit);
  }

  /**
   * Get execution by ID
   */
  static getExecution(id) {
    return this.executions.get(id);
  }
}

export default WorkflowExecutionService;
