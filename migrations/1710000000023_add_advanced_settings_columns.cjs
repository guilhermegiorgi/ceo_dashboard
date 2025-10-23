/**
 * Migration: Add advanced settings columns to user_settings
 *
 * Adds Brain Cloud config, AI API keys, and system settings as JSONB columns.
 */

exports.up = (pgm) => {
  // Add Brain Cloud configuration
  pgm.addColumn("user_settings", {
    braincloud_config: {
      type: "jsonb",
      default: JSON.stringify({
        connectionMode: "auto",
        mcpEnabled: true,
        restEnabled: true,
        mcpServerUrl: "http://localhost:3100",
        restApiUrl: "https://obsidian-brain.cloud/api/v1",
        restApiKey: "",
      }),
      comment: "Brain Cloud connection settings",
    },
  });

  // Add AI API Keys (encrypted in production)
  pgm.addColumn("user_settings", {
    ai_api_keys: {
      type: "jsonb",
      default: JSON.stringify({
        openai: "",
        anthropic: "",
        google: "",
        perplexity: "",
      }),
      comment: "AI service API keys (should be encrypted)",
    },
  });

  // Add system settings
  pgm.addColumn("user_settings", {
    system_settings: {
      type: "jsonb",
      default: JSON.stringify({
        allowEditAllDirectories: false,
        adminApiToken: "",
        pathOverrideTTL: 600,
        autoSaveInterval: 30,
        enableDebugMode: false,
      }),
      comment: "System-level settings",
    },
  });

  // Add interface preferences (more detailed than existing fields)
  pgm.addColumn("user_settings", {
    interface_preferences: {
      type: "jsonb",
      default: JSON.stringify({
        enableSounds: true,
        enableAnimations: true,
        compactMode: false,
        showBetaFeatures: false,
      }),
      comment: "Extended interface preferences",
    },
  });

  // Create index on JSONB columns for faster queries
  pgm.createIndex("user_settings", "braincloud_config", {
    method: "gin",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("user_settings", "braincloud_config");
  pgm.dropColumn("user_settings", "interface_preferences");
  pgm.dropColumn("user_settings", "system_settings");
  pgm.dropColumn("user_settings", "ai_api_keys");
  pgm.dropColumn("user_settings", "braincloud_config");
};
