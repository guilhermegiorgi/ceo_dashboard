# Feature: Enhanced Chat with Sandbox & MCP Integration

## 🎯 Objetivo

Melhorar o sistema de chat do CEO Dashboard integrando:
- **Remote Workbench**: Executor de código isolado com sandbox (similar ao Rube)
- **MCP Integration Melhorada**: Cliente com retry, caching e fallbacks
- **Context Management**: Gerenciamento inteligente de contexto de conversa
- **Persistent Sessions**: Sessões persistentes com histórico

## 📦 O que foi adicionado

### 1. **SandboxExecutor** (`server/services/sandboxExecutor.js`)
Executor de código isolado que permite:
- Executar JavaScript com contexto isolado
- Executar Python (se disponível)
- Executar Bash scripts
- Timeout e limite de memória
- Captura de stdout/stderr

**Uso:**
```javascript
const result = await sandboxExecutor.executeCode(
  `console.log('Hello from sandbox')`,
  30000, // timeout
  'javascript'
);
```

### 2. **RemoteWorkbench** (`server/services/remoteWorkbench.js`)
Gerencia sessões de execução remota:
- Cria sessões por usuário/agente
- Persistir contexto e variáveis
- Histórico de execuções
- Estado persistente

**Uso:**
```javascript
const session = await remoteWorkbench.createSession(userId, agentId);
const execution = await remoteWorkbench.executeCode(
  session.id,
  code,
  'javascript'
);
```

### 3. **MCPClientImproved** (`server/services/mcpClientImproved.js`)
Cliente MCP melhorado com:
- **Retry automático**: Tenta 3x com backoff exponencial
- **Caching**: Cache com TTL configurável
- **Fallbacks**: Retorna resultado local se Brain Cloud indisponível
- **Streaming**: Suporte a SSE para respostas em stream
- **Event emitters**: Emite eventos para log/monitoring

**Uso:**
```javascript
const result = await mcpClient.call(
  'mcp_semantic_search',
  { query: 'IA e agricltura', limit: 5 },
  { 
    useCache: true, 
    fallbackLocal: true,
    cacheTime: 300000 
  }
);
```

### 4. **EnhancedChatService** (`server/services/enhancedChatService.js`)
Serviço de chat integrado:
- Análise automática de intenção
- Execução de ferramentas apropriadas (MCP + Sandbox)
- Gerenciamento de contexto
- Suporte a código inline

**Uso:**
```javascript
const conversation = await enhancedChatService.startConversation(userId, agentId);
const response = await enhancedChatService.sendMessage(
  conversationId,
  'Analise as tarefas dessa semana',
  { code: 'optional code snippet' }
);
```

### 5. **Chat Routes** (`server/routes/chat.js`)
Endpoints REST:
- `POST /api/chat/conversations` - Iniciar conversa
- `POST /api/chat/conversations/:id/messages` - Enviar mensagem
- `GET /api/chat/conversations/:id/messages` - Histórico
- `GET /api/chat/conversations/:id/stream` - SSE stream
- `POST /api/chat/execute` - Executar código direto
- `DELETE /api/chat/conversations/:id` - Deletar conversa

### 6. **Database Migrations** (`migrations/chat_and_workbench.js`)
Tabelas criadas:
- `workbench_sessions`: Sessões de execução
- `workbench_executions`: Histórico de execuções
- `chat_conversations`: Conversas
- `chat_messages`: Mensagens com ferramentas usadas

## 🚀 Instalação

### 1. Criar a branch
```bash
git checkout main
git pull origin main
git checkout -b feature/enhanced-chat-sandbox-mcp
```

### 2. Copiar os arquivos
```bash
# Copiar os arquivos gerados do workbench
cp -r /home/user/ceo_dashboard_improvements/* ./
```

### 3. Instalar dependências (se necessário)
```bash
npm install
# Nenhuma dependência nova - apenas use as existentes
```

### 4. Rodar migrations
```bash
npm run migrate
```

### 5. Configurar variáveis de ambiente
```bash
# .env
BRAINCLOUD_API_TOKEN=seu_token
BRAINCLOUD_BASE_URL=https://obsidian-mcp.ggailabs.com
```

### 6. Registrar rotas no servidor
Em `server/index.js`:
```javascript
import chatRoutes from './routes/chat.js';

app.use('/api/chat', chatRoutes);
```

