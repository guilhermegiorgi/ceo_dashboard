import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  // Configurações do servidor
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3001,
  host: process.env.HOST || '0.0.0.0',
  
  // Configurações de segurança
  jwtSecret: process.env.JWT_SECRET || 'seu_segredo_jwt_aqui',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieSecret: process.env.COOKIE_SECRET || 'seu_segredo_para_cookies',
  
  // CORS
  cors: {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
  
  // Cache
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: parseInt(process.env.REDIS_TTL || '3600', 10) // 1 hora padrão
  },
  
  // Obsidian API
  obsidian: {
    apiUrl: process.env.OBSIDIAN_API_URL || 'http://localhost:3002',
    apiKey: process.env.OBSIDIAN_API_KEY || 'sua_chave_aqui',
    vaultPath: process.env.OBSIDIAN_VAULT_PATH || '/caminho/para/seu/vault',
    syncInterval: parseInt(process.env.OBSIDIAN_SYNC_INTERVAL || '300000', 10) // 5 minutos
  },

  // Obsidian Brain Cloud (nova integração oficial)
  brainCloud: {
    baseUrl: process.env.BRAINCLOUD_BASE_URL || process.env.OBSIDIAN_API_URL || 'http://localhost:8000',
    apiToken: process.env.BRAINCLOUD_API_TOKEN || process.env.OBSIDIAN_API_KEY || process.env.API_TOKEN || '',
    writeDir: process.env.BRAINCLOUD_WRITE_DIR || '5 - INSIGHTS-IA'
  },
  
  // Cognito (Serviço de IA)
  cognito: {
    apiUrl: process.env.COGNITO_API_URL || 'http://localhost:8000',
    apiKey: process.env.COGNITO_API_KEY || 'sua_chave_aqui',
    timeout: parseInt(process.env.COGNITO_TIMEOUT || '30000', 10) // 30 segundos
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
    file: process.env.LOG_FILE || path.join(__dirname, '../../logs/app.log'),
    errorFile: process.env.ERROR_LOG_FILE || path.join(__dirname, '../../logs/error.log')
  },
  
  // Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    directory: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'),
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/markdown',
      'text/plain'
    ]
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutos
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // 100 requisições por janela
    message: {
      success: false,
      error: 'Muitas requisições deste IP. Tente novamente mais tarde.'
    }
  },
  
  // Configurações de desenvolvimento
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test'
};

// Validações
if (!config.jwtSecret || config.jwtSecret === 'seu_segredo_jwt_aqui') {
  console.warn('AVISO: JWT_SECRET não configurado. Usando valor padrão inseguro.');
}

if (!config.cognito.apiKey || config.cognito.apiKey === 'sua_chave_aqui') {
  console.warn('AVISO: COGNITO_API_KEY não configurado. A integração com o Cognito não funcionará corretamente.');
}

export default config;
