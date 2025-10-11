import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { cache } from './cache.js';

// Mapa para armazenar clientes conectados
const clients = new Map();

// Tipos de mensagem suportados
const MESSAGE_TYPES = {
  AUTH: 'AUTH',
  SUBSCRIBE: 'SUBSCRIBE',
  UNSUBSCRIBE: 'UNSUBSCRIBE',
  MESSAGE: 'MESSAGE',
  ERROR: 'ERROR',
  PING: 'PING',
  PONG: 'PONG'
};

// Canais disponíveis para inscrição
const AVAILABLE_CHANNELS = {
  INSIGHTS: 'insights',
  NOTIFICATIONS: 'notifications',
  CHAT: 'chat',
  UPDATES: 'updates'
};

/**
 * Configura os manipuladores de eventos WebSocket
 * @param {WebSocket.Server} wss - Instância do servidor WebSocket
 */
export function setupWebSocket(wss) {
  logger.info('Configurando WebSocket Server...');

  // Manipulador de conexão
  wss.on('connection', (ws, req) => {
    const clientId = uuidv4();
    const clientIp = req.socket.remoteAddress;
    
    // Adiciona o cliente ao mapa
    clients.set(clientId, {
      ws,
      id: clientId,
      ip: clientIp,
      userId: null, // Será definido após autenticação
      channels: new Set(),
      isAlive: true,
      lastActivity: Date.now()
    });

    logger.info(`Cliente conectado: ${clientId} (${clientIp})`);

    // Configura manipuladores de mensagens
    ws.on('message', (data) => handleMessage(clientId, data));
    
    // Configura manipulador de fechamento
    ws.on('close', () => handleClose(clientId));
    
    // Configura manipulador de erros
    ws.on('error', (error) => handleError(clientId, error));
    
    // Envia mensagem de boas-vindas
    sendMessage(clientId, {
      type: MESSAGE_TYPES.MESSAGE,
      data: {
        message: 'Conectado ao WebSocket do GG.AI Dashboard',
        clientId,
        timestamp: new Date().toISOString()
      }
    });
  });

  // Configura ping/pong para manter conexões ativas
  const interval = setInterval(() => {
    wss.clients.forEach((client) => {
      const clientData = Array.from(clients.values()).find(c => c.ws === client);
      
      if (clientData) {
        if (!clientData.isAlive) {
          logger.warn(`Cliente ${clientData.id} não respondeu ao ping, encerrando conexão`);
          return client.terminate();
        }
        
        clientData.isAlive = false;
        client.ping();
      }
    });
  }, 30000); // A cada 30 segundos

  // Limpa o intervalo quando o servidor for encerrado
  wss.on('close', () => {
    clearInterval(interval);
    logger.info('Servidor WebSocket encerrado');
  });
}

/**
 * Manipula mensagens recebidas de um cliente
 * @param {string} clientId - ID do cliente
 * @param {string} data - Dados da mensagem (string ou Buffer)
 */
async function handleMessage(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  // Atualiza a última atividade do cliente
  client.lastActivity = Date.now();
  
  try {
    // Tenta fazer parse da mensagem JSON
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch (e) {
      throw new Error('Mensagem inválida: não é um JSON válido');
    }
    
    // Valida o tipo da mensagem
    if (!message.type || !Object.values(MESSAGE_TYPES).includes(message.type)) {
      throw new Error(`Tipo de mensagem inválido. Tipos suportados: ${Object.values(MESSAGE_TYPES).join(', ')}`);
    }
    
    logger.debug(`Mensagem recebida de ${clientId}:`, message);
    
    // Roteia a mensagem para o manipulador apropriado
    switch (message.type) {
      case MESSAGE_TYPES.AUTH:
        await handleAuth(clientId, message.data);
        break;
        
      case MESSAGE_TYPES.SUBSCRIBE:
        await handleSubscribe(clientId, message.data);
        break;
        
      case MESSAGE_TYPES.UNSUBSCRIBE:
        await handleUnsubscribe(clientId, message.data);
        break;
        
      case MESSAGE_TYPES.MESSAGE:
        await handleChatMessage(clientId, message.data);
        break;
        
      case MESSAGE_TYPES.PING:
        sendMessage(clientId, { type: MESSAGE_TYPES.PONG });
        break;
        
      default:
        throw new Error(`Tipo de mensagem não suportado: ${message.type}`);
    }
  } catch (error) {
    logger.error(`Erro ao processar mensagem de ${clientId}:`, error);
    sendError(clientId, error.message);
  }
}

