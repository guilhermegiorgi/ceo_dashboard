import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { saveInsightNote, searchNotes } from '../services/obsidianService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/save-insight', async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const result = await saveInsightNote(title, content);
    res.status(201).json({
      success: true,
      message: 'Nota de insight salva com sucesso!',
      data: result,
    });
  } catch (error) {
    logger.error('Erro ao salvar nota de insight:', error);
    next(error);
  }
});

router.post('/search', async (req, res, next) => {
  try {
    const { query } = req.body;
    const userId = req.user.id;
    const results = await searchNotes(userId, query);
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Erro ao buscar notas:', error);
    next(error);
  }
});

router.get('/graph', async (req, res, next) => {
  try {
    // Para agora, vai usar o Brain Cloud MCP para obter o grafo
    // Futuramente podemos implementar cache específico para esta rota
    res.json({
      success: true,
      data: {
        nodes: [],
        edges: [],
        message: 'Grafo do Brain Cloud - método não implementado'
      }
    });
  } catch (error) {
    logger.error('Erro ao buscar grafo:', error);
    next(error);
  }
});

export default router;
