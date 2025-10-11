import jwt from 'jsonwebtoken';
import { logger } from '../src/utils/logger.js';
import config from '../config/config.js';

/**
 * Middleware para autenticação JWT
 * Verifica o token JWT no cabeçalho de autorização
 */
export const authenticateJWT = (req, res, next) => {
  // Obtém o token do cabeçalho Authorization
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Tentativa de acesso sem token de autenticação', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    
    return res.status(401).json({
      success: false,
      error: 'Não autorizado',
      message: 'Token de autenticação não fornecido'
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Verifica e decodifica o token
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Adiciona o usuário decodificado ao objeto de requisição
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role || 'user',
      ...decoded
    };
    
    logger.debug(`Usuário autenticado: ${req.user.id} (${req.user.email})`, {
      role: req.user.role,
      path: req.path
    });
    
    next();
  } catch (error) {
    logger.warn('Falha na autenticação do token', {
      error: error.message,
      ip: req.ip,
      path: req.path
    });
    
    let errorMessage = 'Token inválido';
    
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Token expirado';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Token malformado';
    }
    
    return res.status(401).json({
      success: false,
      error: 'Não autorizado',
      message: errorMessage
    });
  }
};

/**
 * Middleware para verificar se o usuário tem uma determinada função
 * @param {...string} roles - Funções permitidas
 */
export const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn('Tentativa de verificação de função sem autenticação', {
        ip: req.ip,
        path: req.path
      });
      
      return res.status(401).json({
        success: false,
        error: 'Não autorizado',
        message: 'Autenticação necessária'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      logger.warn('Acesso negado: função insuficiente', {
        userId: req.user.id,
        requiredRoles: roles,
        userRole: req.user.role,
        path: req.path
      });
      
      return res.status(403).json({
        success: false,
        error: 'Acesso negado',
        message: 'Você não tem permissão para acessar este recurso'
      });
    }
    
    next();
  };
};

/**
 * Gera um token JWT para um usuário
 * @param {Object} user - Objeto do usuário
 * @param {string} user.id - ID do usuário
 * @param {string} user.email - Email do usuário
 * @param {string} [user.role] - Função do usuário (opcional)
 * @param {Object} [additionalClaims] - Reivindicações adicionais para incluir no token
 * @returns {string} Token JWT assinado
 */
export const generateToken = (user, additionalClaims = {}) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role || 'user',
    ...additionalClaims
  };
  
  const options = {
    expiresIn: config.jwtExpiresIn || '7d',
    issuer: 'gg-ai-dashboard',
    audience: ['gg-ai-dashboard']
  };
  
  return jwt.sign(payload, config.jwtSecret, options);
};

/**
 * Middleware para verificar se o usuário está autenticado e é o dono do recurso
 * ou tem uma função administrativa
 */
export const isOwnerOrAdmin = (req, res, next) => {
  const resourceId = req.params.userId || req.params.id;
  
  if (!resourceId) {
    logger.warn('ID do recurso não fornecido para verificação de propriedade', {
      userId: req.user?.id,
      path: req.path
    });
    
    return res.status(400).json({
      success: false,
      error: 'ID do recurso não fornecido'
    });
  }
  
  // Se o usuário for admin, permite o acesso
  if (req.user.role === 'admin') {
    return next();
  }
  
  // Se o ID do recurso for igual ao ID do usuário, permite o acesso
  if (req.user.id === resourceId) {
    return next();
  }
  
  logger.warn('Tentativa de acesso não autorizado a recurso', {
    userId: req.user.id,
    resourceId,
    path: req.path
  });
  
  return res.status(403).json({
    success: false,
    error: 'Acesso negado',
    message: 'Você só pode acessar seus próprios recursos'
  });
};

/**
 * Middleware para verificar se o token JWT é válido sem retornar erro
 * Útil para rotas que podem ser acessadas por usuários autenticados ou não
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role || 'user',
        ...decoded
      };
      
      logger.debug(`Usuário autenticado (opcional): ${req.user.id}`, {
        role: req.user.role,
        path: req.path
      });
    } catch (error) {
      // Ignora erros de autenticação, pois é opcional
      logger.debug('Token opcional inválido ou expirado', {
        error: error.message,
        path: req.path
      });
    }
  }
  
  next();
};