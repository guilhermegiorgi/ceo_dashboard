# Prompt: Testes Unitários Backend - Brain Cloud Service

**Contexto:** Sprint 2 Fase 3 - Completar cobertura de testes da arquitetura unificada Brain Cloud

**Agent Role:** Backend Testing Specialist

**Prioridade:** 🔴 Alta (últimos 3% do Sprint 2)

---

## 🎯 Objetivo

Criar testes unitários completos para a arquitetura Brain Cloud Service v2.0, garantindo cobertura de:
- RestBrainCloudAdapter
- McpBrainCloudAdapter
- BrainCloudService (unified service)
- SSE endpoint (/api/brain/events)

**Meta de cobertura:** >80% dos fluxos críticos

---

## 📁 Arquitetura a Testar

```
server/services/brainCloud/
├── BrainCloudService.ts              (288 linhas) ← TESTAR
├── adapters/
│   ├── RestBrainCloudAdapter.ts      (373 linhas) ← TESTAR
│   ├── McpBrainCloudAdapter.ts       (415 linhas) ← TESTAR
│   └── types.ts                      (40+ tipos)
└── routes/
    └── brainEvents.js                (110 linhas) ← TESTAR SSE
```

---

## 📋 Tarefas Detalhadas

### **1. RestBrainCloudAdapter.test.ts** (Prioridade Máxima)

**Localização:** `server/services/brainCloud/adapters/__tests__/RestBrainCloudAdapter.test.ts`

**Dependências a mockar:**
- `brainCloudClient` (importado de `../../brainCloudClient.js`)
- `globalEventBus` (importado de `./events.js`)

**Casos de teste essenciais:**

```typescript
describe('RestBrainCloudAdapter', () => {

  // Setup
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkConnection()', () => {
    it('deve retornar status connected quando API responde', async () => {
      // Mock brainCloudClient.search retornando sucesso
      // Verificar que retorna { connected: true, mode: 'rest', ... }
    });

    it('deve retornar status disconnected quando API falha', async () => {
      // Mock brainCloudClient.search lançando erro
      // Verificar que retorna { connected: false, error: '...' }
    });
  });

  describe('search()', () => {
    it('deve buscar e mapear resultados corretamente', async () => {
      // Mock brainCloudClient.search({ query, case_sensitive, file_extensions })
      // Verificar SearchResult com results[], total, success: true
    });

    it('deve emitir evento file:updated para cada resultado', async () => {
      // Mock retornando 3 resultados
      // Verificar globalEventBus.emit chamado 3x com 'file:updated'
    });

    it('deve lidar com erro de busca gracefully', async () => {
      // Mock lançando erro
      // Verificar SearchResult com success: false, error
    });

    it('deve passar fileExtensions quando fornecido', async () => {
      // Verificar que file_extensions é passado ao client
    });
  });

  describe('getGraphData()', () => {
    it('deve retornar dados do grafo com nodes e edges', async () => {
      // Mock brainCloudClient.getGraphData
      // Verificar GraphResult com nodes[], edges[]
    });

    it('deve emitir evento graph:updated', async () => {
      // Verificar globalEventBus.emit('graph:updated')
    });
  });

  describe('getCurrentFocus()', () => {
    it('deve retornar daily notes e weekly note', async () => {
      // Mock brainCloudClient.getCurrentFocus
      // Verificar FocusResult com dailyNotes[], weeklyNote
    });

    it('deve emitir evento focus:changed', async () => {
      // Verificar globalEventBus.emit('focus:changed')
    });
  });

  describe('getDueTasks()', () => {
    it('deve retornar lista de tarefas com filtros', async () => {
      // Mock brainCloudClient.getDueTasks({ window, includeCompleted })
      // Verificar TasksResult com tasks[], overdue[], upcoming[]
    });

    it('deve emitir evento task:updated para cada task', async () => {
      // Verificar eventos emitidos
    });
  });

  describe('getHistoricalContext()', () => {
    it('deve retornar contexto histórico relevante', async () => {
      // Mock brainCloudClient.getHistoricalContext
      // Verificar ContextResult com items[]
    });
  });

  describe('saveConversation()', () => {
    it('deve salvar conversa e retornar resultado', async () => {
      // Mock brainCloudClient.saveConversation
      // Verificar SaveResult com conversationId, chunks
    });

    it('deve emitir evento conversation:saved', async () => {
      // Verificar globalEventBus.emit('conversation:saved')
    });

    it('deve mapear camelCase → snake_case corretamente', async () => {
      // Verificar conversão: conversationId → conversation_id, etc.
    });
  });

  describe('capabilities()', () => {
    it('deve retornar 7 capabilities do REST', () => {
      // Verificar array com: search, graph_data, current_focus,
      // due_tasks, historical_context, conversation_persistence, file_operations
    });
  });

  describe('getCapabilitiesInfo()', () => {
    it('deve retornar info do adapter REST', () => {
      // Verificar: { mode: 'rest', capabilities: [...], endpoint: '...' }
    });
  });

  describe('withContext()', () => {
    it('deve aceitar contexto com req', () => {
      // Passar { req: mockReq } e verificar que não quebra
    });

    it('deve incluir userId nos eventos quando disponível', () => {
      // Passar req.user.id e verificar eventos incluem userId
    });
  });
});
```

