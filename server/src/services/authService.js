import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { generateTokenPair } from "../../middleware/auth.js";
import { logger } from "../utils/logger.js";
import { cache } from "./cache.js";
import config from "../../config/config.js";
import { query } from "../../database/pg-pool.js";

// Tempo de expiração padrão para tokens de redefinição de senha (1 hora)
const PASSWORD_RESET_EXPIRY = 3600;

class AuthService {
  /**
   * Registra um novo usuário
   * @param {Object} userData - Dados do usuário
   * @param {string} userData.email - Email do usuário
   * @param {string} userData.password - Senha do usuário
   * @param {string} [userData.name] - Nome do usuário (opcional)
   * @param {string} [userData.tenantId] - ID do tenant (opcional, usa default se não fornecido)
   * @returns {Promise<Object>} Dados do usuário criado (sem a senha)
   */
  async register(userData) {
    const { email, password, name, tenantId } = userData;

    // Validação básica
    if (!email || !password) {
      throw new Error("Email e senha são obrigatórios");
    }

    // Verifica se o usuário já existe
    const existingUser = await query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);

    if (existingUser.rows.length > 0) {
      throw new Error("Este email já está em uso");
    }

    // Obtém ou cria tenant padrão
    let finalTenantId = tenantId;
    if (!finalTenantId) {
      const defaultTenant = await query(
        "SELECT id FROM tenants WHERE slug = 'default' LIMIT 1"
      );

      if (defaultTenant.rows.length > 0) {
        finalTenantId = defaultTenant.rows[0].id;
      } else {
        // Cria tenant padrão se não existir
        const newTenant = await query(
          `INSERT INTO tenants (name, slug, status)
           VALUES ('Default', 'default', 'active')
           RETURNING id`,
          []
        );
        finalTenantId = newTenant.rows[0].id;
      }
    }

    // Criptografa a senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Cria o usuário no banco de dados
    const result = await query(
      `INSERT INTO users (tenant_id, email, password_hash, name, role, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, tenant_id, email, name, role, status, created_at, updated_at`,
      [
        finalTenantId,
        email,
        hashedPassword,
        name || email.split("@")[0],
        "user",
        "active",
      ]
    );

    const user = result.rows[0];

    logger.info(`Novo usuário registrado: ${user.email} (${user.id})`);

