/**
 * Constantes da aplicação
 * 
 * Este arquivo centraliza todas as constantes e configurações globais
 * usadas em toda a aplicação.
 */

// Tempos de expiração em segundos
export const EXPIRATION_TIMES = {
  // Cache de curta duração (5 minutos)
  SHORT: 300,
  // Cache de média duração (1 hora)
  MEDIUM: 3600,
  // Cache de longa duração (24 horas)
  LONG: 86400,
  // Cache de sessão (7 dias)
  SESSION: 604800,
  // Cache de dados estáticos (30 dias)
  STATIC: 2592000,
};

// Chaves de cache
export const CACHE_KEYS = {
  // Autenticação
  USER_SESSION: (sessionId) => `session:${sessionId}`,
  PASSWORD_RESET_TOKEN: (token) => `pwd_reset:${token}`,
  
  // Insights
  USER_INSIGHTS: (userId) => `insights:user:${userId}`,
  INSIGHT_DETAIL: (insightId) => `insight:${insightId}`,
  
  // Obsidian
  OBSIDIAN_VAULT_INDEX: (vaultPath) => `obsidian:index:${Buffer.from(vaultPath).toString('base64')}`,
  OBSIDIAN_NOTE: (vaultPath, notePath) => 
    `obsidian:note:${Buffer.from(vaultPath).toString('base64')}:${Buffer.from(notePath).toString('base64')}`,
  
  // WebSocket
  WS_SESSION: (sessionId) => `ws:session:${sessionId}`,
  WS_USER_SESSIONS: (userId) => `ws:user:${userId}:sessions`,
  WS_CHANNEL: (channel) => `ws:channel:${channel}`,
  
  // Notificações
  USER_NOTIFICATIONS: (userId) => `notifications:user:${userId}`,
  NOTIFICATION: (notificationId) => `notification:${notificationId}`,
  UNREAD_COUNT: (userId) => `notifications:user:${userId}:unread`,
  NOTIFICATION_PREFS: (userId) => `notifications:user:${userId}:preferences`,
};

// Tipos de notificação
export const NOTIFICATION_TYPES = {
  SYSTEM: 'system',
  ALERT: 'alert',
  REMINDER: 'reminder', 
  MESSAGE: 'message',
  TASK: 'task',
  INSIGHT: 'insight',
  UPDATE: 'update'
};

// Níveis de prioridade
export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Configurações padrão de notificação
export const DEFAULT_NOTIFICATION_PREFS = {
  email: {
    enabled: true,
    types: [NOTIFICATION_TYPES.ALERT, NOTIFICATION_TYPES.REMINDER, NOTIFICATION_TYPES.MESSAGE]
  },
  push: {
    enabled: true,
    types: [NOTIFICATION_TYPES.ALERT, NOTIFICATION_TYPES.MESSAGE, NOTIFICATION_TYPES.TASK]
  },
  inApp: {
    enabled: true,
    types: Object.values(NOTIFICATION_TYPES)
  },
  muteUntil: null,
  doNotDisturb: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
    days: [0, 6] // Domingo e sábado
  }
};

// Limites da aplicação
export const LIMITS = {
  // Limites de paginação
  PAGE_SIZE_DEFAULT: 20,
  PAGE_SIZE_MAX: 100,
  
  // Limites de requisição
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutos em milissegundos
  RATE_LIMIT_MAX_REQUESTS: 100, // Máximo de requisições por janela
  
  // Tamanhos máximos
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_QUERY_LENGTH: 1000,
  
  // Tempos máximos
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 horas em milissegundos
  PASSWORD_RESET_TIMEOUT: 3600000, // 1 hora em milissegundos
};

// Códigos de status HTTP comuns
export const HTTP_STATUS = {
  // Sucesso
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  
  // Redirecionamento
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
  
  // Erros do cliente
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  
  // Erros do servidor
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503,
};

// Mensagens de erro comuns
export const ERROR_MESSAGES = {
  // Autenticação
  INVALID_CREDENTIALS: 'Credenciais inválidas',
  INVALID_TOKEN: 'Token inválido ou expirado',
  ACCESS_DENIED: 'Acesso negado',
  SESSION_EXPIRED: 'Sessão expirada',
  
  // Validação
  VALIDATION_ERROR: 'Erro de validação',
  REQUIRED_FIELD: 'Campo obrigatório',
  INVALID_EMAIL: 'E-mail inválido',
  PASSWORD_TOO_WEAK: 'A senha é muito fraca',
  
  // Recursos
  NOT_FOUND: 'Recurso não encontrado',
  ALREADY_EXISTS: 'Recurso já existe',
  
  // Servidor
  INTERNAL_ERROR: 'Erro interno do servidor',
  MAINTENANCE: 'Em manutenção',
  RATE_LIMIT_EXCEEDED: 'Limite de requisições excedido',
};

// Configurações de ambiente
export const ENV = {
  // Tipos de ambiente
  DEVELOPMENT: 'development',
  TEST: 'test',
  PRODUCTION: 'production',
  
  // Níveis de log
  LOG_LEVELS: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug',
    TRACE: 'trace',
  },
  
  // Configurações de CORS
  CORS_ORIGINS: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://ceo-dashboard.ggai.com.br',
  ],
  
  // Configurações de upload
  UPLOAD_DIR: process.env.UPLOAD_DIR || '/tmp/uploads',
  MAX_FILE_UPLOADS: 10,
  
  // Configurações de cache
  CACHE_ENABLED: process.env.CACHE_ENABLED !== 'false',
  CACHE_TTL: process.env.CACHE_TTL || '3600', // 1 hora
};

// Exporta tudo como um objeto padrão para facilitar a importação
const constants = {
  EXPIRATION_TIMES,
  CACHE_KEYS,
  NOTIFICATION_TYPES,
  PRIORITY_LEVELS,
  DEFAULT_NOTIFICATION_PREFS,
  LIMITS,
  HTTP_STATUS,
  ERROR_MESSAGES,
  ENV,
};

export default constants;
