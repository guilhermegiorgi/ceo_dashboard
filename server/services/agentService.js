import { query } from "../database/pg-pool.js";
import { executeAgent } from "./agentExecutor.js";

function normalizeContext(input = {}) {
  const tenantId = input.tenantId || input.tenant_id;
  const userId = input.userId || input.user_id || input.id;

  if (!tenantId || !userId) {
    throw new Error(
      "Tenant e usuário são obrigatórios para operar agentes (tenantId/userId ausentes no token)."
    );
  }

  return { tenantId, userId };
}

function parseConfig(config) {
  if (!config) {
    return {};
  }
  if (typeof config === "string") {
    try {
      return JSON.parse(config);
    } catch (error) {
      console.warn("Não foi possível converter config_json para JSON:", error);
      return {};
    }
  }
  if (typeof config === "object") {
    return config;
  }
  return {};
}

function buildConfiguration(agentData, config) {
  return {
    schedule:
      agentData.schedule ??
      agentData.configuration?.schedule ??
      agentData.metadata?.schedule ??
      null,
    provider:
      agentData.provider ??
      agentData.configuration?.provider ??
      agentData.metadata?.provider ??
      null,
    model:
      agentData.model ??
      agentData.configuration?.model ??
      agentData.metadata?.model ??
      null,
    api_key:
      agentData.api_key ??
      agentData.configuration?.api_key ??
      agentData.metadata?.api_key ??
      null,
    settings:
      agentData.config_json ??
      agentData.configuration?.settings ??
      agentData.configuration?.config_json ??
      config,
  };
}

function deriveLastRun(row) {
  if (row.last_run_at) {
    return row.last_run_at;
  }
  const metadata = row.metadata || {};
  return metadata.last_run_at || metadata.lastRunAt || null;
}

function computeSuccessRate(successRuns = 0, totalRuns = 0) {
  if (!totalRuns) {
    return undefined;
  }
  const rate = Math.round((Number(successRuns) / Number(totalRuns)) * 100);
  return Number.isFinite(rate) ? rate : undefined;
}

function mapAgentRow(row) {
  const configuration = row.configuration || {};
  const configSettings =
    configuration.settings ||
    configuration.config_json ||
    configuration.config ||
    {};
  const totalRuns = Number(row.total_runs ?? row.run_count ?? 0);
  const successRuns = Number(row.success_runs ?? 0);

  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    name: row.name,
    description: row.description || "",
    type: row.agent_type,
    status: row.status || "inactive",
    schedule: configuration.schedule ?? null,
    provider: configuration.provider ?? null,
    model: configuration.model ?? null,
    api_key: configuration.api_key ?? null,
    config_json: configSettings,
    metadata: row.metadata || {},
    last_run_at: deriveLastRun(row),
    lastRun: deriveLastRun(row),
    totalRuns,
    successRate: computeSuccessRate(successRuns, totalRuns),
  };
}

function mapRunRow(row) {
  const output =
    row.output && typeof row.output === "object" ? row.output : { log: row.output };
  return {
    id: row.id,
    agent_id: row.agent_id,
    agent_name: row.agent_name,
    status: row.status,
    start_time: row.started_at || row.created_at,
    end_time: row.completed_at,
    duration_ms: row.duration_ms ?? null,
    tokens_used: row.tokens_used ?? null,
    log: output?.log ?? null,
    output,
    error: row.error ?? null,
    metadata: row.metadata ?? {},
    created_at: row.created_at,
  };
}

export const seedInitialAgent = async () => {
  // Em ambientes com PostgreSQL e RLS não criamos registros padrão automaticamente.
  console.info(
    "seedInitialAgent: inicialização automática ignorada (usar migrations/seed dedicados)."
  );
};

export const getAllAgents = async (context) => {
  const ctx = normalizeContext(context);
  const result = await query(
    `
      SELECT a.*,
             stats.total_runs,
             stats.success_runs,
             stats.last_run_at
      FROM agents a
      LEFT JOIN (
        SELECT agent_id,
               COUNT(*)::int AS total_runs,
               COUNT(*) FILTER (WHERE status IN ('completed','success'))::int AS success_runs,
               MAX(COALESCE(completed_at, started_at, created_at)) AS last_run_at
        FROM agent_runs
        GROUP BY agent_id
      ) stats ON stats.agent_id = a.id
      WHERE a.status IS DISTINCT FROM 'archived'
      ORDER BY COALESCE(stats.last_run_at, a.updated_at, a.created_at) DESC
    `,
    [],
    ctx
  );

  return result.rows.map(mapAgentRow);
};

