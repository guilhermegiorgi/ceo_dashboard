import express from 'express';
import { getStrategicInsights } from '../services/insightService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Rota para obter insights estratégicos consolidados
router.get('/strategic', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const insights = await getStrategicInsights(userId);
    res.json({
      success: true,
      data: insights,
      message: 'Insights estratégicos recuperados com sucesso'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
