import { Router } from "express";
import { randomUUID } from "crypto";
import { query } from "../database/pg-pool.js";
import { cacheDel, cacheGet, cacheSet } from "../services/cache.js";

const router = Router();

const PROJECT_COLUMNS = `id, tenant_id, user_id, name, status, progress, team_size, budget, deadline, priority, roi, description, created_at, updated_at`;

let ensureProjectsTablePromise = null;

async function ensureProjectsTable() {
  if (!ensureProjectsTablePromise) {
    ensureProjectsTablePromise = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          status TEXT,
          progress INTEGER DEFAULT 0,
          team_size INTEGER DEFAULT 0,
          budget TEXT,
          deadline TIMESTAMPTZ,
          priority TEXT,
          roi TEXT,
          description TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      
      // Add missing columns if table already exists (migration compatibility)
      await query(`
        ALTER TABLE projects 
        ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS team_size INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS budget TEXT,
        ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS priority TEXT,
        ADD COLUMN IF NOT EXISTS roi TEXT;
        CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects (tenant_id);
        CREATE INDEX IF NOT EXISTS idx_projects_tenant_user ON projects (tenant_id, user_id);
      `);
    })().catch((error) => {
      ensureProjectsTablePromise = null;
      throw error;
    });
  }

  return ensureProjectsTablePromise;
}

function requireContext(user) {
  const tenantId = user?.tenantId;
  const userId = user?.id;

  if (!tenantId || !userId) {
    const error = new Error(
      "Contexto de tenant e usuário é obrigatório para operar projetos."
    );
    error.status = 400;
    throw error;
  }

  return { tenantId, userId };
}

function normalizeProjectRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    status: row.status ?? "Planning",
    progress: Number(row.progress ?? 0),
    team_size: Number(row.team_size ?? 0),
    budget: row.budget ?? "",
    deadline: row.deadline ? new Date(row.deadline).toISOString() : null,
    priority: row.priority ?? "medium",
    roi: row.roi ?? "+0%",
    description: row.description ?? "",
    created_at: row.created_at
      ? new Date(row.created_at).toISOString()
      : undefined,
    updated_at: row.updated_at
      ? new Date(row.updated_at).toISOString()
      : undefined,
  };
}

router.get("/", async (req, res, next) => {
  try {
    const ctx = requireContext(req.user);
    await ensureProjectsTable();

    const cacheKey = `projects:all:${ctx.tenantId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const result = await query(
      `SELECT ${PROJECT_COLUMNS} FROM projects WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [ctx.tenantId],
      ctx
    );
    const projects = result.rows.map(normalizeProjectRow);

    await cacheSet(cacheKey, projects, 60);

    res.json(projects);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const ctx = requireContext(req.user);
    await ensureProjectsTable();

    const {
      name,
      status = "Planning",
      progress = 0,
      team_size = 1,
      budget,
      deadline,
      priority = "medium",
      roi = "+0%",
      description = "",
    } = req.body;

    if (!name || !budget || !deadline) {
      return res.status(400).json({
        error: "Name, budget, and deadline are required",
      });
    }

    const progressValue = Number(progress);
    if (!Number.isFinite(progressValue) || progressValue < 0 || progressValue > 100) {
      return res.status(400).json({ error: "Progress must be a number between 0 and 100" });
    }

    const teamSizeValue = Number(team_size);
    if (!Number.isFinite(teamSizeValue) || teamSizeValue < 0) {
      return res.status(400).json({ error: "Team size must be a positive number" });
    }

    const deadlineValue = deadline ? new Date(deadline) : null;
    if (deadline && Number.isNaN(deadlineValue?.getTime())) {
      return res.status(400).json({ error: "Invalid deadline" });
    }

    const id = randomUUID();

    const result = await query(
      `
        INSERT INTO projects (
          id, tenant_id, user_id, name, status, progress, team_size, budget, deadline, priority, roi, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING ${PROJECT_COLUMNS}
      `,
      [
        id,
        ctx.tenantId,
        ctx.userId,
        name.trim(),
        status,
        progressValue,
        teamSizeValue,
        budget,
        deadlineValue ? deadlineValue.toISOString() : null,
        priority,
        roi,
        description,
      ],
      ctx
    );

    const project = normalizeProjectRow(result.rows[0]);

    const cacheKey = `projects:all:${ctx.tenantId}`;
    await cacheDel(cacheKey);

    if (global.broadcastToClients) {
      global.broadcastToClients({
        type: "project_created",
        data: project,
      });
    }

    res.status(201).json({
      message: "Project created successfully",
      id,
      project,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const ctx = requireContext(req.user);
    await ensureProjectsTable();

    const { id } = req.params;
    const updates = req.body || {};

    const existing = await query(
      `SELECT ${PROJECT_COLUMNS} FROM projects WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [id, ctx.tenantId],
      ctx
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    const allowedFields = {
      name: (value) => (typeof value === "string" ? value.trim() : undefined),
      status: (value) => value,
      progress: (value) => {
        if (value === undefined) return undefined;
        const num = Number(value);
        if (!Number.isFinite(num) || num < 0 || num > 100) {
          throw new Error("Progress must be a number between 0 and 100");
        }
        return num;
      },
      team_size: (value) => {
        if (value === undefined) return undefined;
        const num = Number(value);
        if (!Number.isFinite(num) || num < 0) {
          throw new Error("Team size must be a positive number");
        }
        return num;
      },
      budget: (value) => value,
      deadline: (value) => {
        if (value === undefined) return undefined;
        if (value === null || value === "") {
          return null;
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
          throw new Error("Invalid deadline");
        }
        return date.toISOString();
      },
      priority: (value) => value,
      roi: (value) => value,
      description: (value) => value,
    };

    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    for (const [field, transform] of Object.entries(allowedFields)) {
      if (Object.prototype.hasOwnProperty.call(updates, field)) {
        let transformed;
        try {
          transformed = transform(updates[field]);
        } catch (err) {
          return res.status(400).json({ error: err.message });
        }

        if (transformed !== undefined) {
          setClauses.push(`${field} = $${paramIndex}`);
          params.push(transformed);
          paramIndex += 1;
        }
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const idParamIndex = paramIndex;
    const tenantParamIndex = paramIndex + 1;

    const updateSql = `
      UPDATE projects
      SET ${setClauses.join(", ")}, updated_at = NOW()
      WHERE id = $${idParamIndex} AND tenant_id = $${tenantParamIndex}
      RETURNING ${PROJECT_COLUMNS}
    `;

    params.push(id, ctx.tenantId);

    const result = await query(updateSql, params, ctx);

    const project = normalizeProjectRow(result.rows[0]);

    const cacheKey = `projects:all:${ctx.tenantId}`;
    await cacheDel(cacheKey);

    if (global.broadcastToClients) {
      global.broadcastToClients({
        type: "project_updated",
        data: project,
      });
    }

    res.json({
      message: "Project updated successfully",
      project,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const ctx = requireContext(req.user);
    await ensureProjectsTable();

    const { id } = req.params;

    const result = await query(
      `SELECT ${PROJECT_COLUMNS} FROM projects WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [id, ctx.tenantId],
      ctx
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(normalizeProjectRow(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const ctx = requireContext(req.user);
    await ensureProjectsTable();

    const { id } = req.params;

    const result = await query(
      `DELETE FROM projects WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [id, ctx.tenantId],
      ctx
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    const cacheKey = `projects:all:${ctx.tenantId}`;
    await cacheDel(cacheKey);

    if (global.broadcastToClients) {
      global.broadcastToClients({
        type: "project_deleted",
        data: { id },
      });
    }

    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;