**Cobertura esperada:** >85%

---

### **2. McpBrainCloudAdapter.test.ts** (Prioridade Alta)

**Localização:** `server/services/brainCloud/adapters/__tests__/McpBrainCloudAdapter.test.ts`

**Dependências a mockar:**
- `BrainCloudService` (importado de `../../brainCloudService.js`)
- `globalEventBus`

**Casos de teste essenciais:**

```typescript
describe('McpBrainCloudAdapter', () => {

  describe('checkConnection()', () => {
    it('deve inicializar serviço se não inicializado', async () => {
      // Mock service.initialized = false
      // Verificar service.initialize() foi chamado
    });

    it('deve retornar status do vault MCP', async () => {
      // Mock service.getVaultStatus()
      // Verificar ConnectionStatus com mode: 'mcp'
    });

    it('deve lançar ConnectionError se MCP falhar', async () => {
      // Mock service.getVaultStatus() lançando erro
      // Verificar que lança ConnectionError
    });
  });

  describe('search()', () => {
    it('deve usar semanticSearch do MCP', async () => {
      // Mock service.semanticSearch(query, limit)
      // Verificar SearchResult
    });

    it('deve emitir evento file:updated', async () => {
      // Verificar globalEventBus.emit
    });

    it('deve inicializar serviço automaticamente', async () => {
      // service.initialized = false
      // Verificar que initialize() é chamado antes de search
    });
  });

  describe('getGraphData()', () => {
    it('deve chamar getGraphData do MCP', async () => {
      // Mock service.getGraphData()
      // Verificar resultado com nodes/edges
    });

    it('deve emitir evento graph:updated', async () => {
      // Verificar evento
    });
  });

  describe('getCurrentFocus()', () => {
    it('deve retornar foco atual via MCP', async () => {
      // Mock service.getCurrentFocus()
    });
  });

  describe('getDueTasks()', () => {
    it('deve retornar tarefas via MCP', async () => {
      // Mock service.getDueTasks()
    });
  });

  describe('getHistoricalContext()', () => {
    it('deve usar histórico semântico do MCP', async () => {
      // Mock service.getHistoricalContext()
    });
  });

  describe('saveConversation()', () => {
    it('deve salvar via MCP com metadata completo', async () => {
      // Mock service.saveConversationHistory()
      // Verificar mapeamento de campos
    });

    it('deve emitir evento conversation:saved', async () => {
      // Verificar evento
    });
  });

  describe('capabilities()', () => {
    it('deve retornar 11 capabilities do MCP', () => {
      // Verificar: search, semantic_search, graph_data, graph_analysis,
      // current_focus, due_tasks, historical_context, conversation_persistence,
      // file_operations, vault_tree, template_rendering
    });
  });

  describe('getCapabilitiesInfo()', () => {
    it('deve retornar info do adapter MCP', () => {
      // Verificar: { mode: 'mcp', capabilities: [...] }
    });
  });
});
```

**Cobertura esperada:** >80%

---

### **3. BrainCloudService.test.ts** (Prioridade Máxima)

**Localização:** `server/services/brainCloud/__tests__/BrainCloudService.test.ts`

**Dependências a mockar:**
- `RestBrainCloudAdapter`
- `McpBrainCloudAdapter`
- `globalEventBus`

**Casos de teste essenciais:**

