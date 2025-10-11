import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import config from './config.js';

/**
 * Serviço para gerenciamento de tokens JWT
 */
class JwtService {
  constructor() {
    this.secret = config.jwt.secret;
    this.accessTokenExpiresIn = config.jwt.accessTokenExpiresIn;
    this.refreshTokenExpiresIn = config.jwt.refreshTokenExpiresIn;
    this.issuer = config.jwt.issuer;
    this.audience = config.jwt.audience;
  }

  /**
   * Gera um token JWT
   * @param {Object} payload - Dados a serem incluídos no token
   * @param {Object} options - Opções adicionais
   * @returns {string} Token JWT assinado
   */
  signToken(payload, options = {}) {
    const {
      expiresIn = this.accessTokenExpiresIn,
      subject = 'access',
      secret = this.secret,
      ...otherOptions
    } = options;

    const jwtId = uuidv4();
    const tokenPayload = {
      ...payload,
      jti: jwtId,
      iat: Math.floor(Date.now() / 1000),
      iss: this.issuer,
      aud: this.audience,
    };

    const signOptions = {
      ...otherOptions,
      expiresIn,
      subject,
      algorithm: 'HS256', // Algoritmo de assinatura
    };

    try {
      const token = jwt.sign(tokenPayload, secret, signOptions);
      
      logger.debug('Token JWT gerado com sucesso', {
        payload: { ...payload, jti: jwtId },
        expiresIn,
        subject,
      });
      
      return token;
    } catch (error) {
      logger.error('Erro ao gerar token JWT:', {
        error: error.message,
        stack: error.stack,
      });
      throw new Error('Falha ao gerar token de autenticação');
    }
  }

  /**
   * Verifica e decodifica um token JWT
   * @param {string} token - Token JWT a ser verificado
   * @param {Object} options - Opções adicionais
   * @returns {Object} Payload decodificado
   */
  verifyToken(token, options = {}) {
    const { secret = this.secret, ...otherOptions } = options;

    const verifyOptions = {
      ...otherOptions,
      algorithms: ['HS256'],
      issuer: this.issuer,
      audience: this.audience,
    };

    try {
      const decoded = jwt.verify(token, secret, verifyOptions);
      
      logger.debug('Token JWT verificado com sucesso', {
        jti: decoded.jti,
        sub: decoded.sub,
        exp: new Date(decoded.exp * 1000).toISOString(),
      });
      
      return decoded;
    } catch (error) {
      logger.warn('Falha ao verificar token JWT:', {
        error: error.message,
        name: error.name,
      });
      
      // Lança erros específicos com base no tipo de falha
      if (error.name === 'TokenExpiredError') {
        const err = new Error('Token expirado');
        err.name = 'TokenExpiredError';
        err.expiredAt = error.expiredAt;
        throw err;
      }
      
      if (error.name === 'JsonWebTokenError') {
        const err = new Error('Token inválido');
        err.name = 'JsonWebTokenError';
        throw err;
      }
      
      throw new Error('Falha ao verificar token de autenticação');
    }
  }

  /**
   * Gera um par de tokens (access e refresh)
   * @param {Object} payload - Dados a serem incluídos nos tokens
   * @returns {Object} Objeto contendo accessToken e refreshToken
   */
  generateTokenPair(payload) {
    const accessToken = this.signToken(payload, {
      expiresIn: this.accessTokenExpiresIn,
      subject: 'access',
    });

    const refreshToken = this.signToken(
      { ...payload, isRefreshToken: true },
      {
        expiresIn: this.refreshTokenExpiresIn,
        subject: 'refresh',
      }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Atualiza um par de tokens usando um refresh token
   * @param {string} refreshToken - Refresh token válido
   * @returns {Object} Novo par de tokens
   */
  refreshTokens(refreshToken) {
    try {
      // Verifica se o refresh token é válido
      const decoded = this.verifyToken(refreshToken, {
        subject: 'refresh',
      });

      // Remove propriedades específicas do refresh token
      const { isRefreshToken, iat, exp, jti, ...payload } = decoded;

      // Gera um novo par de tokens
      return this.generateTokenPair(payload);
    } catch (error) {
      logger.error('Falha ao atualizar tokens:', {
        error: error.message,
        name: error.name,
      });
      throw error;
    }
  }

  /**
   * Extrai o token de um header de autorização
   * @param {string} authHeader - Cabeçalho de autorização (ex: 'Bearer token123')
   * @returns {string|null} Token extraído ou null se inválido
   */
  extractToken(authHeader) {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    
    // Verifica se o cabeçalho está no formato correto: 'Bearer token'
    if (parts.length !== 2 || !/^Bearer$/i.test(parts[0])) {
      return null;
    }

    return parts[1];
  }

  /**
   * Middleware para autenticação JWT
   * @param {Array} roles - Lista de funções permitidas (opcional)
   * @returns {Function} Middleware do Express
   */
  authenticate(roles = []) {
    return (req, res, next) => {
      try {
        // Extrai o token do cabeçalho de autorização
        const authHeader = req.headers.authorization || req.headers.Authorization;
        const token = this.extractToken(authHeader);

        if (!token) {
          return res.status(401).json({
            success: false,
            message: 'Token de autenticação não fornecido',
          });
        }

        // Verifica e decodifica o token
        const decoded = this.verifyToken(token, { subject: 'access' });

        // Verifica se o usuário tem a função necessária
        if (roles.length > 0 && !roles.some(role => decoded.roles?.includes(role))) {
          return res.status(403).json({
            success: false,
            message: 'Acesso não autorizado para este recurso',
          });
        }

        // Adiciona o usuário decodificado à requisição
        req.user = decoded;
        req.token = token;

        next();
      } catch (error) {
        logger.warn('Falha na autenticação JWT:', {
          error: error.message,
          name: error.name,
        });

        if (error.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            message: 'Sessão expirada. Faça login novamente.',
            code: 'TOKEN_EXPIRED',
            expiredAt: error.expiredAt,
          });
        }

        if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({
            success: false,
            message: 'Token inválido',
            code: 'INVALID_TOKEN',
          });
        }

        next(error);
      }
    };
  }
}

// Exporta uma instância única do serviço JWT
export const jwtService = new JwtService();

export default jwtService;
