import { WebSocketServer } from 'ws';
import { logger } from '../utils/logger.js';
import { webSocketService } from '../services/websocketService.js';
import { HTTP_STATUS } from '../constants.js';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';

/**
 * Configura e inicia o servidor WebSocket
 * @param {Object} server - Servidor HTTP/HTTPS
 * @returns {Object} Instância do servidor WebSocket
 */
const configureWebSocket = (server) => {
  // Cria o servidor WebSocket
  const wss = new WebSocketServer({
    server,
    path: '/ws', // Caminho para o WebSocket
    clientTracking: true, // Rastreia clientes conectados
    maxPayload: 1024 * 1024, // 1MB de tamanho máximo de mensagem
    perMessageDeflate: {
      zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      clientNoContextTakeover: true,
      serverNoContextTakeover: true,
      serverMaxWindowBits: 10,
      concurrencyLimit: 10,
      threshold: 1024
    }
  });

  // Manipulador de conexão WebSocket
  wss.on('connection', (ws, req) => {
    let userId = null;
    let sessionId = null;
    
    // Função para enviar mensagens de erro
    const sendError = (code, message) => {
      ws.send(JSON.stringify({
        type: 'error',
        code,
        message,
        timestamp: new Date().toISOString()
      }));
    };
    
    // Autenticação do WebSocket
    const authenticate = (token) => {
      try {
        if (!token) {
          throw new Error('Token de autenticação não fornecido');
        }
        
        // Verifica o token JWT
        const decoded = jwt.verify(token, config.jwt.secret);
        userId = decoded.userId;
        sessionId = decoded.sessionId;
        
        // Registra a conexão no serviço WebSocket
        webSocketService.registerConnection(userId, sessionId, ws);
        
        logger.info(`Conexão WebSocket autenticada para o usuário ${userId}`, {
          sessionId,
          ip: req.socket.remoteAddress
        });
        
        // Confirma a autenticação
        ws.send(JSON.stringify({
          type: 'auth_success',
          userId,
          sessionId,
          timestamp: new Date().toISOString()
        }));
        
        return true;
      } catch (error) {
        logger.error('Falha na autenticação WebSocket:', {
          error: error.message,
          token: token ? 'provided' : 'missing',
          ip: req.socket.remoteAddress
        });
        
        sendError(
          'AUTHENTICATION_FAILED',
          'Falha na autenticação. Token inválido ou expirado.'
        );
        
        // Fecha a conexão após um curto atraso
        setTimeout(() => ws.close(4001, 'Autenticação falhou'), 1000);
        return false;
      }
    };
    
    // Manipulador de mensagens recebidas
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        
        // Todas as mensagens, exceto 'auth', requerem autenticação
        if (data.type !== 'auth' && !userId) {
          return sendError(
            'UNAUTHORIZED',
            'Autenticação necessária. Por favor, autentique-se primeiro.'
          );
        }
        
        // Roteia a mensagem com base no tipo
        switch (data.type) {
          case 'auth':
            // Autenticação do WebSocket
            authenticate(data.token);
            break;
            
          case 'subscribe':
            // Inscreve o cliente em um canal
            if (!data.channel) {
              return sendError('INVALID_REQUEST', 'Canal não especificado');
            }
            await webSocketService.subscribe(userId, sessionId, data.channel);
            break;
            
          case 'unsubscribe':
            // Remove a inscrição de um canal
            if (!data.channel) {
              return sendError('INVALID_REQUEST', 'Canal não especificado');
            }
            await webSocketService.unsubscribe(userId, sessionId, data.channel);
            break;
            
          case 'publish':
            // Publica uma mensagem em um canal
            if (!data.channel) {
              return sendError('INVALID_REQUEST', 'Canal não especificado');
            }
            if (data.message === undefined) {
              return sendError('INVALID_REQUEST', 'Mensagem não fornecida');
            }
            await webSocketService.publish(
              userId,
              data.channel,
              data.message,
              data.options || {}
            );
            break;
            
          case 'ping':
            // Responde a um ping com um pong
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString(),
              ...(data.id && { id: data.id })
            }));
            break;
            
          default:
            sendError('INVALID_MESSAGE_TYPE', `Tipo de mensagem inválido: ${data.type}`);
        }
      } catch (error) {
        logger.error('Erro ao processar mensagem WebSocket:', {
          error: error.message,
          message: message.toString().substring(0, 500), // Limita o tamanho da mensagem no log
          userId,
          sessionId,
          ip: req.socket.remoteAddress
        });
        
        sendError(
          'PROCESSING_ERROR',
          'Erro ao processar a mensagem. Verifique o formato e tente novamente.'
        );
      }
    });
    
    // Manipulador de erros
    ws.on('error', (error) => {
      logger.error('Erro na conexão WebSocket:', {
        error: error.message,
        userId,
        sessionId,
        ip: req.socket.remoteAddress,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
      
      // Fecha a conexão em caso de erro
      if (ws.readyState === ws.OPEN) {
        ws.close(1011, 'Erro interno no servidor');
      }
    });
    
    // Manipulador de fechamento da conexão
    ws.on('close', (code, reason) => {
      logger.info(`Conexão WebSocket fechada`, {
        code,
        reason: reason.toString(),
        userId,
        sessionId,
        ip: req.socket.remoteAddress
      });
      
      // Remove a conexão do serviço WebSocket
      if (userId && sessionId) {
        webSocketService.unregisterConnection(userId, sessionId);
      }
    });
    
    // Configura um heartbeat para manter a conexão ativa
    let isAlive = true;
    const heartbeatInterval = setInterval(() => {
      if (!isAlive) {
        logger.warn('Conexão WebSocket inativa, encerrando...', {
          userId,
          sessionId,
          ip: req.socket.remoteAddress
        });
        return ws.terminate();
      }
      
      isAlive = false;
      ws.ping();
    }, 30000); // 30 segundos
    
    ws.on('pong', () => {
      isAlive = true;
    });
    
    // Limpa o intervalo quando a conexão for fechada
    ws.on('close', () => {
      clearInterval(heartbeatInterval);
    });
    
    // Configura um tempo limite para autenticação
    const authTimeout = setTimeout(() => {
      if (!userId) {
        logger.warn('Tempo limite de autenticação WebSocket excedido', {
          ip: req.socket.remoteAddress
        });
        
        sendError(
          'AUTH_TIMEOUT',
          'Tempo limite de autenticação excedido. Por favor, reconecte.'
        );
        
        ws.close(4002, 'Tempo limite de autenticação excedido');
      }
    }, 10000); // 10 segundos para autenticar
    
    // Limpa o timeout quando a autenticação for bem-sucedida
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'auth' && data.token) {
          clearTimeout(authTimeout);
        }
      } catch (error) {
        // Ignora erros de parsing
      }
    });
  });
  
  // Manipulador de erros do servidor WebSocket
  wss.on('error', (error) => {
    logger.error('Erro no servidor WebSocket:', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  });
  
  logger.info(`Servidor WebSocket inicializado no caminho /ws`);
  
  return wss;
};

export default configureWebSocket;
