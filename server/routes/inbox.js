import { Router } from "express";
import { listInboxNotes, getInboxNoteContent } from "../services/inboxService.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const limitParam = Number.parseInt(req.query.limit, 10);
    const limit = Number.isNaN(limitParam) ? 15 : limitParam;
    const result = await listInboxNotes({ limit });
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/content", async (req, res, next) => {
  try {
    const path = req.query.path;
    if (!path || typeof path !== "string") {
      return res.status(400).json({
        success: false,
        error: "Note path is required",
      });
    }
    const note = await getInboxNoteContent(path);
    res.json({
      success: true,
      data: note,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
