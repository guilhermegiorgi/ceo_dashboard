/**
 * Conversations Routes
 * API endpoints for chat conversations
 */

import express from "express";
import {
  getConversations,
  getConversation,
  createConversation,
  addMessage,
  updateConversationTitle,
  generateConversationTitle,
  deleteConversation,
  updateDetectedTags,
  getConversationStats,
} from "../services/conversationService.js";
import { logger } from "../src/utils/logger.js";
import {
  getConversationModel,
  setConversationModel,
  getProviderApiKey,
  updateModelUsage,
} from "../services/aiProviderService.js";
import {
  buildSystemPrompt,
  convertMessagesForLLM,
  generateChatCompletion,
} from "../services/aiChatClient.js";

const router = express.Router();

/**
 * GET /api/conversations
 * List all conversations for the authenticated user
 */
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit, offset, contextType } = req.query;

    const conversations = await getConversations(userId, {
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      contextType,
    });

    res.json({
      conversations,
      total: conversations.length,
    });
  } catch (error) {
    logger.error("Error in GET /conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

/**
 * GET /api/conversations/stats
 * Get conversation statistics
 */
router.get("/stats", async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await getConversationStats(userId);

    res.json(stats);
  } catch (error) {
    logger.error("Error in GET /conversations/stats:", error);
    res.status(500).json({ error: "Failed to fetch conversation stats" });
  }
});

/**
 * GET /api/conversations/:id
 * Get a single conversation with all messages
 */