```typescript
describe('BrainCloudService', () => {

  describe('Auto-detection', () => {
    it('deve usar REST quando contexto tem req', () => {
      const service = new BrainCloudService({ mode: 'auto' });
      service.withContext({ req: mockReq });
      // Verificar que getMode() retorna 'rest'
    });

    it('deve usar MCP quando contexto tem agentId', () => {
      const service = new BrainCloudService({ mode: 'auto' });
      service.withContext({ agentId: 'agent-123' });
      // Verificar que getMode() retorna 'mcp'
    });

    it('deve usar MCP quando path inclui /mcp', () => {
      const service = new BrainCloudService({ mode: 'auto' });
      service.withContext({ req: { path: '/api/mcp/chat' } });
      // Verificar que getMode() retorna 'mcp'
    });

    it('deve usar MCP quando path inclui /chat', () => {
      const service = new BrainCloudService({ mode: 'auto' });
      service.withContext({ req: { path: '/api/chat' } });
      // Verificar que getMode() retorna 'mcp'
    });

    it('deve usar REST por padrão se preferMcp=false', () => {
      const service = new BrainCloudService({ mode: 'auto', preferMcp: false });
      service.withContext({});
      // Verificar getMode() retorna 'rest'
    });

    it('deve usar MCP por padrão se preferMcp=true', () => {
      const service = new BrainCloudService({ mode: 'auto', preferMcp: true });
      service.withContext({});
      // Verificar getMode() retorna 'mcp'
    });
  });

  describe('Fallback mechanism', () => {
    it('deve fazer fallback de MCP para REST quando falha', async () => {
      const service = new BrainCloudService({
        mode: 'mcp',
        fallbackToRest: true
      });

      // Mock MCP adapter lançando erro
      // Mock REST adapter funcionando
      const result = await service.withContext({ agentId: 'test' }).search({ query: 'test' });

      // Verificar que resultado veio do REST
      // Verificar que evento 'workflow:completed' foi emitido com trigger='mcp_failure'
    });

    it('não deve fazer fallback se fallbackToRest=false', async () => {
      const service = new BrainCloudService({
        mode: 'mcp',
        fallbackToRest: false
      });

      // Mock MCP adapter lançando erro
      // Verificar que erro é propagado (não há fallback)
    });

    it('deve emitir workflow:failed quando ambos falham', async () => {
      const service = new BrainCloudService({ fallbackToRest: true });

      // Mock MCP e REST ambos lançando erro
      // Verificar evento 'workflow:failed'
    });
  });

  describe('Fluent API', () => {
    it('withContext() deve retornar this para chaining', () => {
      const service = new BrainCloudService();
      const result = service.withContext({ req: mockReq });
      expect(result).toBe(service);
    });

    it('deve permitir múltiplas chamadas encadeadas', async () => {
      const service = new BrainCloudService();

      const result = await service
        .withContext({ req: mockReq })
        .search({ query: 'test' });

      expect(result).toBeDefined();
    });
  });

  describe('Mode switching', () => {
    it('setMode() deve alterar o modo', () => {
      const service = new BrainCloudService({ mode: 'auto' });
      service.setMode('rest');
      expect(service.getMode()).toBe('rest');
    });

    it('setMode("auto") deve reabilitar auto-detection', () => {
      const service = new BrainCloudService({ mode: 'rest' });
      service.setMode('auto');
      // Próxima chamada deve fazer auto-detect
    });
  });

  describe('Delegated methods', () => {
    it('checkConnection() deve delegar para adapter ativo', async () => {
      const service = new BrainCloudService({ mode: 'rest' });
      // Mock RestAdapter.checkConnection()
      await service.checkConnection();
      // Verificar que foi chamado
    });

    it('search() deve delegar para adapter ativo', async () => {
      const service = new BrainCloudService({ mode: 'rest' });
      // Mock RestAdapter.search()
      await service.withContext({ req: mockReq }).search({ query: 'test' });
      // Verificar chamada
    });

    // Repetir para: getGraphData, getCurrentFocus, getDueTasks,
    // getHistoricalContext, saveConversation
  });

  describe('Capabilities', () => {
    it('capabilities() deve retornar capabilities do adapter ativo', () => {
      const service = new BrainCloudService({ mode: 'rest' });
      const caps = service.capabilities();
      expect(caps).toHaveLength(7); // REST tem 7
    });

    it('getCapabilitiesInfo() deve retornar info do adapter ativo', () => {
      const service = new BrainCloudService({ mode: 'rest' });
      const info = service.getCapabilitiesInfo();
      expect(info.mode).toBe('rest');
    });
  });

  describe('getInfo()', () => {
    it('deve retornar informações completas do serviço', () => {
      const service = new BrainCloudService({ mode: 'auto', fallbackToRest: true });
      const info = service.getInfo();

      expect(info.service).toBe('Brain Cloud Unified Service');
      expect(info.version).toBe('2.0.0');
      expect(info.mode).toBe('auto');
      expect(info.fallbackEnabled).toBe(true);
      expect(info.adapters.rest).toBeDefined();
      expect(info.adapters.mcp).toBeDefined();
    });
  });

  describe('getStats()', () => {
    it('deve retornar estatísticas do serviço', () => {
      const service = new BrainCloudService();
      const stats = service.getStats();

      expect(stats.mode).toBeDefined();
      expect(stats.currentMode).toBeDefined();
      expect(stats.restCapabilities).toBe(7);
      expect(stats.mcpCapabilities).toBe(11);
    });
  });

  describe('searchConversations()', () => {
    it('deve mapear para search com parâmetros corretos', async () => {
      const service = new BrainCloudService({ mode: 'rest' });
      // Mock adapter.search()
      await service.withContext({ req: mockReq }).searchConversations({
        query: 'test',
        limit: 10,
        filters: {}
      });
      // Verificar que search foi chamado com { query: 'test', limit: 10 }
    });
  });

  describe('Event emission', () => {
    it('deve emitir workflow:completed em sucesso', async () => {
      const service = new BrainCloudService({ mode: 'rest' });
      // Mock adapter retornando sucesso
      await service.withContext({ req: mockReq }).search({ query: 'test' });

      // Verificar globalEventBus.emit('workflow:completed', { ... })
    });

    it('deve emitir workflow:failed em erro', async () => {
      const service = new BrainCloudService({ mode: 'rest', fallbackToRest: false });
      // Mock adapter lançando erro

      try {
        await service.withContext({ req: mockReq }).search({ query: 'test' });
      } catch (e) {
        // Esperado
      }

      // Verificar globalEventBus.emit('workflow:failed', { ... })
    });
  });
});
```

