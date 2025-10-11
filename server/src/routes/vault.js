import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { indexVault } from '../services/obsidianService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

router.use(authMiddleware);

// Rota para forçar a reindexação (sincronização) do vault
router.post('/sync', async (req, res, next) => {
  try {
    const userId = req.user.id;
    logger.info(`Iniciando sincronização manual do vault para o usuário ${userId}`);
    
    // A função indexVault já lê os arquivos e atualiza o cache
    const result = await indexVault(userId);
    
    res.json({
      success: true,
      message: 'Vault sincronizado e indexado com sucesso!',
      data: result.stats,
    });
  } catch (error) {
    logger.error('Erro na sincronização manual do vault:', error, { userId: req.user.id });
    next(error);
  }
});

export default router;
