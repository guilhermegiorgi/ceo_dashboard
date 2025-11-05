/**
 * Migration: Add ai_provider_config column to user_settings
 *
 * Stores the model selection, fallback provider and custom providers for each user.
 */

const DEFAULT_AI_PROVIDER_CONFIG = {
  apiKeys: {
    openai: "",
    anthropic: "",
    google: "",
    perplexity: "",
    openrouter: "",
    deepseek: "",
  },
  modelSelection: {
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
  },
  customProviders: {},
  fallbackProvider: "openai",
};

exports.up = (pgm) => {
  pgm.addColumn("user_settings", {
    ai_provider_config: {
      type: "jsonb",
      default: JSON.stringify(DEFAULT_AI_PROVIDER_CONFIG),
      comment: "AI provider configuration (model selection, fallback, custom providers)",
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn("user_settings", "ai_provider_config");
};
