import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getFeedbackActions, createFeedbackAction, updateFeedbackAction } from '../services/feedbackActionService.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const actions = await getFeedbackActions();
    res.json(actions);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const newAction = await createFeedbackAction(req.body);
    res.status(201).json(newAction);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updatedAction = await updateFeedbackAction(id, status);
    res.json(updatedAction);
  } catch (error) {
    next(error);
  }
});

export default router;
