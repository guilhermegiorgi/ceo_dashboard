import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js';
import { logger, requestLogger } from './utils/logger.js';
import apiRouter from './routes/index.js';
import { setupWebSocket } from './services/websocket.js';
import { initializeCache } from './services/cache.js';
import { startBackgroundJobs } from './jobs/index.js';
import config from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class App {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeWebSocket();
  }

  initializeMiddlewares() {
    // Configuração de segurança
    this.app.use(helmet());
    this.app.use(helmet.hidePoweredBy());
    this.app.use(helmet.noSniff());
    this.app.use(helmet.xssFilter());

    // CORS
    this.app.use(cors(config.cors));

    // Logging de requisições
    this.app.use(requestLogger);
    this.app.use(morgan('dev'));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      message: config.rateLimit.message
    });
    this.app.use(limiter);

    // Compressão de respostas
    this.app.use(compression());

    // Parser de JSON
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Servir arquivos estáticos
    this.app.use('/uploads', express.static(join(__dirname, '../../uploads')));
  }

  initializeRoutes() {
    // Rotas da API
    this.app.use('/api', apiRouter);

    // Rota de health check
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.env
      });
    });

    // Rota para documentação Swagger
    if (config.isDevelopment) {
      import('swagger-ui-express').then(({ default: swaggerUi }) => {
        import('swagger-jsdoc').then(({ default: swaggerJsdoc }) => {
          const options = {
            definition: {
              openapi: '3.0.0',
              info: {
                title: 'GG.AI CEO Dashboard API',
                version: '1.0.0',
                description: 'API para o Dashboard Executivo GG.AI',
              },
              servers: [
                {
                  url: `http://localhost:${config.port}/api`,
                  description: 'Servidor de desenvolvimento',
                },
              ],
            },
            apis: ['./src/routes/*.js'],
          };
          const specs = swaggerJsdoc(options);
          this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
        });
      });
    }

    // Rota para arquivos estáticos do frontend (em produção)
    if (config.isProduction) {
      this.app.use(express.static(join(__dirname, '../../dist')));
      this.app.get('*', (req, res) => {
        res.sendFile(join(__dirname, '../../dist/index.html'));
      });
    }

    // Rota não encontrada
    this.app.use(notFoundHandler);
  }

  initializeErrorHandling() {
    this.app.use(errorHandler);
  }

  initializeWebSocket() {
    setupWebSocket(this.wss);
  }

  async initialize() {
    try {
      // Inicializa o cache
      await initializeCache();
      
      // Inicia os jobs em background
      startBackgroundJobs();
      
      // Inicia o servidor
      this.server.listen(config.port, config.host, () => {
        logger.info(`🚀 Servidor rodando em http://${config.host}:${config.port}`);
        if (config.isDevelopment) {
          logger.info(`📚 Documentação da API disponível em http://${config.host}:${config.port}/api-docs`);
        }
      });
      
      return this.server;
    } catch (error) {
      logger.error('Falha ao inicializar o servidor:', error);
      process.exit(1);
    }
  }

  async close() {
    // Fecha o servidor WebSocket
    this.wss.close(() => {
      logger.info('WebSocket Server closed');
    });
    
    // Fecha o servidor HTTP
    this.server.close(() => {
      logger.info('HTTP Server closed');
    });
  }
}

export default App;
