import { logger } from '../utils/logger.js';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants.js';

/**
 * Middleware para lidar com rotas não encontradas (404)
 * @param {Object} req - Objeto de requisição do Express
 * @param {Object} res - Objeto de resposta do Express
 * @param {Function} next - Próxima função de middleware
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Rota não encontrada: ${req.originalUrl}`);
  error.statusCode = HTTP_STATUS.NOT_FOUND;
  
  logger.warn(error.message, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  next(error);
};

/**
 * Middleware de tratamento de erros global
 * @param {Error} err - Objeto de erro
 * @param {Object} req - Objeto de requisição do Express
 * @param {Object} res - Objeto de resposta do Express
 * @param {Function} next - Próxima função de middleware
 */
export const errorHandler = (err, req, res, next) => {
  // Define valores padrão se não estiverem definidos
  err.statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  err.status = err.status || 'error';
  
  // Log do erro
  const logContext = {
    statusCode: err.statusCode,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  };
  
  // Log apropriado baseado no status do erro
  if (err.statusCode >= 500) {
    logger.error(err.message, logContext);
  } else {
    logger.warn(err.message, logContext);
  }
  
  // Em produção, não exponha detalhes do erro ao cliente
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    err.message = ERROR_MESSAGES.INTERNAL_ERROR;
  }
  
  // Resposta de erro formatada
  const errorResponse = {
    status: err.status,
    statusCode: err.statusCode,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };
  
  // Se for um erro de validação, adiciona os erros
  if (err.errors) {
    errorResponse.errors = err.errors;
  }
  
  // Se for um erro de validação do Joi, formata a resposta
  if (err.isJoi) {
    errorResponse.statusCode = HTTP_STATUS.BAD_REQUEST;
    errorResponse.message = 'Erro de validação';
    errorResponse.errors = err.details.map(detail => ({
      message: detail.message,
      path: detail.path,
      type: detail.type,
      context: detail.context
    }));
  }
  
  // Envia a resposta de erro
  res.status(errorResponse.statusCode).json(errorResponse);
};

/**
 * Middleware para capturar erros assíncronos
 * @param {Function} fn - Função assíncrona a ser executada
 * @returns {Function} Middleware do Express
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    // Se o erro não tiver um statusCode definido, define como 500
    if (!err.statusCode) {
      err.statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    }
    next(err);
  });
};

/**
 * Middleware para lidar com erros de validação
 * @param {Object} schema - Esquema Joi para validação
 * @param {string} [source='body'] - Origem dos dados a serem validados (body, query, params)
 * @returns {Function} Middleware de validação
 */
export const validateRequest = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true
    });
    
    if (error) {
      const validationError = new Error('Erro de validação');
      validationError.statusCode = HTTP_STATUS.BAD_REQUEST;
      validationError.isOperational = true;
      validationError.errors = error.details.map(detail => ({
        message: detail.message,
        path: detail.path,
        type: detail.type,
        context: detail.context
      }));
      
      return next(validationError);
    }
    
    // Substitui os dados da requisição pelos dados validados
    req[source] = value;
    next();
  };
};

/**
 * Middleware para verificar permissões de acesso
 * @param {Array} requiredRoles - Lista de funções permitidas
 * @returns {Function} Middleware de autorização
 */
export const authorize = (requiredRoles = []) => {
  return (req, res, next) => {
    try {
      // Verifica se o usuário está autenticado
      if (!req.user) {
        const error = new Error('Acesso não autorizado. Por favor, faça login.');
        error.statusCode = HTTP_STATUS.UNAUTHORIZED;
        throw error;
      }
      
      // Se não houver funções necessárias, permite o acesso
      if (requiredRoles.length === 0) {
        return next();
      }
      
      // Verifica se o usuário tem alguma das funções necessárias
      const hasPermission = requiredRoles.some(role => req.user.roles.includes(role));
      
      if (!hasPermission) {
        const error = new Error('Você não tem permissão para acessar este recurso.');
        error.statusCode = HTTP_STATUS.FORBIDDEN;
        throw error;
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default {
  notFoundHandler,
  errorHandler,
  asyncHandler,
  validateRequest,
  authorize
};
