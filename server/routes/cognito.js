import { Router } from 'express';
import { queryCognito, startChatSession, streamChatResponse } from '../services/cognitoService.js';
import { authenticateJWT as authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * @route   POST /api/cognito/query
 * @desc    Envia uma consulta para o Cognito
 * @access  Privado
 */
router.post('/query', authenticateToken, async (req, res) => {
  try {
    const { query, sessionId, stream = false } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'O parâmetro "query" é obrigatório'
      });
    }

    if (stream) {
      // Configura o cabeçalho para streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      try {
        const stream = await queryCognito(query, { 
          sessionId, 
          stream: true,
          useCache: false
        });

        // Encaminha o stream para o cliente
        stream.pipe(res);

        // Trata erros no stream
        stream.on('error', (error) => {
          console.error('Erro no stream de resposta:', error);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              error: 'Erro no stream de resposta',
              details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
          }
        });

        // Fecha a conexão quando o cliente se desconectar
        req.on('close', () => {
          if (!res.writableEnded) {
            stream.destroy();
            res.end();
          }
        });

      } catch (error) {
        console.error('Erro ao iniciar o stream:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Erro ao processar a requisição em streaming',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          });
        }
      }
    } else {
      // Resposta padrão (não-streaming)
      const response = await queryCognito(query, { 
        sessionId,
        useCache: true 
      });

      res.json({
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Erro na consulta ao Cognito:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar a consulta',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/cognito/session/start
 * @desc    Inicia uma nova sessão de chat com o Cognito
 * @access  Privado
 */
router.post('/session/start', authenticateToken, async (req, res) => {
  try {
    const sessionId = await startChatSession();
    
    res.json({
      success: true,
      data: { sessionId },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao iniciar sessão:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao iniciar sessão',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/cognito/chat
 * @desc    Envia uma mensagem para o chat e retorna a resposta em streaming
 * @access  Privado
 */
router.post('/chat', authenticateToken, async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'O parâmetro "message" é obrigatório'
    });
  }

  // Configura o cabeçalho para streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const stream = await streamChatResponse(message, sessionId);
    
    // Encaminha o stream para o cliente
    stream.pipe(res);

    // Trata erros no stream
    stream.on('error', (error) => {
      console.error('Erro no stream do chat:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Erro no stream do chat',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });

    // Fecha a conexão quando o cliente se desconectar
    req.on('close', () => {
      if (!res.writableEnded) {
        stream.destroy();
        res.end();
      }
    });

  } catch (error) {
    console.error('Erro no chat com streaming:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Erro ao processar o chat',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});

export default router;
