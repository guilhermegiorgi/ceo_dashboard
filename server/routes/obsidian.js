import express from 'express';
import vaultService from '../services/vaultService.js';

const router = express.Router();

// Rota para salvar um insight gerado pela IA
router.post('/save-insight', async (req, res) => {
  try {
    const insightData = req.body;
    if (!insightData || !insightData.title) {
      return res.status(400).json({ error: 'Dados do insight incompletos. Título é obrigatório.' });
    }
    // Compatibilidade: aceitar 'content' como descrição
    if (!insightData.description && insightData.content) {
      insightData.description = insightData.content;
    }
    if (!insightData.description) {
      insightData.description = '(sem descrição)';
    }
    
    const result = await vaultService.saveInsightNote(insightData);
    res.status(201).json({ message: 'Nota de insight criada com sucesso!', ...result });
  } catch (error) {
    console.error('Erro na API ao salvar nota de insight:', error);
    res.status(500).json({ error: 'Falha ao salvar a nota de insight no vault.' });
  }
});

// Search notes
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    // A query é opcional, se não for fornecida, o serviço retorna todas as notas.
    const results = await vaultService.searchNotes(query || '');
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST variant for search (accepts { query })
router.post('/search', async (req, res) => {
  try {
    const { query } = req.body || {};
    const results = await vaultService.searchNotes(query || '');
    res.json({ success: true, data: results.results, count: results.results?.length || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get note content
router.get('/note/:path(*)', async (req, res) => {
  try {
    const notePath = req.params.path;
    const note = await vaultService.getNoteContent(notePath);
    if (note) {
      res.json(note);
    } else {
      res.status(404).json({ error: 'Nota não encontrada.' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new note
router.post('/note', async (req, res) => {
  try {
    const { title, content, folder } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    const result = await vaultService.createNote(title, content, folder);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
