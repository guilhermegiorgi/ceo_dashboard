/**
 * Enhanced Chat Routes
 * Endpoints para chat com sandbox execution e MCP integration
 */

import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import enhancedChatService from '../services/enhancedChatService.js';

const router = express.Router();

// Iniciar conversa
router.post('/conversations', authenticateJWT, async (req, res, next) => {
  try {
    const { agentId } = req.body;
    const conversation = await enhancedChatService.startConversation(
      req.user,
      agentId
    );
    res.status(201).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    if (error.message?.includes('Conversa')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
});

// Enviar mensagem de chat
router.post('/conversations/:conversationId/messages', authenticateJWT, async (req, res, next) => {
  try {
    const { message, code, language } = req.body;

    const response = await enhancedChatService.sendMessage(
      req.params.conversationId,
      message,
      { code, language },
      req.user
    );

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
});

// Obter histórico de conversa
router.get('/conversations/:conversationId/messages', authenticateJWT, async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;
    const messages = await enhancedChatService.getConversationHistory(
      req.params.conversationId,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    next(error);
  }
});

// Stream de chat (SSE)
router.get('/conversations/:conversationId/stream', authenticateJWT, (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Streaming de conversas ainda não está implementado nesta versão.'
  });
});

// Executar código no sandbox
router.post('/execute', authenticateJWT, async (req, res, next) => {
  try {
    const { code, language = 'javascript', timeout = 30000, conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: 'conversationId é obrigatório'
      });
    }

    const execution = await enhancedChatService.executeCodeForConversation(
      conversationId,
      code,
      language,
      timeout
    );

    res.json({
      success: true,
      data: execution
    });
  } catch (error) {
    next(error);
  }
});

// Deletar conversa
router.delete('/conversations/:conversationId', authenticateJWT, async (req, res, next) => {
  try {
    await enhancedChatService.deleteConversation(req.params.conversationId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