/**
 * Manipula mensagens de autenticação
 * @param {string} clientId - ID do cliente
 * @param {Object} data - Dados de autenticação
 */
async function handleAuth(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  // Em um ambiente real, você validaria o token JWT aqui
  const { token } = data || {};
  
  if (!token) {
    throw new Error('Token de autenticação não fornecido');
  }
  
  try {
    // Aqui você validaria o token JWT e extrairia o ID do usuário
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // client.userId = decoded.userId;
    
    // Para fins de exemplo, vamos apenas armazenar o token
    client.userId = 'user-' + token.substring(0, 8);
    
    logger.info(`Cliente autenticado: ${clientId} (Usuário: ${client.userId})`);
    
    sendMessage(clientId, {
      type: MESSAGE_TYPES.MESSAGE,
      data: {
        message: 'Autenticação bem-sucedida',
        userId: client.userId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    throw new Error(`Falha na autenticação: ${error.message}`);
  }
}

/**
 * Inscreve um cliente em um canal
 * @param {string} clientId - ID do cliente
 * @param {Object} data - Dados de inscrição
 */
async function handleSubscribe(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  const { channel } = data || {};
  
  if (!channel) {
    throw new Error('Canal não especificado');
  }
  
  if (!Object.values(AVAILABLE_CHANNELS).includes(channel)) {
    throw new Error(`Canal inválido. Canais disponíveis: ${Object.values(AVAILABLE_CHANNELS).join(', ')}`);
  }
  
  client.channels.add(channel);
  
  logger.info(`Cliente ${clientId} inscrito no canal: ${channel}`);
  
  sendMessage(clientId, {
    type: MESSAGE_TYPES.MESSAGE,
    data: {
      message: `Inscrito no canal: ${channel}`,
      channel,
      timestamp: new Date().toISOString()
    }
  });
  
  // Se for o canal de chat, envia as últimas mensagens
  if (channel === AVAILABLE_CHANNELS.CHAT) {
    const chatHistory = await cache.get('chat:history') || [];
    sendMessage(clientId, {
      type: 'CHAT_HISTORY',
      data: chatHistory.slice(-50) // Últimas 50 mensagens
    });
  }
}

/**
 * Remove a inscrição de um cliente de um canal
 * @param {string} clientId - ID do cliente
 * @param {Object} data - Dados de cancelamento de inscrição
 */
async function handleUnsubscribe(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  const { channel } = data || {};
  
  if (!channel) {
    throw new Error('Canal não especificado');
  }
  
  if (client.channels.has(channel)) {
    client.channels.delete(channel);
    
    logger.info(`Cliente ${clientId} removido do canal: ${channel}`);
    
    sendMessage(clientId, {
      type: MESSAGE_TYPES.MESSAGE,
      data: {
        message: `Inscrição cancelada do canal: ${channel}`,
        channel,
        timestamp: new Date().toISOString()
      }
    });
  }
}

/**
 * Manipula mensagens de chat
 * @param {string} clientId - ID do cliente remetente
 * @param {Object} data - Dados da mensagem
 */
async function handleChatMessage(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  const { message } = data || {};
  
  if (!message || typeof message !== 'string' || message.trim() === '') {
    throw new Error('Mensagem inválida');
  }
  
  if (!client.userId) {
    throw new Error('Autenticação necessária para enviar mensagens');
  }
  
  // Cria o objeto de mensagem
  const chatMessage = {
    id: uuidv4(),
    userId: client.userId,
    clientId,
    message: message.trim(),
    timestamp: new Date().toISOString()
  };
  
  // Armazena a mensagem no cache
  const chatHistory = await cache.get('chat:history') || [];
  chatHistory.push(chatMessage);
  await cache.set('chat:history', chatHistory);
  
  logger.debug(`Nova mensagem de ${client.userId}: ${message}`);
  
  // Transmite a mensagem para todos os clientes inscritos no canal de chat
  broadcastToChannel(AVAILABLE_CHANNELS.CHAT, {
    type: 'CHAT_MESSAGE',
    data: chatMessage
  });
}

/**
 * Manipula o fechamento da conexão de um cliente
 * @param {string} clientId - ID do cliente
 */
function handleClose(clientId) {
  const client = clients.get(clientId);
  if (!client) return;
  
  // Remove o cliente do mapa
  clients.delete(clientId);
  
  logger.info(`Cliente desconectado: ${clientId} (Usuário: ${client.userId || 'não autenticado'})`);
}

/**
 * Manipula erros de conexão
 * @param {string} clientId - ID do cliente
 * @param {Error} error - Objeto de erro
 */
function handleError(clientId, error) {
  logger.error(`Erro no WebSocket do cliente ${clientId}:`, error);
  
  // Se o cliente ainda existir, tenta enviar uma mensagem de erro
  if (clients.has(clientId)) {
    sendError(clientId, 'Ocorreu um erro na conexão');
  }
  
  // Fecha a conexão
  if (clients.has(clientId)) {
    clients.get(clientId).ws.terminate();
    clients.delete(clientId);
  }
}

/**
 * Envia uma mensagem para um cliente específico
 * @param {string} clientId - ID do cliente
 * @param {Object} message - Mensagem a ser enviada
 */
function sendMessage(clientId, message) {
  const client = clients.get(clientId);
  if (!client || client.ws.readyState !== WebSocket.OPEN) return false;
  
  try {
    const messageStr = JSON.stringify(message);
    client.ws.send(messageStr);
    return true;
  } catch (error) {
    logger.error(`Erro ao enviar mensagem para ${clientId}:`, error);
    return false;
  }
}

/**
 * Envia uma mensagem de erro para um cliente
 * @param {string} clientId - ID do cliente
 * @param {string} errorMessage - Mensagem de erro
 */
function sendError(clientId, errorMessage) {
  return sendMessage(clientId, {
    type: MESSAGE_TYPES.ERROR,
    error: errorMessage,
    timestamp: new Date().toISOString()
  });
}

/**
 * Transmite uma mensagem para todos os clientes inscritos em um canal
 * @param {string} channel - Canal de transmissão
 * @param {Object} message - Mensagem a ser transmitida
 */
function broadcastToChannel(channel, message) {
  if (!channel || !Object.values(AVAILABLE_CHANNELS).includes(channel)) {
    logger.warn(`Tentativa de transmissão para canal inválido: ${channel}`);
    return;
  }
  
  let recipients = 0;
  const messageStr = JSON.stringify(message);
  
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN && client.channels.has(channel)) {
      try {
        client.ws.send(messageStr);
        recipients++;
      } catch (error) {
        logger.error(`Erro ao enviar mensagem para ${client.id}:`, error);
      }
    }
  });
  
  logger.debug(`Mensagem transmitida para ${recipients} clientes no canal ${channel}`);
}

