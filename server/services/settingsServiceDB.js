import { query } from '../database/pg-pool.js';

// Default settings for new users
const defaultAIProviderConfig = {
  apiKeys: {
    openai: '',
    anthropic: '',
    google: '',
    perplexity: '',
    openrouter: '',
    deepseek: '',
  },
  modelSelection: {
    chat: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 2048,
    },
    insights: {
      provider: 'anthropic',
      model: 'claude-3-haiku',
      temperature: 0.4,
      maxTokens: 1536,
    },
    global: {
      provider: 'google',
      model: 'gemini-1.5-flash',
      temperature: 0.5,
      maxTokens: 2048,
    },
  },
  customProviders: {},
  fallbackProvider: 'openai',
};

const cloneDefaultAIProviderConfig = () =>
  JSON.parse(JSON.stringify(defaultAIProviderConfig));

const defaultSettings = {
  braincloudConfig: {
    connectionMode: 'auto',
    mcpEnabled: true,
    restEnabled: true,
    mcpServerUrl: 'http://localhost:3100',
    restApiUrl: 'https://obsidian-brain.cloud/api/v1',
    restApiKey: '',
    // Backend format for compatibility
    baseUrl: 'https://obsidian-brain.cloud/api/v1',
    apiToken: '',
    enableMcp: true,
    enableRest: true,
    mcpWs: 'http://localhost:3100',
  },
  interfacePreferences: {
    enableSounds: true,
    enableAnimations: true,
    compactMode: false,
    showBetaFeatures: false,
  },
  aiApiKeys: { ...defaultAIProviderConfig.apiKeys },
  aiProviderConfig: cloneDefaultAIProviderConfig(),
  systemSettings: {
    allowEditAllDirectories: false,
    adminApiToken: '',
    pathOverrideTTL: 600,
    autoSaveInterval: 30,
    enableDebugMode: false,
  },
  dashboard: {
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
  },
};

const SYSTEM_ACTOR = { id: 'system', tenantId: 'system' };

const buildBraincloudConfig = (raw = defaultSettings.braincloudConfig) => {
  const braincloudConfig = raw || defaultSettings.braincloudConfig;
  return {
    // Frontend format
    connectionMode: braincloudConfig.connectionMode || 'auto',
    mcpEnabled: braincloudConfig.mcpEnabled ?? true,
    restEnabled: braincloudConfig.restEnabled ?? true,
    mcpServerUrl:
      braincloudConfig.mcpServerUrl ||
      braincloudConfig.mcpWs ||
      'http://localhost:3100',
    restApiUrl:
      braincloudConfig.restApiUrl ||
      braincloudConfig.baseUrl ||
      'https://obsidian-brain.cloud/api/v1',
    restApiKey: braincloudConfig.restApiKey || braincloudConfig.apiToken || '',
    // Backend format (keep both for compatibility)
    baseUrl:
      braincloudConfig.baseUrl ||
      braincloudConfig.restApiUrl ||
      'https://obsidian-brain.cloud/api/v1',
    apiToken: braincloudConfig.apiToken || braincloudConfig.restApiKey || '',
    enableMcp: braincloudConfig.enableMcp ?? braincloudConfig.mcpEnabled ?? true,
    enableRest:
      braincloudConfig.enableRest ?? braincloudConfig.restEnabled ?? true,
    mcpWs:
      braincloudConfig.mcpWs ||
      braincloudConfig.mcpServerUrl ||
      'http://localhost:3100',
  };
};

const buildAiProviderConfig = (aiProviderRaw = {}) => ({
  apiKeys: {
    ...defaultSettings.aiProviderConfig.apiKeys,
    ...(aiProviderRaw.apiKeys || {}),
  },
  modelSelection: {
    chat: {
      ...defaultSettings.aiProviderConfig.modelSelection.chat,
      ...(aiProviderRaw.modelSelection?.chat || {}),
    },
    insights: {
      ...defaultSettings.aiProviderConfig.modelSelection.insights,
      ...(aiProviderRaw.modelSelection?.insights || {}),
    },
    global: {
      ...defaultSettings.aiProviderConfig.modelSelection.global,
      ...(aiProviderRaw.modelSelection?.global || {}),
    },
  },
  customProviders: aiProviderRaw.customProviders || {},
  fallbackProvider:
    aiProviderRaw.fallbackProvider ||
    defaultSettings.aiProviderConfig.fallbackProvider,
});

const mapSettingsRow = (row = {}) => {
  const braincloud = buildBraincloudConfig(
    row.braincloud_config || defaultSettings.braincloudConfig
  );
  const aiProvider = buildAiProviderConfig(row.ai_provider_config || {});
  const uiPreferences = row.ui_preferences || {};

  return {
    braincloud,
    interface: {
      theme: row.theme || 'auto',
      language: row.language || 'pt-BR',
      ...(row.interface_preferences || defaultSettings.interfacePreferences),
    },
    aiKeys: row.ai_api_keys || defaultSettings.aiApiKeys,
    aiProvider,
    system: row.system_settings || defaultSettings.systemSettings,
    uiPreferences,
    dashboard: {
      taskPreferences:
        uiPreferences.taskPreferences ||
        defaultSettings.dashboard.taskPreferences,
    },
  };
};

