import { Router } from 'express';
import fetch from 'node-fetch';
import { loadSettings, saveSettings, getDashboardCollections, updateDashboardCollections } from '../services/settingsService.js';

const router = Router();

router.get('/braincloud', async (req, res, next) => {
  try {
    const { braincloud } = await loadSettings();
    res.json({ success: true, braincloud });
  } catch (error) {
    next(error);
  }
});

router.put('/braincloud', async (req, res, next) => {
  try {
    const incoming = req.body?.braincloud;
    if (!incoming || typeof incoming !== 'object') {
      return res.status(400).json({ success: false, error: 'Payload inválido: braincloud' });
    }

    const sanitized = {
      baseUrl: incoming.baseUrl?.trim() || '',
      apiToken: incoming.apiToken?.trim() || '',
      tenantId: incoming.tenantId?.trim() || '',
      tenantPlan: incoming.tenantPlan?.trim() || '',
      mcpWs: incoming.mcpWs?.trim() || '',
      mcpHttp: incoming.mcpHttp?.trim() || '',
      enableRest: Boolean(incoming.enableRest),
      enableMcp: Boolean(incoming.enableMcp)
    };

    const saved = await saveSettings({ braincloud: sanitized });
    res.json({ success: true, braincloud: saved.braincloud });
  } catch (error) {
    next(error);
  }
});

router.post('/braincloud/test', async (req, res, next) => {
  try {
    const config = req.body?.braincloud || {};
    const mode = req.body?.mode || 'rest';

    const baseUrl = (config.baseUrl || '').replace(/\/$/, '');
    if (!baseUrl) {
      return res.status(400).json({ success: false, error: 'Base URL obrigatória' });
    }

    const headers = {};
    if (config.apiToken) {
      headers['Authorization'] = `Bearer ${config.apiToken}`;
    }

    let targetUrl = '';
    if (mode === 'mcp') {
      targetUrl = config.mcpHttp?.replace(/\/$/, '') || `${baseUrl}/api/v1/mcp/http`;
    } else {
      targetUrl = `${baseUrl}/health`;
    }

    const response = await fetch(targetUrl, { headers, method: 'GET' });
    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: `Falha na conexão (${response.status})` });
    }
    const json = await response.json().catch(() => ({}));
    res.json({ success: true, mode, response: json });
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard/collections', async (req, res, next) => {
  try {
    const collections = await getDashboardCollections();
    res.json({ success: true, collections });
  } catch (error) {
    next(error);
  }
});

router.put('/dashboard/collections', async (req, res, next) => {
  try {
    const incoming = req.body?.collections;
    const saved = await updateDashboardCollections(incoming);
    res.json({ success: true, collections: saved });
  } catch (error) {
    next(error);
  }
});

export default router;
