/**
 * Brain Cloud Events Route
 *
 * Server-Sent Events (SSE) endpoint for real-time Brain Cloud updates.
 * Allows frontend to subscribe to file changes, task updates, conversations, etc.
 */

import express from "express";
import {
  globalEventBus,
  BrainCloudEventStream,
} from "../services/brainCloud/adapters/index.ts";

const router = express.Router();

/**
 * GET /api/brain/events
 *
 * Server-Sent Events endpoint for real-time Brain Cloud updates
 *
 * Query params:
 * - filter: Comma-separated event types (e.g. "task:created,file:updated")
 * - userId: Filter events by user ID
 * - source: Filter by source ("ui", "sync", "workflow", "agent")
 *
 * Example:
 * GET /api/brain/events?filter=task:created,task:updated&userId=123
 */
router.get("/events", async (req, res) => {
  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

  // Parse filters from query
  const filterParam = req.query.filter;
  const eventTypes = filterParam
    ? String(filterParam).split(",").filter(Boolean)
    : undefined;

  const userId = req.query.userId ? String(req.query.userId) : undefined;
  const source = req.query.source ? String(req.query.source) : undefined;

  // Create event stream
  const eventStream = new BrainCloudEventStream(globalEventBus);

  // Send initial connection message
  res.write("event: connected\n");
  res.write(
    `data: ${JSON.stringify({
      message: "Connected to Brain Cloud events",
      timestamp: new Date().toISOString(),
    })}\n\n`
  );

  // Heartbeat interval to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 30000); // 30 seconds

  // Handle client disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    eventStream.close();
  });

  try {
    // Subscribe to events with filters
    for await (const event of eventStream.subscribe({
      types: eventTypes,
      userId,
      source,
    })) {
      // Send event to client
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  } catch (error) {
    console.error("Error in event stream:", error);
    clearInterval(heartbeat);
    eventStream.close();

    // Send error event
    res.write("event: error\n");
    res.write(
      `data: ${JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      })}\n\n`
    );

    res.end();
  }
});

/**
 * GET /api/brain/events/ping
 *
 * Simple ping endpoint to test SSE connection
 */
router.get("/events/ping", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "Brain Cloud Events endpoint is available",
  });
});

export default router;
