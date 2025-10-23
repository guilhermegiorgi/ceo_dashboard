import cron from "node-cron";
import logger from "../src/utils/logger.js";
import WorkflowExecutionService from "./workflowExecutionService.js";

class WorkflowScheduler {
  static scheduledJobs = new Map();

  static initialize() {
    logger.info("[Workflow Scheduler] Initializing...");

    // Register default workflows first
    WorkflowExecutionService.registerDefaultWorkflows();
    const workflows = WorkflowExecutionService.getWorkflows();

    workflows.forEach((workflow) => {
      if (workflow.enabled && workflow.schedule) {
        this.scheduleWorkflow(workflow);
      }
    });

    logger.info(`[Workflow Scheduler] ${workflows.length} workflows scheduled`);
  }

  static scheduleWorkflow(workflow) {
    if (this.scheduledJobs.has(workflow.id)) {
      logger.log(`[Workflow Scheduler] Workflow ${workflow.id} already scheduled`);
      return;
    }

    try {
      const job = cron.schedule(workflow.schedule, async () => {
        logger.log(`[Workflow Scheduler] Executing workflow: ${workflow.name}`);
        try {
          const result = await WorkflowExecutionService.executeWorkflow(workflow.id);
          logger.log(`[Workflow Scheduler] Workflow completed: ${result.status}`);
        } catch (error) {
          logger.error(
            `[Workflow Scheduler] Workflow failed: ${error.message}`
          );
        }
      });

      this.scheduledJobs.set(workflow.id, job);
      logger.info(
        `[Workflow Scheduler] Scheduled: ${workflow.name} (${workflow.schedule})`
      );
    } catch (error) {
      logger.error(
        `[Workflow Scheduler] Failed to schedule ${workflow.id}: ${error.message}`
      );
    }
  }

  static stopWorkflow(workflowId) {
    const job = this.scheduledJobs.get(workflowId);
    if (job) {
      job.stop();
      this.scheduledJobs.delete(workflowId);
      logger.info(`[Workflow Scheduler] Stopped: ${workflowId}`);
    }
  }

  static stopAll() {
    this.scheduledJobs.forEach((job) => job.stop());
    this.scheduledJobs.clear();
    logger.info("[Workflow Scheduler] Stopped all workflows");
  }

  static getStatus() {
    return {
      activeWorkflows: this.scheduledJobs.size,
      workflows: this.scheduledJobs.keys(),
      timestamp: new Date().toISOString(),
    };
  }
}

export default WorkflowScheduler;
