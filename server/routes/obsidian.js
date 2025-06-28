import express from 'express';
import obsidianApi from '../services/obsidianApi.js';

const router = express.Router();

// Get vault information
router.get('/vault', async (req, res) => {
  try {
    const vaultInfo = await obsidianApi.getVaultInfo();
    res.json(vaultInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search notes
router.get('/search', async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    const results = await obsidianApi.searchNotes(query, parseInt(limit));
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get note content
router.get('/note/:path(*)', async (req, res) => {
  try {
    const notePath = req.params.path;
    const note = await obsidianApi.getNoteContent(notePath);
    res.json(note);
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
    
    const result = await obsidianApi.createNote(title, content, folder);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update existing note
router.put('/note/:path(*)', async (req, res) => {
  try {
    const notePath = req.params.path;
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const result = await obsidianApi.updateNote(notePath, content);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get note links
router.get('/note/:path(*)/links', async (req, res) => {
  try {
    const notePath = req.params.path;
    const links = await obsidianApi.getNoteLinks(notePath);
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent notes
router.get('/recent', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const notes = await obsidianApi.getRecentNotes(parseInt(limit));
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;