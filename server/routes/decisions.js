import express from 'express';
import { getDatabase, dbAll, dbRun, dbGet } from '../services/database.js';
import { cacheGet, cacheSet, cacheDel } from '../services/cache.js';

const router = express.Router();

// Get all decisions
router.get('/', async (req, res) => {
  try {
    const { category, status, limit = 50 } = req.query;
    
    let query = 'SELECT * FROM decisions';
    const params = [];
    const conditions = [];

    if (category && category !== 'all') {
      conditions.push('category = ?');
      params.push(category);
    }

    if (status && status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const decisions = await dbAll(query, params);
    
    // Parse JSON fields
    const formattedDecisions = decisions.map(decision => ({
      ...decision,
      tags: decision.tags ? JSON.parse(decision.tags) : [],
      related_insights: decision.related_insights ? JSON.parse(decision.related_insights) : [],
      would_do_again: Boolean(decision.would_do_again)
    }));

    res.json(formattedDecisions);
  } catch (error) {
    console.error('Error fetching decisions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new decision
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      context,
      decision,
      rationale,
      expected_outcome,
      confidence,
      impact,
      category,
      tags = [],
      related_insights = []
    } = req.body;

    if (!title || !description || !decision || !rationale) {
      return res.status(400).json({ 
        error: 'Title, description, decision, and rationale are required' 
      });
    }

    const id = Date.now().toString();
    const created_date = new Date().toISOString().split('T')[0];
    
    await dbRun(`
      INSERT INTO decisions (
        id, title, description, context, decision, rationale, expected_outcome,
        confidence, impact, category, status, created_date, tags, related_insights
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, title, description, context, decision, rationale, expected_outcome,
      confidence, impact, category, 'pending', created_date,
      JSON.stringify(tags), JSON.stringify(related_insights)
    ]);

    // Clear cache
    await cacheDel('decisions:all');

    const newDecision = await dbGet('SELECT * FROM decisions WHERE id = ?', [id]);

    res.json({ 
      message: 'Decision recorded successfully', 
      decision: {
        ...newDecision,
        tags: JSON.parse(newDecision.tags || '[]'),
        related_insights: JSON.parse(newDecision.related_insights || '[]')
      }
    });
  } catch (error) {
    console.error('Error creating decision:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update decision
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if decision exists
    const decision = await dbGet('SELECT * FROM decisions WHERE id = ?', [id]);
    if (!decision) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    // Build update query dynamically
    const allowedFields = [
      'title', 'description', 'context', 'decision', 'rationale', 
      'expected_outcome', 'actual_outcome', 'confidence', 'impact', 
      'category', 'status', 'review_date', 'tags', 'related_insights', 
      'lessons', 'would_do_again'
    ];
    
    const updateFields = [];
    const updateValues = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        if (key === 'tags' || key === 'related_insights') {
          updateValues.push(JSON.stringify(value));
        } else if (key === 'would_do_again') {
          updateValues.push(value ? 1 : 0);
        } else {
          updateValues.push(value);
        }
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateValues.push(id);

    await dbRun(`
      UPDATE decisions 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, updateValues);

    // Clear cache
    await cacheDel('decisions:all');

    const updatedDecision = await dbGet('SELECT * FROM decisions WHERE id = ?', [id]);

    res.json({ 
      message: 'Decision updated successfully',
      decision: {
        ...updatedDecision,
        tags: JSON.parse(updatedDecision.tags || '[]'),
        related_insights: JSON.parse(updatedDecision.related_insights || '[]'),
        would_do_again: Boolean(updatedDecision.would_do_again)
      }
    });
  } catch (error) {
    console.error('Error updating decision:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get decision analytics
router.get('/analytics', async (req, res) => {
  try {
    const analytics = {};

    // Success rate
    const successStats = await dbGet(`
      SELECT 
        COUNT(CASE WHEN status = 'validated' THEN 1 END) as validated,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(*) as total
      FROM decisions 
      WHERE status IN ('validated', 'failed')
    `);

    analytics.successRate = successStats.total > 0 
      ? Math.round((successStats.validated / (successStats.validated + successStats.failed)) * 100)
      : 0;

    // Average confidence
    const confidenceStats = await dbGet(`
      SELECT AVG(confidence) as avg_confidence
      FROM decisions
    `);

    analytics.averageConfidence = Math.round(confidenceStats.avg_confidence || 0);

    // Total decisions
    const totalStats = await dbGet(`
      SELECT COUNT(*) as total
      FROM decisions
    `);

    analytics.totalDecisions = totalStats.total;

    // Pending review
    const pendingStats = await dbGet(`
      SELECT COUNT(*) as pending
      FROM decisions
      WHERE status = 'implemented'
    `);

    analytics.pendingReview = pendingStats.pending;

    // Decisions by category
    const categoryStats = await dbAll(`
      SELECT category, COUNT(*) as count
      FROM decisions
      GROUP BY category
      ORDER BY count DESC
    `);

    analytics.byCategory = categoryStats;

    // Recent trends (last 30 days)
    const trendStats = await dbAll(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM decisions
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    analytics.recentTrends = trendStats;

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching decision analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;