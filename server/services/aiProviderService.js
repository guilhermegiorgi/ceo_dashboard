/**
 * AI Provider Service
 * Manages AI providers, models, and their configurations
 */

import { query } from "../database/pg-pool.js";
import { logger } from "../src/utils/logger.js";
import crypto from "crypto";
import fetch from "node-fetch";

// Encryption key from environment
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "default-32-char-encryption-key!";
const ALGORITHM = "aes-256-cbc";

// Default models registered when a provider is configured
export const DEFAULT_MODELS = {
  openai: [
    {
      modelId: "gpt-4o",
      displayName: "GPT-4o",
      description: "Most capable GPT-4 model, great for complex tasks",
      supportsStreaming: true,
      supportsFunctionCalling: true,
      supportsVision: true,
      maxTokens: 4096,
      contextWindow: 128000,
      costPerInputToken: 2.5,
      costPerOutputToken: 10.0,
      isDefault: true,
    },
    {
      modelId: "gpt-4o-mini",
      displayName: "GPT-4o Mini",
      description: "Faster and more affordable GPT-4o",
      supportsStreaming: true,
      supportsFunctionCalling: true,
      supportsVision: true,
      maxTokens: 4096,
      contextWindow: 128000,
      costPerInputToken: 0.15,
      costPerOutputToken: 0.6,
      isDefault: false,
    },
    {
      modelId: "gpt-4-turbo",
      displayName: "GPT-4 Turbo",
      description: "Previous generation flagship model",
      supportsStreaming: true,
      supportsFunctionCalling: true,
      supportsVision: true,
      maxTokens: 4096,
      contextWindow: 128000,
      costPerInputToken: 10.0,
      costPerOutputToken: 30.0,
      isDefault: false,
    },
  ],
  anthropic: [
    {
      modelId: "claude-3-5-sonnet-20241022",
      displayName: "Claude 3.5 Sonnet",
      description: "Most intelligent Claude model, best for complex tasks",
      supportsStreaming: true,
      supportsFunctionCalling: true,
      supportsVision: true,
      maxTokens: 8192,
      contextWindow: 200000,
      costPerInputToken: 3.0,
      costPerOutputToken: 15.0,
      isDefault: true,
    },
    {
      modelId: "claude-3-5-haiku-20241022",
      displayName: "Claude 3.5 Haiku",
      description: "Fastest and most affordable Claude model",
      supportsStreaming: true,
      supportsFunctionCalling: true,
      supportsVision: false,
      maxTokens: 8192,
      contextWindow: 200000,
      costPerInputToken: 0.8,
      costPerOutputToken: 4.0,
      isDefault: false,
    },
    {
      modelId: "claude-3-opus-20240229",
      displayName: "Claude 3 Opus",
      description: "Previous generation flagship model",
      supportsStreaming: true,
      supportsFunctionCalling: true,
      supportsVision: true,
      maxTokens: 4096,
      contextWindow: 200000,
      costPerInputToken: 15.0,
      costPerOutputToken: 75.0,
      isDefault: false,
    },
  ],
  deepseek: [
    {
      modelId: "deepseek-chat",
      displayName: "DeepSeek Chat",
      description: "DeepSeek's main conversational model",
      supportsStreaming: true,
      supportsFunctionCalling: true,
      supportsVision: false,
      maxTokens: 4096,
      contextWindow: 32000,
      costPerInputToken: 0.14,
      costPerOutputToken: 0.28,
      isDefault: true,
    },
    {
      modelId: "deepseek-coder",
      displayName: "DeepSeek Coder",
      description: "Specialized model for code generation and analysis",
      supportsStreaming: true,
      supportsFunctionCalling: false,
      supportsVision: false,
      maxTokens: 4096,
      contextWindow: 16000,
      costPerInputToken: 0.14,
      costPerOutputToken: 0.28,
      isDefault: false,
    },
  ],
  openrouter: [
    {
      modelId: "anthropic/claude-3.5-sonnet",
      displayName: "Claude 3.5 Sonnet (via OpenRouter)",
      description: "Access Claude 3.5 Sonnet through OpenRouter",
      supportsStreaming: true,
      supportsFunctionCalling: true,
      supportsVision: true,
      maxTokens: 8192,
      contextWindow: 200000,
      costPerInputToken: 3.0,
      costPerOutputToken: 15.0,
      isDefault: true,
    },
    {
      modelId: "openai/gpt-4o",
      displayName: "GPT-4o (via OpenRouter)",
      description: "Access GPT-4o through OpenRouter",
      supportsStreaming: true,
      supportsFunctionCalling: true,
      supportsVision: true,
      maxTokens: 4096,
      contextWindow: 128000,
      costPerInputToken: 2.5,
      costPerOutputToken: 10.0,
      isDefault: false,
    },
    {
      modelId: "deepseek/deepseek-chat",
      displayName: "DeepSeek Chat (via OpenRouter)",
      description: "Access DeepSeek through OpenRouter",
      supportsStreaming: true,
      supportsFunctionCalling: true,
      supportsVision: false,
      maxTokens: 4096,
      contextWindow: 32000,
      costPerInputToken: 0.14,
      costPerOutputToken: 0.28,
      isDefault: false,
    },
  ],
  gemini: [
    {
      modelId: "gemini-2.0-flash",
      displayName: "Gemini 2.0 Flash",
      description: "Latest Gemini model with improved performance",
      supportsStreaming: true,
      supportsFunctionCalling: true,
      supportsVision: true,
      maxTokens: 8192,
      contextWindow: 1000000,
      costPerInputToken: 0.075,
      costPerOutputToken: 0.3,
      isDefault: true,
    },
    {
      modelId: "gemini-1.5-pro",
      displayName: "Gemini 1.5 Pro",
      description: "Advanced reasoning and complex task handling",
      supportsStreaming: true,
      supportsFunctionCalling: true,
      supportsVision: true,
      maxTokens: 8192,
      contextWindow: 1000000,
      costPerInputToken: 1.25,
      costPerOutputToken: 5.0,
      isDefault: false,
    },
    {
      modelId: "gemini-1.5-flash",
      displayName: "Gemini 1.5 Flash",
      description: "Fast and efficient model for everyday tasks",
      supportsStreaming: true,
      supportsFunctionCalling: true,
      supportsVision: true,
      maxTokens: 8192,
      contextWindow: 1000000,
      costPerInputToken: 0.075,
      costPerOutputToken: 0.3,
      isDefault: false,
    },
  ],
};

