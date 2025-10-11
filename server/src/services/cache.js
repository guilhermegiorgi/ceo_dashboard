import { createClient } from 'redis';
import { promisify } from 'util';
import config from '../../config/config.js';
import { logger } from '../utils/logger.js';

class CacheService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.useRedis = config.redis.url.startsWith('redis://');
    this.memoryCache = new Map();
    this.ttl = config.redis.ttl;
  }

  /**
   * Inicializa a conexão com o Redis
   */
  async connect() {
    if (this.connected) return;

    try {
      if (this.useRedis) {
        this.client = createClient({
          url: config.redis.url,
          socket: {
            reconnectStrategy: (retries) => {
              if (retries > 5) {
                logger.warn('Muitas tentativas de reconexão ao Redis. Usando cache em memória.');
                return new Error('Número máximo de tentativas de reconexão excedido');
              }
              // Exponencial backoff
              return Math.min(retries * 100, 5000);
            },
          },
        });

        this.client.on('error', (err) => {
          logger.error('Redis Client Error:', err);
          this.connected = false;
        });

        this.client.on('connect', () => {
          logger.info('Conectado ao Redis');
          this.connected = true;
        });

        this.client.on('reconnecting', () => {
          logger.info('Reconectando ao Redis...');
          this.connected = false;
        });

        await this.client.connect();

        // Promisify methods
        this.getAsync = this.client.get.bind(this.client);
        this.setAsync = this.client.set.bind(this.client);
        this.delAsync = this.client.del.bind(this.client);
        this.expireAsync = this.client.expire.bind(this.client);
        this.quitAsync = this.client.quit.bind(this.client);
      } else {
        logger.warn('Usando cache em memória. Não recomendado para produção.');
        this.connected = true;
      }
    } catch (error) {
      logger.error('Falha ao conectar ao Redis:', error);
      this.connected = false;
      this.useRedis = false;
      throw error;
    }
  }

  /**
   * Obtém um valor do cache
   * @param {string} key - Chave do cache
   * @returns {Promise<*>} Valor armazenado ou null se não existir
   */
  async get(key) {
    if (!this.connected) {
      await this.connect();
    }

    try {
      if (this.useRedis && this.connected) {
        const value = await this.getAsync(key);
        return value ? JSON.parse(value) : null;
      } else {
        const item = this.memoryCache.get(key);
        if (!item) return null;
        
        // Verifica se o item expirou
        if (item.expiresAt && item.expiresAt < Date.now()) {
          this.memoryCache.delete(key);
          return null;
        }
        
        return item.value;
      }
    } catch (error) {
      logger.error(`Erro ao obter chave ${key} do cache:`, error);
      return null;
    }
  }

  /**
   * Armazena um valor no cache
   * @param {string} key - Chave do cache
   * @param {*} value - Valor a ser armazenado
   * @param {number} ttl - Tempo de vida em segundos (opcional)
   * @returns {Promise<boolean>} Verdadeiro se bem-sucedido
   */
  async set(key, value, ttl = null) {
    if (!this.connected) {
      await this.connect();
    }

    const ttlToUse = ttl !== null ? ttl : this.ttl;

    try {
      if (this.useRedis && this.connected) {
        const serialized = JSON.stringify(value);
        if (ttlToUse) {
          await this.setAsync(key, serialized, {
            EX: ttlToUse,
          });
        } else {
          await this.setAsync(key, serialized);
        }
      } else {
        const item = {
          value,
          expiresAt: ttlToUse ? Date.now() + ttlToUse * 1000 : null,
        };
        this.memoryCache.set(key, item);
      }
      return true;
    } catch (error) {
      logger.error(`Erro ao definir chave ${key} no cache:`, error);
      return false;
    }
  }

  /**
   * Remove uma chave do cache
   * @param {string} key - Chave a ser removida
   * @returns {Promise<boolean>} Verdadeiro se bem-sucedido
   */
  async del(key) {
    if (!this.connected) {
      await this.connect();
    }

    try {
      if (this.useRedis && this.connected) {
        await this.delAsync(key);
      } else {
        this.memoryCache.delete(key);
      }
      return true;
    } catch (error) {
      logger.error(`Erro ao remover chave ${key} do cache:`, error);
      return false;
    }
  }

  /**
   * Define o tempo de vida de uma chave existente
   * @param {string} key - Chave do cache
   * @param {number} ttl - Tempo de vida em segundos
   * @returns {Promise<boolean>} Verdadeiro se bem-sucedido
   */
  async expire(key, ttl) {
    if (!this.connected) {
      await this.connect();
    }

    try {
      if (this.useRedis && this.connected) {
        const result = await this.expireAsync(key, ttl);
        return result === 1;
      } else {
        const item = this.memoryCache.get(key);
        if (item) {
          item.expiresAt = Date.now() + ttl * 1000;
          return true;
        }
        return false;
      }
    } catch (error) {
      logger.error(`Erro ao definir TTL para a chave ${key}:`, error);
      return false;
    }
  }

  /**
   * Limpa todo o cache
   * @returns {Promise<boolean>} Verdadeiro se bem-sucedido
   */
  async flush() {
    try {
      if (this.useRedis && this.connected) {
        await this.client.flushDb();
      } else {
        this.memoryCache.clear();
      }
      return true;
    } catch (error) {
      logger.error('Erro ao limpar o cache:', error);
      return false;
    }
  }

  /**
   * Fecha a conexão com o Redis
   */
  async close() {
    if (this.useRedis && this.connected) {
      try {
        await this.quitAsync();
        this.connected = false;
        logger.info('Conexão com o Redis encerrada');
      } catch (error) {
        logger.error('Erro ao encerrar conexão com o Redis:', error);
      }
    }
  }
}

// Instância singleton
export const cache = new CacheService();

// Inicializa o cache quando o módulo for carregado
cache.connect().catch(error => {
  logger.error('Falha ao conectar ao cache:', error);
});

// Função de inicialização para ser usada no app.js
export const initializeCache = async () => {
  try {
    await cache.connect();
    logger.info('Cache inicializado com sucesso');
    return cache;
  } catch (error) {
    logger.error('Falha ao inicializar o cache:', error);
    throw error;
  }
};

export default cache;
