import jwt from "jsonwebtoken";
import { logger } from "../src/utils/logger.js";
import config from "../config/config.js";
import { query } from "../database/pg-pool.js";

/**
 * Middleware para autenticação JWT
 * Verifica o token JWT no cabeçalho de autorização
 */
export const authenticateJWT = (req, res, next) => {
  // Debug logging for /api/settings specifically
  if (req.path === '/' && req.baseUrl === '/api/settings') {
    console.log('[auth] /api/settings root - session check:', {
      path: req.path,
      baseUrl: req.baseUrl,
      isAuthenticatedExists: typeof req.isAuthenticated,
      isAuthenticated: req.isAuthenticated?.(),
      hasSession: !!req.session,
      sessionID: req.sessionID,
      hasPassportUser: !!req.session?.passport?.user,
      passportUser: req.session?.passport?.user,
      cookies: req.headers.cookie?.substring(0, 80),
    });
  }

  // Check for Passport session first (OAuth login)
  const hasPassportUser = req.session?.passport?.user;
  const isAuthenticatedMethod = req.isAuthenticated && req.isAuthenticated();
  
  console.log('[auth] Authentication check:', {
    path: req.path,
    hasIsAuthenticatedMethod: !!req.isAuthenticated,
    isAuthenticatedResult: isAuthenticatedMethod,
    hasSession: !!req.session,
    hasPassportUser: !!hasPassportUser,
    passportUserId: hasPassportUser,
    hasReqUser: !!req.user,
    reqUserId: req.user?.id,
  });
  
  if (isAuthenticatedMethod && req.user) {
    console.log('[auth] ✅ User authenticated via Passport session:', req.user?.email);
    return next();
  }
  
  // Fallback: check if session has passport user but req.user not populated yet
  if (hasPassportUser && !req.user) {
    console.log('[auth] ⚠️  Session has passport user but req.user not populated');
  }

  // Obtém o token do cabeçalho Authorization ou query parameter (para EventSource)
  const authHeader = req.headers.authorization;
  let token;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query.token) {
    // Fallback para query parameter (usado por EventSource)
    token = req.query.token;
  }

  if (!token) {
    logger.warn("Tentativa de acesso sem token de autenticação", {
      ip: req.ip,
      path: req.path,
      method: req.method,
      hasSession: !!req.session,
      sessionID: req.sessionID,
      hasPassportUser: !!req.session?.passport?.user,
    });

    return res.status(401).json({
      success: false,
      error: "Não autorizado",
      message: "Token de autenticação não fornecido ou sessão inválida",
    });
  }

  try {
    // Verifica e decodifica o token
    const decoded = jwt.verify(token, config.jwtSecret);

    // Adiciona o usuário decodificado ao objeto de requisição
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role || "user",
      ...decoded,
    };

    logger.debug(`Usuário autenticado: ${req.user.id} (${req.user.email})`, {
      role: req.user.role,
      path: req.path,
    });

    next();
  } catch (error) {
    logger.warn("Falha na autenticação do token", {
      error: error.message,
      ip: req.ip,
      path: req.path,
    });

    let errorMessage = "Token inválido";

    if (error.name === "TokenExpiredError") {
      errorMessage = "Token expirado";
    } else if (error.name === "JsonWebTokenError") {
      errorMessage = "Token malformado";
    }

    return res.status(401).json({
      success: false,
      error: "Não autorizado",
      message: errorMessage,
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
      logger.warn("Tentativa de verificação de função sem autenticação", {
        ip: req.ip,
        path: req.path,
      });

      return res.status(401).json({
        success: false,
        error: "Não autorizado",
        message: "Autenticação necessária",
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn("Acesso negado: função insuficiente", {
        userId: req.user.id,
        requiredRoles: roles,
        userRole: req.user.role,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: "Acesso negado",
        message: "Você não tem permissão para acessar este recurso",
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
    role: user.role || "user",
    ...additionalClaims,
  };

  const options = {
    expiresIn: config.jwtExpiresIn || "7d",
    issuer: "gg-ai-dashboard",
    audience: ["gg-ai-dashboard"],
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
    logger.warn("ID do recurso não fornecido para verificação de propriedade", {
      userId: req.user?.id,
      path: req.path,
    });

    return res.status(400).json({
      success: false,
      error: "ID do recurso não fornecido",
    });
  }

  // Se o usuário for admin, permite o acesso
  if (req.user.role === "admin") {
    return next();
  }

  // Se o ID do recurso for igual ao ID do usuário, permite o acesso
  if (req.user.id === resourceId) {
    return next();
  }

  logger.warn("Tentativa de acesso não autorizado a recurso", {
    userId: req.user.id,
    resourceId,
    path: req.path,
  });

  return res.status(403).json({
    success: false,
    error: "Acesso negado",
    message: "Você só pode acessar seus próprios recursos",
  });
};

/**
 * Middleware para verificar se o token JWT é válido sem retornar erro
 * Útil para rotas que podem ser acessadas por usuários autenticados ou não
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, config.jwtSecret);

      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role || "user",
        ...decoded,
      };

      logger.debug(`Usuário autenticado (opcional): ${req.user.id}`, {
        role: req.user.role,
        path: req.path,
      });
    } catch (error) {
      // Ignora erros de autenticação, pois é opcional
      logger.debug("Token opcional inválido ou expirado", {
        error: error.message,
        path: req.path,
      });
    }
  }

  next();
};

// ==========================================
// Multi-Tenant & Refresh Token Support
// ==========================================

const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "change-this-refresh-secret";

/**
 * Generate both access and refresh tokens for multi-tenant auth
 * @param {Object} user - User object with id, tenant_id, email, role
 * @returns {Object} - { accessToken, refreshToken }
 */
export const generateTokenPair = (user) => {
  const accessPayload = {
    userId: user.id,
    tenantId: user.tenant_id,
    email: user.email,
    role: user.role || "member",
  };

  const refreshPayload = {
    userId: user.id,
    tenantId: user.tenant_id,
  };

  const accessToken = jwt.sign(accessPayload, config.jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    issuer: "gg-ai-dashboard",
    audience: ["gg-ai-dashboard"],
  });

  const refreshToken = jwt.sign(refreshPayload, JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    issuer: "gg-ai-dashboard",
    audience: ["gg-ai-dashboard"],
  });

  return { accessToken, refreshToken };
};

/**
 * Verify refresh token and generate new token pair
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} - New token pair and user data
 */
export const refreshAccessToken = async (refreshToken) => {
  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    // Fetch user from database
    const result = await query(
      `SELECT id, tenant_id, email, name, role, status
       FROM users
       WHERE id = $1 AND status = 'active'`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      throw new Error("User not found or inactive");
    }

    const user = result.rows[0];

    // Generate new token pair
    const tokens = generateTokenPair(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Refresh token expired");
    }
    throw new Error("Invalid refresh token");
  }
};

/**
 * Refresh token endpoint handler
 */
export const refreshTokenHandler = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: "BadRequest",
        message: "Refresh token required",
      });
    }

    const result = await refreshAccessToken(refreshToken);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.warn("Failed to refresh token", {
      error: error.message,
      ip: req.ip,
    });

    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: error.message || "Invalid refresh token",
    });
  }
};