/**
 * Encrypt API key
 */
function encryptApiKey(apiKey) {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32));
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(apiKey, "utf8", "hex");
  encrypted += cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt API key
 */
function decryptApiKey(encryptedData) {
  const [ivHex, encrypted] = encryptedData.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32));
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

async function ensureDefaultModels(providerId, providerName) {
  const defaults = DEFAULT_MODELS[providerName];

  if (!defaults || defaults.length === 0) {
    return;
  }

  try {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS total
      FROM ai_models
      WHERE provider_id = $1`,
      [providerId]
    );

    if (rows?.[0]?.total > 0) {
      return;
    }
  } catch (error) {
    logger.warn(
      `Failed to check existing models for provider ${providerId}:`,
      error
    );
    // Continue attempting to seed defaults even if count fails
  }

  for (const model of defaults) {
    try {
      await upsertModel(providerId, model);
    } catch (error) {
      logger.error(
        `Error inserting default model ${model.modelId} for provider ${providerId}:`,
        error
      );
    }
  }
}

/**
 * Get all providers for a user
 */
export async function getProviders(userId) {
  try {
    const result = await query(
      `SELECT
        id,
        provider_name,
        display_name,
        base_url,
        is_active,
        is_default,
        created_at,
        updated_at,
        last_used_at
      FROM ai_providers
      WHERE user_id = $1
      ORDER BY is_default DESC, display_name ASC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    logger.error("Error fetching providers:", error);
    throw error;
  }
}

export async function getProviderById(providerId, userId) {
  const { rows } = await query(
    `SELECT * FROM ai_providers WHERE id = $1 AND user_id = $2`,
    [providerId, userId]
  );

  if (rows.length === 0) {
    throw new Error("Provider not found or unauthorized");
  }

  return rows[0];
}

export async function getProviderByName(userId, providerName) {
  if (!userId) {
    throw new Error("User ID is required to look up providers");
  }

  if (!providerName) {
    throw new Error("Provider name is required");
  }

  const normalized = providerName.toLowerCase();

  const { rows } = await query(
    `SELECT *
     FROM ai_providers
     WHERE user_id = $1
       AND provider_name = $2
       AND is_active = true
     LIMIT 1`,
    [userId, normalized]
  );

  return rows[0] || null;
}

/**
 * Create or update a provider
 */
