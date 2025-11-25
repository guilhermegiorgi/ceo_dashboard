import { randomUUID } from 'crypto';
import { query, transaction } from '../database/pg-pool.js';
import {
  loadSystemSettings,
  loadUserSettings,
  saveSystemSettings,
  saveUserSettings,
} from './settingsServiceDB.js';

const defaultSettings = {
  braincloud: {
    baseUrl: '',
    apiToken: '',
    tenantId: '',
    tenantPlan: '',
    mcpWs: '',
    mcpHttp: '',
    enableRest: true,
    enableMcp: true
  },
  interface: {
    theme: 'auto',
    language: 'pt-BR',
    enableSounds: true,
    enableAnimations: true,
    compactMode: false,
    showBetaFeatures: false,
  },
  aiKeys: {
    openai: '',
    anthropic: '',
    google: '',
    perplexity: '',
  },
  system: {
    allowEditAllDirectories: false,
    adminApiToken: '',
    pathOverrideTTL: 600,
    autoSaveInterval: 30,
    enableDebugMode: false,
  },
  dashboard: {
    collections: [],
    taskPreferences: {
      viewMode: 'list',
      sortBy: 'natural',
      pinnedTaskIds: [],
      priorityMap: {},
      boardOrder: {},
      lastContextId: null,
      contextTemplate: {
        workDescription: '',
        shortTermFocus: '',
        longTermGoals: '',
        otherContext: '',
      },
    },
  }
};

let ensureCollectionsTablePromise = null;

async function ensureDashboardCollectionsTable() {
  if (!ensureCollectionsTablePromise) {
    ensureCollectionsTablePromise = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS dashboard_collections (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          label TEXT NOT NULL,
          description TEXT,
          filter TEXT,
          icon TEXT,
          type TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_dashboard_collections_tenant_user
          ON dashboard_collections (tenant_id, user_id);
      `);
    })().catch((error) => {
      ensureCollectionsTablePromise = null;
      throw error;
    });
  }

  return ensureCollectionsTablePromise;
}

function normalizeContext(context) {
  const tenantId = context?.tenantId;
  const userId = context?.userId || context?.id;

  if (!tenantId || !userId) {
    const error = new Error('TenantId e userId são obrigatórios para acessar coleções do dashboard.');
    error.status = 400;
    throw error;
  }

  return { tenantId, userId };
}

function mapDashboardCollection(row) {
  return {
    id: row.id,
    label: row.label,
    description: row.description ?? '',
    filter: row.filter ?? '',
    icon: row.icon ?? 'sparkles',
    type: row.type ?? 'custom',
    created_at: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

export async function loadSettings() {
  return loadSystemSettings();
}

export async function saveSettings(settings) {
  return saveSystemSettings(settings);
}

export async function getDashboardCollections(context) {
  const ctx = normalizeContext(context);
  await ensureDashboardCollectionsTable();

  const result = await query(
    `
      SELECT id, label, description, filter, icon, type, created_at, updated_at
      FROM dashboard_collections
      WHERE tenant_id = $1 AND user_id = $2
      ORDER BY created_at DESC
    `,
    [ctx.tenantId, ctx.userId],
    ctx
  );

  return result.rows.map(mapDashboardCollection);
}

export async function updateDashboardCollections(collections = [], context) {
  if (!Array.isArray(collections)) {
    throw new Error('Collections payload must be an array');
  }

  const ctx = normalizeContext(context);
  await ensureDashboardCollectionsTable();

  const normalized = collections
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: String(item.id || item.label || randomUUID()),
      label: String(item.label || 'Collection'),
      description: item.description ? String(item.description) : '',
      filter: item.filter ? String(item.filter) : '',
      icon: item.icon ? String(item.icon) : 'sparkles',
      type: item.type ? String(item.type) : 'custom',
    }));

  await transaction(async (client) => {
    await client.query(
      `DELETE FROM dashboard_collections WHERE tenant_id = $1 AND user_id = $2`,
      [ctx.tenantId, ctx.userId]
    );

    for (const collection of normalized) {
      await client.query(
        `
          INSERT INTO dashboard_collections (
            id, tenant_id, user_id, label, description, filter, icon, type, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        `,
        [
          collection.id,
          ctx.tenantId,
          ctx.userId,
          collection.label,
          collection.description,
          collection.filter,
          collection.icon,
          collection.type,
        ]
      );
    }
  }, ctx);

  return getDashboardCollections(ctx);
}

export async function getTaskPreferences(user) {
  const settings = user
    ? await loadUserSettings(user)
    : await loadSystemSettings();
  return (
    settings.dashboard?.taskPreferences || {
      ...defaultSettings.dashboard.taskPreferences,
    }
  );
}

export async function updateTaskPreferences(patch = {}, user) {
  const settings = user
    ? await loadUserSettings(user)
    : await loadSystemSettings();
  const existing =
    settings.dashboard?.taskPreferences || {
      ...defaultSettings.dashboard.taskPreferences,
    };

  const mergedPriorityMap = { ...existing.priorityMap };
  if (patch.priorityMap && typeof patch.priorityMap === 'object') {
    Object.entries(patch.priorityMap).forEach(([taskId, value]) => {
      if (value === null || value === undefined) {
        delete mergedPriorityMap[taskId];
      } else {
        mergedPriorityMap[taskId] = value;
      }
    });
  }

  const mergedBoardOrder = { ...existing.boardOrder };
  if (patch.boardOrder && typeof patch.boardOrder === 'object') {
    Object.entries(patch.boardOrder).forEach(([column, order]) => {
      if (!Array.isArray(order)) return;
      mergedBoardOrder[column] = order.map(String);
    });
  }

  const mergedContextTemplate = {
    ...existing.contextTemplate,
    ...(patch.contextTemplate && typeof patch.contextTemplate === 'object'
      ? patch.contextTemplate
      : {}),
  };

  const merged = {
    ...existing,
    ...patch,
    pinnedTaskIds: Array.isArray(patch.pinnedTaskIds)
      ? Array.from(new Set(patch.pinnedTaskIds))
      : existing.pinnedTaskIds,
    priorityMap: mergedPriorityMap,
    boardOrder: mergedBoardOrder,
    contextTemplate: mergedContextTemplate,
  };

  const saved = user
    ? await saveUserSettings(user, {
        ...settings,
        uiPreferences: {
          ...(settings.uiPreferences || {}),
          taskPreferences: merged,
        },
        dashboard: { taskPreferences: merged },
      })
    : await saveSystemSettings({
        ...settings,
        uiPreferences: {
          ...(settings.uiPreferences || {}),
          taskPreferences: merged,
        },
        dashboard: { taskPreferences: merged },
      });

  return saved.dashboard?.taskPreferences || merged;
}
