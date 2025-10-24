import { Router } from "express";
import { authenticateJWT } from "../middleware/auth.js";
import {
  getUserAIConfig,
  sanitizeConfigForClient,
  getModelConfigForUser,
  MODEL_REGISTRY,
} from "../services/aiConfigService.js";
import {
  loadUserSettings,
  saveUserSettings,
} from "../services/settingsServiceDB.js";
import { aiProviderRouter } from "../services/aiProviderRouter.js";
import {
  getProviderByName,
  getModels,
  syncProviderModels,
} from "../services/aiProviderService.js";
import { logger } from "../src/utils/logger.js";

const router = Router();

router.get("/", authenticateJWT, async (req, res, next) => {
  try {
    const config = await getUserAIConfig(req.user);
    res.json({
      success: true,
      config: sanitizeConfigForClient(config),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

router.post("/test", authenticateJWT, async (req, res, next) => {
  try {
    const { context = "chat", prompt = "Teste de conexão do provedor." } =
      req.body || {};

    const modelConfig = await getModelConfigForUser(req.user, context);

    await aiProviderRouter.routeChat({
      user: req.user,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      systemPrompt:
        "Você é um assistente de teste. Responda com uma frase curta confirmando a conexão.",
      context,
      overrides: req.body?.selection || {},
      stream: false,
    });

    res.json({
      success: true,
      provider: modelConfig.provider,
      model: modelConfig.model,
      fallbackUsed: modelConfig.fallbackUsed || false,
    });
  } catch (error) {
    next(error);
  }
});

// Force sync all models for a provider (clears cache, refetches from API)
router.post(
  "/force-sync/:provider",
  authenticateJWT,
  async (req, res, next) => {
    try {
      const { provider: providerParam } = req.params;
      const userId = req.user?.id;
      const normalizedProvider = providerParam.toLowerCase();

      console.log(
        `[AIConfigRoute] 🔄 FORCE SYNC triggered for ${normalizedProvider} by user ${userId}`
      );

      let provider = await getProviderByName(userId, normalizedProvider);

      if (!provider) {
        return res.status(404).json({
          success: false,
          error: `Provider ${normalizedProvider} not found`,
        });
      }

      console.log(
        `[AIConfigRoute] Starting force sync for provider ID: ${provider.id}`
      );
      const models = await syncProviderModels(userId, provider.id);

      console.log(
        `[AIConfigRoute] ✅ FORCE SYNC COMPLETE: ${models.length} models for ${normalizedProvider}`
      );
      console.log(
        `[AIConfigRoute] Model IDs:`,
        models.map((m) => m.model_id).join(", ")
      );

      return res.json({
        success: true,
        provider: normalizedProvider,
        modelsCount: models.length,
        models: models.map((m) => ({
          id: m.id,
          modelId: m.model_id,
          displayName: m.display_name,
          description: m.description,
          contextWindow: m.context_window,
        })),
      });
    } catch (error) {
      console.error(`[AIConfigRoute] Error in force sync:`, error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to sync models",
      });
    }
  }
);

router.get("/models", authenticateJWT, async (req, res, next) => {
  try {
    const providerParam = (req.query.provider || "").toString().trim();
    const forceRefresh =
      req.query.forceRefresh === "true" || req.query.forceRefresh === true;

    if (!providerParam) {
      return res.status(400).json({
        success: false,
        error: "provider query parameter is required",
      });
    }

    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;

    if (!userId || !tenantId) {
      console.error(
        `[AIConfigRoute] Missing user context - userId: ${userId}, tenantId: ${tenantId}`
      );
      return res
        .status(400)
        .json({ success: false, error: "User context missing" });
    }

    const normalizedProvider = providerParam.toLowerCase();
    console.log(
      `[AIConfigRoute] ============ GET /models - provider: ${normalizedProvider}, userId: ${userId}, tenantId: ${tenantId}, forceRefresh: ${forceRefresh} ============`
    );
    logger.info(
      `[AIConfigRoute] GET /models - provider: ${normalizedProvider}, userId: ${userId}`
    );

    let provider = await getProviderByName(userId, normalizedProvider);

    if (provider) {
      console.log(
        `[AIConfigRoute] Provider found in DB - ID: ${provider.id}, name: ${provider.provider_name}`
      );
      logger.info(
        `[AIConfigRoute] Provider found in DB - ID: ${provider.id}, name: ${provider.provider_name}`
      );
    } else {
      console.log(
        `[AIConfigRoute] Provider NOT found in DB for ${normalizedProvider}`
      );
      logger.info(
        `[AIConfigRoute] Provider NOT found in DB for ${normalizedProvider}`
      );
    }

    // AUTO-CREATE PROVIDER if it doesn't exist and user has API key
    if (!provider) {
      console.log(
        `[AIConfigRoute] Loading user settings from PostgreSQL for userId: ${userId}, tenantId: ${tenantId}`
      );
      const userSettings = await loadUserSettings(req.user); // Pass full user object with id AND tenantId
      console.log(
        `[AIConfigRoute] User settings aiKeys from DB:`,
        JSON.stringify(userSettings.aiKeys, null, 2)
      );
      console.log(
        `[AIConfigRoute] aiKeys structure check:`,
        JSON.stringify(
          {
            hasAiKeys: !!userSettings.aiKeys,
            aiKeysKeys: Object.keys(userSettings.aiKeys || {}),
            openaiValue: userSettings.aiKeys?.[normalizedProvider],
            openaiValueType: typeof userSettings.aiKeys?.[normalizedProvider],
            openaiValueLength:
              userSettings.aiKeys?.[normalizedProvider]?.length,
          },
          null,
          2
        )
      );

      const apiKey = userSettings.aiKeys?.[normalizedProvider];

      if (apiKey && apiKey.trim()) {
        console.log(
          `[AIConfigRoute] ✅ API key found for ${normalizedProvider}, auto-creating provider...`
        );
        logger.info(
          `[AIConfigRoute] Auto-creating provider ${normalizedProvider} for user ${userId}`
        );

        // Create provider in database
        const { upsertProvider } = await import(
          "../services/aiProviderService.js"
        );
        try {
          provider = await upsertProvider(userId, {
            providerName: normalizedProvider,
            displayName:
              providerParam ||
              normalizedProvider.charAt(0).toUpperCase() +
                normalizedProvider.slice(1),
            apiKey: apiKey,
            isActive: true,
            isDefault: false,
          });
          console.log(
            `[AIConfigRoute] ✅ Provider ${normalizedProvider} created with ID ${provider.id}`
          );
          logger.info(
            `[AIConfigRoute] Provider ${normalizedProvider} created with ID ${provider.id}`
          );
        } catch (createError) {
          console.error(
            `[AIConfigRoute] ❌ Failed to auto-create provider:`,
            createError
          );
          logger.warn(
            `[AIConfigRoute] Failed to auto-create provider: ${createError?.message}`
          );
          provider = {
            id: null,
            provider_name: normalizedProvider,
            display_name: providerParam || normalizedProvider,
          };
        }
      } else {
        console.log(
          `[AIConfigRoute] ⚠️ No API key found for ${normalizedProvider}, using mock provider`
        );
        provider = {
          id: null,
          provider_name: normalizedProvider,
          display_name: providerParam || normalizedProvider,
        };
      }
    }

    const ensureModelsSynced = async () => {
      if (!provider.id) {
        console.log(
          `[AIConfigRoute] ⚠️ Provider ${normalizedProvider} has no ID, cannot sync models from API`
        );
        logger.warn(
          `[AIConfigRoute] Provider ${normalizedProvider} has no ID, cannot sync models`
        );
        return [];
      }

      console.log(
        `[AIConfigRoute] Checking cached models for provider ID: ${provider.id}, forceRefresh: ${forceRefresh}`
      );
      let models = await getModels(provider.id);

      if (!models.length || forceRefresh) {
        if (forceRefresh && models.length > 0) {
          console.log(
            `[AIConfigRoute] 🔄 Force refresh requested, re-syncing ${models.length} cached models from API...`
          );
        } else {
          console.log(
            `[AIConfigRoute] No cached models, syncing from API for provider ${provider.provider_name}...`
          );
        }

        try {
          logger.info(
            `[AIConfigRoute] Syncing models for provider ${provider.provider_name} (ID: ${provider.id})`
          );
          models = await syncProviderModels(userId, provider.id);
          console.log(
            `[AIConfigRoute] ✅ Synced ${models.length} models from ${provider.provider_name} API`
          );
          logger.info(
            `[AIConfigRoute] Synced ${models.length} models for ${provider.provider_name}`
          );
        } catch (syncError) {
          console.error(
            `[AIConfigRoute] ❌ Failed to sync models from API:`,
            syncError
          );
          logger.warn(
            `[AIConfigRoute] Failed to sync models for ${provider.provider_name}: ${syncError?.message}`
          );
        }
      } else {
        console.log(
          `[AIConfigRoute] ✅ Using ${models.length} cached models for ${provider.provider_name}`
        );
        logger.info(
          `[AIConfigRoute] Using ${models.length} cached models for ${provider.provider_name}`
        );
      }
      return models;
    };

    let models = await ensureModelsSynced();

    console.log(`[AIConfigRoute] ========== MODELS FROM SYNC ==========`);
    console.log(`[AIConfigRoute] Total: ${models.length} models`);
    console.log(
      `[AIConfigRoute] Model IDs:`,
      models.map((m) => m.model_id).join(", ")
    );
    console.log(
      `[AIConfigRoute] Sample model structure:`,
      JSON.stringify(models[0], null, 2)
    );
    console.log(`[AIConfigRoute] =====================================`);

    if (!models.length) {
      console.log(
        `[AIConfigRoute] ⚠️ No models from sync, using MODEL_REGISTRY fallback for ${normalizedProvider}`
      );
      logger.warn(
        `[AIConfigRoute] No models from sync, using MODEL_REGISTRY fallback for ${normalizedProvider}`
      );
      const fallbackRegistry = MODEL_REGISTRY[normalizedProvider] || [];
      console.log(
        `[AIConfigRoute] MODEL_REGISTRY has ${fallbackRegistry.length} models for ${normalizedProvider}`
      );
      logger.info(
        `[AIConfigRoute] MODEL_REGISTRY has ${fallbackRegistry.length} models for ${normalizedProvider}`
      );
      models = fallbackRegistry.map((modelId, index) => ({
        id: provider.id
          ? `${provider.id}:${modelId}`
          : `${normalizedProvider}:${modelId}`,
        model_id: modelId,
        display_name: modelId,
        description: `Modelo padrão para ${provider.display_name}`,
        supports_streaming: true,
        supports_function_calling: provider.provider_name === "openai",
        supports_vision:
          provider.provider_name === "openai" && modelId.includes("vision"),
        max_tokens: null,
        context_window: null,
        cost_per_input_token: null,
        cost_per_output_token: null,
        is_default: index === 0,
        is_active: true,
        total_requests: null,
        total_tokens: null,
        last_used_at: null,
        training_data_cutoff: null,
      }));
    }

    console.log(
      `[AIConfigRoute] Formatting ${models.length} models for ${normalizedProvider}`
    );
    console.log(
      `[AIConfigRoute] Sample model:`,
      JSON.stringify(models[0], null, 2)
    );
    logger.info(
      `[AIConfigRoute] Formatting ${models.length} models for ${normalizedProvider}`
    );
    logger.info(`[AIConfigRoute] Sample model:`, models[0]);

    const formatted = models.map((model) => {
      const contextWindow = Number(
        model.context_window || model.max_tokens || 0
      );
      const costInput =
        model.cost_per_input_token !== null &&
        model.cost_per_input_token !== undefined
          ? Number(model.cost_per_input_token)
          : null;
      const costOutput =
        model.cost_per_output_token !== null &&
        model.cost_per_output_token !== undefined
          ? Number(model.cost_per_output_token)
          : null;

      const capabilities = [];
      if (model.supports_streaming) capabilities.push("Streaming");
      if (model.supports_function_calling)
        capabilities.push("Function Calling");
      if (model.supports_vision) capabilities.push("Vision");

      return {
        id: model.id,
        name: model.display_name || model.model_id,
        modelId: model.model_id,
        displayName: model.display_name,
        description: model.description,
        provider: provider.provider_name,
        providerId: provider.id,
        providerDisplayName: provider.display_name,
        contextWindow,
        maxTokens: model.max_tokens,
        costPerInputToken: costInput,
        costPerOutputToken: costOutput,
        costPer1kTokens: {
          input: costInput,
          output: costOutput,
        },
        supportsStreaming: model.supports_streaming,
        supportsFunctionCalling: model.supports_function_calling,
        supportsVision: model.supports_vision,
        trainingDataCutoff: model.training_data_cutoff || null,
        capabilities,
        isDefault: model.is_default,
        isActive: model.is_active,
        lastUsedAt: model.last_used_at,
        totalRequests: model.total_requests,
        totalTokens: model.total_tokens,
      };
    });

    console.log(
      `[AIConfigRoute] Returning ${formatted.length} formatted models for ${normalizedProvider}`
    );
    console.log(
      `[AIConfigRoute] Sample formatted model:`,
      JSON.stringify(formatted[0], null, 2)
    );
    logger.info(
      `[AIConfigRoute] Returning ${formatted.length} formatted models for ${normalizedProvider}`
    );
    logger.info(`[AIConfigRoute] Sample formatted model:`, formatted[0]);

    // Prevent caching to ensure fresh model data
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    return res.json({ success: true, models: formatted });
  } catch (error) {
    console.error(`[AIConfigRoute] ❌ Error in GET /models:`, error);
    logger.error(`[AIConfigRoute] Error in GET /models:`, error);
    next(error);
  }
});

router.patch("/", authenticateJWT, async (req, res, next) => {
  try {
    const { context, selection, fallbackProvider } = req.body || {};

    if (!selection && !fallbackProvider) {
      return res.status(400).json({
        success: false,
        error: "selection or fallbackProvider required",
      });
    }

    if (selection && !context) {
      return res.status(400).json({
        success: false,
        error: "context is required when updating selection",
      });
    }

    const fullSettings = await loadUserSettings(req.user);
    const settings = await getUserAIConfig(req.user);

    const nextConfig = {
      ...settings,
      modelSelection: { ...settings.modelSelection },
    };

    if (selection && context) {
      const currentSelection = settings.modelSelection?.[context] || {};
      nextConfig.modelSelection = {
        ...nextConfig.modelSelection,
        [context]: {
          ...currentSelection,
          ...selection,
        },
      };
    }

    if (fallbackProvider) {
      nextConfig.fallbackProvider = fallbackProvider;
    }

    await saveUserSettings(req.user, {
      braincloud: fullSettings.braincloud,
      interface: fullSettings.interface,
      aiKeys: nextConfig.apiKeys,
      aiProvider: nextConfig,
      system: fullSettings.system,
    });

    res.json({ success: true, config: sanitizeConfigForClient(nextConfig) });
  } catch (error) {
    next(error);
  }
});

export default router;
