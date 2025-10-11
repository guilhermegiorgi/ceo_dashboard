import express from 'express';
import { authService } from '../services/authService.js';
import { logger } from '../utils/logger.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

// Rota de Registro
router.post('/register', async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({
      success: true,
      data: user,
      message: 'Usuário registrado com sucesso.'
    });
  } catch (error) {
    next(error);
  }
});

// Rota de Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const data = await authService.login(email, password);
    res.json({
      success: true,
      data,
      message: 'Login bem-sucedido.'
    });
  } catch (error) {
    next(error);
  }
});

// Rota para Renovar o Token
router.post('/refresh-token', async (req, res, next) => {
  try {
    const { token } = req.body;
    const data = await authService.refreshToken(token);
    res.json({
      success: true,
      data,
      message: 'Token renovado com sucesso.'
    });
  } catch (error) {
    next(error);
  }
});

// Rota de Logout (exemplo)
router.post('/logout', authenticateJWT, async (req, res, next) => {
  try {
    // A lógica de logout pode variar. Aqui, apenas confirmamos.
    // A invalidação real do token acontece no frontend ao remover o token.
    res.json({ success: true, message: 'Logout bem-sucedido.' });
  } catch (error) {
    next(error);
  }
});

export default router;
