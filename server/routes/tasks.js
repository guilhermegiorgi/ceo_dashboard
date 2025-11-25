import { Router } from "express";
import { authenticateJWT as authenticateToken } from "../middleware/auth.js";
import {
  toggleTaskCompletion,
  getTaskPreferences,
  updateTaskPreferences,
  getCompletedTasks,
  triggerTasksCleanup,
  createTask,
  getPendingTasks,
  getCriticalTasks,
} from "../services/tasksService.js";

const router = Router();

router.post("/toggle", authenticateToken, async (req, res, next) => {
  try {
    const { filePath, lineNumber, completed, title } = req.body || {};

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: "filePath é obrigatório.",
      });
    }

    const result = await toggleTaskCompletion({
      filePath,
      lineNumber:
        lineNumber !== undefined && lineNumber !== null
          ? Number(lineNumber)
          : null,
      completed: Boolean(completed),
      title: title || null,
      user: req.user, // Pass user context for settings lookup
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/preferences", authenticateToken, async (req, res, next) => {
  try {
    const preferences = await getTaskPreferences();
    res.json({ success: true, data: preferences });
  } catch (error) {
    next(error);
  }
});

router.patch("/preferences", authenticateToken, async (req, res, next) => {
  try {
    const payload = req.body || {};
    const preferences = await updateTaskPreferences(payload);
    res.json({ success: true, data: preferences });
  } catch (error) {
    next(error);
  }
});

router.get("/critical", authenticateToken, async (req, res, next) => {
  try {
    const limitParam = req.query.limit || 10;
    const tasks = await getCriticalTasks({
      limit: Number(limitParam),
    });
    res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
});

router.get("/pending", authenticateToken, async (req, res, next) => {
  try {
    const windowParam = req.query.window || "all";
    const limitParam = req.query.limit || 100;
    const tasks = await getPendingTasks({
      window: windowParam,
      limit: Number(limitParam),
    });
    res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
});

router.get("/completed", authenticateToken, async (req, res, next) => {
  try {
    const windowParam = req.query.window || "week";
    const tasks = await getCompletedTasks({ window: windowParam });
    res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
});

router.post("/cleanup", authenticateToken, async (req, res, next) => {
  try {
    const payload = req.body || {};
    const result = await triggerTasksCleanup(payload);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post("/create", authenticateToken, async (req, res, next) => {
  try {
    const { title, project, dueDate, priority } = req.body || {};

    const result = await createTask({
      title,
      project,
      dueDate,
      priority,
      user: req.user,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});
  try {
    const payload = req.body || {};
    const result = await triggerTasksCleanup(payload);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
