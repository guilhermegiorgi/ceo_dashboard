import { generateAIInsights } from './aiService.js';
import obsidianApi from './obsidianApi.js';
import { dbRun, dbAll } from './database.js';

let backgroundIntervals = [];

export function startBackgroundServices() {
  console.log('Starting background services...');

  // Periodic insight generation (every 5 minutes)
  const insightInterval = setInterval(async () => {
    try {
      await generatePeriodicInsights();
    } catch (error) {
      console.error('Background insight generation error:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes

  // Knowledge graph sync (every 10 minutes)
  const syncInterval = setInterval(async () => {
    try {
      await syncKnowledgeGraph();
    } catch (error) {
      console.error('Knowledge graph sync error:', error);
    }
  }, 10 * 60 * 1000); // 10 minutes

  // Health check and cleanup (every hour)
  const cleanupInterval = setInterval(async () => {
    try {
      await performCleanup();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }, 60 * 60 * 1000); // 1 hour

  backgroundIntervals.push(insightInterval, syncInterval, cleanupInterval);
  console.log('Background services started successfully');
}

export function stopBackgroundServices() {
  backgroundIntervals.forEach(interval => clearInterval(interval));
  backgroundIntervals = [];
  console.log('Background services stopped');
}

async function generatePeriodicInsights() {
  console.log('Generating periodic insights...');
  
  try {
    // Get recent notes from Obsidian
    const recentNotes = await obsidianApi.getRecentNotes(5);
    
    // Generate insights based on recent activity
    const context = {
      recentNotes: recentNotes,
      timestamp: new Date().toISOString(),
      trigger: 'periodic'
    };
    
    const insights = await generateAIInsights(context);
    
    // Store insights in database
    for (const insight of insights) {
      await dbRun(`
        INSERT OR IGNORE INTO insights (id, title, content, confidence, priority, actionable, source, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        insight.id,
        insight.title,
        insight.content,
        insight.confidence,
        insight.priority,
        insight.actionable ? 1 : 0,
        'background',
        JSON.stringify(insight.metadata || {})
      ]);
    }
    
    // Broadcast new insights to connected clients
    if (global.broadcastToClients && insights.length > 0) {
      global.broadcastToClients({
        type: 'new_insights',
        data: insights,
        count: insights.length
      });
    }
    
    console.log(`Generated ${insights.length} periodic insights`);
  } catch (error) {
    console.error('Failed to generate periodic insights:', error);
  }
}

async function syncKnowledgeGraph() {
  console.log('Syncing knowledge graph...');
  
  try {
    // Get recent notes from Obsidian
    const recentNotes = await obsidianApi.getRecentNotes(20);
    
    for (const note of recentNotes) {
      try {
        // Get note content and links
        const content = await obsidianApi.getNoteContent(note.path);
        const links = await obsidianApi.getNoteLinks(note.path);
        
        // Extract tags from content
        const tags = extractTags(content.content || '');
        
        // Calculate importance score
        const importance = calculateImportance(content, links);
        
        // Update or insert knowledge node
        await dbRun(`
          INSERT OR REPLACE INTO knowledge_nodes 
          (id, title, type, content, connections, tags, last_modified, importance, obsidian_path)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          note.path,
          note.name,
          determineNodeType(content.content || ''),
          content.content || '',
          JSON.stringify(links.outgoing || []),
          JSON.stringify(tags),
          note.modified,
          importance,
          note.path
        ]);
        
      } catch (error) {
        console.error(`Failed to sync note ${note.path}:`, error);
      }
    }
    
    console.log(`Synced ${recentNotes.length} knowledge nodes`);
  } catch (error) {
    console.error('Failed to sync knowledge graph:', error);
  }
}

async function performCleanup() {
  console.log('Performing cleanup...');
  
  try {
    // Clean up old insights (older than 30 days)
    await dbRun(`
      DELETE FROM insights 
      WHERE created_at < datetime('now', '-30 days')
    `);
    
    // Clean up old feedback actions (older than 90 days)
    await dbRun(`
      DELETE FROM feedback_actions 
      WHERE created_at < datetime('now', '-90 days')
    `);
    
    // Update database statistics
    await dbRun('VACUUM');
    
    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Failed to perform cleanup:', error);
  }
}

function extractTags(content) {
  const tagRegex = /#[\w-]+/g;
  const matches = content.match(tagRegex) || [];
  return matches.map(tag => tag.substring(1)); // Remove # prefix
}

function determineNodeType(content) {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('project') || lowerContent.includes('initiative')) {
    return 'project';
  }
  if (lowerContent.includes('decision') || lowerContent.includes('choice')) {
    return 'decision';
  }
  if (lowerContent.includes('insight') || lowerContent.includes('analysis')) {
    return 'insight';
  }
  if (lowerContent.includes('person') || lowerContent.includes('team member')) {
    return 'person';
  }
  if (lowerContent.includes('concept') || lowerContent.includes('framework')) {
    return 'concept';
  }
  
  return 'note';
}

function calculateImportance(content, links) {
  let score = 50; // Base score
  
  // Increase score based on content length
  score += Math.min((content.content?.length || 0) / 100, 20);
  
  // Increase score based on number of connections
  score += Math.min((links.outgoing?.length || 0) * 5, 20);
  score += Math.min((links.incoming?.length || 0) * 3, 15);
  
  // Increase score for recent modifications
  const lastModified = new Date(content.frontmatter?.modified || Date.now());
  const daysSinceModified = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceModified < 7) {
    score += 10;
  } else if (daysSinceModified < 30) {
    score += 5;
  }
  
  return Math.min(Math.max(score, 0), 100);
}