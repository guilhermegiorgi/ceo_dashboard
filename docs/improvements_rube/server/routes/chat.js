/**
 * Enhanced Chat Routes
 * Endpoints para chat com sandbox execution e MCP integration
 */

import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import enhancedChatService from '../services/enhancedChatService.js';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

// Iniciar conversa
router.post('/conversations', authenticateJWT, async (req, res, next) => {
  try {
    const { agentId } = req.body;
    const conversation = await enhancedChatService.startConversation(
      req.user.id,
      agentId
    );
    res.status(201).json({
      success: true,
      data: conversation
    });
  } catch (error) {
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
      { code, language }
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
router.get('/conversations/:conversationId/stream', authenticateJWT, async (req, res, next) => {
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Conectar aos eventos de workbench
    const onChunk = (chunk) => {
      res.write(\`data: \${JSON.stringify({ chunk })}\n\n\`);
    };

    res.on('close', () => {
      res.end();
    });
  } catch (error) {
    next(error);
  }
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

    const conversation = await enhancedChatService.conversationContexts.get(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversa não encontrada'
      });
    }

    const execution = await remoteWorkbench.executeCode(
      conversation.workbenchSession,
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