const getSettingsRow = async (user) => {
  const result = await query(
    `SELECT 
        theme,
        language,
        braincloud_config,
        ai_api_keys,
        system_settings,
        interface_preferences,
        ai_provider_config,
        ui_preferences
      FROM user_settings
      WHERE user_id = $1 AND tenant_id = $2`,
    [user.id, user.tenantId]
  );

  return result.rows[0] || null;
};

/**
 * Load settings for a specific user from PostgreSQL
 * @param {Object} user - User object with id and tenantId
 * @returns {Promise<Object>} User settings
 */
export async function loadUserSettings(user) {
  if (!user?.id || !user?.tenantId) {
    throw new Error('[settingsServiceDB] User context is required');
  }

  const row = await getSettingsRow(user);
  if (!row) {
    console.log(`[settingsServiceDB] Creating default settings for user ${user.id}`);
    return createDefaultSettings(user);
  }

  return mapSettingsRow(row);
}

/**
 * Save settings for a specific user to PostgreSQL
 * @param {Object} user - User object with id and tenantId
 * @param {Object} settings - Settings to save
 * @returns {Promise<Object>} Saved settings
 */
export async function saveUserSettings(user, settings) {
  if (!user?.id || !user?.tenantId) {
    throw new Error('[settingsServiceDB] User context is required');
  }

  console.log('[settingsServiceDB] Saving settings for user:', {
    userId: user.id,
    tenantId: user.tenantId,
    braincloud: settings.braincloud ? '[provided]' : '[missing]',
    aiKeys: settings.aiKeys ? Object.keys(settings.aiKeys) : null,
    hasAiProvider: !!settings.aiProvider,
    system: settings.system ? Object.keys(settings.system) : null,
  });

  const uiPreferences = {
    ...(settings.uiPreferences || {}),
  };

  if (!uiPreferences.taskPreferences && settings.dashboard?.taskPreferences) {
    uiPreferences.taskPreferences = settings.dashboard.taskPreferences;
  }

  const result = await query(
    `INSERT INTO user_settings (
        user_id,
        tenant_id,
        theme,
        language,
        braincloud_config,
        ai_api_keys,
        ai_provider_config,
        system_settings,
        interface_preferences,
        ui_preferences,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      ON CONFLICT (tenant_id, user_id) 
      DO UPDATE SET
        theme = COALESCE($3, user_settings.theme),
        language = COALESCE($4, user_settings.language),
        braincloud_config = COALESCE($5, user_settings.braincloud_config),
        ai_api_keys = COALESCE($6, user_settings.ai_api_keys),
        ai_provider_config = COALESCE($7, user_settings.ai_provider_config),
        system_settings = COALESCE($8, user_settings.system_settings),
        interface_preferences = COALESCE($9, user_settings.interface_preferences),
        ui_preferences = COALESCE($10, user_settings.ui_preferences),
        updated_at = NOW()
      RETURNING 
        theme,
        language,
        braincloud_config,
        ai_api_keys,
        ai_provider_config,
        system_settings,
        interface_preferences,
        ui_preferences`,
    [
      user.id,
      user.tenantId,
      settings.interface?.theme || null,
      settings.interface?.language || null,
      settings.braincloud || null,
      settings.aiKeys || null,
      settings.aiProvider || null,
      settings.system || null,
      settings.interface
        ? {
            enableSounds: settings.interface.enableSounds,
            enableAnimations: settings.interface.enableAnimations,
            compactMode: settings.interface.compactMode,
            showBetaFeatures: settings.interface.showBetaFeatures,
          }
        : null,
      uiPreferences,
    ]
  );

  console.log(`[settingsServiceDB] Settings saved for user ${user.id}`);
  return mapSettingsRow(result.rows[0]);
}

/**
 * Create default settings for a new user
 */
async function createDefaultSettings(user) {
  const defaults = {
    braincloud: buildBraincloudConfig(defaultSettings.braincloudConfig),
    interface: {
      theme: 'auto',
      language: 'pt-BR',
      ...defaultSettings.interfacePreferences,
    },
    aiKeys: defaultSettings.aiApiKeys,
    aiProvider: cloneDefaultAIProviderConfig(),
    system: defaultSettings.systemSettings,
    uiPreferences: {
      taskPreferences: defaultSettings.dashboard.taskPreferences,
    },
  };

  await saveUserSettings(user, defaults);
  return defaults;
}

/**
 * Load a system-level settings record (used where user context is absent)
 */
export async function loadSystemSettings() {
  const row = await getSettingsRow(SYSTEM_ACTOR);
  if (!row) {
    return createDefaultSettings(SYSTEM_ACTOR);
  }
  return mapSettingsRow(row);
}

/**
 * Persist system-level settings record
 */
export async function saveSystemSettings(settings) {
  return saveUserSettings(SYSTEM_ACTOR, settings);
}
