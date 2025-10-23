import express from 'express';
import brainCloudService from '../services/brainCloudService.js';
import brainCloudClient from '../services/brainCloudClient.js';

const router = express.Router();

function normalizeGraphPayload(raw) {
  if (!raw) {
    return { nodes: [], edges: [], stats: undefined };
  }

  let payload = raw;

  if (Array.isArray(raw.content)) {
    for (const entry of raw.content) {
      if (entry?.type === 'json' && entry.data) {
        payload = entry.data;
        break;
      }
      if (entry?.type === 'text' && typeof entry.text === 'string') {
        try {
          const parsed = JSON.parse(entry.text);
          if (parsed && typeof parsed === 'object') {
            payload = parsed;
            break;
          }
        } catch (error) {
          // ignore parse error and continue
        }
      }
    }
  }

  const rawNodes = Array.isArray(payload.nodes)
    ? payload.nodes
    : Array.isArray(payload.data)
      ? payload.data
      : [];

  const rawEdges = Array.isArray(payload.edges)
    ? payload.edges
    : Array.isArray(payload.links)
      ? payload.links
      : [];

  const nodes = rawNodes.map((node, index) => {
    const id = node?.id || node?.path || node?.name || `node-${index}`;
    const title =
      node?.title ||
      node?.name ||
      node?.basename ||
      (typeof node?.path === 'string' ? node.path.split('/').pop() : null) ||
      `Node ${index + 1}`;

    return {
      id: String(id),
      title: String(title),
      path: node?.path ? String(node.path) : undefined,
      type: node?.type ? String(node.type) : undefined,
      tags: Array.isArray(node?.tags) ? node.tags.map(String) : undefined,
      weight:
        typeof node?.weight === 'number'
          ? node.weight
          : typeof node?.count === 'number'
            ? node.count
            : undefined,
    };
  });

  const edges = rawEdges
    .filter((edge) => edge?.source || edge?.target || edge?.from || edge?.to)
    .map((edge, index) => ({
      id: edge?.id || `edge-${index}`,
      source: String(edge?.source || edge?.from || ''),
      target: String(edge?.target || edge?.to || ''),
      type: edge?.type ? String(edge.type) : undefined,
      weight:
        typeof edge?.weight === 'number'
          ? edge.weight
          : typeof edge?.count === 'number'
            ? edge.count
            : undefined,
    }))
    .filter((edge) => edge.source && edge.target);

  return {
    nodes,
    edges,
    stats: payload.stats || payload.metadata || undefined,
  };
}

async function getKnowledgeGraph(options = {}) {
  try {
    const result = await brainCloudService.getGraphData(
      options.directory || '',
      options.includeOrphans ?? true
    );
    const normalized = normalizeGraphPayload(result);
    if (normalized.nodes.length || normalized.edges.length) {
      return normalized;
    }
  } catch (error) {
    console.warn('Brain Cloud MCP graph retrieval failed, falling back to REST:', error.message);
  }

  try {
    const fallback = await brainCloudClient.getGraphData({
      directory: options.directory || '',
      include_orphans: options.includeOrphans ?? true,
      include_unresolved: true,
    });
    return normalizeGraphPayload(fallback);
  } catch (error) {
    throw error;
  }
}

// GET /api/knowledge-graph/nodes
router.get('/nodes', async (req, res) => {
  try {
    const directory = typeof req.query.directory === 'string' ? req.query.directory : '';
    const includeOrphans = req.query.include_orphans !== 'false';

    const graph = await getKnowledgeGraph({ directory, includeOrphans });
    res.json(graph);
  } catch (error) {
    console.error('Error fetching knowledge graph nodes:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
