import express from 'express';
import { authenticateJWT as authenticateToken } from '../middleware/auth.js';
import * as agentService from '../services/agentService.js';

const router = express.Router();

// Rota para listar todos os agentes
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const agents = await agentService.getAllAgents();
    res.json({ success: true, data: agents });
  } catch (error) {
    next(error);
  }
});

// Rota para criar um novo agente
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const newAgent = await agentService.createAgent(req.body);
    res.status(201).json({ success: true, data: newAgent });
  } catch (error) {
    next(error);
  }
});

// Rota para obter um agente específico
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const agent = await agentService.getAgentById(req.params.id);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agente não encontrado' });
    }
    res.json({ success: true, data: agent });
  } catch (error) {
    next(error);
  }
});

// Rota para atualizar um agente
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const updatedAgent = await agentService.updateAgent(req.params.id, req.body);
    if (!updatedAgent) {
      return res.status(404).json({ success: false, error: 'Agente não encontrado' });
    }
    res.json({ success: true, data: updatedAgent });
  } catch (error) {
    next(error);
  }
});

// Rota para deletar um agente
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    await agentService.deleteAgent(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Rota para executar um agente
router.post('/:id/run', authenticateToken, async (req, res, next) => {
  try {
    const result = await agentService.runAgent(req.params.id);
    res.json({ success: true, message: 'Execução do agente concluída.', data: result });
  } catch (error) {
    next(error);
  }
});

// Runs recentes (geral)
router.get('/runs', authenticateToken, async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const data = await agentService.listRuns(limit);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Runs por agente
router.get('/:id/runs', authenticateToken, async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const data = await agentService.listRunsByAgent(req.params.id, limit);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