    return {
      id: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  /**
   * Autentica um usuário
   * @param {string} email - Email do usuário
   * @param {string} password - Senha do usuário
   * @returns {Promise<{user: Object, token: string, refreshToken: string}>} Dados do usuário, token JWT e refresh token
   */
  async login(email, password) {
    logger.info(`[Auth Service] Tentativa de login:`, { email, hasPassword: !!password });
    
    // Busca o usuário no banco de dados
    const result = await query(
      `SELECT id, tenant_id, email, password_hash, name, role, status
       FROM users
       WHERE email = $1`,
      [email]
    );

    logger.info(`[Auth Service] Usuário encontrado:`, { 
      found: result.rows.length > 0,
      email: email 
    });

    if (result.rows.length === 0) {
      logger.warn(`[Auth Service] Tentativa de login com email não cadastrado: ${email}`);
      throw new Error("Credenciais inválidas");
    }

    const user = result.rows[0];

    // Verifica se o usuário está ativo
    if (user.status !== "active") {
      logger.warn(`Tentativa de login com usuário inativo: ${email}`);
      throw new Error("Usuário inativo. Entre em contato com o administrador.");
    }

    // Verifica a senha
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      logger.warn(`[Auth Service] Tentativa de login com senha incorreta: ${email}`);
      logger.warn(`[Auth Service] Senha check:`, { 
        providedPasswordLength: password?.length || 0,
        storedPasswordHashLength: user.password_hash?.length || 0
      });
      throw new Error("Credenciais inválidas");
    }

    // Gera os tokens usando a função do middleware
    const tokens = generateTokenPair({
      id: user.id,
      tenant_id: user.tenant_id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // Armazena o refresh token no cache com expiração longa (7 dias)
    await cache.set(
      `refresh_token:${tokens.refreshToken}`,
      {
        userId: user.id,
        tenantId: user.tenant_id,
        email: user.email,
      },
      7 * 24 * 60 * 60
    ); // 7 dias em segundos

    logger.info(`Usuário autenticado com sucesso: ${user.email} (${user.id})`);

    return {
      user: {
        id: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Desconecta um usuário (invalida o token)
   * @param {string} userId - ID do usuário
   * @param {string} token - Token JWT a ser invalidado
   * @returns {Promise<boolean>} Verdadeiro se desconectado com sucesso
   */
  async logout(userId, token) {
    try {
      // Adiciona o token à blacklist no cache (expira após o tempo de vida do token)
      await cache.set(
        `blacklist:${token}`,
        { userId, loggedOutAt: new Date().toISOString() },
        15 * 60
      ); // 15 min

      logger.info(`Usuário desconectado: ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Erro ao desconectar usuário ${userId}:`, error);
      return false;
    }
  }

  /**
   * Gera um token de redefinição de senha
   * @param {string} email - Email do usuário
   * @returns {Promise<string>} Token de redefinição
   */
  async generatePasswordResetToken(email) {
    // Busca o usuário
    const result = await query(
      "SELECT id, email FROM users WHERE email = $1 AND status = $2",
      [email, "active"]
    );

    if (result.rows.length === 0) {
      // Não revelamos se o email existe por questões de segurança
      logger.warn(
        `Tentativa de redefinição de senha para email não cadastrado: ${email}`
      );
      return null;
    }

    const user = result.rows[0];

    // Gera um token único
    const resetToken = uuidv4();

    // Armazena o token no cache com expiração
    await cache.set(
      `password_reset:${resetToken}`,
      { userId: user.id, email: user.email },
      PASSWORD_RESET_EXPIRY
    );

    logger.info(`Token de redefinição gerado para: ${email}`);

    return resetToken;
  }

  /**
   * Redefine a senha de um usuário usando um token de redefinição
   * @param {string} token - Token de redefinição
   * @param {string} newPassword - Nova senha
   * @returns {Promise<boolean>} Verdadeiro se a senha foi redefinida com sucesso
   */
  async resetPassword(token, newPassword) {
    // Obtém os dados do token do cache
    const tokenData = await cache.get(`password_reset:${token}`);

    if (!tokenData) {
      throw new Error("Token inválido ou expirado");
    }

    const { userId, email } = tokenData;

    // Verifica se o usuário existe
    const result = await query(
      "SELECT id FROM users WHERE id = $1 AND email = $2",
      [userId, email]
    );

    if (result.rows.length === 0) {
      throw new Error("Usuário não encontrado");
    }

    // Criptografa a nova senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Atualiza a senha do usuário
    await query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [hashedPassword, userId]
    );

    // Remove o token de redefinição
    await cache.del(`password_reset:${token}`);

    logger.info(`Senha redefinida para o usuário: ${email}`);

    return true;
  }

  /**
   * Verifica se um token de redefinição de senha é válido
   * @param {string} token - Token de redefinição
   * @returns {Promise<{isValid: boolean, email: string|null}>} Se o token é válido e o email associado
   */
  async verifyPasswordResetToken(token) {
    const tokenData = await cache.get(`password_reset:${token}`);

    if (!tokenData) {
      return { isValid: false, email: null };
    }

    return {
      isValid: true,
      email: tokenData.email,
    };
  }

  /**
   * Atualiza o perfil do usuário
   * @param {string} userId - ID do usuário
   * @param {Object} updates - Campos para atualizar
   * @returns {Promise<Object>} Usuário atualizado
   */
  async updateProfile(userId, updates) {
    // Busca o usuário
    const userResult = await query(
      "SELECT id, tenant_id, email, name FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error("Usuário não encontrado");
    }

    // Atualiza apenas os campos permitidos
    const allowedUpdates = ["name"];
    const updateFields = [];
    const updateValues = [];
    let paramCounter = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key) && value !== undefined) {
        updateFields.push(`${key} = $${paramCounter}`);
        updateValues.push(value);
        paramCounter++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error("Nenhum campo válido para atualizar");
    }

    // Adiciona updated_at
    updateFields.push("updated_at = NOW()");
    updateValues.push(userId);

    // Executa a atualização
    const result = await query(
      `UPDATE users SET ${updateFields.join(
        ", "
      )} WHERE id = $${paramCounter} RETURNING id, tenant_id, email, name, role, status`,
      updateValues
    );

    const updatedUser = result.rows[0];

    logger.info(`Perfil atualizado: ${updatedUser.email} (${updatedUser.id})`);

    return {
      id: updatedUser.id,
      tenantId: updatedUser.tenant_id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      status: updatedUser.status,
    };
  }

  /**
   * Altera a senha do usuário
   * @param {string} userId - ID do usuário
   * @param {string} currentPassword - Senha atual
   * @param {string} newPassword - Nova senha
   * @returns {Promise<boolean>} Verdadeiro se a senha foi alterada com sucesso
   */
  async changePassword(userId, currentPassword, newPassword) {
    // Busca o usuário
    const result = await query(
      "SELECT id, email, password_hash FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error("Usuário não encontrado");
    }

    const user = result.rows[0];

    // Verifica a senha atual
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      throw new Error("Senha atual incorreta");
    }

    // Criptografa a nova senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Atualiza a senha
    await query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [hashedPassword, userId]
    );

    logger.info(`Senha alterada para o usuário: ${user.email}`);
    return true;
  }

