/**
 * Conversation Service
 * Manages chat conversations with contextual awareness
 */

import { query } from "../database/pg-pool.js";
import { logger } from "../src/utils/logger.js";

/**
 * Get all conversations for a user
 * @param {string} userId - User ID
 * @param {object} options - Query options (limit, offset, contextType)
 * @returns {Promise<Array>} List of conversations
 */
export async function getConversations(userId, options = {}) {
  const { limit = 50, offset = 0, contextType } = options;

  let sql = `
    SELECT
      c.id,
      c.title,
      c.context_type,
      c.context_project_id,
      c.context_note_path,
      c.message_count,
      c.last_message_preview,
      c.detected_tags,
      c.created_at,
      c.updated_at,
      p.name as project_name
    FROM conversations c
    LEFT JOIN projects p ON c.context_project_id = p.id
    WHERE c.user_id = $1
  `;

  const params = [userId];

  if (contextType) {
    sql += ` AND c.context_type = $${params.length + 1}`;
    params.push(contextType);
  }

  sql += ` ORDER BY c.updated_at DESC LIMIT $${params.length + 1} OFFSET $${
    params.length + 2
  }`;
  params.push(limit, offset);

  try {
    const result = await query(sql, params);
    return result.rows;
  } catch (error) {
    logger.error("Error fetching conversations:", error);
    throw error;
  }
}

/**
 * Get a single conversation with all messages
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User ID (for security)
 * @returns {Promise<object>} Conversation with messages
 */
export async function getConversation(conversationId, userId) {
  try {
    // Get conversation metadata
    const convResult = await query(
      `SELECT
        c.*,
        p.name as project_name,
        p.description as project_description
      FROM conversations c
      LEFT JOIN projects p ON c.context_project_id = p.id
      WHERE c.id = $1 AND c.user_id = $2`,
      [conversationId, userId]
    );

    if (convResult.rows.length === 0) {
      return null;
    }

    const conversation = convResult.rows[0];

    // Get all messages
    const messagesResult = await query(
      `SELECT
        id,
        role,
        content,
        context_snapshot,
        created_at
      FROM conversation_messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC`,
      [conversationId]
    );

    conversation.messages = messagesResult.rows;

    return conversation;
  } catch (error) {
    logger.error("Error fetching conversation:", error);
    throw error;
  }
}

/**
 * Create a new conversation
 * @param {string} userId - User ID
 * @param {object} context - Context information
 * @returns {Promise<object>} Created conversation
 */
export async function createConversation(userId, context = {}) {
  const {
    contextType = "global",
    contextProjectId = null,
    contextNotePath = null,
    title = "Nova Conversa",
  } = context;

  try {
    const result = await query(
      `INSERT INTO conversations (
        user_id,
        title,
        context_type,
        context_project_id,
        context_note_path
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [userId, title, contextType, contextProjectId, contextNotePath]
    );

    logger.info(`Conversation created: ${result.rows[0].id}`);
    return result.rows[0];
  } catch (error) {
    logger.error("Error creating conversation:", error);
    throw error;
  }
}

/**
 * Add a message to a conversation
 * @param {string} conversationId - Conversation ID
 * @param {object} message - Message data
 * @returns {Promise<object>} Created message
 */
export async function addMessage(conversationId, message) {
  const { role, content, contextSnapshot = null } = message;

  try {
    const result = await query(
      `INSERT INTO conversation_messages (
        conversation_id,
        role,
        content,
        context_snapshot
      ) VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [conversationId, role, content, contextSnapshot]
    );

    logger.info(`Message added to conversation ${conversationId}`);
    return result.rows[0];
  } catch (error) {
    logger.error("Error adding message:", error);
    throw error;
  }
}

/**
 * Update conversation title
 * @param {string} conversationId - Conversation ID
 * @param {string} title - New title
 * @param {string} userId - User ID (for security)
 * @returns {Promise<object>} Updated conversation
 */
export async function updateConversationTitle(conversationId, title, userId) {
  try {
    const result = await query(
      `UPDATE conversations
      SET title = $1, updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING *`,
      [title, conversationId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error("Conversation not found or unauthorized");
    }

    logger.info(`Conversation title updated: ${conversationId}`);
    return result.rows[0];
  } catch (error) {
    logger.error("Error updating conversation title:", error);
    throw error;
  }
}

/**
 * Generate conversation title using AI
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User ID
 * @returns {Promise<string>} Generated title
 */
export async function generateConversationTitle(conversationId, userId) {
  try {
    // Get first 5 messages
    const result = await query(
      `SELECT role, content
      FROM conversation_messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
      LIMIT 5`,
      [conversationId]
    );

    const messages = result.rows;

    if (messages.length < 2) {
      return "Nova Conversa";
    }

    // Simple title generation based on first user message
    // TODO: Use Cognito AI for better title generation
    const firstUserMessage = messages.find((m) => m.role === "user");
    if (firstUserMessage) {
      // Extract first 50 chars and add ellipsis
      let title = firstUserMessage.content.trim().substring(0, 50);
      if (firstUserMessage.content.length > 50) {
        title += "...";
      }
      return title;
    }

    return "Nova Conversa";
  } catch (error) {
    logger.error("Error generating conversation title:", error);
    return "Nova Conversa";
  }
}

/**
 * Delete a conversation
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User ID (for security)
 * @returns {Promise<boolean>} Success status
 */
export async function deleteConversation(conversationId, userId) {
  try {
    const result = await query(
      `DELETE FROM conversations
      WHERE id = $1 AND user_id = $2
      RETURNING id`,
      [conversationId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error("Conversation not found or unauthorized");
    }

    logger.info(`Conversation deleted: ${conversationId}`);
    return true;
  } catch (error) {
    logger.error("Error deleting conversation:", error);
    throw error;
  }
}

/**
 * Update detected tags in conversation
 * @param {string} conversationId - Conversation ID
 * @param {Array<string>} tags - Array of tags
 * @returns {Promise<object>} Updated conversation
 */
export async function updateDetectedTags(conversationId, tags) {
  try {
    const result = await query(
      `UPDATE conversations
      SET detected_tags = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *`,
      [tags, conversationId]
    );

    logger.info(`Tags updated for conversation: ${conversationId}`);
    return result.rows[0];
  } catch (error) {
    logger.error("Error updating tags:", error);
    throw error;
  }
}

/**
 * Get conversation statistics
 * @param {string} userId - User ID
 * @returns {Promise<object>} Statistics
 */
export async function getConversationStats(userId) {
  try {
    const result = await query(
      `SELECT
        COUNT(*) as total_conversations,
        SUM(message_count) as total_messages,
        COUNT(CASE WHEN context_type = 'project' THEN 1 END) as project_conversations,
        COUNT(CASE WHEN context_type = 'note' THEN 1 END) as note_conversations,
        COUNT(CASE WHEN context_type = 'global' THEN 1 END) as global_conversations,
        MAX(updated_at) as last_conversation_at
      FROM conversations
      WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0];
  } catch (error) {
    logger.error("Error fetching conversation stats:", error);
    throw error;
  }
}

export default {
  getConversations,
  getConversation,
  createConversation,
  addMessage,
  updateConversationTitle,
  generateConversationTitle,
  deleteConversation,
  updateDetectedTags,
  getConversationStats,
};
