import express from 'express';
import { getDatabase, dbAll, dbRun, dbGet } from '../services/database.js';
import { cacheGet, cacheSet, cacheDel } from '../services/cache.js';
import aiService from '../services/aiService.js';

const router = express.Router();

// Get all knowledge nodes
router.get('/nodes', async (req, res) => {
  try {
    const { type, limit = 100, search } = req.query;
    
    let query = 'SELECT * FROM knowledge_nodes';
    const params = [];
    const conditions = [];

    if (type && type !== 'all') {
      conditions.push('type = ?');
      params.push(type);
    }

    if (search) {
      conditions.push('(title LIKE ? OR content LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY importance DESC, last_modified DESC LIMIT ?';
    params.push(parseInt(limit));

    const nodes = await dbAll(query, params);
    
    // Parse JSON fields
    const formattedNodes = nodes.map(node => ({
      ...node,
      connections: node.connections ? JSON.parse(node.connections) : [],
      tags: node.tags ? JSON.parse(node.tags) : []
    }));

    res.json(formattedNodes);
  } catch (error) {
    console.error('Error fetching knowledge nodes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze knowledge graph for patterns and insights
router.post('/analyze', async (req, res) => {
  try {
    console.log('Starting knowledge graph analysis...');

    // Get all nodes
    const nodes = await dbAll('SELECT * FROM knowledge_nodes ORDER BY importance DESC');
    
    // Parse connections and tags
    const formattedNodes = nodes.map(node => ({
      ...node,
      connections: node.connections ? JSON.parse(node.connections) : [],
      tags: node.tags ? JSON.parse(node.tags) : []
    }));

    // Analyze patterns
    const analysis = {
      totalNodes: formattedNodes.length,
      nodeTypes: {},
      topTags: {},
      connectionPatterns: [],
      insights: []
    };

    // Count node types
    formattedNodes.forEach(node => {
      analysis.nodeTypes[node.type] = (analysis.nodeTypes[node.type] || 0) + 1;
    });

    // Count tags
    formattedNodes.forEach(node => {
      node.tags.forEach(tag => {
        analysis.topTags[tag] = (analysis.topTags[tag] || 0) + 1;
      });
    });

    // Find highly connected nodes
    const connectionCounts = formattedNodes.map(node => ({
      id: node.id,
      title: node.title,
      connectionCount: node.connections.length,
      importance: node.importance
    })).sort((a, b) => b.connectionCount - a.connectionCount);

    analysis.connectionPatterns = connectionCounts.slice(0, 10);

    // Generate AI insights about the graph
    try {
      const graphContext = {
        nodeCount: analysis.totalNodes,
        nodeTypes: analysis.nodeTypes,
        topTags: Object.entries(analysis.topTags)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10),
        highlyConnected: connectionCounts.slice(0, 5)
      };

      const aiInsight = await aiService.generateInsight({
        type: 'knowledge_graph_analysis',
        data: graphContext
      });

      analysis.insights.push(aiInsight);
    } catch (error) {
      console.error('Failed to generate AI insight for graph analysis:', error);
    }

    // Find potential new connections (nodes with similar tags but no connections)
    const potentialConnections = [];
    for (let i = 0; i < formattedNodes.length; i++) {
      for (let j = i + 1; j < formattedNodes.length; j++) {
        const nodeA = formattedNodes[i];
        const nodeB = formattedNodes[j];
        
        // Check if they're not already connected
        if (!nodeA.connections.includes(nodeB.id) && !nodeB.connections.includes(nodeA.id)) {
          // Check for shared tags
          const sharedTags = nodeA.tags.filter(tag => nodeB.tags.includes(tag));
          if (sharedTags.length >= 2) {
            potentialConnections.push({
              nodeA: { id: nodeA.id, title: nodeA.title },
              nodeB: { id: nodeB.id, title: nodeB.title },
              sharedTags,
              strength: sharedTags.length
            });
          }
        }
      }
    }

    analysis.potentialConnections = potentialConnections
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 10);

    // Cache the analysis
    await cacheSet('knowledge_graph:analysis', analysis, 300); // Cache for 5 minutes

    // Broadcast update to WebSocket clients
    if (global.broadcastToClients) {
      global.broadcastToClients({
        type: 'knowledge_graph_analyzed',
        data: analysis
      });
    }

    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing knowledge graph:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get node details with connections
router.get('/nodes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const node = await dbGet('SELECT * FROM knowledge_nodes WHERE id = ?', [id]);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Parse JSON fields
    const formattedNode = {
      ...node,
      connections: node.connections ? JSON.parse(node.connections) : [],
      tags: node.tags ? JSON.parse(node.tags) : []
    };

    // Get connected nodes details
    if (formattedNode.connections.length > 0) {
      const placeholders = formattedNode.connections.map(() => '?').join(',');
      const connectedNodes = await dbAll(
        `SELECT id, title, type, importance FROM knowledge_nodes WHERE id IN (${placeholders})`,
        formattedNode.connections
      );
      formattedNode.connectedNodes = connectedNodes;
    } else {
      formattedNode.connectedNodes = [];
    }

    res.json(formattedNode);
  } catch (error) {
    console.error('Error fetching node details:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update node
router.put('/nodes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if node exists
    const node = await dbGet('SELECT * FROM knowledge_nodes WHERE id = ?', [id]);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Build update query dynamically
    const allowedFields = ['title', 'type', 'content', 'connections', 'tags', 'importance'];
    const updateFields = [];
    const updateValues = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        if (['connections', 'tags'].includes(key)) {
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
      UPDATE knowledge_nodes 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, updateValues);

    // Clear analysis cache
    await cacheDel('knowledge_graph:analysis');

    const updatedNode = await dbGet('SELECT * FROM knowledge_nodes WHERE id = ?', [id]);

    res.json({ 
      message: 'Node updated successfully',
      node: {
        ...updatedNode,
        connections: JSON.parse(updatedNode.connections || '[]'),
        tags: JSON.parse(updatedNode.tags || '[]')
      }
    });
  } catch (error) {
    console.error('Error updating node:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get graph statistics
router.get('/stats', async (req, res) => {
  try {
    const cacheKey = 'knowledge_graph:stats';
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const stats = {};

    // Total nodes
    const totalNodes = await dbGet('SELECT COUNT(*) as count FROM knowledge_nodes');
    stats.totalNodes = totalNodes.count;

    // Nodes by type
    const nodesByType = await dbAll(`
      SELECT type, COUNT(*) as count 
      FROM knowledge_nodes 
      GROUP BY type 
      ORDER BY count DESC
    `);
    stats.nodesByType = nodesByType;

    // Average importance
    const avgImportance = await dbGet('SELECT AVG(importance) as avg FROM knowledge_nodes');
    stats.averageImportance = Math.round(avgImportance.avg || 0);

    // Most connected nodes
    const mostConnected = await dbAll(`
      SELECT id, title, type, importance,
             json_array_length(connections) as connection_count
      FROM knowledge_nodes
      WHERE json_array_length(connections) > 0
      ORDER BY connection_count DESC
      LIMIT 5
    `);
    stats.mostConnected = mostConnected;

    // Recent activity
    const recentActivity = await dbAll(`
      SELECT COUNT(*) as count, DATE(updated_at) as date
      FROM knowledge_nodes
      WHERE updated_at >= datetime('now', '-7 days')
      GROUP BY DATE(updated_at)
      ORDER BY date DESC
    `);
    stats.recentActivity = recentActivity;

    await cacheSet(cacheKey, stats, 300); // Cache for 5 minutes
    res.json(stats);
  } catch (error) {
    console.error('Error fetching graph stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;