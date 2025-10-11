import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { cache } from './cache.js';
import { logger } from '../utils/logger.js';
import config from '../../config/config.js';
import { verifyToken } from '../middleware/auth.js';

// Chaves de cache
const CACHE_KEYS = {
  SESSION: (sessionId) => `websocket:session:${sessionId}`,
  USER_SESSIONS: (userId) => `websocket:user:${userId}:sessions`,
  CHANNEL_SUBSCRIBERS: (channel) => `websocket:channel:${channel}:subscribers`,
  MESSAGE_HISTORY: (channel, limit = 100) => `websocket:channel:${channel}:history:${limit}`
};

// Tempo de expiração das sessões (24 horas)
const SESSION_TTL = 86400;

/**
 * Serviço de WebSocket para comunicação em tempo real
 */
class WebSocketService {
  constructor() {
    this.wss = null;
    this.sessions = new Map();
    this.channels = new Map();
    this.messageHandlers = new Map();
    this.heartbeatInterval = null;
  }

  /**
   * Inicializa o servidor WebSocket
   * @param {Object} server - Servidor HTTP/HTTPS
   */
  initialize(server) {
    // Cria o servidor WebSocket
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      clientTracking: true,
      maxPayload: 1024 * 1024, // 1MB
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

    // Configura os manipuladores de eventos
    this.setupEventHandlers();
    
    // Inicia o heartbeat para manter as conexões ativas
    this.startHeartbeat();
    
    logger.info('Servidor WebSocket inicializado');
    
    return this.wss;
  }

  /**
   * Configura os manipuladores de eventos do WebSocket
   */
  setupEventHandlers() {
    // Manipulador de conexão
    this.wss.on('connection', async (ws, req) => {
      const sessionId = uuidv4();
      let userId = 'anonymous';
      let user = null;
      
      // Adiciona a sessão à lista de sessões ativas
      this.sessions.set(sessionId, {
        id: sessionId,
        ws,
        userId,
        user,
        ip: req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        connectedAt: new Date().toISOString(),
        lastActivity: Date.now(),
        channels: new Set(),
        isAlive: true
      });
      
      logger.debug('Nova conexão WebSocket estabelecida', { sessionId });
      
      // Envia uma mensagem de boas-vindas
      this.sendMessage(ws, {
        type: 'welcome',
        sessionId,
        timestamp: new Date().toISOString(),
        serverInfo: {
          name: 'GG.AI CEO Dashboard',
          version: '1.0.0',
          maxPayload: 1024 * 1024 // 1MB
        }
      });
      
      // Manipulador de mensagens
      ws.on('message', async (data) => {
        try {
          const session = this.sessions.get(sessionId);
          if (!session) return;
          
          // Atualiza a última atividade
          session.lastActivity = Date.now();
          
          // Processa a mensagem
          let message;
          try {
            message = typeof data === 'string' ? JSON.parse(data) : data;
          } catch (error) {
            logger.error('Erro ao analisar mensagem WebSocket:', error);
            this.sendError(ws, 'invalid_message', 'Mensagem inválida');
            return;
          }
          
          // Registra a mensagem recebida
          logger.debug('Mensagem WebSocket recebida', { 
            sessionId, 
            type: message.type,
            channel: message.channel
          });
          
          // Roteia a mensagem para o manipulador apropriado
          await this.routeMessage(session, message);
          
        } catch (error) {
          logger.error('Erro ao processar mensagem WebSocket:', error, { sessionId });
          this.sendError(ws, 'processing_error', 'Erro ao processar a mensagem');
        }
      });
      
      // Manipulador de erros
      ws.on('error', (error) => {
        logger.error('Erro na conexão WebSocket:', error, { sessionId });
        this.cleanupSession(sessionId);
      });
      
      // Manipulador de fechamento
      ws.on('close', () => {
        logger.debug('Conexão WebSocket fechada', { sessionId });
        this.cleanupSession(sessionId);
      });
      
      // Configura o ping/pong para detecção de conexões inativas
      ws.on('pong', () => {
        const session = this.sessions.get(sessionId);
        if (session) {
          session.isAlive = true;
        }
      });
    });
    
    // Manipulador de erros do servidor
    this.wss.on('error', (error) => {
      logger.error('Erro no servidor WebSocket:', error);
    });
    
    // Manipulador de fechamento do servidor
    this.wss.on('close', () => {
      logger.info('Servidor WebSocket encerrado');
      this.stopHeartbeat();
    });
  }
  