export async function upsertProvider(userId, providerData) {
  const {
    providerName,
    displayName,
    apiKey,
    baseUrl = null,
    isActive = true,
    isDefault = false,
  } = providerData;

  try {
    // Check if this is an existing provider update (don't overwrite API key)
    let encryptedKey;
    if (apiKey === "API_KEY_PLACEHOLDER_TO_PRESERVE_EXISTING") {
      // Get existing provider to preserve API key
      const existing = await query(
        `SELECT api_key_encrypted FROM ai_providers 
         WHERE user_id = $1 AND provider_name = $2 AND is_active = true`,
        [userId, providerName]
      );

      logger.info(
        `[upsertProvider] Looking for existing provider ${providerName} for user ${userId}`
      );
      logger.info(
        `[upsertProvider] Found ${existing.rows.length} existing providers`
      );

      if (existing.rows.length > 0) {
        encryptedKey = existing.rows[0].api_key_encrypted;
        logger.info(
          `[upsertProvider] Preserving existing API key, encrypted length: ${
            encryptedKey?.length || 0
          }`
        );
      } else {
        logger.error(
          `[upsertProvider] Cannot find existing provider ${providerName} to preserve API key`
        );
        throw new Error(
          `Cannot find existing provider ${providerName} to preserve API key`
        );
      }
    } else {
      encryptedKey = encryptApiKey(apiKey);
      logger.info(
        `[upsertProvider] Creating new API key for provider ${providerName}`
      );
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await query(
        `UPDATE ai_providers
        SET is_default = false
        WHERE user_id = $1 AND provider_name != $2`,
        [userId, providerName]
      );
    }

    const result = await query(
      `INSERT INTO ai_providers (
        user_id,
        provider_name,
        display_name,
        api_key_encrypted,
        base_url,
        is_active,
        is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, provider_name)
      DO UPDATE SET
        display_name = EXCLUDED.display_name,
        api_key_encrypted = EXCLUDED.api_key_encrypted,
        base_url = EXCLUDED.base_url,
        is_active = EXCLUDED.is_active,
        is_default = EXCLUDED.is_default,
        updated_at = NOW()
      RETURNING id, provider_name, display_name, is_active, is_default`,
      [
        userId,
        providerName,
        displayName,
        encryptedKey,
        baseUrl,
        isActive,
        isDefault,
      ]
    );

    logger.info(`Provider upserted: ${providerName} for user ${userId}`);
    const provider = result.rows[0];

    if (provider?.id) {
      await ensureDefaultModels(provider.id, providerName);
    }

    return provider;
  } catch (error) {
    logger.error("Error upserting provider:", error);
    throw error;
  }
}

/**
 * Delete a provider
 */
