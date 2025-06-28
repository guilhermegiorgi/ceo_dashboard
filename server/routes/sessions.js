import express from 'express';
import { getDatabase, dbAll, dbRun, dbGet } from '../services/database.js';
import { cacheGet, cacheSet, cacheDel } from '../services/cache.js';

const router = express.Router();

// Get all strategic sessions
router.get('/', async (req, res) => {
  try {
    const { status, type, limit = 50 } = req.query;
    
    let query = 'SELECT * FROM strategic_sessions';
    const params = [];
    const conditions = [];

    if (status && status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }

    if (type && type !== 'all') {
      conditions.push('type = ?');
      params.push(type);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const sessions = await dbAll(query, params);
    
    // Parse JSON fields
    const formattedSessions = sessions.map(session => ({
      ...session,
      participants: session.participants ? JSON.parse(session.participants) : [],
      preparation_notes: session.preparation_notes ? JSON.parse(session.preparation_notes) : [],
      expected_outcomes: session.expected_outcomes ? JSON.parse(session.expected_outcomes) : []
    }));

    res.json(formattedSessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new strategic session
router.post('/', async (req, res) => {
  try {
    const {
      title,
      type,
      description,
      suggested_duration,
      participants = [],
      preparation_notes = [],
      expected_outcomes = [],
      priority = 'medium',
      trigger_insight
    } = req.body;

    if (!title || !type || !description) {
      return res.status(400).json({ 
        error: 'Title, type, and description are required' 
      });
    }

    const id = Date.now().toString();
    
    await dbRun(`
      INSERT INTO strategic_sessions (
        id, title, type, description, suggested_duration, participants,
        preparation_notes, expected_outcomes, priority, trigger_insight, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, title, type, description, suggested_duration,
      JSON.stringify(participants), JSON.stringify(preparation_notes),
      JSON.stringify(expected_outcomes), priority, trigger_insight, 'suggested'
    ]);

    const newSession = await dbGet('SELECT * FROM strategic_sessions WHERE id = ?', [id]);

    res.json({ 
      message: 'Strategic session created successfully', 
      session: {
        ...newSession,
        participants: JSON.parse(newSession.participants || '[]'),
        preparation_notes: JSON.parse(newSession.preparation_notes || '[]'),
        expected_outcomes: JSON.parse(newSession.expected_outcomes || '[]')
      }
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Schedule a session
router.post('/:id/schedule', async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // Check if session exists
    const session = await dbGet('SELECT * FROM strategic_sessions WHERE id = ?', [id]);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await dbRun(`
      UPDATE strategic_sessions 
      SET status = 'scheduled', scheduled_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [date, id]);

    const updatedSession = await dbGet('SELECT * FROM strategic_sessions WHERE id = ?', [id]);

    // Broadcast update to WebSocket clients
    if (global.broadcastToClients) {
      global.broadcastToClients({
        type: 'session_scheduled',
        data: {
          ...updatedSession,
          participants: JSON.parse(updatedSession.participants || '[]'),
          preparation_notes: JSON.parse(updatedSession.preparation_notes || '[]'),
          expected_outcomes: JSON.parse(updatedSession.expected_outcomes || '[]')
        }
      });
    }

    res.json({ 
      message: 'Session scheduled successfully',
      session: {
        ...updatedSession,
        participants: JSON.parse(updatedSession.participants || '[]'),
        preparation_notes: JSON.parse(updatedSession.preparation_notes || '[]'),
        expected_outcomes: JSON.parse(updatedSession.expected_outcomes || '[]')
      }
    });
  } catch (error) {
    console.error('Error scheduling session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update session
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if session exists
    const session = await dbGet('SELECT * FROM strategic_sessions WHERE id = ?', [id]);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Build update query dynamically
    const allowedFields = [
      'title', 'type', 'description', 'suggested_duration', 'participants',
      'preparation_notes', 'expected_outcomes', 'priority', 'trigger_insight',
      'scheduled_date', 'status'
    ];
    
    const updateFields = [];
    const updateValues = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        if (['participants', 'preparation_notes', 'expected_outcomes'].includes(key)) {
          updateValues.push(JSON.stringify(value));
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
      UPDATE strategic_sessions 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, updateValues);

    const updatedSession = await dbGet('SELECT * FROM strategic_sessions WHERE id = ?', [id]);

    res.json({ 
      message: 'Session updated successfully',
      session: {
        ...updatedSession,
        participants: JSON.parse(updatedSession.participants || '[]'),
        preparation_notes: JSON.parse(updatedSession.preparation_notes || '[]'),
        expected_outcomes: JSON.parse(updatedSession.expected_outcomes || '[]')
      }
    });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate AI-suggested sessions based on insights
router.post('/generate', async (req, res) => {
  try {
    const { insights = [], context = {} } = req.body;

    // This would integrate with AI service to generate session suggestions
    // For now, we'll create mock suggestions based on insights
    const suggestedSessions = [];

    for (const insight of insights.slice(0, 3)) { // Limit to 3 sessions
      const sessionTypes = ['synergy_exploration', 'gap_analysis', 'pattern_validation', 'strategic_alignment'];
      const randomType = sessionTypes[Math.floor(Math.random() * sessionTypes.length)];

      const session = {
        title: `Strategic Session: ${insight.title}`,
        type: randomType,
        description: `Deep dive session to explore the implications and opportunities identified in: ${insight.content.substring(0, 200)}...`,
        suggested_duration: 90 + Math.floor(Math.random() * 60), // 90-150 minutes
        participants: ['CEO', 'CTO', 'Strategy Director', 'Domain Expert'],
        preparation_notes: [
          `Review insight: ${insight.title}`,
          'Gather relevant market data',
          'Prepare competitive analysis',
          'Review related project status'
        ],
        expected_outcomes: [
          'Validate strategic assumptions',
          'Identify concrete action items',
          'Define success metrics',
          'Establish timeline and responsibilities'
        ],
        priority: insight.priority,
        trigger_insight: insight.title
      };

      // Create the session
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      await dbRun(`
        INSERT INTO strategic_sessions (
          id, title, type, description, suggested_duration, participants,
          preparation_notes, expected_outcomes, priority, trigger_insight, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, session.title, session.type, session.description, session.suggested_duration,
        JSON.stringify(session.participants), JSON.stringify(session.preparation_notes),
        JSON.stringify(session.expected_outcomes), session.priority, session.trigger_insight, 'suggested'
      ]);

      suggestedSessions.push({ id, ...session });
    }

    res.json({ 
      message: 'Strategic sessions generated successfully',
      count: suggestedSessions.length,
      sessions: suggestedSessions
    });
  } catch (error) {
    console.error('Error generating sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;