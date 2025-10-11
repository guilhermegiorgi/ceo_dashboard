import express from 'express';
import vaultService from '../services/vaultService.js';
import { authenticateJWT as authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/vault/stats
 * @desc    Obtém estatísticas do vault Obsidian
 * @access  Privado
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await vaultService.getVaultStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas do vault:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar estatísticas do vault',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// OBC sync + vault status
router.get('/obc/status', authenticateToken, async (req, res) => {
  try {
    const data = await vaultService.getObcStatus();
    res.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Erro ao buscar OBC status:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar OBC status' });
  }
});

// Recent changes from OBC
router.get('/recent-changes', authenticateToken, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const days = req.query.days ? parseInt(req.query.days) : 30;
    const data = await vaultService.getRecentChanges(limit, days);
    res.json({ success: true, data, limit, days, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Erro ao buscar mudanças recentes:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar mudanças recentes' });
  }
});

/**
 * @route   POST /api/vault/sync
 * @desc    Sincroniza o vault com o repositório Git
 * @access  Privado
 */
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const { direction = 'pull' } = req.body; // 'pull' ou 'push'

    let result;
    if (direction === 'push') {
      const message = req.body.message || 'Sync from CEO Dashboard';
      result = await vaultService.syncToGit(message);
    } else {
      result = await vaultService.syncFromGit();
    }

    res.json({
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro na sincronização do vault:', error);
    res.status(500).json({
      success: false,
      error: 'Erro na sincronização',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/vault/notes
 * @desc    Busca notas no vault com filtros
 * @access  Privado
 */
router.get('/notes', authenticateToken, async (req, res) => {
  try {
    const { query = '', folder = '', limit = 50, withContent = false } = req.query;

    let results;
    if (withContent === 'true') {
      results = await vaultService.searchNotesWithContent(query, parseInt(limit));
    } else {
      const searchResult = await vaultService.searchNotes(query, folder);
      results = searchResult.results.slice(0, parseInt(limit));
    }

    res.json({
      success: true,
      data: results,
      count: results.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao buscar notas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar notas',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/vault/notes/:path
 * @desc    Obtém o conteúdo de uma nota específica
 * @access  Privado
 */
router.get('/notes/:path(*)', authenticateToken, async (req, res) => {
  try {
    const notePath = req.params.path;
    const content = await vaultService.getNoteContent(notePath);

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Nota não encontrada'
      });
    }

    res.json({
      success: true,
      data: content,
      path: notePath,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao buscar conteúdo da nota:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar conteúdo da nota',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/vault/notes
 * @desc    Cria uma nova nota no vault
 * @access  Privado
 */
router.post('/notes', authenticateToken, async (req, res) => {
  try {
    const { title, content, folder = '' } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Título e conteúdo são obrigatórios'
      });
    }

    const result = await vaultService.createNote(title, content, folder);

    // Sincroniza com Git após criar nota
    await vaultService.syncToGit(`Nova nota: ${title}`);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao criar nota:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar nota',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