export async function deleteProvider(userId, providerId) {
  try {
    // Start transaction to handle foreign key constraints
    await query("BEGIN");

    try {
      // First, delete associated conversation model configs
      await query(
        `
        DELETE FROM conversation_model_config 
        WHERE model_id IN (
          SELECT id FROM ai_models WHERE provider_id = $1
        )
      `,
        [providerId]
      );

      // Then delete associated models
      await query(`DELETE FROM ai_models WHERE provider_id = $1`, [providerId]);

      // Finally delete the provider
      const result = await query(
        `DELETE FROM ai_providers
        WHERE id = $1 AND user_id = $2
        RETURNING id`,
        [providerId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error("Provider not found or unauthorized");
      }

      await query("COMMIT");
      logger.info(`Provider deleted: ${providerId}`);
      return true;
    } catch (deleteError) {
      await query("ROLLBACK");
      throw deleteError;
    }
  } catch (error) {
    logger.error("Error deleting provider:", error);
    throw error;
  }
}

/**
 * Get API key for a provider (decrypted)
 */
export async function getProviderApiKey(userId, providerId) {
  try {
    const result = await query(
      `SELECT api_key_encrypted, base_url, provider_name, display_name
      FROM ai_providers
      WHERE id = $1 AND user_id = $2 AND is_active = true`,
      [providerId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error("Provider not found or inactive");
    }

    const { api_key_encrypted, base_url, provider_name, display_name } =
      result.rows[0];

    logger.info(
      `[getProviderApiKey] Provider: ${provider_name} (${providerId})`
    );
    logger.info(
      `[getProviderApiKey] Encrypted key length: ${
        api_key_encrypted?.length || 0
      }`
    );

    // Check if the encrypted data looks like "dummy" (unencrypted)
    if (api_key_encrypted === "dummy") {
      logger.error(
        `[getProviderApiKey] ERROR: API key stored as unencrypted "dummy" for provider ${provider_name}`
      );
      throw new Error(
        `API key for provider ${provider_name} was corrupted during default setting. Please reconfigure the provider.`
      );
    }

    let decryptedKey;
    try {
      decryptedKey = decryptApiKey(api_key_encrypted);
    } catch (decryptError) {
      logger.error(
        `[getProviderApiKey] Failed to decrypt API key for ${provider_name}:`,
        decryptError
      );
      throw new Error(
        `Failed to decrypt API key for provider ${provider_name}. Please reconfigure the provider.`
      );
    }

    logger.info(
      `[getProviderApiKey] Successfully decrypted API key for ${provider_name}, length: ${
        decryptedKey?.length || 0
      }`
    );

    return {
      apiKey: decryptedKey,
      baseUrl: base_url,
    };
  } catch (error) {
    logger.error("Error getting provider API key:", error);
    throw error;
  }
}

/**
 * Get all models for a provider
 */
export async function getModels(providerId) {
  try {
    const result = await query(
      `SELECT
        id,
        model_id,
        display_name,
        description,
        supports_streaming,
        supports_function_calling,
        supports_vision,
        max_tokens,
        context_window,
        cost_per_input_token,
        cost_per_output_token,
        is_active,
        is_default,
        total_requests,
        total_tokens,
        last_used_at
      FROM ai_models
      WHERE provider_id = $1 AND is_active = true
      ORDER BY is_default DESC, display_name ASC`,
      [providerId]
    );

    return result.rows;
  } catch (error) {
    logger.error("Error fetching models:", error);
    throw error;
  }
}

/**
 * Get all available models for a user (across all active providers)
 */
export async function getAvailableModels(userId) {
  try {
    const result = await query(
      `SELECT
        m.id,
        m.model_id,
        m.display_name,
        m.description,
        m.supports_streaming,
        m.context_window,
        m.is_default,
        p.id as provider_id,
        p.provider_name,
        p.display_name as provider_display_name
      FROM ai_models m
      JOIN ai_providers p ON m.provider_id = p.id
      WHERE p.user_id = $1
        AND p.is_active = true
        AND m.is_active = true
      ORDER BY p.is_default DESC, m.is_default DESC, p.display_name ASC, m.display_name ASC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    logger.error("Error fetching available models:", error);
    throw error;
  }
}

/**
 * Add or update a model
 */
export async function upsertModel(providerId, modelData) {
  const {
    modelId,
    displayName,
    description = null,
    supportsStreaming = true,
    supportsFunctionCalling = false,
    supportsVision = false,
    maxTokens = null,
    contextWindow = null,
    costPerInputToken = null,
    costPerOutputToken = null,
    isActive = true,
    isDefault = false,
  } = modelData;

  try {
    // If setting as default, unset other defaults for this provider
    if (isDefault) {
      await query(
        `UPDATE ai_models
        SET is_default = false
        WHERE provider_id = $1 AND model_id != $2`,
        [providerId, modelId]
      );
    }

    const result = await query(
      `INSERT INTO ai_models (
        provider_id,
        model_id,
        display_name,
        description,
        supports_streaming,
        supports_function_calling,
        supports_vision,
        max_tokens,
        context_window,
        cost_per_input_token,
        cost_per_output_token,
        is_active,
        is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (provider_id, model_id)
      DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        supports_streaming = EXCLUDED.supports_streaming,
        supports_function_calling = EXCLUDED.supports_function_calling,
        supports_vision = EXCLUDED.supports_vision,
        max_tokens = EXCLUDED.max_tokens,
        context_window = EXCLUDED.context_window,
        cost_per_input_token = EXCLUDED.cost_per_input_token,
        cost_per_output_token = EXCLUDED.cost_per_output_token,
        is_active = EXCLUDED.is_active,
        is_default = EXCLUDED.is_default,
        updated_at = NOW()
      RETURNING id, model_id, display_name`,
      [
        providerId,
        modelId,
        displayName,
        description,
        supportsStreaming,
        supportsFunctionCalling,
        supportsVision,
        maxTokens,
        contextWindow,
        costPerInputToken,
        costPerOutputToken,
        isActive,
        isDefault,
      ]
    );

    logger.info(`Model upserted: ${modelId} for provider ${providerId}`);
    return result.rows[0];
  } catch (error) {
    logger.error("Error upserting model:", error);
    throw error;
  }
}

/**
 * Set conversation model configuration
 */
export async function setConversationModel(
  conversationId,
  modelId,
  parameters = {}
) {
  const { temperature = 0.7, maxTokens = null, topP = 1.0 } = parameters;

  try {
    const result = await query(
      `INSERT INTO conversation_model_config (
        conversation_id,
        model_id,
        temperature,
        max_tokens,
        top_p
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (conversation_id)
      DO UPDATE SET
        model_id = EXCLUDED.model_id,
        temperature = EXCLUDED.temperature,
        max_tokens = EXCLUDED.max_tokens,
        top_p = EXCLUDED.top_p
      RETURNING *`,
      [conversationId, modelId, temperature, maxTokens, topP]
    );

    if (!result.rows[0]) {
      return null;
    }

    return getConversationModel(conversationId);
  } catch (error) {
    logger.error("Error setting conversation model:", error);
    throw error;
  }
}

/**
 * Get conversation model configuration
 */
export async function getConversationModel(conversationId) {
  try {
    const result = await query(
      `SELECT
        cmc.id,
        cmc.conversation_id,
        cmc.model_id,
        cmc.temperature,
        cmc.max_tokens,
        cmc.top_p,
        cmc.created_at,
        m.id as model_record_id,
        m.model_id as model_key,
        m.display_name as model_name,
        m.supports_streaming,
        p.id as provider_id,
        p.provider_name,
        p.display_name as provider_display_name
      FROM conversation_model_config cmc
      JOIN ai_models m ON cmc.model_id = m.id
      JOIN ai_providers p ON m.provider_id = p.id
      WHERE cmc.conversation_id = $1`,
      [conversationId]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error("Error getting conversation model:", error);
    throw error;
  }
}

/**
 * Update model usage statistics
 */
export async function updateModelUsage(modelId, tokensUsed) {
  try {
    await query(
      `UPDATE ai_models
      SET
        total_requests = total_requests + 1,
        total_tokens = total_tokens + $1,
        last_used_at = NOW()
      WHERE id = $2`,
      [tokensUsed, modelId]
    );
  } catch (error) {
    logger.error("Error updating model usage:", error);
  }
}

const OPENAI_BASE_URL = "https://api.openai.com/v1";
const ANTHROPIC_BASE_URL = "https://api.anthropic.com";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

function buildUrl(baseUrl, path) {
  const sanitizedBase = (baseUrl || "").replace(/\/$/, "");
  const sanitizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${sanitizedBase}${sanitizedPath}`;
}

async function fetchJson(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(
        `[fetchJson] ❌ HTTP ${response.status} from ${url}`,
        text ? `Response: ${text.substring(0, 200)}` : ""
      );
      throw new Error(`Request failed ${response.status}: ${text}`);
    }
    const data = await response.json();
    console.log(`[fetchJson] ✅ Success from ${url.substring(0, 60)}...`);
    return data;
  } catch (error) {
    console.error(`[fetchJson] ❌ Error fetching ${url}:`, {
      message: error.message,
      name: error.name,
    });
    throw error;
  }
}

async function fetchOpenAIModels({ apiKey, baseUrl }) {
  const url = buildUrl(baseUrl || OPENAI_BASE_URL, "/models");
  console.log(`[fetchOpenAIModels] Fetching from: ${url}`);

  const data = await fetchJson(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  console.log(`[fetchOpenAIModels] Raw response:`, {
    hasData: !!data?.data,
    dataLength: data?.data?.length,
    dataType: typeof data?.data,
    sampleModel: data?.data?.[0],
  });

  const models = Array.isArray(data?.data) ? data.data : [];
  console.log(`[fetchOpenAIModels] Total models from API: ${models.length}`);

  const filtered = models
    .filter((model) => typeof model?.id === "string")
    .map((model) => {
      const id = model.id;
      const description = model.root || model.owned_by || "Modelo OpenAI";
      const supportsFunctionCalling = /gpt-4|gpt-3.5|gpt-4o/i.test(id);
      const supportsVision = /gpt-4o|gpt-4\.1|vision/i.test(id);

      return {
        modelId: id,
        displayName: id,
        description,
        supportsStreaming: true,
        supportsFunctionCalling,
        supportsVision,
      };
    });

  console.log(
    `[fetchOpenAIModels] ✅ Returning ${filtered.length} models after filtering`
  );
  return filtered;
}

async function fetchAnthropicModels({ apiKey, baseUrl }) {
  const url = buildUrl(baseUrl || ANTHROPIC_BASE_URL, "/v1/models");
  console.log(
    `[fetchAnthropicModels] 🔄 Fetching from: ${url}`,
    `API Key length: ${apiKey?.length || 0}`
  );

  const data = await fetchJson(url, {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": process.env.ANTHROPIC_API_VERSION || "2023-06-01",
    },
  });

  console.log(`[fetchAnthropicModels] 📦 Raw response:`, {
    hasModels: !!data?.models,
    modelsLength: data?.models?.length,
    hasData: !!data?.data,
    dataLength: data?.data?.length,
    sampleModel: data?.models?.[0]?.id || data?.data?.[0]?.id,
  });

  const models = Array.isArray(data?.models) ? data.models : data?.data || [];
  console.log(
    `[fetchAnthropicModels] ✅ Total models from API: ${models.length}`
  );

  const filtered = models
    .filter((model) => typeof model?.id === "string")
    .map((model) => {
      const id = model.id;
      const displayName = model.display_name || id;
      const description = model.description || "Modelo Anthropic";
      const contextWindow = model.context_length || model.context_window;

      return {
        modelId: id,
        displayName,
        description,
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsVision: /opus|sonnet|vision/i.test(id),
        contextWindow,
        maxTokens: model.max_output_tokens || null,
      };
    });

  console.log(
    `[fetchAnthropicModels] ✅ Returning ${filtered.length} models after filtering`
  );
  return filtered;
}

async function fetchDeepSeekModels({ apiKey, baseUrl }) {
  const url = buildUrl(baseUrl || DEEPSEEK_BASE_URL, "/models");
  console.log(
    `[fetchDeepSeekModels] 🔄 Fetching from: ${url}`,
    `API Key length: ${apiKey?.length || 0}`
  );

  const data = await fetchJson(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  console.log(`[fetchDeepSeekModels] 📦 Raw response:`, {
    hasData: !!data?.data,
    dataLength: data?.data?.length,
    sampleModel: data?.data?.[0]?.id,
  });

  const models = Array.isArray(data?.data) ? data.data : [];
  console.log(
    `[fetchDeepSeekModels] ✅ Total models from API: ${models.length}`
  );

  // Filter out models without valid IDs and ensure all modelIds are unique
  const validModels = models.filter((model) => {
    const id = model.id || model.name;
    if (!id || typeof id !== "string" || id.trim() === "") {
      console.warn(
        `[fetchDeepSeekModels] ⚠️ Skipping model with invalid ID:`,
        model
      );
      return false;
    }
    return true;
  });

  console.log(
    `[fetchDeepSeekModels] 📊 Filtered ${
      validModels.length
    } valid models (removed ${
      models.length - validModels.length
    } with invalid IDs)`
  );

  return validModels.map((model, index) => {
    const id = (model.id || model.name || "").trim();
    // Fallback if somehow ID is still empty - use provider + index
    const finalId = id || `deepseek-model-${index}`;

    return {
      modelId: finalId,
      displayName: model.display_name || id || `DeepSeek Model ${index}`,
      description: model.description || "Modelo DeepSeek",
      supportsStreaming: true,
      supportsFunctionCalling: /coder/i.test(finalId) ? false : true,
      supportsVision: false,
      maxTokens: model.max_tokens || null,
      contextWindow: model.context_window || null,
    };
  });
}

async function fetchOpenRouterModels({ apiKey, baseUrl }) {
  const url = buildUrl(baseUrl || OPENROUTER_BASE_URL, "/models");
  console.log(
    `[fetchOpenRouterModels] 🔄 Fetching from: ${url}`,
    `API Key length: ${apiKey?.length || 0}`
  );

  const data = await fetchJson(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  console.log(`[fetchOpenRouterModels] 📦 Raw response:`, {
    hasData: !!data?.data,
    dataLength: data?.data?.length,
    sampleModel: data?.data?.[0]?.id,
  });

  const models = Array.isArray(data?.data) ? data.data : [];
  console.log(
    `[fetchOpenRouterModels] ✅ Total models from API: ${models.length}`
  );

  const filtered = models
    .filter((model) => {
      const id = model.id || model.slug;
      if (!id || typeof id !== "string" || id.trim() === "") {
        console.warn(
          `[fetchOpenRouterModels] ⚠️ Skipping model with invalid ID:`,
          model
        );
        return false;
      }
      return true;
    })
    .map((model) => {
      const pricing = model.pricing || {};
      const id = (model.id || model.slug || "").trim();

      return {
        modelId: id,
        displayName: model.name || id,
        description:
          model.description ||
          model.top_provider?.description ||
          "Modelo OpenRouter",
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsVision: Boolean(model.capabilities?.vision),
        costPerInputToken: pricing?.prompt || null,
        costPerOutputToken: pricing?.completion || null,
      };
    });

  console.log(
    `[fetchOpenRouterModels] ✅ Returning ${filtered.length} models after filtering`
  );
  return filtered;
}

async function fetchGeminiModels({ apiKey, baseUrl }) {
  // Gemini API uses API key as query parameter, not in headers
  const baseUrlValue = baseUrl || GEMINI_BASE_URL;
  const url = `${baseUrlValue}/models?key=${apiKey?.substring(0, 10)}...`;

  console.log(
    `[fetchGeminiModels] 🔄 Fetching from: ${baseUrlValue}/models`,
    `API Key length: ${apiKey?.length || 0}`
  );

  const data = await fetchJson(`${baseUrlValue}/models?key=${apiKey}`);

  console.log(`[fetchGeminiModels] 📦 Raw response:`, {
    hasModels: !!data?.models,
    modelsLength: data?.models?.length,
    sampleModel: data?.models?.[0]?.displayName,
  });

  const models = Array.isArray(data?.models) ? data.models : [];
  console.log(`[fetchGeminiModels] ✅ Total models from API: ${models.length}`);

  const filtered = models
    .filter((model) => {
      // Only include models that support generateContent
      const methods = model.supportedGenerationMethods || [];
      return methods.includes("generateContent") && model.displayName;
    })
    .map((model) => {
      // Extract meaningful model ID from the full name (e.g., "models/gemini-2.0-flash" -> "gemini-2.0-flash")
      const modelIdFull = model.name || "";
      const modelId = modelIdFull.replace("models/", "");

      // Check capabilities from model name
      const supportsVision = /vision|gemini-[12]/.test(modelId);
      const supportsFunctionCalling = true; // Gemini models support function calling

      return {
        modelId: modelId,
        displayName: model.displayName || modelId,
        description: model.description || "Modelo Google Gemini",
        supportsStreaming: true,
        supportsFunctionCalling,
        supportsVision,
        maxTokens: model.maxOutputTokens || 8192,
        contextWindow: model.maxInputTokens || 1000000,
      };
    });

  console.log(
    `[fetchGeminiModels] ✅ Returning ${filtered.length} models after filtering`
  );
  return filtered;
}

const MODEL_FETCHERS = {
  openai: fetchOpenAIModels,
  anthropic: fetchAnthropicModels,
  deepseek: fetchDeepSeekModels,
  openrouter: fetchOpenRouterModels,
  gemini: fetchGeminiModels,
};

async function disableMissingModels(providerId, activeModelIds) {
  const ids = activeModelIds.length ? activeModelIds : ["__none__"];
  await query(
    `UPDATE ai_models
    SET is_active = false
    WHERE provider_id = $1
      AND model_id <> ALL($2::text[])`,
    [providerId, ids]
  );
}

export async function syncProviderModels(userId, providerId) {
  try {
    const provider = await getProviderById(providerId, userId);
    let normalizedProviderName = provider.provider_name?.toLowerCase();

    // Map provider names to fetcher keys
    const providerNameMap = {
      google: "gemini",
    };
    const fetcherKey =
      providerNameMap[normalizedProviderName] || normalizedProviderName;
    const fetcher = MODEL_FETCHERS[fetcherKey];

    console.log(
      `[syncProviderModels] 🔄 Starting sync for provider ${provider.provider_name} (ID: ${providerId})`
    );
    console.log(
      `[syncProviderModels] Provider name: ${normalizedProviderName}, Fetcher key: ${fetcherKey}, Has fetcher: ${!!fetcher}`
    );

    let remoteModels = [];

    if (!fetcher) {
      console.warn(
        `[syncProviderModels] ⚠️ No API fetcher for provider: ${provider.provider_name} (normalized: ${normalizedProviderName})`
      );
      console.warn(
        `[syncProviderModels] Available fetchers:`,
        Object.keys(MODEL_FETCHERS).join(", ")
      );
      console.log(
        `[syncProviderModels] Using MODEL_REGISTRY fallback for ${normalizedProviderName}`
      );

      // Use DEFAULT_MODELS fallback for providers without API fetchers
      const defaultModels = DEFAULT_MODELS[normalizedProviderName] || [];
      remoteModels = defaultModels.map((model) => ({
        modelId: model.modelId,
        displayName: model.displayName || model.modelId,
        description:
          model.description || `Modelo padrão para ${provider.display_name}`,
        supportsStreaming: model.supportsStreaming ?? true,
        supportsFunctionCalling: model.supportsFunctionCalling ?? true,
        supportsVision: model.supportsVision ?? false,
        maxTokens: model.maxTokens,
        contextWindow: model.contextWindow,
        costPerInputToken: model.costPerInputToken,
        costPerOutputToken: model.costPerOutputToken,
      }));

      console.log(
        `[syncProviderModels] ℹ️ Using ${remoteModels.length} models from DEFAULT_MODELS for ${provider.provider_name}`
      );
    } else {
      try {
        console.log(
          `[syncProviderModels] 📞 Fetcher FOUND! Calling ${fetcherKey} fetcher...`
        );
        const { apiKey, baseUrl } = await getProviderApiKey(userId, providerId);
        console.log(
          `[syncProviderModels] Got API key (length: ${apiKey?.length}), calling fetcher for ${provider.provider_name}...`
        );

        remoteModels = await fetcher({ apiKey, baseUrl });
        console.log(
          `[syncProviderModels] ✅ Fetcher returned ${remoteModels.length} models`
        );
        console.log(
          `[syncProviderModels] Model IDs from API:`,
          remoteModels
            .slice(0, 5)
            .map((m) => m.modelId)
            .join(", "),
          remoteModels.length > 5
            ? `... (+${remoteModels.length - 5} more)`
            : ""
        );
      } catch (fetchError) {
        console.error(
          `[syncProviderModels] ❌ FETCHER ERROR for ${provider.provider_name}:`,
          fetchError.message
        );
        console.error(`[syncProviderModels] Full error:`, fetchError);
        throw fetchError;
      }
    }

    if (!remoteModels.length) {
      logger.warn(
        `Nenhum modelo retornado pelo provedor ${provider.provider_name}`
      );
    }

    const existing = await query(
      `SELECT id, model_id, is_default
      FROM ai_models
      WHERE provider_id = $1`,
      [providerId]
    );

    const existingDefault = existing.rows.find(
      (row) => row.is_default
    )?.model_id;
    const activeIds = [];

    let defaultAssigned = Boolean(existingDefault);

    console.log(
      `[syncProviderModels] 💾 Starting to upsert ${remoteModels.length} models...`
    );

    for (const remote of remoteModels) {
      const isDefault =
        remote.modelId === existingDefault ||
        (!defaultAssigned && remoteModels[0] === remote);
      if (!existingDefault && remoteModels[0] === remote) {
        defaultAssigned = true;
      }

      await upsertModel(providerId, {
        modelId: remote.modelId,
        displayName: remote.displayName,
        description: remote.description,
        supportsStreaming: remote.supportsStreaming,
        supportsFunctionCalling: remote.supportsFunctionCalling,
        supportsVision: remote.supportsVision,
        maxTokens: remote.maxTokens,
        contextWindow: remote.contextWindow,
        costPerInputToken: remote.costPerInputToken,
        costPerOutputToken: remote.costPerOutputToken,
        isActive: true,
        isDefault,
      });

      activeIds.push(remote.modelId);
    }

    console.log(`[syncProviderModels] ✅ Upserted ${activeIds.length} models`);

    if (activeIds.length) {
      console.log(`[syncProviderModels] Disabling missing models...`);
      await disableMissingModels(providerId, activeIds);
    } else {
      console.log(`[syncProviderModels] No active IDs, disabling all models`);
      await query(
        `UPDATE ai_models SET is_active = false WHERE provider_id = $1`,
        [providerId]
      );
    }

    const finalModels = await getModels(providerId);
    console.log(
      `[syncProviderModels] 🎉 Final result: ${finalModels.length} active models in database`
    );
    return finalModels;
  } catch (error) {
    logger.error("Error syncing provider models:", error);
    throw error;
  }
}

export async function getDefaultProvider() {
  try {
    const { rows } = await query(`
      SELECT id, provider_name, display_name, base_url, is_active
      FROM ai_providers 
      WHERE is_active = true 
      ORDER BY is_default DESC, display_name ASC 
      LIMIT 1
    `);

    return rows[0] || null;
  } catch (error) {
    logger.error("Error getting default provider:", error);
    return null;
  }
}

export async function getDefaultModel() {
  try {
    const { rows } = await query(`
      SELECT m.id, m.model_id, m.display_name, m.is_active, m.is_default,
             p.provider_name, p.display_name as provider_display_name
      FROM ai_models m
      JOIN ai_providers p ON m.provider_id = p.id
      WHERE m.is_active = true AND p.is_active = true
      ORDER BY m.is_default DESC, p.display_name ASC, m.display_name ASC
      LIMIT 1
    `);

    return rows[0] || null;
  } catch (error) {
    logger.error("Error getting default model:", error);
    return null;
  }
}

export default {
  getProviders,
  upsertProvider,
  deleteProvider,
  getProviderApiKey,
  getModels,
  getAvailableModels,
  upsertModel,
  setConversationModel,
  getConversationModel,
  updateModelUsage,
  syncProviderModels,
  getProviderById,
  getProviderByName,
};
