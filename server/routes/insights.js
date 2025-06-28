import express from 'express';
import { getDatabase, dbAll, dbRun } from '../services/database.js';
import { generateAIInsights } from '../services/aiService.js';
import { cacheGet, cacheSet } from '../services/cache.js';

const router = express.Router();

// Get all insights
router.get('/', async (req, res) => {
  try {
    const cacheKey = 'insights:all';
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const insights = await dbAll(`
      SELECT * FROM insights 
      ORDER BY created_at DESC
    `);
    
    const formattedInsights = insights.map(insight => ({
      ...insight,
      metadata: insight.metadata ? JSON.parse(insight.metadata) : {},
      actionable: Boolean(insight.actionable)
    }));

    await cacheSet(cacheKey, formattedInsights, 60);
    res.json(formattedInsights);
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate new insights
router.post('/generate', async (req, res) => {
  try {
    const { source = 'manual', context } = req.body;
    
    // Generate insights using AI service
    const newInsights = await generateAIInsights(context);
    
    // Store insights in database
    for (const insight of newInsights) {
      await dbRun(`
        INSERT INTO insights (id, title, content, confidence, priority, actionable, source, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        insight.id,
        insight.title,
        insight.content,
        insight.confidence,
        insight.priority,
        insight.actionable ? 1 : 0,
        source,
        JSON.stringify(insight.metadata || {})
      ]);
    }
    
    // Clear cache
    await cacheDel('insights:all');
    
    res.json({ 
      message: 'Insights generated successfully', 
      count: newInsights.length,
      insights: newInsights
    });
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create action plan from insight
router.post('/:id/action-plan', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, tasks, assignedProject, priority, deadline } = req.body;
    
    // Get the insight
    const insight = await dbGet('SELECT * FROM insights WHERE id = ?', [id]);
    if (!insight) {
      return res.status(404).json({ error: 'Insight not found' });
    }
    
    // Create decision log note in Obsidian
    const decisionNote = {
      title: `Decision Log - ${insight.title}`,
      content: `# Decision Log: ${insight.title}

## Original Insight
${insight.content}

## Decision Made
Action plan created and tasks assigned to project: ${assignedProject}

## Action Items
${tasks.map((task, i) => `${i + 1}. ${task}`).join('\n')}

## Context
- Confidence Level: ${insight.confidence}%
- Priority: ${insight.priority}
- Date: ${new Date().toISOString().split('T')[0]}
- Source: AI Dashboard Insight

## Tags
#decision-log #ai-insight #action-taken

## Links
[[${assignedProject}]]
`,
      folder: 'Decision Logs'
    };
    
    // Create note in Obsidian
    await obsidianApi.createNote(decisionNote.title, decisionNote.content, decisionNote.folder);
    
    // Record feedback action
    await dbRun(`
      INSERT INTO feedback_actions (id, type, title, description, status, obsidian_note, related_project)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      Date.now().toString(),
      'decision',
      insight.title,
      'Created action plan and assigned tasks to project',
      'completed',
      `${decisionNote.folder}/${decisionNote.title}.md`,
      assignedProject
    ]);
    
    res.json({ 
      message: 'Action plan created successfully',
      decisionNote: decisionNote.title
    });
  } catch (error) {
    console.error('Error creating action plan:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get insight details with connected notes
router.get('/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    
    const insight = await dbGet('SELECT * FROM insights WHERE id = ?', [id]);
    if (!insight) {
      return res.status(404).json({ error: 'Insight not found' });
    }
    
    // Get connected notes from metadata
    const metadata = insight.metadata ? JSON.parse(insight.metadata) : {};
    const connectedNotes = metadata.connectedNotes || [];
    
    // Fetch note details from Obsidian
    const noteDetails = await Promise.all(
      connectedNotes.map(async (notePath) => {
        try {
          const note = await obsidianApi.getNoteContent(notePath);
          return {
            path: notePath,
            title: note.name || notePath,
            excerpt: note.content ? note.content.substring(0, 200) + '...' : ''
          };
        } catch (error) {
          return {
            path: notePath,
            title: notePath,
            excerpt: 'Note not accessible'
          };
        }
      })
    );
    
    res.json({
      ...insight,
      metadata: metadata,
      connectedNotes: noteDetails
    });
  } catch (error) {
    console.error('Error fetching insight details:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;