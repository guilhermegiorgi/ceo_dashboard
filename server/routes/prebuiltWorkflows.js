import express from "express";
import WorkflowExecutionService from "../services/workflowExecutionService.js";

const router = express.Router();

// Initialize default workflows
WorkflowExecutionService.registerDefaultWorkflows();

/**
 * GET /api/prebuilt-workflows
 * List all pre-built workflows
 */
router.get("/", (req, res) => {
  try {
    const workflows = WorkflowExecutionService.getWorkflows();
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * GET /api/prebuilt-workflows/:id
 * Get workflow by ID
 */
router.get("/:id", (req, res) => {
  try {
    const workflow = WorkflowExecutionService.getWorkflow(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * POST /api/prebuilt-workflows/:id/execute
 * Execute workflow immediately
 */
router.post("/:id/execute", async (req, res) => {
  try {
    const execution = await WorkflowExecutionService.executeWorkflow(
      req.params.id,
      req.user?.id
    );
    res.json(execution);
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

/**
 * GET /api/prebuilt-workflows/:id/executions
 * Get execution history
 */
router.get("/:id/executions", (req, res) => {
  try {
    const executions = WorkflowExecutionService.getExecutions(
      req.params.id,
      req.query.limit ? parseInt(req.query.limit) : 20
    );
    res.json(executions);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * GET /api/prebuilt-workflows/executions/:execId
 * Get specific execution
 */
router.get("/executions/:execId", (req, res) => {
  try {
    const execution = WorkflowExecutionService.getExecution(req.params.execId);
    if (!execution) {
      return res.status(404).json({ error: "Execution not found" });
    }
    res.json(execution);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default router;
