import express from 'express';
import { getInsights, generateWeeklyInsights } from '../services/insightService.js';
import { authenticateJWT as authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/insights
 * @desc    Obtém todos os insights disponíveis
 * @access  Privado
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const insights = await getInsights();
    res.json({
      success: true,
      data: insights,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao buscar insights:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar insights',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/insights/weekly
 * @desc    Obtém insights semanais gerados a partir do conteúdo do Obsidian
 * @access  Privado
 */
router.get('/weekly', authenticateToken, async (req, res) => {
  try {
    const useCache = req.query.cache !== 'false';
    const options = {
      note_query: req.query.note_query || undefined,
      note_limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      prompt_template: req.query.template || undefined,
      temperature: req.query.temperature ? parseFloat(req.query.temperature) : undefined,
      iterations: req.query.iterations ? parseInt(req.query.iterations) : undefined,
      auto_save: req.query.auto_save === 'false' ? false : undefined,
    };
    const insights = await generateWeeklyInsights(useCache, options);
    
    res.json({
      success: true,
      data: insights,
      timestamp: new Date().toISOString(),
      cache: useCache ? 'HIT' : 'MISS'
    });
  } catch (error) {
    console.error('Erro ao buscar insights semanais:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar insights',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/insights/generate
 * @desc    Gera novos insights a partir de um conjunto de notas
 * @access  Privado
 */
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { notes, prompt } = req.body;
    
    if (!notes || !Array.isArray(notes)) {
      return res.status(400).json({
        success: false,
        error: 'O parâmetro "notes" é obrigatório e deve ser um array'
      });
    }

    const insights = await generateInsights(notes, prompt);
    
    res.json({
      success: true,
      data: insights,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao gerar insights:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao gerar insights',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
