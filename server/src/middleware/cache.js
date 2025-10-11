import { cache } from '../services/cache.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware para cache de respostas da API
 * @param {Object} options - Opções de configuração
 * @param {number} [options.ttl] - Tempo de vida do cache em segundos
 * @param {boolean} [options.bypassOnError=true] - Se deve ignorar erros de cache
 * @param {Function} [options.keyGenerator] - Função para gerar chaves de cache personalizadas
 * @returns {Function} Middleware do Express
 */
const cacheMiddleware = (options = {}) => {
  const {
    ttl = 300, // 5 minutos por padrão
    bypassOnError = true,
    keyGenerator = defaultKeyGenerator
  } = options;

  return async (req, res, next) => {
    // Apenas armazenamos em cache requisições GET
    if (req.method !== 'GET') {
      return next();
    }

    // Gera a chave de cache para esta requisição
    const cacheKey = keyGenerator(req);
    
    try {
      // Tenta obter a resposta do cache
      const cachedData = await cache.get(cacheKey);
      
      if (cachedData !== null) {
        logger.debug(`Cache HIT: ${cacheKey}`, {
          path: req.path,
          method: req.method
        });
        
        // Define o cabeçalho X-Cache para indicar que a resposta veio do cache
        res.set('X-Cache', 'HIT');
        
        return res.json({
          ...cachedData,
          _cached: true,
          _cachedAt: new Date().toISOString()
        });
      }
      
      // Se não encontrou no cache, continua para o próximo middleware
      // mas sobrescreve o método res.json para capturar a resposta
      const originalJson = res.json;
      
      res.json = (body) => {
        // Armazena a resposta no cache
        if (res.statusCode === 200 && !body.error) {
          cache.set(cacheKey, body, ttl)
            .then(() => {
              logger.debug(`Cache SET: ${cacheKey} (TTL: ${ttl}s)`, {
                path: req.path,
                method: req.method,
                ttl
              });
            })
            .catch(error => {
              logger.error('Erro ao armazenar no cache:', error);
            });
        }
        
        // Define o cabeçalho X-Cache para indicar que a resposta não veio do cache
        res.set('X-Cache', 'MISS');
        
        // Chama o método json original
        return originalJson.call(res, body);
      };
      
      next();
    } catch (error) {
      logger.error('Erro no middleware de cache:', error);
      
      if (bypassOnError) {
        // Em caso de erro, continua sem cache
        next();
      } else {
        res.status(500).json({
          success: false,
          error: 'Erro no sistema de cache',
          message: 'Não foi possível recuperar os dados do cache'
        });
      }
    }
  };
};

/**
 * Gera uma chave de cache padrão baseada na URL e nos parâmetros da requisição
 * @param {Object} req - Objeto de requisição do Express
 * @returns {string} Chave de cache
 */
const defaultKeyGenerator = (req) => {
  const { originalUrl, method, query, body, user } = req;
  
  // Cria um hash simples baseado na URL, método, query params e corpo
  const keyData = {
    url: originalUrl,
    method,
    query,
    // Inclui o corpo apenas se for uma requisição GET com corpo (não comum, mas possível)
    ...(method === 'GET' && Object.keys(body).length > 0 && { body }),
    // Inclui o ID do usuário se estiver autenticado para cache específico por usuário
    ...(user?.id && { userId: user.id })
  };
  
  // Converte para string e gera um hash simples
  const keyString = JSON.stringify(keyData);
  return `api:${hashCode(keyString)}`;
};

/**
 * Função auxiliar para gerar um hash de uma string
 * @param {string} str - String para gerar o hash
 * @returns {string} Hash da string
 */
const hashCode = (str) => {
  let hash = 0;
  
  if (str.length === 0) return '0';
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Converte para inteiro de 32 bits
  }
  
  return Math.abs(hash).toString(16);
};

/**
 * Middleware para limpar o cache de rotas específicas
 * Útil para limpar o cache após operações de escrita
 * @param {string|Function} key - Chave de cache ou função para gerar a chave
 * @returns {Function} Middleware do Express
 */
const clearCache = (key) => {
  return async (req, res, next) => {
    // Salva a função next original
    const originalJson = res.json;
    
    // Sobrescreve o método json para limpar o cache após o envio da resposta
    res.json = async (body) => {
      try {
        // Gera a chave de cache se for uma função
        const cacheKey = typeof key === 'function' ? key(req) : key;
        
        if (cacheKey) {
          await cache.del(cacheKey);
          logger.debug(`Cache CLEAR: ${cacheKey}`, {
            path: req.path,
            method: req.method
          });
          
          // Se o corpo da resposta incluir dados, também limpamos o cache baseado nesses dados
          if (body && body.id) {
            const itemCacheKey = `api:item:${body.id}`;
            await cache.del(itemCacheKey);
            logger.debug(`Cache CLEAR: ${itemCacheKey}`);
          }
        }
      } catch (error) {
        logger.error('Erro ao limpar o cache:', error);
        // Não interrompe o fluxo em caso de erro
      }
      
      // Chama o método json original
      return originalJson.call(res, body);
    };
    
    next();
  };
};

export { cacheMiddleware, clearCache };

export default cacheMiddleware;
