import { Router } from 'express';
import { getDashboardSnapshot } from '../services/dashboardService.js';

const router = Router();

router.get('/today', async (req, res, next) => {
  try {
    const snapshot = await getDashboardSnapshot();
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
});

export default router;
