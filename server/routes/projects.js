import express from 'express';
import { getDatabase, dbAll, dbRun, dbGet, ensureDbHelpers } from '../services/database.js';
import { cacheGet, cacheSet, cacheDel } from '../services/cache.js';

const router = express.Router();

// Get all projects
router.get('/', async (req, res) => {
  try {
    ensureDbHelpers(); // Inicializa helpers do SQLite
    const cacheKey = 'projects:all';
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const projects = await dbAll(`
      SELECT * FROM projects 
      ORDER BY created_at DESC
    `);
    
    await cacheSet(cacheKey, projects, 120); // Cache for 2 minutes
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new project
router.post('/', async (req, res) => {
  try {
    const {
      name,
      status = 'Planning',
      progress = 0,
      team_size = 1,
      budget,
      deadline,
      priority = 'medium',
      roi = '+0%',
      description = ''
    } = req.body;

    if (!name || !budget || !deadline) {
      return res.status(400).json({ 
        error: 'Name, budget, and deadline are required' 
      });
    }

    const id = Date.now().toString();
    
    await dbRun(`
      INSERT INTO projects (id, name, status, progress, team_size, budget, deadline, priority, roi, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, name, status, progress, team_size, budget, deadline, priority, roi, description]);

    // Clear cache
    await cacheDel('projects:all');

    // Broadcast update to WebSocket clients
    if (global.broadcastToClients) {
      global.broadcastToClients({
        type: 'project_created',
        data: { id, name, status, progress, team_size, budget, deadline, priority, roi, description }
      });
    }

    res.json({ 
      message: 'Project created successfully', 
      id,
      project: { id, name, status, progress, team_size, budget, deadline, priority, roi, description }
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update project
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if project exists
    const project = await dbGet('SELECT * FROM projects WHERE id = ?', [id]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Build update query dynamically
    const allowedFields = ['name', 'status', 'progress', 'team_size', 'budget', 'deadline', 'priority', 'roi', 'description'];
    const updateFields = [];
    const updateValues = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateValues.push(id); // Add id for WHERE clause

    await dbRun(`
      UPDATE projects 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, updateValues);

    // Clear cache
    await cacheDel('projects:all');

    // Get updated project
    const updatedProject = await dbGet('SELECT * FROM projects WHERE id = ?', [id]);

    // Broadcast update to WebSocket clients
    if (global.broadcastToClients) {
      global.broadcastToClients({
        type: 'project_updated',
        data: updatedProject
      });
    }

    res.json({ 
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const project = await dbGet('SELECT * FROM projects WHERE id = ?', [id]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if project exists
    const project = await dbGet('SELECT * FROM projects WHERE id = ?', [id]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await dbRun('DELETE FROM projects WHERE id = ?', [id]);

    // Clear cache
    await cacheDel('projects:all');

    // Broadcast update to WebSocket clients
    if (global.broadcastToClients) {
      global.broadcastToClients({
        type: 'project_deleted',
        data: { id }
      });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;