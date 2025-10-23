# Brain Cloud Adapters Architecture

**Versão:** 1.0.0
**Status:** 🚧 Em Desenvolvimento
**Data:** 2025-10-20

---

## 🎯 Objetivo

Unificar acesso ao Obsidian Brain Cloud através de **Strategy Pattern**, suportando:
- **REST API** (brainCloudClient)
- **MCP Protocol** (brainCloudService)
- **Proxy/Bridge** (futuro)

Eliminando 4 serviços duplicados: `brainCloudREST`, `brainCloudMCP`, `brainCloudHybrid`, `brainCloudProxy`.

---

## 🏗️ Arquitetura

### Diagrama de Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  (Routes, Services, ChatWidget, Dashboard)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│              BrainCloudService (Unified)                    │
│  • Auto-detection (REST vs MCP)                             │
│  • Event emission (globalEventBus)                          │
│  • Workflow management                                      │
│  • Context-aware routing                                    │
└──────────┬──────────────────────┬───────────────────────────┘
           │                      │
  ┌────────▼─────────┐   ┌───────▼──────────┐
  │ RestAdapter      │   │ McpAdapter       │
  │ (brainCloudClient)   │ (brainCloudService)
  └──────────────────┘   └──────────────────┘
```

### Componentes

#### 1. **BrainCloudAdapter** (Interface)
Interface unificada que todos adapters implementam:
- `checkConnection()`
- `search(params)`
- `getGraphData(options)`
- `getCurrentFocus(options)`
- `getDueTasks(options)`
- `getHistoricalContext(params)`
- `saveConversation(payload)`
- `capabilities()`

#### 2. **Types** (`types.ts`)
Tipos compartilhados:
- Params: `SearchParams`, `GraphOptions`, `TasksOptions`
- Results: `SearchResult`, `GraphResult`, `TasksResult`
- Capabilities: `BrainCloudCapability`
- Errors: `BrainCloudError`, `CapabilityNotSupportedError`

#### 3. **Events System** (`events.ts`)
Sistema de eventos em tempo real para:
- Notificar UI de mudanças (SSE/WebSocket)
- Triggerar workflows
- Sincronizar estado entre tabs

**Event Types:**
```typescript
'file:created' | 'file:updated' | 'file:deleted' | 'file:moved' |
'task:created' | 'task:updated' | 'task:completed' |
'note:created' | 'note:updated' |
'conversation:saved' |
'graph:updated' |
'focus:changed' |
'sync:started' | 'sync:completed' | 'sync:failed' |
'workflow:triggered' | 'workflow:completed' | 'workflow:failed'
```

**Event Stream:**
```typescript
// SSE endpoint example
for await (const event of eventStream.subscribe({ types: ['task:created'] })) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}
```

#### 4. **Workflows System** (`workflows.ts`)
Sistema de workflows dinâmicos com:

**Tipos de Workflow:**
- `native` - Built-in (código)
- `ui` - Criados via interface
- `agent` - Gerados por IA durante interação

**Triggers:**
- `event` - Evento do Brain Cloud
- `schedule` - Cron job
- `manual` - Execução manual
- `webhook` - Webhook externo

**Actions:**
```typescript
'create_note' | 'update_note' |
'create_task' | 'complete_task' |
'send_notification' | 'run_agent' |
'search' | 'analyze_graph' |
'http_request' | 'conditional' | 'loop' | 'transform_data'
```

**Exemplo - Workflow Builder:**
```typescript
const workflow = new WorkflowBuilder('Auto-save chats', 'ui')
  .description('Save conversations to daily notes')
  .onEvent('conversation:saved')
  .createNote(
    '5 - INSIGHTS-IA/Daily/{{date}}.md',
    '## Chat: {{conversation.title}}\n\n{{conversation.summary}}'
  )
  .withSettings({ timeout: 30000 })
  .build();

await workflowManager.register(workflow);
```

---

## 🔄 Fluxo de Dados

### 1. **Request → Adapter Selection**
```typescript
// Auto-detection baseado em contexto
const service = new BrainCloudService({ mode: 'auto' });

// Request vindo de API REST
const result = await service.withContext({ req }).search({ query: 'IA' });
// ↳ Usa RestAdapter

// Request vindo de Agent MCP
const result = await service.withContext({ agentId }).search({ query: 'IA' });
// ↳ Usa McpAdapter
```

### 2. **Adapter → Operation → Event**
```typescript
// Operação executada
const result = await adapter.createNote(path, content);

