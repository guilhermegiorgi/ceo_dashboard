import { loadUserSettings } from "./settingsServiceDB.js";
import { logger } from "../src/utils/logger.js";

const DEFAULT_API_KEYS = {
  openai: "",
  anthropic: "",
  google: "",
  perplexity: "",
  openrouter: "",
};

const DEFAULT_MODEL_SELECTION = {
  chat: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 2048,
  },
  insights: {
    provider: "anthropic",
    model: "claude-3-haiku",
    temperature: 0.4,
    maxTokens: 1536,
  },
  global: {
    provider: "google",
    model: "gemini-1.5-flash",
    temperature: 0.5,
    maxTokens: 2048,
  },
};

const SUPPORTED_PROVIDERS = new Set([
  "openai",
  "anthropic",
  "google",
  "perplexity",
  "openrouter",
]);

export const MODEL_REGISTRY = {
  openai: [
    "gpt-4o-mini",
    "gpt-4o",
    "gpt-4o-mini-vision",
    "gpt-4-turbo",
    "gpt-3.5-turbo",
  ],
  anthropic: [
    "claude-3-5-sonnet",
    "claude-3-opus",
    "claude-3-sonnet",
    "claude-3-haiku",
  ],
  google: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"],
  perplexity: [
    "sonar-reasoning",
    "sonar-medium-online",
    "sonar-small-chat",
  ],
  openrouter: [
    "openrouter/auto",
    "anthropic/claude-3.5-sonnet:beta",
    "meta-llama/llama-3.1-70b-instruct",
    "google/gemini-flash-1.5",
  ],
};

const CONTEXTS = ["chat", "insights", "global"];

function cloneModelSelection(selection = DEFAULT_MODEL_SELECTION) {
  return {
    chat: { ...DEFAULT_MODEL_SELECTION.chat, ...(selection.chat || {}) },
    insights: {
      ...DEFAULT_MODEL_SELECTION.insights,
      ...(selection.insights || {}),
    },
    global: { ...DEFAULT_MODEL_SELECTION.global, ...(selection.global || {}) },
  };
}

function createDefaultConfig() {
  return {
    apiKeys: { ...DEFAULT_API_KEYS },
    modelSelection: cloneModelSelection(),
    customProviders: {},
    fallbackProvider: "openai",
  };
}

function mergeConfig(rawConfig) {
  const base = createDefaultConfig();
  if (!rawConfig || typeof rawConfig !== "object") {
    return base;
  }

  const merged = {
    apiKeys: { ...base.apiKeys, ...(rawConfig.apiKeys || {}) },
    modelSelection: cloneModelSelection(rawConfig.modelSelection || {}),
    customProviders: rawConfig.customProviders || {},
    fallbackProvider: rawConfig.fallbackProvider || base.fallbackProvider,
  };

  return merged;
}

function sanitizeSelection(selection, fallbackProvider) {
  const provider = selection.provider;
  const model = selection.model;

  if (!provider || !SUPPORTED_PROVIDERS.has(provider)) {
    const fallback = fallbackProvider && SUPPORTED_PROVIDERS.has(fallbackProvider)
      ? fallbackProvider
      : DEFAULT_MODEL_SELECTION.chat.provider;
    return {
      provider: fallback,
      model:
        MODEL_REGISTRY[fallback]?.[0] || DEFAULT_MODEL_SELECTION.chat.model,
      temperature: selection.temperature,
      maxTokens: selection.maxTokens,
      customProviderId: undefined,
    };
  }

  const knownModels = MODEL_REGISTRY[provider] || [];
  const defaultModel =
    knownModels[0] ||
    MODEL_REGISTRY[fallbackProvider]?.[0] ||
    DEFAULT_MODEL_SELECTION.chat.model;

  return {
    provider,
    model: model && knownModels.includes(model) ? model : defaultModel,
    temperature: selection.temperature,
    maxTokens: selection.maxTokens,
    customProviderId: selection.customProviderId,
  };
}

export async function getUserAIConfig(user) {
  try {
    const settings = await loadUserSettings(user || {});
    const config = mergeConfig(settings?.aiProvider);

    if (settings?.aiKeys) {
      config.apiKeys = { ...config.apiKeys, ...settings.aiKeys };
    }

    return config;
  } catch (error) {
    logger.error("[aiConfigService] Failed to load user AI config:", error);
    return createDefaultConfig();
  }
}

function getApiKey(config, provider, customProviderId) {
  if (customProviderId) {
    return config.apiKeys?.[customProviderId] || "";
  }
  return config.apiKeys?.[provider] || "";
}

function getCustomProviderConfig(config, customProviderId) {
  if (!customProviderId) return undefined;
  return config.customProviders?.[customProviderId];
}

function ensureProviderConfig(config, context) {
  const selection =
    config.modelSelection?.[context] || DEFAULT_MODEL_SELECTION[context];
  return sanitizeSelection(selection, config.fallbackProvider);
}

function buildFallbackSelection(config, context, preferred) {
  const base =
    config.modelSelection?.global || DEFAULT_MODEL_SELECTION.global;
  const selection = {
    ...base,
    provider: config.fallbackProvider || base.provider,
    customProviderId: undefined,
  };

  if (context !== "global" && preferred?.provider === selection.provider) {
    return preferred;
  }

  return sanitizeSelection(selection, selection.provider);
}

function resolveWithFallback(config, context, overrides = {}) {
  const preferred = {
    ...ensureProviderConfig(config, context),
    ...overrides,
  };

  const apiKey = getApiKey(
    config,
    preferred.provider,
    preferred.customProviderId
  );
  if (apiKey) {
    return { selection: preferred, apiKey, fallbackUsed: false };
  }

  const fallbackSelection = buildFallbackSelection(config, context, preferred);
  const fallbackKey = getApiKey(
    config,
    fallbackSelection.provider,
    fallbackSelection.customProviderId
  );

  if (fallbackKey) {
    return {
      selection: fallbackSelection,
      apiKey: fallbackKey,
      fallbackUsed: true,
    };
  }

  return { selection: preferred, apiKey: "", fallbackUsed: false };
}

export async function getModelConfigForUser(user, context, overrides = {}) {
  const config = await getUserAIConfig(user);
  const ctx = CONTEXTS.includes(context) ? context : "global";
  const { selection, apiKey, fallbackUsed } = resolveWithFallback(
    config,
    ctx,
    overrides
  );

  const customProviderConfig = getCustomProviderConfig(
    config,
    selection.customProviderId
  );

  return {
    provider: selection.provider,
    model: selection.model,
    temperature: selection.temperature,
    maxTokens: selection.maxTokens,
    customProviderId: selection.customProviderId,
    apiKey,
    customProviderConfig,
    fallbackUsed,
    baseUrl: customProviderConfig?.baseUrl,
    customHeaders: customProviderConfig?.customHeaders,
  };
}

export function sanitizeConfigForClient(config) {
  return {
    ...config,
    apiKeys: Object.fromEntries(
      Object.entries(config.apiKeys || {}).map(([key]) => [
        key,
        config.apiKeys[key] ? "********" : "",
      ])
    ),
  };
}
