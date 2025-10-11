import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import { logger } from '../utils/logger.js';
import { HTTP_STATUS, ENV } from '../constants.js';
import { errorHandler, notFoundHandler } from '../middleware/errorMiddleware.js';

/**
 * Configura e retorna uma instância do Express com middlewares essenciais
 * @param {Object} options - Opções de configuração
 * @returns {Object} Aplicação Express configurada
 */
const configureExpress = (options = {}) => {
  const app = express();
  
  // 1) MIDDLEWARES GLOBAIS ===================================
  
  // Configuração de segurança de cabeçalhos HTTP
  app.use(helmet());
  
  // Habilita CORS
  app.use(cors({
    origin: ENV.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
  }));
  
  // Limite de taxa de requisições (proteção contra força bruta e DDoS)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // limite de 100 requisições por janela por IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 'error',
      message: 'Muitas requisições deste IP. Tente novamente mais tarde.'
    }
  });
  
  // Aplica o limite de taxa globalmente
  app.use(limiter);
  
  // Parser de corpo da requisição (limita o tamanho do payload)
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  
  // Parser de cookies
  app.use(cookieParser());
  
  // Compressão de respostas (gzip)
  app.use(compression());
  
  // Segurança: Previne injeção de operadores NoSQL
  app.use(mongoSanitize());
  
  // Segurança: Previne XSS (Cross-Site Scripting)
  app.use(xss());
  
  // Segurança: Previne parâmetros de poluição HTTP
  app.use(
    hpp({
      whitelist: [
        'duration',
        'ratingsQuantity',
        'ratingsAverage',
        'maxGroupSize',
        'difficulty',
        'price'
      ]
    })
  );
  
  // Log de requisições HTTP
  if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
      logger.http(`${req.method} ${req.originalUrl}`, {
        ip: req.ip,
        headers: req.headers,
        query: req.query,
        body: req.body
      });
      next();
    });
  }
  
  // 2) ROTAS =================================================
  
  // Rota de saúde/status da API
  app.get('/api/health', (req, res) => {
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      message: 'API operacional',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  });
  
  // 3) MANIPULADORES DE ERROS ================================
  
  // Rota não encontrada (404)
  app.use(notFoundHandler);
  
  // Manipulador de erros global
  app.use(errorHandler);
  
  return app;
};

export default configureExpress;
