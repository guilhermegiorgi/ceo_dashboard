import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { logger } from '../utils/logger.js';

// Importa os roteadores
import authRouter from './auth.js';
import insightsRouter from './insights.js';
import cognitoRouter from './cognito.js';
import decisionsRouter from './decisions.js';
import notesRouter from './notes.js';
import usersRouter from './users.js';
import feedbackActionsRouter from './feedbackActions.js';
import vaultRouter from './vault.js';
import marketIntelligenceRouter from './marketIntelligence.js';
import obsidianRouter from './obsidian.js';

const router = Router();

// Middleware de log para todas as rotas
router.use((req, res, next) => {
  logger.http(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    query: req.query,
    params: req.params,
    body: Object.keys(req.body).length > 0 ? req.body : undefined
  });
  next();
});

// Rotas públicas
router.use('/auth', authRouter);

// Middleware de autenticação para rotas protegidas
router.use(authenticateJWT);

// Rotas protegidas
router.use('/insights', cacheMiddleware(), insightsRouter);
router.use('/cognito', cognitoRouter);
router.use('/decisions', decisionsRouter);
router.use('/notes', notesRouter);
router.use('/users', usersRouter);
router.use('/feedback-actions', feedbackActionsRouter);
router.use('/vault', vaultRouter);
router.use('/market-intelligence', marketIntelligenceRouter);
router.use('/obsidian', obsidianRouter);

// Rota de verificação de saúde da API
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// Rota raiz
router.get('/', (req, res) => {
  res.json({
    name: 'GG.AI CEO Dashboard API',
    version: '1.0.0',
    documentation: '/api-docs',
    status: 'operational'
  });
});

// Middleware para rotas não encontradas
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    message: `O caminho ${req.originalUrl} não existe na API`
  });
});

// Middleware de tratamento de erros
router.use((err, req, res, next) => {
  logger.error('Erro na API:', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id || 'anonymous'
  });

  // Se os cabeçalhos já foram enviados, delegue para o manipulador de erros padrão do Express
  if (res.headersSent) {
    return next(err);
  }

  // Resposta de erro padronizada
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.details
    })
  });
});

export default router;
