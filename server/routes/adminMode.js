import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import { loadUserSettings } from '../services/settingsServiceDB.js';
import brainCloudClient from '../services/brainCloudClient.js';

const router = Router();

// Activate admin mode (path override)
router.post('/activate', authenticateJWT, async (req, res, next) => {
  try {
    // Load user settings to get admin token and TTL
    const settings = await loadUserSettings(req.user);
    
    if (!settings.system?.allowEditAllDirectories) {
      return res.status(400).json({
        success: false,
        error: 'Admin mode not enabled in settings',
      });
    }

    const adminToken = settings.system?.adminApiToken;
    if (!adminToken) {
      return res.status(400).json({
        success: false,
        error: 'Admin API token not configured',
      });
    }

    const ttl = settings.system?.pathOverrideTTL || 600;

    console.log('[adminMode] Activating path override for', ttl, 'seconds');
    const result = await brainCloudClient.enablePathOverride(ttl, adminToken);
    
    console.log('[adminMode] Path override activated until:', result.expires_at);

    res.json({
      success: true,
      expiresAt: result.expires_at,
      ttl,
    });
  } catch (error) {
    console.error('[adminMode] Error activating:', error);
    next(error);
  }
});

export default router;
