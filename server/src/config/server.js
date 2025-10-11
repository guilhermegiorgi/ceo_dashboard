import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import configureExpress from './express.js';
import configureWebSocket from './websocket.js';
import config from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configura e inicia o servidor HTTP/HTTPS
 * @param {Object} options - Opções de configuração
 * @returns {Object} Objeto com o servidor HTTP/HTTPS e a aplicação Express
 */
const configureServer = async (options = {}) => {
  try {
    // Cria a aplicação Express
    const app = configureExpress(options);
    
    let server;
    let isHttps = false;
    
    // Configura o servidor HTTP ou HTTPS
    if (config.https.enabled) {
      // Configuração HTTPS
      const sslOptions = {
        key: fs.readFileSync(path.resolve(__dirname, config.https.keyPath)),
        cert: fs.readFileSync(path.resolve(__dirname, config.https.certPath)),
        ...(config.https.caPath && { 
          ca: fs.readFileSync(path.resolve(__dirname, config.https.caPath)) 
        }),
        minVersion: 'TLSv1.2',
        ciphers: [
          'TLS_AES_256_GCM_SHA384',
          'TLS_CHACHA20_POLY1305_SHA256',
          'TLS_AES_128_GCM_SHA256',
          'TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384',
          'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384',
          'TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256',
          'TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256',
          'TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256',
          'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256',
        ].join(':'),
        honorCipherOrder: true,
      };
      
      server = https.createServer(sslOptions, app);
      isHttps = true;
      
      // Redireciona HTTP para HTTPS (opcional)
      if (config.https.redirectHttp) {
        const httpApp = configureExpress({ trustProxy: true });
        httpApp.use((req, res) => {
          const host = req.headers.host || 'localhost';
          const url = new URL(`https://${host}${req.url}`);
          res.redirect(301, url.toString());
        });
        
        const httpServer = http.createServer(httpApp);
        httpServer.listen(config.port.http, () => {
          logger.info(`Servidor HTTP redirecionando para HTTPS na porta ${config.port.http}`);
        });
      }
    } else {
      // Configuração HTTP simples
      server = http.createServer(app);
    }
    
    // Configura o WebSocket
    const wss = configureWebSocket(server);
    
    // Adiciona manipuladores de eventos do servidor
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }
      
      const bind = typeof config.port === 'string'
        ? `Pipe ${config.port}`
        : `Port ${config.port}`;
      
      // Mensagens de erro amigáveis
      switch (error.code) {
        case 'EACCES':
          logger.error(`${bind} requer privilégios elevados`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`${bind} já está em uso`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });
    
    server.on('listening', () => {
      const addr = server.address();
      const bind = typeof addr === 'string'
        ? `pipe ${addr}`
        : `port ${addr.port}`;
      
      logger.info(`Servidor ${isHttps ? 'HTTPS' : 'HTTP'} rodando em ${bind}`);
      
      // Emite um evento quando o servidor estiver pronto
      server.emit('ready');
    });
    
    // Configura o tempo limite de inatividade
    server.timeout = config.server.timeout;
    server.keepAliveTimeout = config.server.keepAliveTimeout;
    server.headersTimeout = config.server.headersTimeout;
    
    // Configura o tamanho máximo do cabeçalho da requisição
    server.maxHeadersCount = config.server.maxHeadersCount;
    
    // Configura o tamanho máximo do corpo da requisição
    server.maxHeaderSize = config.server.maxHeaderSize;
    
    // Configura o número máximo de conexões simultâneas
    server.maxConnections = config.server.maxConnections;
    
    // Configura o tempo de espera para conexões pendentes
    server.requestTimeout = config.server.requestTimeout;
    
    // Configura o tempo de espera para conexões HTTP Keep-Alive
    if (config.server.keepAlive) {
      server.keepAliveTimeout = config.server.keepAliveTimeout;
    } else {
      // Desativa o Keep-Alive
      server.keepAliveTimeout = 0;
    }
    
    // Inicia o servidor
    const port = isHttps ? config.port.https : config.port.http;
    server.listen(port, config.host, () => {
      logger.info(`Servidor ${isHttps ? 'HTTPS' : 'HTTP'} iniciado em ${config.host}:${port}`);
    });
    
    // Manipulador para encerramento gracioso
    const gracefulShutdown = async () => {
      logger.info('Recebido sinal de desligamento. Encerrando servidor...');
      
      try {
        // Fecha o servidor WebSocket
        if (wss) {
          wss.clients.forEach(client => {
            if (client.readyState === client.OPEN) {
              client.close(1001, 'Servidor em manutenção');
            }
          });
          
          await new Promise(resolve => wss.close(resolve));
          logger.info('Servidor WebSocket encerrado');
        }
        
        // Fecha o servidor HTTP/HTTPS
        if (server) {
          await new Promise(resolve => server.close(resolve));
          logger.info('Servidor HTTP/HTTPS encerrado');
        }
        
        // Encerra o processo
        process.exit(0);
      } catch (error) {
        logger.error('Erro durante o encerramento gracioso:', error);
        process.exit(1);
      }
    };
    
    // Captura sinais de término do processo
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
    return { app, server, wss };
  } catch (error) {
    logger.error('Falha ao iniciar o servidor:', error);
    process.exit(1);
  }
};

export default configureServer;
