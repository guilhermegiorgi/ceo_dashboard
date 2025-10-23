import { Router } from "express";
import { authenticateJWT } from "../middleware/auth.js";
import {
  getUserAIConfig,
  sanitizeConfigForClient,
  getModelConfigForUser,
  MODEL_REGISTRY,
} from "../services/aiConfigService.js";
import { loadUserSettings, saveUserSettings } from "../services/settingsServiceDB.js";
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

router.get("/models", authenticateJWT, async (req, res, next) => {
  try {
    const providerParam = (req.query.provider || "").toString().trim();

    if (!providerParam) {
      return res
        .status(400)
        .json({ success: false, error: "provider query parameter is required" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, error: "User context missing" });
    }

    const provider = await getProviderByName(userId, providerParam);

    if (!provider) {
      return res
        .status(404)
        .json({ success: false, error: "Provider not found for user" });
    }

    const ensureModelsSynced = async () => {
      let models = await getModels(provider.id);
      if (!models.length) {
        try {
          models = await syncProviderModels(userId, provider.id);
        } catch (syncError) {
          // swallow sync errors but log for diagnostics
          logger.warn(
            `[AIConfigRoute] Failed to sync models for ${provider.provider_name}: ${syncError?.message}`
          );
        }
      }
      return models;
    };

    let models = await ensureModelsSynced();

    if (!models.length) {
      const fallbackRegistry = MODEL_REGISTRY[provider.provider_name] || [];
      models = fallbackRegistry.map((modelId, index) => ({
        id: `${provider.id}:${modelId}`,
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

    const formatted = models.map((model) => {
      const contextWindow = Number(model.context_window || model.max_tokens || 0);
      const costInput =
        model.cost_per_input_token !== null && model.cost_per_input_token !== undefined
          ? Number(model.cost_per_input_token)
          : null;
      const costOutput =
        model.cost_per_output_token !== null && model.cost_per_output_token !== undefined
          ? Number(model.cost_per_output_token)
          : null;

      const capabilities = [];
      if (model.supports_streaming) capabilities.push("Streaming");
      if (model.supports_function_calling) capabilities.push("Function Calling");
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

    return res.json({ success: true, models: formatted });
  } catch (error) {
    next(error);
  }
});

router.patch("/", authenticateJWT, async (req, res, next) => {
  try {
    const { context, selection, fallbackProvider } = req.body || {};

    if (!selection && !fallbackProvider) {
      return res
        .status(400)
        .json({ success: false, error: "selection or fallbackProvider required" });
    }

    if (selection && !context) {
      return res
        .status(400)
        .json({ success: false, error: "context is required when updating selection" });
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
