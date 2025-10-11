import { Router } from 'express';
import insightsRouter from './insights.js';
import decisionsRouter from './decisions.js';
import cognitoRouter from './cognito.js';
import mcpRouter from './mcp.js';
import projectsRouter from './projects.js';
import feedbackActionsRouter from './feedbackActions.js';
import authRouter from './auth.js';
import obsidianRouter from './obsidian.js'; // Importa as rotas do Obsidian
import vaultRouter from './vault.js'; // Importa as rotas do Vault
import agentsRouter from './agents.js'; // Importa as rotas dos Agentes
import providersRouter from './providers.js'; // Importa as rotas dos Provedores
import toolsRouter from './tools.js'; // Importa as rotas das Ferramentas
import settingsRouter from './settings.js';
import dashboardRouter from './dashboard.js';
import { authenticateJWT as authenticateToken } from '../middleware/auth.js';

const router = Router();

// Rotas públicas
router.use('/auth', authRouter);

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rotas protegidas por autenticação
router.use('/insights', authenticateToken, insightsRouter);
router.use('/decisions', authenticateToken, decisionsRouter);
router.use('/cognito', cognitoRouter);
router.use('/mcp', mcpRouter);
router.use('/projects', authenticateToken, projectsRouter);
router.use('/feedback-actions', authenticateToken, feedbackActionsRouter);
router.use('/obsidian', authenticateToken, obsidianRouter); // Monta as rotas do Obsidian
router.use('/vault', authenticateToken, vaultRouter); // Monta as rotas do Vault
router.use('/agents', authenticateToken, agentsRouter); // Monta as rotas dos Agentes
router.use('/providers', authenticateToken, providersRouter); // Monta as rotas dos Provedores
router.use('/tools', authenticateToken, toolsRouter); // Monta as rotas das Ferramentas
router.use('/settings', authenticateToken, settingsRouter);
router.use('/dashboard', authenticateToken, dashboardRouter);


// Rota de fallback para rotas não encontradas
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    path: req.originalUrl
  });
});

export default router;
