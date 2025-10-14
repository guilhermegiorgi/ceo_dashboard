import { promises as fs } from 'fs';
import path from 'path';

const SETTINGS_FILE = path.resolve(process.cwd(), 'data', 'settings.json');

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

async function ensureSettingsFile() {
  await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
  try {
    await fs.access(SETTINGS_FILE);
  } catch (error) {
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
  }
}

export async function loadSettings() {
  await ensureSettingsFile();
  const raw = await fs.readFile(SETTINGS_FILE, 'utf-8');
  const parsed = JSON.parse(raw || '{}');
  return {
    braincloud: {
      ...defaultSettings.braincloud,
      ...(parsed.braincloud || {})
    },
    dashboard: {
      ...defaultSettings.dashboard,
      ...(parsed.dashboard || {})
    }
  };
}

export async function saveSettings(settings) {
  const current = await loadSettings();
  const merged = {
    braincloud: {
      ...current.braincloud,
      ...(settings.braincloud || {})
    },
    dashboard: {
      ...current.dashboard,
      ...(settings.dashboard || {})
    }
  };
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(merged, null, 2));
  return merged;
}

export async function getDashboardCollections() {
  const settings = await loadSettings();
  return settings.dashboard?.collections || [];
}

export async function updateDashboardCollections(collections = []) {
  if (!Array.isArray(collections)) {
    throw new Error('Collections payload must be an array');
  }
  const normalized = collections
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: String(item.id || item.label || Date.now()),
      label: String(item.label || 'Collection'),
      description: item.description ? String(item.description) : '',
      filter: item.filter ? String(item.filter) : '',
      icon: item.icon ? String(item.icon) : 'sparkles'
    }));

  const saved = await saveSettings({ dashboard: { collections: normalized } });
  return saved.dashboard.collections;
}

export async function getTaskPreferences() {
  const settings = await loadSettings();
  return settings.dashboard?.taskPreferences || { ...defaultSettings.dashboard.taskPreferences };
}

export async function updateTaskPreferences(patch = {}) {
  const current = await loadSettings();
  const existing = current.dashboard?.taskPreferences || { ...defaultSettings.dashboard.taskPreferences };

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
  const saved = await saveSettings({
    dashboard: { taskPreferences: merged },
  });
  return saved.dashboard.taskPreferences;
}
