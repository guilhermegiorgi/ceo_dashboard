import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { combine, timestamp, printf, colorize, json } = winston.format;

// Formato para o console
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;
  
  // Adiciona metadados se existirem
  if (Object.keys(meta).length > 0) {
    log += `\n${JSON.stringify(meta, null, 2)}`;
  }
  
  return log;
});

// Configuração dos níveis de log
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Cores para o console
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Filtro para logs de requisição HTTP
const httpFilter = winston.format((info) => {
  return info.level === 'http' ? info : false;
});

// Transportes (destinos dos logs)
const transports = [];

// Console (apenas em desenvolvimento)
if (config.isDevelopment) {
  transports.push(
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      ),
    })
  );
}

// Arquivo de erros
if (config.logging.file) {
  transports.push(
    new winston.transports.File({
      filename: config.logging.errorFile,
      level: 'error',
      format: combine(timestamp(), json()),
    })
  );
  
  // Arquivo de logs gerais
  transports.push(
    new winston.transports.File({
      filename: config.logging.file,
      format: combine(timestamp(), json()),
    })
  );
  
  // Arquivo separado para logs HTTP
  transports.push(
    new winston.transports.File({
      filename: path.join(
        path.dirname(config.logging.file),
        'http.log'
      ),
      level: 'http',
      format: combine(
        httpFilter(),
        timestamp(),
        json()
      ),
    })
  );
}

// Cria o logger
const logger = winston.createLogger({
  level: config.logging.level,
  levels,
  format: combine(
    timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports,
  exitOnError: false,
});

// Middleware para log de requisições HTTP
export const requestLogger = (req, res, next) => {
  // Ignora requisições para arquivos estáticos em produção
  if (config.isProduction && req.path.startsWith('/static/')) {
    return next();
  }
  
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.http(`${req.method} ${req.originalUrl}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id || 'anonymous',
    });
  });
  
  next();
};

export { logger };

export default logger;