// Evento emitido automaticamente
globalEventBus.emit('note:created', {
  type: 'note:created',
  path,
  title,
  timestamp: new Date().toISOString(),
  source: 'ui'
});
```

### 3. **Event → Workflow Trigger**
```typescript
// Workflow registrado previamente
globalEventBus.on('note:created', async (event) => {
  // Workflow: "Auto-tag notes"
  if (event.path.includes('/Daily/')) {
    await adapter.updateNote(event.path, {
      tags: ['#daily-note', ...inferTags(event.content)]
    });
  }
});
```

### 4. **Event → UI Update (Real-time)**
```typescript
// Frontend: SSE connection
const events = new EventSource('/api/brain/events');
events.addEventListener('note:created', (e) => {
  const data = JSON.parse(e.data);
  toast.success(`Nova nota criada: ${data.title}`);
  refreshTimeline();
});
```

---

## 📦 Estrutura de Arquivos

```
server/services/brainCloud/adapters/
├── index.ts                    # Exports públicos
├── README.md                   # Esta documentação
├── BrainCloudAdapter.ts        # Interface base ✅
├── types.ts                    # Tipos compartilhados ✅
├── events.ts                   # Event system ✅
├── workflows.ts                # Workflow system ✅
├── RestBrainCloudAdapter.ts    # 🚧 TODO
├── McpBrainCloudAdapter.ts     # 🚧 TODO
└── BrainCloudService.ts        # 🚧 TODO (serviço unificado)
```

---

## 🚀 Próximos Passos

### Sprint 2 - Fase 2

**Prioridade Alta:**
1. ✅ Interface + tipos
2. ✅ Event system
3. ✅ Workflow system
4. 🚧 `RestBrainCloudAdapter` (wrapper `brainCloudClient`)
5. 🚧 `McpBrainCloudAdapter` (wrapper `brainCloudService`)
6. 🚧 `BrainCloudService` (unificado com auto-detection)

**Prioridade Média:**
7. Migrar rota `/api/brain` para usar `BrainCloudService`
8. Criar endpoint SSE `/api/brain/events`
9. Adicionar testes unitários (adapters + workflows)
10. Documentar capabilities por adapter

**Prioridade Baixa:**
11. Implementar workflow executor completo
12. Criar workflow templates (productivity, automation)
13. UI para criar workflows (drag-and-drop)
14. Deprecar serviços antigos (REST/MCP/Hybrid/Proxy)

---

## 🎨 Casos de Uso

### 1. **UI cria nota → Aparece em tempo real no Dashboard**

```typescript
// Backend: adapter emite evento
await adapter.writeFile('nota.md', 'conteúdo');
globalEventBus.emit('file:created', { path: 'nota.md', source: 'ui', ... });

// Frontend: ChatWidget/Dashboard recebe via SSE
const stream = new EventSource('/api/brain/events?filter=file:created');
stream.onmessage = (e) => {
  const event = JSON.parse(e.data);
  addToTimeline(event); // Atualiza terceiro bloco (Timeline)
};
```

### 2. **Agent cria workflow durante chat**

```typescript
// ChatWidget: usuário pede "crie um workflow que salva todas minhas conversas"
// Agent gera código:
const workflow = new WorkflowBuilder('Auto-save conversations', 'agent')
  .onEvent('conversation:saved')
  .createNote('Conversas/{{date}}_{{conversationId}}.md', '{{content}}')
  .build();

await workflowManager.register(workflow);
// ↳ Workflow ativo imediatamente, sem deploy
```

### 3. **Interface alimenta Obsidian → Sync → UI atualiza**

```typescript
// 1. UI cria tarefa
await fetch('/api/tasks', { method: 'POST', body: { title: 'Revisar docs' } });

// 2. Backend cria nota no vault via adapter
await adapter.createNote('Tasks/revisar-docs.md', frontmatter + content);

// 3. Evento emitido
globalEventBus.emit('task:created', { taskId, filePath, source: 'ui' });

// 4. Obsidian sincroniza (via plugin ou manual)
// 5. Brain Cloud detecta mudança no vault
globalEventBus.emit('sync:completed', { filesChanged: 1 });

// 6. Dashboard atualiza automaticamente (via SSE)
// ↳ Terceiro bloco mostra nova tarefa em tempo real
```

---

## 🧪 Testes

### Testes Unitários
```typescript
// tests/unit/adapters/RestBrainCloudAdapter.test.ts
describe('RestBrainCloudAdapter', () => {
  it('should search vault via REST API', async () => {
    const adapter = new RestBrainCloudAdapter();
    const result = await adapter.search({ query: 'test' });
    expect(result.success).toBe(true);
    expect(result.results).toBeInstanceOf(Array);
  });
});
```

### Testes de Integração
```typescript
// tests/integration/brain-cloud-service.test.ts
describe('BrainCloudService', () => {
  it('should auto-detect adapter based on context', async () => {
    const service = new BrainCloudService({ mode: 'auto' });

    // REST context
    const restResult = await service.withContext({ req }).search({ query: 'test' });
    expect(restResult.mode).toBe('rest');

    // MCP context
    const mcpResult = await service.withContext({ agentId: 'agent-1' }).search({ query: 'test' });
    expect(mcpResult.mode).toBe('mcp');
  });
});
```

---

## 📚 Referências

- [Strategy Pattern (Refactoring Guru)](https://refactoring.guru/design-patterns/strategy)
- [Server-Sent Events (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [MCP Protocol Spec](https://modelcontextprotocol.io)
- [Obsidian REST API](http://localhost:8000/docs) (local MCP server)

---

**Última Atualização:** 2025-10-20 00:45 BRT
**Mantenedor:** Claude (Anthropic) + Guilherme (GG.AI Labs)
**Versão Next.js:** 15.5.6
**Status:** Fase de Fundação Arquitetural
