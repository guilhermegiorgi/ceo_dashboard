import { query } from '../database/pg-pool.js';
import { promises as fs } from 'fs';
import path from 'path';

const SETTINGS_FILE = path.resolve(process.cwd(), 'data', 'settings.json');

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
};

/**
 * Load settings for a specific user from PostgreSQL
 * @param {Object} user - User object with id and tenantId
 * @returns {Promise<Object>} User settings
 */
export async function loadUserSettings(user) {
  if (!user || !user.id || !user.tenantId) {
    console.warn('[settingsServiceDB] No user context, falling back to file');
    return loadSettingsFromFile();
  }

  try {
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

    if (result.rows.length === 0) {
      // User doesn't have settings yet, create defaults
      console.log(`[settingsServiceDB] Creating default settings for user ${user.id}`);
      return createDefaultSettings(user);
    }

    const row = result.rows[0];
    const aiProviderRaw = row.ai_provider_config || {};
    const aiProvider = {
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
    };
    
    // Get braincloud config and map both formats
    const braincloudConfig = row.braincloud_config || defaultSettings.braincloudConfig;
    const braincloud = {
      // Frontend format
      connectionMode: braincloudConfig.connectionMode || 'auto',
      mcpEnabled: braincloudConfig.mcpEnabled ?? true,
      restEnabled: braincloudConfig.restEnabled ?? true,
      mcpServerUrl: braincloudConfig.mcpServerUrl || braincloudConfig.mcpWs || 'http://localhost:3100',
      restApiUrl: braincloudConfig.restApiUrl || braincloudConfig.baseUrl || 'https://obsidian-brain.cloud/api/v1',
      restApiKey: braincloudConfig.restApiKey || braincloudConfig.apiToken || '',
      // Backend format (keep both for compatibility)
      baseUrl: braincloudConfig.baseUrl || braincloudConfig.restApiUrl || 'https://obsidian-brain.cloud/api/v1',
      apiToken: braincloudConfig.apiToken || braincloudConfig.restApiKey || '',
      enableMcp: braincloudConfig.enableMcp ?? braincloudConfig.mcpEnabled ?? true,
      enableRest: braincloudConfig.enableRest ?? braincloudConfig.restEnabled ?? true,
      mcpWs: braincloudConfig.mcpWs || braincloudConfig.mcpServerUrl || 'http://localhost:3100',
    };

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
      uiPreferences: row.ui_preferences || {},
    };
  } catch (error) {
    console.error('[settingsServiceDB] Error loading from DB, falling back to file:', error.message);
    return loadSettingsFromFile();
  }
}

/**
 * Save settings for a specific user to PostgreSQL
 * @param {Object} user - User object with id and tenantId
 * @param {Object} settings - Settings to save
 * @returns {Promise<Object>} Saved settings
 */