  /**
   * Renova o token de acesso usando um refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<{user: Object, token: string, refreshToken: string}>} Novos tokens
   */
  async refreshToken(refreshToken) {
    try {
      // Verifica se o refresh token ainda é válido no cache
      const tokenData = await cache.get(`refresh_token:${refreshToken}`);
      if (!tokenData) {
        throw new Error("Refresh token expirado ou inválido");
      }

      // Busca o usuário no banco de dados
      const result = await query(
        `SELECT id, tenant_id, email, name, role, status
         FROM users
         WHERE id = $1 AND status = 'active'`,
        [tokenData.userId]
      );

      if (result.rows.length === 0) {
        throw new Error("Usuário não encontrado ou inativo");
      }

      const user = result.rows[0];

      // Gera novos tokens
      const tokens = generateTokenPair({
        id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        name: user.name,
        role: user.role,
      });

      // Invalida o refresh token antigo
      await cache.del(`refresh_token:${refreshToken}`);

      // Armazena o novo refresh token
      await cache.set(
        `refresh_token:${tokens.refreshToken}`,
        {
          userId: user.id,
          tenantId: user.tenant_id,
          email: user.email,
        },
        7 * 24 * 60 * 60
      ); // 7 dias

      logger.info(`Token renovado para usuário: ${user.email}`);

      return {
        user: {
          id: user.id,
          tenantId: user.tenant_id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        },
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      logger.warn(`Falha ao renovar token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Processa login OAuth (Google, etc.)
   * @param {Object} profile - Perfil do OAuth provider
   * @param {string} profile.id - ID do provider
   * @param {string} profile.email - Email do usuário
   * @param {string} profile.displayName - Nome do usuário
   * @param {string} provider - Nome do provider (google, etc.)
   * @returns {Promise<Object>} Usuário e tokens
   */
  async handleOAuthLogin(profile, provider) {
    const { email, displayName, id: providerId } = profile;

    // Busca o usuário pelo email
    let result = await query(
      `SELECT id, tenant_id, email, name, role, status
       FROM users
       WHERE email = $1`,
      [email]
    );

    let user;

    if (result.rows.length === 0) {
      // Usuário não existe, cria novo
      logger.info(`Criando novo usuário via OAuth ${provider}: ${email}`);

      // Obtém tenant padrão
      const defaultTenant = await query(
        "SELECT id FROM tenants WHERE slug = 'default' LIMIT 1"
      );

      let tenantId;
      if (defaultTenant.rows.length > 0) {
        tenantId = defaultTenant.rows[0].id;
      } else {
        // Cria tenant padrão
        const newTenant = await query(
          `INSERT INTO tenants (name, slug, status)
           VALUES ('Default', 'default', 'active')
           RETURNING id`
        );
        tenantId = newTenant.rows[0].id;
      }

      // Cria usuário sem senha (OAuth only)
      const newUserResult = await query(
        `INSERT INTO users (tenant_id, email, name, role, status, oauth_provider, oauth_provider_id)
         VALUES ($1, $2, $3, 'user', 'active', $4, $5)
         RETURNING id, tenant_id, email, name, role, status`,
        [tenantId, email, displayName, provider, providerId]
      );

      user = newUserResult.rows[0];
    } else {
      user = result.rows[0];

      // Atualiza o OAuth provider se necessário
      await query(
        `UPDATE users
         SET oauth_provider = $1, oauth_provider_id = $2, updated_at = NOW()
         WHERE id = $3`,
        [provider, providerId, user.id]
      );
    }

    // Gera tokens
    const tokens = generateTokenPair({
      id: user.id,
      tenant_id: user.tenant_id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // Armazena refresh token
    await cache.set(
      `refresh_token:${tokens.refreshToken}`,
      {
        userId: user.id,
        tenantId: user.tenant_id,
        email: user.email,
      },
      7 * 24 * 60 * 60
    );

    logger.info(
      `Login OAuth ${provider} bem-sucedido: ${user.email} (${user.id})`
    );

    return {
      user: {
        id: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Recupera o perfil básico de um usuário pelo ID.
   * @param {string} userId
   * @returns {Promise<object|null>}
   */
  async getUserById(userId) {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const result = await query(
      `SELECT id, tenant_id, email, name, picture, role, status, last_login_at, metadata, created_at, updated_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      email: row.email,
      name: row.name,
      picture: row.picture,
      role: row.role,
      status: row.status,
      lastLoginAt: row.last_login_at,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Exporta uma instância única do serviço
export const authService = new AuthService();

export default authService;
