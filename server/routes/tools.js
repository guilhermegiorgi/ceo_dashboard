import express from 'express';
import { authenticateJWT as authenticateToken } from '../middleware/auth.js';
import { executeTool } from '../services/toolService.js';

const router = express.Router();

/**
 * @route   POST /api/tools/execute
 * @desc    Executa uma ferramenta específica.
 * @access  Privado
 */
router.post('/execute', authenticateToken, async (req, res, next) => {
  const { toolName, toolInput } = req.body;

  if (!toolName || toolInput === undefined) {
    return res.status(400).json({ success: false, error: 'toolName e toolInput são obrigatórios.' });
  }

  try {
    const result = await executeTool(toolName, toolInput);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
