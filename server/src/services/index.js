// Serviço de autenticação e gerenciamento de usuários
export { authService } from './authService.js';

// Serviço de cache (Redis ou memória)
export { cache } from './cache.js';

// Serviço de integração com o Cognito AI
export { cognitoService } from './cognitoService.js';

// Serviço de gerenciamento de insights
export { insightService } from './insightService.js';

// Serviço de integração com o Obsidian
export { obsidianService } from './obsidianService.js';

// Serviço de WebSocket para comunicação em tempo real
export { webSocketService } from './websocketService.js';

// Exporta todos os serviços como um objeto
const services = {
  authService: await import('./authService.js').then(m => m.authService),
  cache: await import('./cache.js').then(m => m.cache),
  cognitoService: await import('./cognitoService.js').then(m => m.cognitoService),
  insightService: await import('./insightService.js').then(m => m.insightService),
  obsidianService: await import('./obsidianService.js').then(m => m.obsidianService),
  webSocketService: await import('./websocketService.js').then(m => m.webSocketService)
};

export default services;