## 📋 Exemplos de Uso

### Exemplo 1: Chat Simples com Busca no Brain
```javascript
const conversation = await enhancedChatService.startConversation(userId);
const response = await enhancedChatService.sendMessage(
  conversation.id,
  'Quais são as notas mais importantes sobre IA?'
);
// Resposta usa: mcp_semantic_search automaticamente
```

### Exemplo 2: Código no Sandbox
```javascript
const response = await enhancedChatService.sendMessage(
  conversation.id,
  'Execute uma análise de dados',
  {
    code: \`
      const data = [1, 2, 3, 4, 5];
      const avg = data.reduce((a, b) => a + b) / data.length;
      console.log('Média:', avg);
    \`,
    language: 'javascript'
  }
);
```

### Exemplo 3: Análise de Tarefas
```javascript
const response = await enhancedChatService.sendMessage(
  conversation.id,
  'Quais tarefas vencem essa semana?'
);
// Usa: mcp_get_tasks + mcp_get_tasks_summary
```

### Exemplo 4: Stream de Resposta (Frontend)
```javascript
// Browser
const eventSource = new EventSource(
  '/api/chat/conversations/conv-123/stream'
);

eventSource.onmessage = (event) => {
  const chunk = JSON.parse(event.data);
  console.log('Chunk:', chunk);
};
```

## 🔄 Fluxo de Execução

```
1. Usuário envia mensagem
   ↓
2. Chat Service analisa intenção
   ↓
3. Build context (carrega dados do Brain, tarefas, etc)
   ↓
4. Executa ferramentas apropriadas:
   - MCP tools (com retry/cache)
   - Sandbox execution (se código)
   - Web search (se necessário)
   ↓
5. Gera resposta (com integração LLM futura)
   ↓
6. Persiste em DB e retorna ao usuário
```

## 🛡️ Segurança

- **Sandbox isolado**: Código roda em processo separado
- **Timeouts**: Máximo 30s por execução
- **Memory limits**: 512MB por processo
- **File access**: Limitado a /tmp/ceo-dashboard-sandbox
- **Auth**: Todas rotas requerem JWT válido
- **Rate limiting**: Aplicar express-rate-limit nas rotas de chat

## 📊 Monitoramento

### Logs
```javascript
mcpClient.on('cache-hit', ({toolName}) => console.log('Cache hit:', toolName));
mcpClient.on('retry', ({attempt, delay}) => console.log(\`Retry \${attempt} em \${delay}ms\`));
mcpClient.on('tool-error', ({error}) => console.error('MCP error:', error));
```

### Database Queries
```sql
-- Execuções mais lentas
SELECT * FROM workbench_executions 
WHERE duration > 5000 
ORDER BY created_at DESC;

-- Conversas ativas
SELECT COUNT(*) as active_conversations
FROM chat_conversations
WHERE updated_at > NOW() - INTERVAL '1 day'
AND archived_at IS NULL;
```

## ✅ Checklist de Integração

- [ ] Copiar arquivos para o repositório
- [ ] Registrar rotas em server/index.js
- [ ] Rodar migrations
- [ ] Testar endpoints básicos
- [ ] Verificar conectividade com Brain Cloud
- [ ] Testar sandbox execution
- [ ] Integração com frontend (próximo passo)
- [ ] Documentar no README principal
- [ ] Deploy para staging
- [ ] Testes end-to-end

## 🔗 Próximos Passos

1. **Frontend Integration**: Criar componentes React para chat
2. **LLM Integration**: Integrar Claude/GPT para respostas melhores
3. **Streaming**: Implementar WebSocket para respostas real-time
4. **Advanced Features**: 
   - Planejamento multi-passos (agentic loop)
   - Context window management
   - Tool chaining

## 📝 Notas

- **Fallbacks**: Se Brain Cloud estiver indisponível, sistema usa resultados locais
- **Caching**: Ajuste `cacheTime` conforme necessário
- **Performance**: Sandbox é isolado, pode ter overhead. Use cache quando possível
- **Escalabilidade**: Para 1000+ users, considere job queue (Bull/BullMQ)

## 🤝 Contribuindo

Ao fazer commits:
```bash
git commit -m "feat: melhorar chat com [feature]"
```

Push e abra PR contra `main`.

---

**Status**: 🚧 In Development
**Versão**: 1.0.0
**Última atualização**: 2025-10-17
