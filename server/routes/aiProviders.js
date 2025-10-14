/**
 * AI Providers Routes
 * API endpoints for managing AI providers and models
 */

import express from "express";
import {
  getProviders,
  upsertProvider,
  deleteProvider,
  getModels,
  getAvailableModels,
  upsertModel,
  setConversationModel,
  getConversationModel,
  syncProviderModels,
} from "../services/aiProviderService.js";
import { logger } from "../src/utils/logger.js";

const router = express.Router();

/**
 * GET /api/ai-providers
 * Get all providers for the current user
 */
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const providers = await getProviders(userId);

    res.json({ providers });
  } catch (error) {
    logger.error("Error in GET /ai-providers:", error);
    res.status(500).json({ error: "Failed to fetch providers" });
  }
});

/**
 * POST /api/ai-providers
 * Create or update a provider
 */
router.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { providerName, displayName, apiKey, baseUrl, isActive, isDefault } =
      req.body;

    if (!providerName || !displayName || !apiKey) {
      return res.status(400).json({
        error: "Provider name, display name, and API key are required",
      });
    }

    const provider = await upsertProvider(userId, {
      providerName,
      displayName,
      apiKey,
      baseUrl,
      isActive,
      isDefault,
    });

    res.json(provider);
  } catch (error) {
    logger.error("Error in POST /ai-providers:", error);
    res.status(500).json({ error: "Failed to upsert provider" });
  }
});

/**
 * DELETE /api/ai-providers/:id
 * Delete a provider
 */
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const providerId = req.params.id;

    await deleteProvider(userId, providerId);

    res.json({ success: true, message: "Provider deleted" });
  } catch (error) {
    logger.error("Error in DELETE /ai-providers/:id:", error);
    res.status(500).json({ error: "Failed to delete provider" });
  }
});

/**
 * GET /api/ai-providers/:id/models
 * Get all models for a provider
 */
router.get("/:id/models", async (req, res) => {
  try {
    const providerId = req.params.id;
    const models = await getModels(providerId);

    res.json({ models });
  } catch (error) {
    logger.error("Error in GET /ai-providers/:id/models:", error);
    res.status(500).json({ error: "Failed to fetch models" });
  }
});

/**
 * POST /api/ai-providers/:id/models
 * Add or update a model for a provider
 */
router.post("/:id/models", async (req, res) => {
  try {
    const providerId = req.params.id;
    const modelData = req.body;

    if (!modelData.modelId || !modelData.displayName) {
      return res.status(400).json({
        error: "Model ID and display name are required",
      });
    }

    const model = await upsertModel(providerId, modelData);

    res.json(model);
  } catch (error) {
    logger.error("Error in POST /ai-providers/:id/models:", error);
    res.status(500).json({ error: "Failed to upsert model" });
  }
});

/**
 * POST /api/ai-providers/:id/models/sync
 * Synchronize models directly from the provider API
 */
router.post("/:id/models/sync", async (req, res) => {
  try {
    const providerId = req.params.id;
    const userId = req.user.id;

    const models = await syncProviderModels(userId, providerId);

    res.json({ models });
  } catch (error) {
    logger.error("Error in POST /ai-providers/:id/models/sync:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to sync models",
    });
  }
});

/**
 * GET /api/ai-providers/models/available
 * Get all available models across all active providers for the user
 */
router.get("/models/available", async (req, res) => {
  try {
    const userId = req.user.id;
    const models = await getAvailableModels(userId);

    res.json({ models });
  } catch (error) {
    logger.error("Error in GET /ai-providers/models/available:", error);
    res.status(500).json({ error: "Failed to fetch available models" });
  }
});

/**
 * POST /api/ai-providers/conversations/:conversationId/model
 * Set model for a conversation
 */
router.post("/conversations/:conversationId/model", async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { modelId, temperature, maxTokens, topP } = req.body;

    if (!modelId) {
      return res.status(400).json({ error: "Model ID is required" });
    }

    const config = await setConversationModel(conversationId, modelId, {
      temperature,
      maxTokens,
      topP,
    });

    res.json(config);
  } catch (error) {
    logger.error(
      "Error in POST /ai-providers/conversations/:conversationId/model:",
      error
    );
    res.status(500).json({ error: "Failed to set conversation model" });
  }
});

/**
 * GET /api/ai-providers/conversations/:conversationId/model
 * Get model configuration for a conversation
 */
router.get("/conversations/:conversationId/model", async (req, res) => {
  try {
    const { conversationId } = req.params;
    const config = await getConversationModel(conversationId);

    res.json(config);
  } catch (error) {
    logger.error(
      "Error in GET /ai-providers/conversations/:conversationId/model:",
      error
    );
    res.status(500).json({ error: "Failed to get conversation model" });
  }
});

export default router;
