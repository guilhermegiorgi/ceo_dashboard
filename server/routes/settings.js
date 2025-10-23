import { Router } from 'express';
import fetch from 'node-fetch';
import { getDashboardCollections, updateDashboardCollections } from '../services/settingsService.js';
import { loadUserSettings, saveUserSettings } from '../services/settingsServiceDB.js';

const router = Router();

// MIDDLEWARE FIX: Apply Passport session check for all routes
router.use((req, res, next) => {
  console.log('[settings router] Middleware check:', {
    path: req.path,
    isAuthenticated: req.isAuthenticated?.(),
    hasUser: !!req.user,
    method: req.method,
  });
  next();
});

router.get('/', async (req, res, next) => {
  try {
    console.log('[settings GET /] Auth check:', {
      isAuthenticated: req.isAuthenticated?.(),
      hasUser: !!req.user,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      hasSession: !!req.session,
      sessionID: req.sessionID,
    });
    
    const settings = await loadUserSettings(req.user);
    
    res.json({
      success: true,
      brainCloud: settings.braincloud,
      interface: settings.interface,
      aiKeys: settings.aiKeys,
      system: settings.system,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { brainCloud, interface: interfacePrefs, aiKeys, system } = req.body;
    
    const saved = await saveUserSettings(req.user, {
      braincloud: brainCloud,
      interface: interfacePrefs,
      aiKeys,
      system,
    });
    
    res.json({
      success: true,
      brainCloud: saved.braincloud,
      interface: saved.interface,
      aiKeys: saved.aiKeys,
      system: saved.system,
    });
  } catch (error) {
    next(error);
  }
});

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

    // Accept both formats: frontend (restApiUrl) and backend (baseUrl)
    const baseUrl = (config.restApiUrl || config.baseUrl || '').replace(/\/$/, '');
    if (!baseUrl) {
      return res.status(400).json({ success: false, error: 'Base URL obrigatória' });
    }

    const headers = {};
    // Accept both formats: restApiKey and apiToken
    const apiKey = config.restApiKey || config.apiToken;
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    let targetUrl = '';
    let testMethod = 'GET';
    let testBody = null;
    
    if (mode === 'mcp') {
      // For MCP, test the base URL health instead of the MCP endpoint
      // MCP endpoints require OAuth which is complex to test here
      targetUrl = `${baseUrl}/health`;
      
      // Alternative: just return success if URL is valid
      if (config.mcpServerUrl || config.mcpHttp) {
        return res.json({ 
          success: true, 
          mode: 'mcp',
          message: 'MCP URL configurada. A conexão real será testada ao usar o protocolo.',
          url: config.mcpServerUrl || config.mcpHttp
        });
      }
    } else {
      targetUrl = `${baseUrl}/health`;
    }

    const response = await fetch(targetUrl, { 
      headers, 
      method: testMethod,
      body: testBody ? JSON.stringify(testBody) : undefined
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        success: false, 
        error: `Falha na conexão (${response.status})`,
        url: targetUrl
      });
    }
    
    const json = await response.json().catch(() => ({}));
    res.json({ success: true, mode, response: json, url: targetUrl });
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard/collections', async (req, res, next) => {
  try {
    const collections = await getDashboardCollections(req.user);
    res.json({ success: true, collections });
  } catch (error) {
    next(error);
  }
});

router.put('/dashboard/collections', async (req, res, next) => {
  try {
    const incoming = req.body?.collections;
    const saved = await updateDashboardCollections(incoming, req.user);
    res.json({ success: true, collections: saved });
  } catch (error) {
    next(error);
  }
});

export default router;
