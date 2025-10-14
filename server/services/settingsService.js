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
    collections: []
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