/**
 * Transmite uma mensagem para todos os clientes conectados
 * @param {Object} message - Mensagem a ser transmitida
 */
function broadcast(message) {
  let recipients = 0;
  const messageStr = JSON.stringify(message);
  
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(messageStr);
        recipients++;
      } catch (error) {
        logger.error(`Erro ao enviar mensagem para ${client.id}:`, error);
      }
    }
  });
  
  logger.debug(`Mensagem transmitida para ${recipients} clientes`);
}

/**
 * Envia uma notificação para um usuário específico
 * @param {string} userId - ID do usuário
 * @param {Object} notification - Notificação a ser enviada
 */
function sendNotification(userId, notification) {
  let sent = 0;
  
  clients.forEach((client) => {
    if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify({
          type: 'NOTIFICATION',
          data: {
            ...notification,
            timestamp: new Date().toISOString()
          }
        }));
        sent++;
      } catch (error) {
        logger.error(`Erro ao enviar notificação para ${client.id}:`, error);
      }
    }
  });
  
  logger.debug(`Notificação enviada para ${sent} sessões do usuário ${userId}`);
  return sent > 0;
}

// Exporta funções úteis
export {
  broadcast,
  broadcastToChannel,
  sendNotification,
  MESSAGE_TYPES,
  AVAILABLE_CHANNELS
};

export default {
  setup: setupWebSocket,
  broadcast,
  broadcastToChannel,
  sendNotification,
  MESSAGE_TYPES,
  AVAILABLE_CHANNELS
};
