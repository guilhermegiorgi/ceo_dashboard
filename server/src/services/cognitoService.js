import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { cache } from './cache.js';
import { logger } from '../utils/logger.js';
import config from '../../config/config.js';

// Chaves de cache
const CACHE_KEYS = {
  QUERY_RESPONSE: (queryId) => `cognito:query:${queryId}`,
  CHAT_SESSION: (sessionId) => `cognito:chat:${sessionId}`,
  INSIGHT: (insightId) => `cognito:insight:${insightId}`
};

// Tempo de cache padrão (1 hora)
const DEFAULT_CACHE_TTL = 3600;

// Cliente HTTP para a API do Cognito
const cognitoClient = axios.create({
  baseURL: config.cognito.apiUrl,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.cognito.apiKey}`,
    'X-Request-ID': uuidv4()
  }
});

// Adiciona um interceptor para log de requisições
cognitoClient.interceptors.request.use(
  (config) => {
    logger.debug('Enviando requisição para Cognito:', {
      method: config.method.toUpperCase(),
      url: config.url,
      data: config.data ? JSON.parse(config.data) : {}
    });
    return config;
  },
  (error) => {
    logger.error('Erro na requisição para Cognito:', error);
    return Promise.reject(error);
  }
);

// Adiciona um interceptor para log de respostas
cognitoClient.interceptors.response.use(
  (response) => {
    logger.debug('Resposta recebida do Cognito:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    if (error.response) {
      logger.error('Erro na resposta do Cognito:', {
        status: error.response.status,
        url: error.config.url,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      logger.error('Sem resposta do servidor Cognito:', error.request);
    } else {
      logger.error('Erro ao configurar a requisição para o Cognito:', error.message);
    }
    
    return Promise.reject(error);
  }
);

/**
 * Serviço para interação com a API do Cognito
 */
class CognitoService {
  /**
   * Processa uma consulta e retorna uma resposta
   * @param {string} query - Consulta do usuário
   * @param {Object} context - Contexto adicional para a consulta
   * @returns {Promise<Object>} Resposta processada
   */
  async processQuery(query, context = {}) {
    const queryId = uuidv4();
    const cacheKey = CACHE_KEYS.QUERY_RESPONSE(queryId);
    
    try {
      // Verifica se já temos uma resposta em cache para esta consulta
      const cachedResponse = await cache.get(cacheKey);
      if (cachedResponse) {
        logger.debug('Retornando resposta em cache para a consulta', { queryId });
        return cachedResponse;
      }
      
      logger.info('Processando consulta no Cognito', { queryId, query });
      
      // Prepara os dados da requisição
      const requestData = {
        query,
        context: {
          userId: context.userId || 'anonymous',
          sessionId: context.sessionId || uuidv4(),
          timestamp: new Date().toISOString(),
          ...context
        },
        options: {
          includeSources: true,
          maxTokens: 1000,
          temperature: 0.7,
          ...(context.options || {})
        }
      };
      
      // Envia a requisição para a API do Cognito
      const response = await cognitoClient.post('/query', requestData);
      
      // Formata a resposta
      const result = {
        id: queryId,
        query,
        response: response.data.response,
        sources: response.data.sources || [],
        metadata: {
          model: response.data.model || 'gpt-4',
          tokens: response.data.usage?.total_tokens || 0,
          timestamp: new Date().toISOString(),
          ...(response.data.metadata || {})
        }
      };
      
      // Armazena no cache
      await cache.set(cacheKey, result, DEFAULT_CACHE_TTL);
      
      return result;
      
    } catch (error) {
      logger.error('Erro ao processar consulta no Cognito:', error, { queryId });
      
      // Retorna uma resposta de erro amigável
      return {
        id: queryId,
        query,
        response: 'Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde.',
        sources: [],
        metadata: {
          error: true,
          message: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
  
  /**
   * Inicia uma nova sessão de chat
   * @param {Object} options - Opções da sessão
   * @returns {Promise<Object>} Dados da sessão
   */
  async startChatSession(options = {}) {
    const sessionId = uuidv4();
    const cacheKey = CACHE_KEYS.CHAT_SESSION(sessionId);
    
    const session = {
      id: sessionId,
      userId: options.userId || 'anonymous',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        model: options.model || 'gpt-4',
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 1000,
        ...(options.metadata || {})
      },
      messages: []
    };
    
    // Armazena a sessão no cache
    await cache.set(cacheKey, session, DEFAULT_CACHE_TTL);
    
    logger.info('Nova sessão de chat iniciada', { sessionId });
    
    return session;
  }
  
  /**
   * Envia uma mensagem em uma sessão de chat existente
   * @param {string} sessionId - ID da sessão
   * @param {string} message - Mensagem do usuário
   * @param {Object} options - Opções adicionais
   * @returns {Promise<Object>} Resposta do assistente
   */
  async sendChatMessage(sessionId, message, options = {}) {
    const cacheKey = CACHE_KEYS.CHAT_SESSION(sessionId);
    
    try {
      // Obtém a sessão do cache
      const session = await cache.get(cacheKey);
      
      if (!session) {
        throw new Error('Sessão não encontrada ou expirada');
      }
      
      // Adiciona a mensagem do usuário ao histórico
      const userMessage = {
        id: uuidv4(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };
      
      session.messages.push(userMessage);
      
      // Prepara o histórico de mensagens para o modelo
      const messages = session.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Envia a requisição para a API do Cognito
      const response = await cognitoClient.post('/chat', {
        sessionId,
        messages,
        options: {
          ...session.metadata,
          ...options
        }
      });
      
      // Adiciona a resposta do assistente ao histórico
      const assistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString(),
        metadata: {
          model: response.data.model,
          tokens: response.data.usage?.total_tokens,
          ...(response.data.metadata || {})
        }
      };
      
      session.messages.push(assistantMessage);
      session.updatedAt = new Date().toISOString();
      
      // Atualiza a sessão no cache
      await cache.set(cacheKey, session, DEFAULT_CACHE_TTL);
      
      logger.debug('Mensagem de chat processada', { 
        sessionId, 
        messageId: assistantMessage.id,
        tokens: assistantMessage.metadata.tokens 
      });
      
      return {
        sessionId,
        messageId: assistantMessage.id,
        response: assistantMessage.content,
        metadata: assistantMessage.metadata
      };
      
    } catch (error) {
      logger.error('Erro ao processar mensagem de chat:', error, { sessionId });
      
      // Retorna uma mensagem de erro amigável
      return {
        sessionId,
        messageId: uuidv4(),
        response: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
        metadata: {
          error: true,
          message: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
  
  /**
   * Gera insights com base em um conjunto de dados
   * @param {Object} data - Dados para análise
   * @param {Object} options - Opções de geração
   * @returns {Promise<Object>} Insights gerados
   */
  async generateInsights(data, options = {}) {
    const insightId = uuidv4();
    const cacheKey = CACHE_KEYS.INSIGHT(insightId);
    
    try {
      logger.info('Gerando insights no Cognito', { insightId });
      
      // Envia a requisição para a API do Cognito
      const response = await cognitoClient.post('/insights', {
        data,
        options: {
          model: 'gpt-4',
          maxInsights: 5,
          temperature: 0.7,
          ...options
        }
      });
      
      // Formata os insights
      const insights = {
        id: insightId,
        type: options.type || 'analysis',
        title: response.data.title || 'Análise de Dados',
        summary: response.data.summary || '',
        keyFindings: response.data.key_findings || [],
        recommendations: response.data.recommendations || [],
        metadata: {
          model: response.data.model || 'gpt-4',
          tokens: response.data.usage?.total_tokens || 0,
          timestamp: new Date().toISOString(),
          ...(response.data.metadata || {})
        }
      };
      
      // Armazena no cache
      await cache.set(cacheKey, insights, DEFAULT_CACHE_TTL);
      
      logger.debug('Insights gerados com sucesso', { 
        insightId, 
        tokens: insights.metadata.tokens 
      });
      
      return insights;
      
    } catch (error) {
      logger.error('Erro ao gerar insights no Cognito:', error, { insightId });
      
      // Retorna um objeto de insights vazio em caso de erro
      return {
        id: insightId,
        type: options.type || 'analysis',
        title: 'Análise de Dados',
        summary: 'Não foi possível gerar insights no momento. Por favor, tente novamente mais tarde.',
        keyFindings: [],
        recommendations: [],
        metadata: {
          error: true,
          message: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
  
  /**
   * Resume um texto longo
   * @param {string} text - Texto para resumir
   * @param {Object} options - Opções de resumo
   * @returns {Promise<string>} Texto resumido
   */
  async summarizeText(text, options = {}) {
    try {
      const response = await cognitoClient.post('/summarize', {
        text,
        options: {
          model: 'gpt-3.5-turbo',
          maxLength: 500,
          ...options
        }
      });
      
      return response.data.summary || text;
      
    } catch (error) {
      logger.error('Erro ao resumir texto no Cognito:', error);
      // Retorna o texto original em caso de erro
      return text;
    }
  }
  
  /**
   * Classifica um texto em categorias predefinidas
   * @param {string} text - Texto para classificar
   * @param {string[]} categories - Lista de categorias possíveis
   * @returns {Promise<string>} Categoria mais provável
   */
  async classifyText(text, categories) {
    try {
      const response = await cognitoClient.post('/classify', {
        text,
        categories,
        options: {
          model: 'gpt-3.5-turbo',
          temperature: 0.3
        }
      });
      
      return response.data.category || categories[0];
      
    } catch (error) {
      logger.error('Erro ao classificar texto no Cognito:', error);
      // Retorna a primeira categoria em caso de erro
      return categories[0];
    }
  }
}

// Exporta uma instância única do serviço
export const cognitoService = new CognitoService();

export default cognitoService;
