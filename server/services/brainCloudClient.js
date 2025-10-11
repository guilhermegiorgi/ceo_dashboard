import fetch from 'node-fetch';
import { loadSettings } from './settingsService.js';

/**
 * Lightweight client for Obsidian Brain Cloud (OBC) REST API.
 * Uses runtime settings (UI-managed) with environment fallbacks and exposes
 * helpers consumed across dashboard services.
 */

const DEFAULT_BASE_URL = process.env.BRAINCLOUD_BASE_URL || process.env.OBSIDIAN_API_URL || 'http://localhost:8000';
const DEFAULT_API_TOKEN = process.env.BRAINCLOUD_API_TOKEN || process.env.OBSIDIAN_API_KEY || process.env.API_TOKEN || '';
const DEFAULT_TENANT_ID = process.env.BRAINCLOUD_TENANT_ID || '';
const DEFAULT_TENANT_PLAN = process.env.BRAINCLOUD_TENANT_PLAN || '';

const CONFIG_CACHE_TTL = 60_000; // 60s
let cachedConfig = null;
let lastConfigLoad = 0;

function buildFallbackConfig() {
  return {
    baseUrl: DEFAULT_BASE_URL.replace(/\/+$/, ''),
    apiToken: DEFAULT_API_TOKEN,
    tenantId: DEFAULT_TENANT_ID,
    tenantPlan: DEFAULT_TENANT_PLAN,
    enableRest: true,
    enableMcp: true
  };
}

async function getRuntimeConfig(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedConfig && now - lastConfigLoad < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }

  try {
    const settings = await loadSettings();
    const braincloud = settings?.braincloud || {};
    cachedConfig = {
      baseUrl: (braincloud.baseUrl || DEFAULT_BASE_URL || '').replace(/\/+$/, ''),
      apiToken: braincloud.apiToken || DEFAULT_API_TOKEN,
      tenantId: braincloud.tenantId || DEFAULT_TENANT_ID,
      tenantPlan: braincloud.tenantPlan || DEFAULT_TENANT_PLAN,
      enableRest: braincloud.enableRest !== undefined ? braincloud.enableRest : true,
      enableMcp: braincloud.enableMcp !== undefined ? braincloud.enableMcp : true
    };
  } catch (error) {
    console.warn('BrainCloud settings unavailable, falling back to environment variables:', error.message);
    cachedConfig = buildFallbackConfig();
  }

  lastConfigLoad = now;
  return cachedConfig;
}

function buildHeaders(config, extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  if (config.apiToken) headers['Authorization'] = `Bearer ${config.apiToken}`;
  if (config.tenantId) headers['X-Tenant-Id'] = config.tenantId;
  if (config.tenantPlan) headers['X-Tenant-Plan'] = config.tenantPlan;
  return headers;
}

async function request(path, { method = 'GET', body, headers = {}, searchParams } = {}) {
  const config = await getRuntimeConfig();
  if (!config.enableRest) {
    throw new Error('BrainCloud REST integration is disabled via settings.');
  }

  const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  const url = new URL(path, `${baseUrl}/`);

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        value.filter((v) => v !== undefined && v !== null).forEach((item) => url.searchParams.append(key, item));
      } else {
        url.searchParams.set(key, value);
      }
    });
  }

  const finalHeaders = buildHeaders(config, headers);
  let payload;

  if (body !== undefined && body !== null) {
    if (typeof body === 'string' || body instanceof Buffer) {
      payload = body;
    } else if (finalHeaders['Content-Type']?.includes('application/json')) {
      payload = JSON.stringify(body);
    } else {
      payload = body;
    }
  }

  const response = await fetch(url.toString(), {
    method,
    headers: finalHeaders,
    body: payload
  });

  return handleJson(response);
}

async function handleJson(res) {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OBC HTTP ${res.status}: ${text || res.statusText}`);
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch (e) {
    return text;
  }
}

export async function getBrainCloudRuntimeConfig({ forceRefresh = false } = {}) {
  return getRuntimeConfig(forceRefresh);
}

export const brainCloudClient = {
  // Files
  async listFiles(directory = '') {
    return request('/api/v1/files/', {
      searchParams: directory !== undefined && directory !== null ? { directory } : undefined
    });
  },

  async getFile(path) {
    return request(`/api/v1/files/${encodeURIComponent(path)}`);
  },

  async batchGet(filepaths = [], ignore_missing = false) {
    return request('/api/v1/files/batch', {
      method: 'POST',
      body: { filepaths, ignore_missing }
    });
  },

  async writeFile(path, content, create_parents = true) {
    return request('/api/v1/files/', {
      method: 'POST',
      body: { path, content, create_parents }
    });
  },

  async appendContent(path, content, create_parents = true, separator = '\n') {
    return request('/api/v1/files/append', {
      method: 'POST',
      body: { path, content, create_parents, separator }
    });
  },

  async patchContent({ path, content, heading, position = 'after_heading', create_file = true, create_parents = true, separator = '\n' }) {
    return request('/api/v1/files/patch', {
      method: 'POST',
      body: { path, content, heading, position, create_file, create_parents, separator }
    });
  },

  async moveFile({ source_path, destination_path, create_parents = true, overwrite = false }) {
    return request('/api/v1/files/move', {
      method: 'POST',
      body: { source_path, destination_path, create_parents, overwrite }
    });
  },

  async deleteFile(path) {
    return request(`/api/v1/files/${encodeURIComponent(path)}`, { method: 'DELETE' });
  },

  // Search
  async search({ query, case_sensitive = false, file_extensions = [], directories = [] }) {
    return request('/api/v1/search/', {
      method: 'POST',
      body: { query, case_sensitive, file_extensions, directories }
    });
  },

  async complexSearch({ rules, file_extensions = null, directories = null, limit = 50 }) {
    return request('/api/v1/search/complex', {
      method: 'POST',
      body: { rules, file_extensions, directories, limit }
    });
  },

  // Periodic notes & recent
  async getPeriodic({ period_type, date = null }) {
    return request('/api/v1/periodic/', {
      method: 'POST',
      body: { period_type, date }
    });
  },

  async getRecentPeriodic({ period_type, limit = 5 }) {
    return request(`/api/v1/recent/periodic/${encodeURIComponent(period_type)}`, {
      searchParams: { limit }
    });
  },

  async getRecentChanges({ limit = 10, days = 90 } = {}) {
    return request('/api/v1/recent/changes', {
      searchParams: { limit, days }
    });
  },

  // Sync & status
  async syncNow() {
    return request('/api/v1/sync/', { method: 'POST' });
  },

  async syncStatus() {
    return request('/api/v1/sync/status');
  },

  async vaultStatus() {
    return request('/api/v1/vault/status');
  },

  // Focus & context
  async getCurrentFocus(params = {}) {
    return request('/api/v1/focus/current', {
      searchParams: params
    });
  },

  async getTimeBasedContext(params = {}) {
    return request('/api/v1/context/time', {
      searchParams: params
    });
  },

  // Tasks & due items
  async getDueTasks(params = {}) {
    return request('/api/v1/tasks/due', {
      searchParams: params
    });
  },

  async getTasksSummary(params = {}) {
    return request('/api/v1/tasks/summary', {
      searchParams: params
    });
  },

  async getOverdueTasks(params = {}) {
    return request('/api/v1/tasks/overdue', {
      searchParams: params
    });
  }
};

export default brainCloudClient;
