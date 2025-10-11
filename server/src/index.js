#!/usr/bin/env node

/**
 * Ponto de entrada principal da aplicação
 * 
 * Este arquivo é responsável por inicializar todos os serviços,
 * configurar o ambiente e iniciar o servidor.
 */

import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';
import cluster from 'cluster';
import os from 'os';
import { logger } from './utils/logger.js';
import configureServer from './config/server.js';
import config from './config/config.js';

// Configura caminhos de diretório
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.env.APP_ROOT = path.resolve(__dirname, '..');

// Verifica se o arquivo .env foi carregado
if (!process.env.NODE_ENV) {
  logger.warn('Nenhum ambiente definido. Usando ambiente de desenvolvimento.');
  process.env.NODE_ENV = 'development';
}

// Configura o número de workers baseado nos núcleos da CPU
const numCPUs = process.env.NODE_ENV === 'production' 
  ? Math.max(2, os.cpus().length) 
  : 1;

/**
 * Função para inicializar um worker
 */
async function startWorker() {
  try {
    logger.info(`Iniciando worker ${process.pid}`);
    
    // Inicializa o servidor
    const { server } = await configureServer({
      // Opções adicionais podem ser passadas aqui
    });
    
    // Manipulador para erros não capturados
    process.on('uncaughtException', (error) => {
      logger.error(`Erro não capturado no worker ${process.pid}:`, {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      // Encerra o processo em caso de erro crítico
      if (!error.isOperational) {
        process.exit(1);
      }
    });
    
    // Manipulador para rejeições de promessas não tratadas
    process.on('unhandledRejection', (reason, promise) => {
      logger.error(`Rejeição não tratada no worker ${process.pid}:`, {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined,
        timestamp: new Date().toISOString()
      });
    });
    
    // Manipulador para o sinal SIGTERM (encerramento gracioso)
    process.on('SIGTERM', async () => {
      logger.info(`Recebido SIGTERM. Encerrando worker ${process.pid}...`);
      
      try {
        await new Promise((resolve) => {
          if (server) {
            server.close(() => {
              logger.info(`Servidor no worker ${process.pid} encerrado`);
              resolve();
            });
          } else {
            resolve();
          }
        });
        
        process.exit(0);
      } catch (error) {
        logger.error(`Erro ao encerrar worker ${process.pid}:`, error);
        process.exit(1);
      }
    });
    
    logger.info(`Worker ${process.pid} iniciado e pronto para requisições`);
    
  } catch (error) {
    logger.error(`Falha ao iniciar worker ${process.pid}:`, {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    process.exit(1);
  }
}

/**
 * Função principal
 */
async function main() {
  try {
    // Exibe informações do ambiente
    logger.info(`Iniciando aplicação em modo ${process.env.NODE_ENV}`);
    logger.debug(`Diretório raiz: ${process.env.APP_ROOT}`);
    
    // Modo cluster para produção
    if (cluster.isPrimary && process.env.NODE_ENV === 'production') {
      logger.info(`Master ${process.pid} está rodando`);
      
      // Inicializa workers
      for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
      }
      
      // Manipula a saída de workers
      cluster.on('exit', (worker, code, signal) => {
        const exitCode = worker.process.exitCode;
        logger.warn(`Worker ${worker.process.pid} encerrado com código ${exitCode} e sinal ${signal}`);
        
        // Reinicia o worker se não foi um encerramento intencional
        if (exitCode !== 0 && !worker.exitedAfterDisconnect) {
          logger.info(`Reiniciando worker...`);
          const newWorker = cluster.fork();
          logger.info(`Novo worker ${newWorker.process.pid} iniciado`);
        }
      });
      
      // Captura sinais para encerramento gracioso
      process.on('SIGINT', () => {
        logger.info('Recebido SIGINT. Encerrando workers...');
        
        // Envia SIGTERM para todos os workers
        for (const id in cluster.workers) {
          cluster.workers[id].process.kill('SIGTERM');
        }
        
        // Encerra o processo mestre
        process.exit(0);
      });
      
    } else {
      // Modo de desenvolvimento ou worker
      await startWorker();
    }
    
  } catch (error) {
    logger.error('Falha ao iniciar a aplicação:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    process.exit(1);
  }
}

// Inicia a aplicação
main().catch((error) => {
  logger.error('Erro fatal durante a inicialização:', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  process.exit(1);
});
