#!/usr/bin/env node

import 'dotenv/config';
import App from './app.js';
import { logger } from './utils/logger.js';
import config from '../config/config.js';

// Captura exceções não tratadas
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Encerra o processo com falha
  process.exit(1);
});

// Captura rejeições de promessas não tratadas
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Encerra o processo com falha
  process.exit(1);
});

// Captura sinais de encerramento
const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

signals.forEach((signal) => {
  process.on(signal, async () => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    
    // Encerra o servidor
    if (app) {
      await app.close();
    }
    
    logger.info('Server closed');
    process.exit(0);
  });
});

// Inicializa o aplicativo
const app = new App();
const server = await app.initialize();

export default server;
