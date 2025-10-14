/**
 * Health Check Routes
 *
 * Endpoints para verificar o status do sistema.
 */

import express from "express";
import { query } from "../database/pg-pool.js";

const router = express.Router();

/**
 * GET /health
 * Health check básico
 */
router.get("/", async (req, res) => {
  try {
    // Test database connection
    const dbResult = await query(
      "SELECT NOW() as current_time, version() as pg_version"
    );

    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      database: {
        status: "connected",
        currentTime: dbResult.rows[0].current_time,
        version: dbResult.rows[0].pg_version.split(" ")[1], // Extract version number
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
        total:
          Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
      },
    };

    res.json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
      database: {
        status: "disconnected",
      },
    });
  }
});

/**
 * GET /health/db
 * Detailed database health check
 */
router.get("/db", async (req, res) => {
  try {
    const startTime = Date.now();

    // Test database connection with more details
    const [timeResult, statsResult] = await Promise.all([
      query("SELECT NOW() as current_time, version() as pg_version"),
      query(`
        SELECT
          (SELECT count(*) FROM tenants) as total_tenants,
          (SELECT count(*) FROM users) as total_users,
          (SELECT count(*) FROM projects) as total_projects,
          (SELECT count(*) FROM conversations) as total_conversations
      `),
    ]);

    const responseTime = Date.now() - startTime;

    res.json({
      status: "connected",
      timestamp: new Date().toISOString(),
      responseTime: responseTime + "ms",
      database: {
        currentTime: timeResult.rows[0].current_time,
        version: timeResult.rows[0].pg_version,
      },
      statistics: statsResult.rows[0],
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * GET /health/ready
 * Readiness check (para Kubernetes/Docker)
 */
router.get("/ready", async (req, res) => {
  try {
    // Quick DB check
    await query("SELECT 1");

    res.status(200).json({
      ready: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * GET /health/live
 * Liveness check (para Kubernetes/Docker)
 */
router.get("/live", (req, res) => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