**Cobertura esperada:** >85%

---

### **4. brainEvents.spec.js** (Prioridade Média)

**Localização:** `server/routes/__tests__/brainEvents.spec.js`

**Objetivo:** Testar SSE endpoint

**Casos de teste essenciais:**

```javascript
describe('Brain Events SSE Endpoint', () => {

  describe('GET /api/brain/events', () => {
    it('deve configurar headers SSE corretamente', async () => {
      const response = await request(app)
        .get('/api/brain/events')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.headers['content-type']).toBe('text/event-stream');
      expect(response.headers['cache-control']).toBe('no-cache');
      expect(response.headers['connection']).toBe('keep-alive');
    });

    it('deve enviar mensagem de conexão inicial', (done) => {
      request(app)
        .get('/api/brain/events')
        .set('Authorization', `Bearer ${validToken}`)
        .buffer(false)
        .parse((res, callback) => {
          res.on('data', (chunk) => {
            const data = chunk.toString();
            if (data.includes('event: connected')) {
              done();
            }
          });
        });
    });

    it('deve aceitar filtro de tipos de eventos', async () => {
      // Fazer request com ?filter=task:created,task:updated
      // Verificar que BrainCloudEventStream foi criado com tipos corretos
    });

    it('deve aceitar filtro de userId', async () => {
      // Fazer request com ?userId=123
      // Verificar filtro aplicado
    });

    it('deve aceitar filtro de source', async () => {
      // Fazer request com ?source=ui
      // Verificar filtro aplicado
    });

    it('deve emitir heartbeat a cada 30s', (done) => {
      jest.useFakeTimers();

      request(app)
        .get('/api/brain/events')
        .set('Authorization', `Bearer ${validToken}`)
        .buffer(false)
        .parse((res, callback) => {
          let heartbeatReceived = false;

          res.on('data', (chunk) => {
            if (chunk.toString().includes(': heartbeat')) {
              heartbeatReceived = true;
            }
          });

          jest.advanceTimersByTime(30000);

          setTimeout(() => {
            expect(heartbeatReceived).toBe(true);
            done();
          }, 100);
        });
    });

    it('deve fechar stream quando cliente desconecta', (done) => {
      const req = request(app)
        .get('/api/brain/events')
        .set('Authorization', `Bearer ${validToken}`);

      // Simular desconexão do cliente
      setTimeout(() => {
        req.abort();
        // Verificar que eventStream.close() foi chamado
        done();
      }, 500);
    });

    it('deve transmitir eventos emitidos pelo globalEventBus', (done) => {
      request(app)
        .get('/api/brain/events')
        .set('Authorization', `Bearer ${validToken}`)
        .buffer(false)
        .parse((res, callback) => {
          res.on('data', (chunk) => {
            const data = chunk.toString();
            if (data.includes('task:created')) {
              done();
            }
          });
        });

      // Emitir evento após 100ms
      setTimeout(() => {
        globalEventBus.emit('task:created', {
          type: 'task:created',
          taskId: 'test-123',
          timestamp: new Date().toISOString()
        });
      }, 100);
    });

    it('deve retornar 401 sem autenticação', async () => {
      const response = await request(app)
        .get('/api/brain/events');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/brain/events/ping', () => {
    it('deve retornar pong para health check', async () => {
      const response = await request(app)
        .get('/api/brain/events/ping')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.message).toBe('pong');
    });
  });
});
```