router.get("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    const conversation = await getConversation(conversationId, userId);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json(conversation);
  } catch (error) {
    logger.error("Error in GET /conversations/:id:", error);
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

/**
 * POST /api/conversations
 * Create a new conversation
 */
router.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { contextType, contextProjectId, contextNotePath, title } = req.body;

    const conversation = await createConversation(userId, {
      contextType,
      contextProjectId,
      contextNotePath,
      title,
    });

    res.status(201).json(conversation);
  } catch (error) {
    logger.error("Error in POST /conversations:", error);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

/**
 * POST /api/conversations/:id/messages
 * Add a message to a conversation (with streaming support)
 */
router.post("/:id/messages", async (req, res) => {
  try {
    const conversationId = req.params.id;
    const { role, content, contextSnapshot } = req.body;
    const userId = req.user.id;

    // Verify conversation belongs to user
    const conversation = await getConversation(conversationId, userId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Save user message
    const message = await addMessage(conversationId, {
      role,
      content,
      contextSnapshot,
    });

    // Check if we should generate title (after 2nd user message)
    const userMessageCount = conversation.messages.filter(
      (m) => m.role === "user"
    ).length;

    if (
      userMessageCount === 1 &&
      conversation.title === "Nova Conversa" &&
      role === "user"
    ) {
      // Generate title in background
      generateConversationTitle(conversationId, userId)
        .then((title) => {
          updateConversationTitle(conversationId, title, userId);
          // Emit via WebSocket if available
          if (req.app.get("io")) {
            req.app
              .get("io")
              .to(`conversation:${conversationId}`)
              .emit("conversation:title-updated", { title });
          }
        })
        .catch((err) => {
          logger.error("Error generating title:", err);
        });
    }

    res.status(201).json(message);
  } catch (error) {
    logger.error("Error in POST /conversations/:id/messages:", error);
    res.status(500).json({ error: "Failed to add message" });
  }
});

/**
 * POST /api/conversations/:id/respond
 * Generate an assistant response using the configured AI provider
 */
router.post("/:id/respond", async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user.id;
    const { temperature, maxTokens, topP, modelId } = req.body || {};

    const conversation = await getConversation(conversationId, userId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    let config = await getConversationModel(conversationId);

    if (modelId && (!config || config.model_id !== modelId)) {
      await setConversationModel(conversationId, modelId, {
        temperature,
        maxTokens,
        topP,
      });
      config = await getConversationModel(conversationId);
    }

    if (!config) {
      return res.status(400).json({
        error: "Nenhum modelo configurado para esta conversa. Selecione um modelo nas configurações de AI.",
      });
    }

    const providerCredentials = await getProviderApiKey(userId, config.provider_id);

    const configTemperature =
      config.temperature !== null && config.temperature !== undefined
        ? Number(config.temperature)
        : null;
    const configMaxTokens =
      config.max_tokens !== null && config.max_tokens !== undefined
        ? Number(config.max_tokens)
        : null;
    const configTopP =
      config.top_p !== null && config.top_p !== undefined
        ? Number(config.top_p)
        : null;

    const effectiveTemperature =
      typeof temperature === "number" ? temperature : configTemperature ?? 0.7;
    const effectiveMaxTokens =
      typeof maxTokens === "number" ? maxTokens : configMaxTokens ?? undefined;
    const effectiveTopP =
      typeof topP === "number" ? topP : configTopP ?? 1.0;

    const history = convertMessagesForLLM(conversation.messages || []).slice(-20);
    const systemPrompt = buildSystemPrompt(conversation);

    const modelIdentifier = config.model_key;

    if (!modelIdentifier) {
      return res.status(400).json({
        error: "Modelo configurado inválido. Reconfigure o provedor de IA.",
      });
    }

    const completion = await generateChatCompletion({
      providerName: config.provider_name,
      baseUrl: providerCredentials.baseUrl,
      apiKey: providerCredentials.apiKey,
      model: modelIdentifier,
      messages: history,
      temperature: effectiveTemperature,
      maxTokens: effectiveMaxTokens,
      topP: effectiveTopP,
      systemPrompt,
    });

    if (!completion?.content) {
      throw new Error("AI response returned empty content");
    }

    const assistantMessage = await addMessage(conversationId, {
      role: "assistant",
      content: completion.content,
    });

    if (config.model_id) {
      try {
        const tokensUsed = Number(completion.tokensUsed || 0);
        await updateModelUsage(config.model_id, tokensUsed);
      } catch (usageError) {
        logger.warn("Failed to update model usage stats:", usageError);
      }
    }

    res.json({
      message: assistantMessage,
      usage: completion.usage,
      provider: {
        id: config.provider_id,
        name: config.provider_name,
        displayName: config.provider_display_name,
      },
      model: {
        id: config.model_id,
        identifier: modelIdentifier,
        name: config.model_name,
      },
    });
  } catch (error) {
    logger.error("Error in POST /conversations/:id/respond:", error);
    res.status(500).json({ error: "Failed to generate assistant response" });
  }
});

/**
 * PATCH /api/conversations/:id/title
 * Update conversation title
 */
router.patch("/:id/title", async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;
    const { title } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: "Title is required" });
    }

    const conversation = await updateConversationTitle(
      conversationId,
      title.trim(),
      userId
    );

    res.json(conversation);
  } catch (error) {
    logger.error("Error in PATCH /conversations/:id/title:", error);
    res.status(500).json({ error: "Failed to update conversation title" });
  }
});

/**
 * POST /api/conversations/:id/generate-title
 * Generate title using AI
 */
router.post("/:id/generate-title", async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    // Verify conversation belongs to user
    const conversation = await getConversation(conversationId, userId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const title = await generateConversationTitle(conversationId, userId);
    const updated = await updateConversationTitle(
      conversationId,
      title,
      userId
    );

    res.json({ title: updated.title });
  } catch (error) {
    logger.error("Error in POST /conversations/:id/generate-title:", error);
    res.status(500).json({ error: "Failed to generate title" });
  }
});

/**
 * PATCH /api/conversations/:id/tags
 * Update detected tags
 */
router.patch("/:id/tags", async (req, res) => {
  try {
    const conversationId = req.params.id;
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: "Tags must be an array" });
    }

    const conversation = await updateDetectedTags(conversationId, tags);

    res.json(conversation);
  } catch (error) {
    logger.error("Error in PATCH /conversations/:id/tags:", error);
    res.status(500).json({ error: "Failed to update tags" });
  }
});

/**
 * DELETE /api/conversations/:id
 * Delete a conversation
 */
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    await deleteConversation(conversationId, userId);

    res.json({ success: true, message: "Conversation deleted" });
  } catch (error) {
    logger.error("Error in DELETE /conversations/:id:", error);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

export default router;
