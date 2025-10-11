import { Router } from 'express';
import authService from '../src/services/authService.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Renova o token de acesso usando o refresh token
 * @access  Público (mas requer refresh token válido)
 */
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: 'Refresh token é obrigatório'
    });
  }

  try {
    const result = await authService.refreshToken(refreshToken);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Refresh token inválido ou expirado',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Desconecta o usuário e invalida tokens
 * @access  Privado
 */
router.post('/logout', authenticateJWT, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.split(' ')[1];

    await authService.logout(req.user.id, token);

    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro no logout',
      message: error.message
    });
  }
});

export default router;