**Cobertura esperada:** >70% (SSE é complexo para testar)

---

## 🛠️ Setup e Ferramentas

### **Jest Configuration**

Verifique se `jest.config.js` está configurado para TypeScript:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.js'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'server/services/brainCloud/**/*.{ts,js}',
    '!server/services/brainCloud/**/*.d.ts',
    '!server/services/brainCloud/__tests__/**',
  ],
};
```

### **Mocks Helpers**

Criar arquivo `server/services/brainCloud/__tests__/helpers/mocks.ts`:

```typescript
export const createMockReq = (overrides = {}) => ({
  user: { id: 'user-123', email: 'test@example.com' },
  headers: { authorization: 'Bearer token' },
  path: '/api/brain/search',
  ...overrides,
});

export const createMockSearchResponse = () => ({
  results: [
    { path: 'note1.md', title: 'Note 1', score: 0.95 },
    { path: 'note2.md', title: 'Note 2', score: 0.87 },
  ],
});

export const createMockGraphResponse = () => ({
  nodes: [
    { id: 'node1', type: 'note', title: 'Note 1' },
    { id: 'node2', type: 'project', title: 'Project 1' },
  ],
  edges: [
    { source: 'node1', target: 'node2', type: 'references' },
  ],
});

// ... demais helpers
```

---

## 📊 Critérios de Sucesso

### **Cobertura mínima:**
- RestBrainCloudAdapter: >85%
- McpBrainCloudAdapter: >80%
- BrainCloudService: >85%
- brainEvents endpoint: >70%

### **Qualidade:**
- ✅ 0 testes falhando
- ✅ 0 erros TypeScript
- ✅ Todos os mocks limpos (jest.clearAllMocks)
- ✅ Casos de erro cobertos
- ✅ Eventos verificados

### **Execução:**
```bash
# Rodar testes
npm test -- server/services/brainCloud

# Com coverage
npm test -- --coverage server/services/brainCloud

# Watch mode (desenvolvimento)
npm test -- --watch server/services/brainCloud
```

---

## 📚 Referências

1. **Arquitetura atual:**
   - [SPRINT2_BACKEND_CONSOLIDATION.md](./SPRINT2_BACKEND_CONSOLIDATION.md)
   - [BRAIN_CLOUD_MIGRATION_GUIDE.md](./BRAIN_CLOUD_MIGRATION_GUIDE.md)

2. **Código-fonte:**
   - `server/services/brainCloud/BrainCloudService.ts`
   - `server/services/brainCloud/adapters/RestBrainCloudAdapter.ts`
   - `server/services/brainCloud/adapters/McpBrainCloudAdapter.ts`
   - `server/routes/brainEvents.js`

3. **Testes existentes (referência):**
   - `src/components/__tests__/FeedbackLoopTracker.test.tsx`
   - `src/components/__tests__/UserProfileModal.test.tsx`
   - `tests/e2e/critical/dashboard.spec.ts`

---

## ✅ Checklist de Entrega

- [ ] RestBrainCloudAdapter.test.ts criado (>15 testes)
- [ ] McpBrainCloudAdapter.test.ts criado (>12 testes)
- [ ] BrainCloudService.test.ts criado (>20 testes)
- [ ] brainEvents.spec.js criado (>8 testes)
- [ ] Helpers/mocks criados
- [ ] Todos os testes passando (0 failures)
- [ ] Cobertura >80% global
- [ ] 0 erros TypeScript
- [ ] Documentação de testes atualizada

---

## 🎯 Resultado Esperado

Após completar estas tarefas:

```
Sprint 2 Backend: 90% → 100% ✅
Sprint 2 Total: 97% → 100% ✅

Testes totais:
- Unit: 9 → 60+ (componentes + backend)
- E2E: 18
- TOTAL: ~78 testes automatizados

Cobertura:
- Frontend: >90%
- Backend: >80%
- E2E: >70% fluxos críticos
```

**Sprint 2 = 100% COMPLETO! 🎉**

---

**Estimativa de tempo:** 3-4 horas
**Prioridade:** 🔴 Alta
**Complexidade:** Média (estrutura definida, apenas implementar casos)

**Boa sorte!** 🚀
