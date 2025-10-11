import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { generateToken } from '../../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { cache } from './cache.js';
import config from '../../config/config.js';

// Tempo de expiração padrão para tokens de redefinição de senha (1 hora)
const PASSWORD_RESET_EXPIRY = 3600;

class AuthService {
  constructor() {
    this.users = new Map(); // Em produção, substitua por um banco de dados real
    this.sessions = new Map(); // Armazena sessões ativas
  }

  /**
   * Registra um novo usuário
   * @param {Object} userData - Dados do usuário
   * @param {string} userData.email - Email do usuário
   * @param {string} userData.password - Senha do usuário
   * @param {string} [userData.name] - Nome do usuário (opcional)
   * @returns {Promise<Object>} Dados do usuário criado (sem a senha)
   */
  async register(userData) {
    const { email, password, name } = userData;
    
    // Validação básica
    if (!email || !password) {
      throw new Error('Email e senha são obrigatórios');
    }
    
    // Verifica se o usuário já existe
    if (this.users.has(email)) {
      throw new Error('Este email já está em uso');
    }
    
    // Criptografa a senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Cria o usuário
    const user = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      name: name || email.split('@')[0],
      role: 'user', // Função padrão
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Armazena o usuário (em produção, salve no banco de dados)
    this.users.set(email, user);
    
    // Remove a senha antes de retornar
    const { password: _, ...userWithoutPassword } = user;
    
    logger.info(`Novo usuário registrado: ${user.email} (${user.id})`);
    
    return userWithoutPassword;
  }
  
  /**
   * Autentica um usuário
   * @param {string} email - Email do usuário
   * @param {string} password - Senha do usuário
   * @returns {Promise<{user: Object, token: string, refreshToken: string}>} Dados do usuário, token JWT e refresh token
   */
  async login(email, password) {
    // Encontra o usuário
    const user = this.users.get(email);

    if (!user) {
      throw new Error('Credenciais inválidas');
    }

    // Verifica a senha
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new Error('Credenciais inválidas');
    }

    // Verifica se o usuário está verificado (se necessário)
    if (!user.isVerified) {
      throw new Error('Por favor, verifique seu email antes de fazer login');
    }

    // Gera os tokens
    const token = generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Registra a sessão (em produção, armazene no banco de dados)
    this.sessions.set(user.id, {
      userId: user.id,
      token,
      refreshToken,
      lastActivity: new Date().toISOString(),
      userAgent: 'web', // Em uma aplicação real, obtenha do cabeçalho da requisição
      ip: '127.0.0.1'   // Em uma aplicação real, obtenha do cabeçalho da requisição
    });

    // Armazena o refresh token no cache com expiração longa (30 dias)
    await cache.set(`refresh_token:${refreshToken}`, {
      userId: user.id,
      email: user.email
    }, 30 * 24 * 60 * 60); // 30 dias em segundos

    // Remove a senha antes de retornar
    const { password: _, ...userWithoutPassword } = user;

    logger.info(`Usuário autenticado: ${user.email} (${user.id})`);