export const getAgentById = async (id, context) => {
  const ctx = normalizeContext(context);
  const result = await query(
    `
      SELECT a.*,
             stats.total_runs,
             stats.success_runs,
             stats.last_run_at
      FROM agents a
      LEFT JOIN (
        SELECT agent_id,
               COUNT(*)::int AS total_runs,
               COUNT(*) FILTER (WHERE status IN ('completed','success'))::int AS success_runs,
               MAX(COALESCE(completed_at, started_at, created_at)) AS last_run_at
        FROM agent_runs
        GROUP BY agent_id
      ) stats ON stats.agent_id = a.id
      WHERE a.id = $1
      LIMIT 1
    `,
    [id],
    ctx
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapAgentRow(result.rows[0]);
};

export const createAgent = async (agentData, context) => {
  const ctx = normalizeContext(context);
  const parsedConfig = parseConfig(agentData.config_json);
  const configuration = buildConfiguration(agentData, parsedConfig);
  const systemPrompt = parsedConfig.prompt_template || parsedConfig.prompt || null;

  const result = await query(
    `
      INSERT INTO agents (
        tenant_id,
        user_id,
        name,
        description,
        agent_type,
        system_prompt,
        configuration,
        status,
        brain_context_enabled,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10::jsonb)
      RETURNING *
    `,
    [
      ctx.tenantId,
      ctx.userId,
      agentData.name,
      agentData.description || "",
      agentData.type || "general",
      systemPrompt,
      configuration,
      agentData.status || "active",
      agentData.brain_context_enabled ?? true,
      agentData.metadata || {},
    ],
    ctx
  );

  return mapAgentRow(result.rows[0]);
};

export const updateAgent = async (id, agentData, context) => {
  const ctx = normalizeContext(context);
  const parsedConfig = parseConfig(agentData.config_json);
  const configuration = buildConfiguration(agentData, parsedConfig);
  const systemPrompt = parsedConfig.prompt_template || parsedConfig.prompt || null;

  const result = await query(
    `
      UPDATE agents
      SET name = $2,
          description = $3,
          agent_type = $4,
          system_prompt = $5,
          configuration = $6::jsonb,
          status = $7,
          metadata = CASE
                       WHEN $8::jsonb IS NULL THEN metadata
                       ELSE $8::jsonb
                     END,
          brain_context_enabled = COALESCE($9, brain_context_enabled),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [
      id,
      agentData.name,
      agentData.description || "",
      agentData.type || "general",
      systemPrompt,
      configuration,
      agentData.status || "active",
      agentData.metadata ?? null,
      agentData.brain_context_enabled ?? null,
    ],
    ctx
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapAgentRow(result.rows[0]);
};

export const deleteAgent = async (id, context) => {
  const ctx = normalizeContext(context);
  await query("DELETE FROM agents WHERE id = $1", [id], ctx);
};

export const runAgent = async (agentId, context) => {
  const ctx = normalizeContext(context);
  const agentResult = await query(
    `
      SELECT *
      FROM agents
      WHERE id = $1
      LIMIT 1
    `,
    [agentId],
    ctx
  );

  if (agentResult.rows.length === 0) {
    throw new Error("Agente não encontrado");
  }

  const agent = mapAgentRow(agentResult.rows[0]);

  await query(
    `
      UPDATE agents
      SET status = 'running',
          updated_at = NOW()
      WHERE id = $1
    `,
    [agentId],
    ctx
  );

  const runResult = await query(
    `
      INSERT INTO agent_runs (agent_id, status, started_at, input)
      VALUES ($1, 'running', NOW(), $2::jsonb)
      RETURNING *
    `,
    [
      agentId,
      {
        trigger: "manual",
        executedBy: ctx.userId,
      },
    ],
    ctx
  );

  const run = runResult.rows[0];

  try {
    const log = await executeAgent(agent);

    await query(
      `
        UPDATE agent_runs
        SET status = 'completed',
            output = $2::jsonb,
            completed_at = NOW(),
            duration_ms = FLOOR(
              EXTRACT(
                EPOCH FROM (NOW() - COALESCE(started_at, created_at))
              ) * 1000
            )
        WHERE id = $1
      `,
      [run.id, { log }],
      ctx
    );

    await query(
      `
        UPDATE agents
        SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('last_run_at', NOW()),
            status = 'active',
            updated_at = NOW()
        WHERE id = $1
      `,
      [agentId],
      ctx
    );

    return { id: run.id, log };
  } catch (error) {
    await query(
      `
        UPDATE agent_runs
        SET status = 'failed',
            error = $2,
            completed_at = NOW()
        WHERE id = $1
      `,
      [run.id, error.message || "Erro desconhecido"],
      ctx
    );

    await query(
      `
        UPDATE agents
        SET status = 'failed',
            updated_at = NOW()
        WHERE id = $1
      `,
      [agentId],
      ctx
    ).catch(() => {});

    throw error;
  }
};

export const listRuns = async (limit = 50, context) => {
  const ctx = normalizeContext(context);
  const result = await query(
    `
      SELECT ar.*, a.name AS agent_name
      FROM agent_runs ar
      JOIN agents a ON a.id = ar.agent_id
      WHERE a.status IS DISTINCT FROM 'archived'
      ORDER BY ar.created_at DESC
      LIMIT $1
    `,
    [limit],
    ctx
  );

  return result.rows.map(mapRunRow);
};

export const listRunsByAgent = async (agentId, limit = 50, context) => {
  const ctx = normalizeContext(context);
  const result = await query(
    `
      SELECT ar.*, a.name AS agent_name
      FROM agent_runs ar
      JOIN agents a ON a.id = ar.agent_id
      WHERE ar.agent_id = $1
      ORDER BY ar.created_at DESC
      LIMIT $2
    `,
    [agentId, limit],
    ctx
  );

  return result.rows.map(mapRunRow);
};