export async function saveUserSettings(user, settings) {
  if (!user || !user.id || !user.tenantId) {
    console.warn('[settingsServiceDB] No user context, falling back to file');
    return saveSettingsToFile(settings);
  }

  console.log('[settingsServiceDB] Saving settings for user:', {
    userId: user.id,
    tenantId: user.tenantId,
    braincloud: settings.braincloud,
    aiKeys: settings.aiKeys ? Object.keys(settings.aiKeys) : null,
    aiProvider: settings.aiProvider ? Object.keys(settings.aiProvider) : null,
    system: settings.system ? Object.keys(settings.system) : null,
  });

  try {
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
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (tenant_id, user_id) 
      DO UPDATE SET
        theme = COALESCE($3, user_settings.theme),
        language = COALESCE($4, user_settings.language),
        braincloud_config = COALESCE($5, user_settings.braincloud_config),
        ai_api_keys = COALESCE($6, user_settings.ai_api_keys),
        ai_provider_config = COALESCE($7, user_settings.ai_provider_config),
        system_settings = COALESCE($8, user_settings.system_settings),
        interface_preferences = COALESCE($9, user_settings.interface_preferences),
        updated_at = NOW()
      RETURNING 
        theme,
        language,
        braincloud_config,
        ai_api_keys,
        ai_provider_config,
        system_settings,
        interface_preferences`,
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
      ]
    );

    const row = result.rows[0];

    console.log(`[settingsServiceDB] Settings saved for user ${user.id}`);

    return {
      braincloud: row.braincloud_config,
      interface: {
        theme: row.theme,
        language: row.language,
        ...row.interface_preferences,
      },
      aiKeys: row.ai_api_keys,
      aiProvider,
      system: row.system_settings,
    };
  } catch (error) {
    console.error('[settingsServiceDB] Error saving to DB, falling back to file:', error.message);
    return saveSettingsToFile(settings);
  }
}

/**
 * Create default settings for a new user
 */
async function createDefaultSettings(user) {
  // Create braincloud with both formats
  const braincloudConfig = defaultSettings.braincloudConfig;
  const braincloud = {
    // Frontend format
    connectionMode: braincloudConfig.connectionMode || 'auto',
    mcpEnabled: braincloudConfig.mcpEnabled ?? true,
    restEnabled: braincloudConfig.restEnabled ?? true,
    mcpServerUrl: braincloudConfig.mcpServerUrl || braincloudConfig.mcpWs || 'http://localhost:3100',
    restApiUrl: braincloudConfig.restApiUrl || braincloudConfig.baseUrl || 'https://obsidian-brain.cloud/api/v1',
    restApiKey: braincloudConfig.restApiKey || braincloudConfig.apiToken || '',
    // Backend format (keep both for compatibility)
    baseUrl: braincloudConfig.baseUrl || braincloudConfig.restApiUrl || 'https://obsidian-brain.cloud/api/v1',
    apiToken: braincloudConfig.apiToken || braincloudConfig.restApiKey || '',
    enableMcp: braincloudConfig.enableMcp ?? braincloudConfig.mcpEnabled ?? true,
    enableRest: braincloudConfig.enableRest ?? braincloudConfig.restEnabled ?? true,
    mcpWs: braincloudConfig.mcpWs || braincloudConfig.mcpServerUrl || 'http://localhost:3100',
  };

  const defaults = {
    braincloud,
    interface: {
      theme: 'auto',
      language: 'pt-BR',
      ...defaultSettings.interfacePreferences,
    },
    aiKeys: defaultSettings.aiApiKeys,
    aiProvider: cloneDefaultAIProviderConfig(),
    system: defaultSettings.systemSettings,
  };

  return saveUserSettings(user, defaults);
}

/**
 * Fallback: Load from JSON file (for dev/backwards compatibility)
 */
async function loadSettingsFromFile() {
  try {
    await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
    const raw = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(raw || '{}');
    
    // Handle braincloud with both formats
    const fileBraincloud = {
      ...defaultSettings.braincloudConfig,
      ...(parsed.braincloud || {}),
    };
    const braincloud = {
      // Frontend format
      connectionMode: fileBraincloud.connectionMode || 'auto',
      mcpEnabled: fileBraincloud.mcpEnabled ?? true,
      restEnabled: fileBraincloud.restEnabled ?? true,
      mcpServerUrl: fileBraincloud.mcpServerUrl || fileBraincloud.mcpWs || 'http://localhost:3100',
      restApiUrl: fileBraincloud.restApiUrl || fileBraincloud.baseUrl || 'https://obsidian-brain.cloud/api/v1',
      restApiKey: fileBraincloud.restApiKey || fileBraincloud.apiToken || '',
      // Backend format (keep both for compatibility)
      baseUrl: fileBraincloud.baseUrl || fileBraincloud.restApiUrl || 'https://obsidian-brain.cloud/api/v1',
      apiToken: fileBraincloud.apiToken || fileBraincloud.restApiKey || '',
      enableMcp: fileBraincloud.enableMcp ?? fileBraincloud.mcpEnabled ?? true,
      enableRest: fileBraincloud.enableRest ?? fileBraincloud.restEnabled ?? true,
      mcpWs: fileBraincloud.mcpWs || fileBraincloud.mcpServerUrl || 'http://localhost:3100',
    };

    const fileAiProviderRaw = parsed.aiProvider || {};
    const aiProvider = {
      apiKeys: {
        ...defaultSettings.aiProviderConfig.apiKeys,
        ...(fileAiProviderRaw.apiKeys || {}),
      },
      modelSelection: {
        chat: {
          ...defaultSettings.aiProviderConfig.modelSelection.chat,
          ...(fileAiProviderRaw.modelSelection?.chat || {}),
        },
        insights: {
          ...defaultSettings.aiProviderConfig.modelSelection.insights,
          ...(fileAiProviderRaw.modelSelection?.insights || {}),
        },
        global: {
          ...defaultSettings.aiProviderConfig.modelSelection.global,
          ...(fileAiProviderRaw.modelSelection?.global || {}),
        },
      },
      customProviders: fileAiProviderRaw.customProviders || {},
      fallbackProvider:
        fileAiProviderRaw.fallbackProvider ||
        defaultSettings.aiProviderConfig.fallbackProvider,
    };

    return {
      braincloud,
      interface: {
        theme: parsed.interface?.theme || 'auto',
        language: parsed.interface?.language || 'pt-BR',
        ...defaultSettings.interfacePreferences,
        ...(parsed.interface || {}),
      },
      aiKeys: {
        ...defaultSettings.aiApiKeys,
        ...(parsed.aiKeys || {}),
      },
      aiProvider,
      system: {
        ...defaultSettings.systemSettings,
        ...(parsed.system || {}),
      },
    };
  } catch (error) {
    console.warn('[settingsServiceDB] File not found, using defaults');
    // Create braincloud with both formats
    const braincloudConfig = defaultSettings.braincloudConfig;
    const braincloud = {
      // Frontend format
      connectionMode: braincloudConfig.connectionMode || 'auto',
      mcpEnabled: braincloudConfig.mcpEnabled ?? true,
      restEnabled: braincloudConfig.restEnabled ?? true,
      mcpServerUrl: braincloudConfig.mcpServerUrl || braincloudConfig.mcpWs || 'http://localhost:3100',
      restApiUrl: braincloudConfig.restApiUrl || braincloudConfig.baseUrl || 'https://obsidian-brain.cloud/api/v1',
      restApiKey: braincloudConfig.restApiKey || braincloudConfig.apiToken || '',
      // Backend format (keep both for compatibility)
      baseUrl: braincloudConfig.baseUrl || braincloudConfig.restApiUrl || 'https://obsidian-brain.cloud/api/v1',
      apiToken: braincloudConfig.apiToken || braincloudConfig.restApiKey || '',
      enableMcp: braincloudConfig.enableMcp ?? braincloudConfig.mcpEnabled ?? true,
      enableRest: braincloudConfig.enableRest ?? braincloudConfig.restEnabled ?? true,
      mcpWs: braincloudConfig.mcpWs || braincloudConfig.mcpServerUrl || 'http://localhost:3100',
    };

    return {
      braincloud,
      interface: {
        theme: 'auto',
        language: 'pt-BR',
        ...defaultSettings.interfacePreferences,
      },
      aiKeys: defaultSettings.aiApiKeys,
      aiProvider: cloneDefaultAIProviderConfig(),
      system: defaultSettings.systemSettings,
    };
  }
}

/**
 * Fallback: Save to JSON file
 */
async function saveSettingsToFile(settings) {
  const current = await loadSettingsFromFile();
  const incomingAiProvider = settings.aiProvider || {};
  const mergedAiProvider = {
    apiKeys: {
      ...current.aiProvider?.apiKeys,
      ...(incomingAiProvider.apiKeys || {}),
    },
    modelSelection: {
      chat: {
        ...current.aiProvider?.modelSelection?.chat,
        ...(incomingAiProvider.modelSelection?.chat || {}),
      },
      insights: {
        ...current.aiProvider?.modelSelection?.insights,
        ...(incomingAiProvider.modelSelection?.insights || {}),
      },
      global: {
        ...current.aiProvider?.modelSelection?.global,
        ...(incomingAiProvider.modelSelection?.global || {}),
      },
    },
    customProviders: {
      ...current.aiProvider?.customProviders,
      ...(incomingAiProvider.customProviders || {}),
    },
    fallbackProvider:
      incomingAiProvider.fallbackProvider ??
      current.aiProvider?.fallbackProvider ??
      defaultSettings.aiProviderConfig.fallbackProvider,
  };

  const merged = {
    braincloud: { ...current.braincloud, ...(settings.braincloud || {}) },
    interface: { ...current.interface, ...(settings.interface || {}) },
    aiKeys: { ...current.aiKeys, ...(settings.aiKeys || {}) },
    aiProvider: mergedAiProvider,
    system: { ...current.system, ...(settings.system || {}) },
  };
  
  await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(merged, null, 2));
  
  return merged;
}