  /**
   * Inicia o heartbeat para manter as conexões ativas
   */
  startHeartbeat() {
    // Verifica conexões inativas a cada 30 segundos
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 30000; // 30 segundos
      
      for (const [sessionId, session] of this.sessions.entries()) {
        // Verifica se a conexão ainda está ativa
        if (session.isAlive === false) {
          logger.debug('Conexão inativa encerrada', { sessionId, userId: session.userId });
          session.ws.terminate();
          this.cleanupSession(sessionId);
          continue;
        }
        
        // Marca como não vivo e envia um ping
        session.isAlive = false;
        session.ws.ping(() => {});
        
        // Verifica se a sessão está inativa há muito tempo
        if (now - session.lastActivity > timeout) {
          logger.debug('Sessão inativa encerrada', { sessionId, userId: session.userId });
          session.ws.terminate();
          this.cleanupSession(sessionId);
        }
      }
    }, 10000); // Verifica a cada 10 segundos
    
    logger.debug('Heartbeat WebSocket iniciado');
  }
  
  /**
   * Para o heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      logger.debug('Heartbeat WebSocket interrompido');
    }
  }
  
  /**
   * Limpa os recursos de uma sessão
   * @param {string} sessionId - ID da sessão
   */
  cleanupSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    // Remove a sessão de todos os canais
    for (const channel of session.channels) {
      this.unsubscribeFromChannel(sessionId, channel);
    }
    
    // Remove a sessão do cache
    if (session.userId && session.userId !== 'anonymous') {
      this.removeUserSession(session.userId, sessionId);
    }
    
    // Remove a sessão da lista de sessões ativas
    this.sessions.delete(sessionId);
    
    logger.debug('Sessão WebSocket encerrada', { sessionId, userId: session.userId });
  }
  
  /**
   * Adiciona uma sessão de usuário ao cache
   * @param {string} userId - ID do usuário
   * @param {string} sessionId - ID da sessão
   */
  async addUserSession(userId, sessionId) {
    const cacheKey = CACHE_KEYS.USER_SESSIONS(userId);
    let sessions = await cache.get(cacheKey) || [];
    
    if (!sessions.includes(sessionId)) {
      sessions.push(sessionId);
      await cache.set(cacheKey, sessions, SESSION_TTL);
    }
  }
  
  /**
   * Remove uma sessão de usuário do cache
   * @param {string} userId - ID do usuário
   * @param {string} sessionId - ID da sessão
   */
  async removeUserSession(userId, sessionId) {
    const cacheKey = CACHE_KEYS.USER_SESSIONS(userId);
    let sessions = await cache.get(cacheKey) || [];
    
    sessions = sessions.filter(id => id !== sessionId);
    
    if (sessions.length > 0) {
      await cache.set(cacheKey, sessions, SESSION_TTL);
    } else {
      await cache.del(cacheKey);
    }
  }
  
  /**
   * Autentica um usuário em uma sessão WebSocket
   * @param {Object} session - Sessão WebSocket
   * @param {string} token - Token JWT
   * @returns {Promise<boolean>} Verdadeiro se a autenticação for bem-sucedida
   */
  async authenticateSession(session, token) {
    try {
      // Verifica o token JWT
      const decoded = await verifyToken(token);
      
      // Atualiza os dados da sessão
      session.userId = decoded.userId;
      session.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
      
      // Adiciona a sessão ao cache de sessões do usuário
      await this.addUserSession(session.userId, session.id);
      
      logger.debug('Sessão WebSocket autenticada', { 
        sessionId: session.id, 
        userId: session.userId 
      });
      
      return true;
      
    } catch (error) {
      logger.error('Falha na autenticação WebSocket:', error, { 
        sessionId: session.id 
      });
      
      return false;
    }
  }
  
  /**
   * Inscreve uma sessão em um canal
   * @param {string} sessionId - ID da sessão
   * @param {string} channel - Nome do canal
   * @param {Object} [options] - Opções de assinatura
   * @returns {Promise<boolean>} Verdadeiro se a inscrição for bem-sucedida
   */
  async subscribeToChannel(sessionId, channel, options = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    // Verifica se o canal requer autenticação
    if (channel.startsWith('private-') && !session.userId) {
      this.sendError(session.ws, 'unauthorized', 'Autenticação necessária para este canal');
      return false;
    }
    
    // Verifica permissões específicas do canal
    if (channel.startsWith('admin-') && (!session.user || session.user.role !== 'admin')) {
      this.sendError(session.ws, 'forbidden', 'Permissão negada para este canal');
      return false;
    }
    
    // Adiciona o canal à lista de canais da sessão
    session.channels.add(channel);
    
    // Adiciona a sessão à lista de assinantes do canal
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    
    this.channels.get(channel).add(sessionId);
    
    // Envia uma confirmação de inscrição
    this.sendMessage(session.ws, {
      type: 'subscription:confirmed',
      channel,
      timestamp: new Date().toISOString(),
      sessionId: session.id
    });
    
    logger.debug('Sessão inscrita no canal', { 
      sessionId, 
      userId: session.userId, 
      channel 
    });
    
    return true;
  }
  
  /**
   * Remove uma sessão de um canal
   * @param {string} sessionId - ID da sessão
   * @param {string} channel - Nome do canal
   * @returns {boolean} Verdadeiro se a remoção for bem-sucedida
   */
  unsubscribeFromChannel(sessionId, channel) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    // Remove o canal da lista de canais da sessão
    session.channels.delete(channel);
    
    // Remove a sessão da lista de assinantes do canal
    if (this.channels.has(channel)) {
      this.channels.get(channel).delete(sessionId);
      
      // Se não houver mais assinantes, remove o canal
      if (this.channels.get(channel).size === 0) {
        this.channels.delete(channel);
      }
    }
    
    logger.debug('Sessão removida do canal', { 
      sessionId, 
      userId: session.userId, 
      channel 
    });
    
    return true;
  }
  
  /**
   * Envia uma mensagem para todos os assinantes de um canal
   * @param {string} channel - Nome do canal
   * @param {Object} message - Mensagem a ser enviada
   * @param {string} [excludeSessionId] - ID da sessão a ser excluída
   */
  broadcastToChannel(channel, message, excludeSessionId = null) {
    if (!this.channels.has(channel)) return;
    
    const subscribers = this.channels.get(channel);
    const timestamp = new Date().toISOString();
    
    // Prepara a mensagem
    const fullMessage = {
      ...message,
      channel,
      timestamp
    };
    
    // Envia a mensagem para todos os assinantes
    for (const sessionId of subscribers) {
      if (sessionId === excludeSessionId) continue;
      
      const session = this.sessions.get(sessionId);
      if (session && session.ws.readyState === 1) { // 1 = OPEN
        this.sendMessage(session.ws, fullMessage);
      }
    }
    
    // Registra a mensagem no histórico do canal
    this.addToChannelHistory(channel, fullMessage);
  }
  
  /**
   * Adiciona uma mensagem ao histórico do canal
   * @param {string} channel - Nome do canal
   * @param {Object} message - Mensagem a ser armazenada
   * @param {number} [limit=100] - Número máximo de mensagens a serem mantidas
   */
  async addToChannelHistory(channel, message, limit = 100) {
    const cacheKey = CACHE_KEYS.MESSAGE_HISTORY(channel, limit);
    let history = await cache.get(cacheKey) || [];
    
    // Adiciona a mensagem ao histórico
    history.unshift(message);
    
    // Mantém apenas o número máximo de mensagens
    if (history.length > limit) {
      history = history.slice(0, limit);
    }
    
    // Armazena o histórico atualizado
    await cache.set(cacheKey, history, SESSION_TTL);
  }
  
  /**
   * Obtém o histórico de mensagens de um canal
   * @param {string} channel - Nome do canal
   * @param {number} [limit=50] - Número máximo de mensagens a serem retornadas
   * @returns {Promise<Array>} Histórico de mensagens
   */
  async getChannelHistory(channel, limit = 50) {
    const cacheKey = CACHE_KEYS.MESSAGE_HISTORY(channel, 100); // Busca até 100 mensagens
    const history = await cache.get(cacheKey) || [];
    
    // Retorna apenas o número solicitado de mensagens
    return history.slice(0, limit);
  }
  
  /**
   * Roteia uma mensagem para o manipulador apropriado
   * @param {Object} session - Sessão WebSocket
   * @param {Object} message - Mensagem recebida
   */
  async routeMessage(session, message) {
    const { type } = message;
    
    try {
      switch (type) {
        case 'auth':
          // Autenticação
          const { token } = message;
          if (!token) {
            this.sendError(session.ws, 'invalid_token', 'Token não fornecido');
            return;
          }
          
          const authenticated = await this.authenticateSession(session, token);
          if (authenticated) {
            this.sendMessage(session.ws, {
              type: 'auth:success',
              userId: session.userId,
              timestamp: new Date().toISOString()
            });
          } else {
            this.sendError(session.ws, 'auth_failed', 'Falha na autenticação');
          }
          break;
          
        case 'subscribe':
          // Inscrição em canal
          const { channel, options } = message;
          if (!channel) {
            this.sendError(session.ws, 'invalid_channel', 'Canal não especificado');
            return;
          }
          
          await this.subscribeToChannel(session.id, channel, options || {});
          break;
          
        case 'unsubscribe':
          // Cancelamento de inscrição
          const { channel: unsubscribeChannel } = message;
          if (!unsubscribeChannel) {
            this.sendError(session.ws, 'invalid_channel', 'Canal não especificado');
            return;
          }
          
          this.unsubscribeFromChannel(session.id, unsubscribeChannel);
          this.sendMessage(session.ws, {
            type: 'unsubscribed',
            channel: unsubscribeChannel,
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'publish':
          // Publicação em canal
          const { channel: publishChannel, data } = message;
          if (!publishChannel) {
            this.sendError(session.ws, 'invalid_channel', 'Canal não especificado');
            return;
          }
          
          // Verifica se a sessão está inscrita no canal
          if (!session.channels.has(publishChannel)) {
            this.sendError(session.ws, 'not_subscribed', 'Não inscrito no canal');
            return;
          }
          
          // Transmite a mensagem para todos os assinantes do canal
          this.broadcastToChannel(publishChannel, {
            type: 'message',
            from: session.userId || 'anonymous',
            data,
            sessionId: session.id
          }, session.id);
          
          // Confirmação de publicação
          this.sendMessage(session.ws, {
            type: 'publish:ack',
            channel: publishChannel,
            timestamp: new Date().toISOString(),
            messageId: uuidv4()
          });
          break;
          
        case 'ping':
          // Resposta ao ping
          this.sendMessage(session.ws, {
            type: 'pong',
            timestamp: new Date().toISOString(),
            serverTime: Date.now()
          });
          break;
          
        default:
          // Mensagem não reconhecida
          this.sendError(session.ws, 'unknown_message_type', `Tipo de mensagem desconhecido: ${type}`);
      }
      
    } catch (error) {
      logger.error('Erro ao rotear mensagem WebSocket:', error, { 
        sessionId: session.id,
        messageType: type 
      });
      
      this.sendError(session.ws, 'processing_error', 'Erro ao processar a mensagem');
    }
  }
  
  /**
   * Envia uma mensagem através de um WebSocket
   * @param {WebSocket} ws - Instância do WebSocket
   * @param {Object} message - Mensagem a ser enviada
   * @returns {boolean} Verdadeiro se a mensagem foi enviada com sucesso
   */
  sendMessage(ws, message) {
    try {
      if (ws.readyState === 1) { // 1 = OPEN
        ws.send(JSON.stringify(message));
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Erro ao enviar mensagem WebSocket:', error);
      return false;
    }
  }
  
  /**
   * Envia uma mensagem de erro através de um WebSocket
   * @param {WebSocket} ws - Instância do WebSocket
   * @param {string} code - Código do erro
   * @param {string} message - Mensagem de erro
   * @param {Object} [details] - Detalhes adicionais do erro
   */
  sendError(ws, code, message, details = {}) {
    const errorMessage = {
      type: 'error',
      error: {
        code,
        message,
        ...details
      },
      timestamp: new Date().toISOString()
    };
    
    this.sendMessage(ws, errorMessage);
  }
  
  /**
   * Envia uma mensagem para todas as sessões de um usuário
   * @param {string} userId - ID do usuário
   * @param {Object} message - Mensagem a ser enviada
   */
  async sendToUser(userId, message) {
    const cacheKey = CACHE_KEYS.USER_SESSIONS(userId);
    const sessionIds = await cache.get(cacheKey) || [];
    
    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session && session.ws.readyState === 1) { // 1 = OPEN
        this.sendMessage(session.ws, message);
      }
    }
  }
  
  /**
   * Envia uma notificação para um usuário
   * @param {string} userId - ID do usuário
   * @param {string} title - Título da notificação
   * @param {string} message - Mensagem da notificação
   * @param {Object} [data] - Dados adicionais
   */
  async sendNotification(userId, title, message, data = {}) {
    const notification = {
      type: 'notification',
      notification: {
        id: uuidv4(),
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false,
        ...data
      }
    };
    
    await this.sendToUser(userId, notification);
  }
  
  /**
   * Fecha o servidor WebSocket
   */
  close() {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    
    this.stopHeartbeat();
    this.sessions.clear();
    this.channels.clear();
    
    logger.info('Servidor WebSocket encerrado');
  }
}

// Exporta uma instância única do serviço
export const webSocketService = new WebSocketService();

export default webSocketService;
