import express from 'express';
import { authenticateJWT as authenticateToken } from '../middleware/auth.js';
import * as providerService from '../services/providerService.js';

const router = express.Router();

/**
 * @route   POST /api/providers/list-models
 * @desc    Lista os modelos de um provedor de IA usando a chave de API fornecida.
 * @access  Privado
 */
router.post('/list-models', authenticateToken, async (req, res, next) => {
  const { provider, apiKey } = req.body;

  if (!provider || !apiKey) {
    return res.status(400).json({ success: false, error: 'Provedor e chave de API são obrigatórios.' });
  }

  try {
    const models = await providerService.listModels(provider, apiKey);
    res.json({ success: true, data: models });
  } catch (error) {
    // Encaminha o erro para o middleware de tratamento de erros
    next(error);
  }
});

export default router;