    return {
      user: userWithoutPassword,
      token,
      refreshToken
    };
  }
  
  /**
   * Desconecta um usuário (invalida o token)
   * @param {string} userId - ID do usuário
   * @param {string} token - Token JWT a ser invalidado
   * @returns {Promise<boolean>} Verdadeiro se desconectado com sucesso
   */
  async logout(userId, token) {
    // Em uma aplicação real, você pode adicionar o token a uma lista negra
    // ou removê-lo da lista de sessões ativas
    
    // Para este exemplo, apenas removemos a sessão
    if (this.sessions.has(userId)) {
      this.sessions.delete(userId);
      logger.info(`Usuário desconectado: ${userId}`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Gera um token de redefinição de senha
   * @param {string} email - Email do usuário
   * @returns {Promise<string>} Token de redefinição
   */
  async generatePasswordResetToken(email) {
    const user = this.users.get(email);
    
    if (!user) {
      // Não revelamos se o email existe por questões de segurança
      logger.warn(`Tentativa de redefinição de senha para email não cadastrado: ${email}`);
      return null;
    }
    
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
      throw new Error('Token inválido ou expirado');
    }
    
    const { userId, email } = tokenData;
    const user = this.users.get(email);
    
    if (!user || user.id !== userId) {
      throw new Error('Usuário não encontrado');
    }
    
    // Criptografa a nova senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Atualiza a senha do usuário
    user.password = hashedPassword;
    user.updatedAt = new Date().toISOString();
    
    // Remove o token de redefinição
    await cache.del(`password_reset:${token}`);
    
    // Encerra todas as sessões do usuário (opcional, por segurança)
    this.sessions.delete(userId);
    
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
      email: tokenData.email
    };
  }
  
  /**
   * Atualiza o perfil do usuário
   * @param {string} userId - ID do usuário
   * @param {Object} updates - Campos para atualizar
   * @returns {Promise<Object>} Usuário atualizado
   */
  async updateProfile(userId, updates) {
    const user = Array.from(this.users.values()).find(u => u.id === userId);
    
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    
    // Atualiza apenas os campos permitidos
    const allowedUpdates = ['name', 'avatar'];
    const updatesToApply = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key) && value !== undefined) {
        updatesToApply[key] = value;
      }
    }
    
    // Aplica as atualizações
    const updatedUser = {
      ...user,
      ...updatesToApply,
      updatedAt: new Date().toISOString()
    };
    
    // Atualiza o usuário (em produção, atualize no banco de dados)
    this.users.set(user.email, updatedUser);
    
    // Remove a senha antes de retornar
    const { password, ...userWithoutPassword } = updatedUser;
    
    logger.info(`Perfil atualizado: ${user.email} (${user.id})`);
    
    return userWithoutPassword;
  }
  
  /**
   * Altera a senha do usuário
   * @param {string} userId - ID do usuário
   * @param {string} currentPassword - Senha atual
   * @param {string} newPassword - Nova senha
   * @returns {Promise<boolean>} Verdadeiro se a senha foi alterada com sucesso
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = Array.from(this.users.values()).find(u => u.id === userId);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verifica a senha atual
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      throw new Error('Senha atual incorreta');
    }

    // Criptografa a nova senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Atualiza a senha
    user.password = hashedPassword;
    user.updatedAt = new Date().toISOString();

    // Encerra todas as sessões do usuário (opcional, por segurança)
    this.sessions.delete(userId);

    logger.info(`Senha alterada para o usuário: ${user.email}`);
    return true;
  }

  /**
   * Gera um refresh token
   * @param {Object} user - Objeto do usuário
   * @returns {string} Refresh token
   */
  generateRefreshToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        type: 'refresh'
      },
      config.jwtSecret,
      {
        expiresIn: '30d', // Refresh token dura 30 dias
        issuer: 'gg-ai-dashboard',
        audience: ['gg-ai-dashboard']
      }
    );
  }

  /**
   * Renova o token de acesso usando um refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<{user: Object, token: string, refreshToken: string}>} Novos tokens
   */
  async refreshToken(refreshToken) {
    try {
      // Verifica o refresh token
      const decoded = jwt.verify(refreshToken, config.jwtSecret);

      if (decoded.type !== 'refresh') {
        throw new Error('Token inválido');
      }

      // Verifica se o refresh token ainda é válido no cache
      const tokenData = await cache.get(`refresh_token:${refreshToken}`);
      if (!tokenData) {
        throw new Error('Refresh token expirado ou inválido');
      }

      // Encontra o usuário
      const user = this.users.get(tokenData.email);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Gera novos tokens
      const newToken = generateToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      // Invalida o refresh token antigo
      await cache.del(`refresh_token:${refreshToken}`);

      // Armazena o novo refresh token
      await cache.set(`refresh_token:${newRefreshToken}`, {
        userId: user.id,
        email: user.email
      }, 30 * 24 * 60 * 60); // 30 dias

      // Remove a senha antes de retornar
      const { password: _, ...userWithoutPassword } = user;

      logger.info(`Token renovado para usuário: ${user.email}`);

      return {
        user: userWithoutPassword,
        token: newToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      logger.warn(`Falha ao renovar token: ${error.message}`);
      throw error;
    }
  }
}

// Exporta uma instância única do serviço
export const authService = new AuthService();

export default authService;
