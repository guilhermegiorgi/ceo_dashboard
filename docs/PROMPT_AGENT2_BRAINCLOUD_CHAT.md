# AGENT 2: Obsidian Brain Cloud + Chat Funcional

**Objetivo:** Integrar dados reais do Obsidian vault, fazer chat processar mensagens com contexto.  
**Tempo estimado:** 3-4h  
**Prioridade:** P0 CRÍTICO

## CONTEXTO

- Brain Cloud MCP está disponível em: `https://obsidian-mcp.ggailabs.com`
- Token: `BRAINCLOUD_API_TOKEN` no `.env`
- Já existe `BrainCloudService` com Strategy Pattern (REST/MCP)
- Chat UI existe mas não processa mensagens

## TAREFAS

### 1. Integrar Brain Cloud Real (1.5h)

**Arquivos:**
- `server/routes/dashboard.js` - GET `/api/dashboard/today`
- `server/routes/knowledgeGraph.js` - GET `/api/knowledge-graph/nodes`

**Ações:**

**Dashboard:**
```javascript
// Em vez de mock, usar:
import { brainCloudService } from '../services/brainCloud/BrainCloudService.ts';

router.get('/today', async (req, res) => {
  const focus = await brainCloudService.getFocus();
  const tasks = await brainCloudService.getTasks({ window: 'today' });
  const recentNotes = await brainCloudService.search({ 
    query: 'modified:today', 
    limit: 5 
  });

  res.json({
    focus: focus.weekly || {},
    dailyNotes: focus.daily || [],
    tasks: tasks.items || [],
    recentNotes: recentNotes.results || [],
  });
});
```

**Knowledge Graph:**
```javascript
router.get('/nodes', async (req, res) => {
  const graph = await brainCloudService.getGraph({ max_nodes: 100 });
  res.json(graph);
});
```

### 2. Fazer Chat Funcionar (1.5h)

**Arquivos:**
- `server/routes/chat.js`
- `app/api/chat/route.ts` (se existir)

**Ações:**

1. **Verificar rota atual:**
   - Se usa OpenAI, verificar `OPENAI_API_KEY` no `.env`
   - Se não, implementar integração simples

2. **Adicionar contexto do Brain Cloud:**
```javascript
router.post('/', async (req, res) => {
  const { message, conversationId } = req.body;

  // 1. Buscar contexto relevante do vault
  const context = await brainCloudService.getHistoricalContext({
    query: message,
    limit: 3
  });

  // 2. Enviar para AI com contexto
  const systemPrompt = `Você é um assistente CEO com acesso ao vault Obsidian.
Contexto relevante:
${context.results.map(r => `- ${r.title}: ${r.excerpt}`).join('\n')}`;

  // 3. Chamar OpenAI/outro modelo
  // 4. Salvar conversa no Brain Cloud
  await brainCloudService.saveConversation({
    conversation_id: conversationId,
    messages: [{ role: 'user', content: message }, ...]
  });

  res.json({ response: aiResponse });
});
```

### 3. Conectar Frontend ao Chat (1h)

**Arquivos:**
- `src/components/ConversationView.tsx`
- `src/hooks/useAPI.tsx`

**Ações:**
- Verificar se `onSendMessage` está conectado corretamente
- Testar fluxo: digitar mensagem → backend → resposta → UI atualiza
- Adicionar loading states

### 4. Testar & Validar (30min)

- ✅ Dashboard mostra dados reais do vault (notas, tasks)
- ✅ Knowledge Graph mostra nós reais
- ✅ Chat processa mensagem e retorna resposta
- ✅ Chat salva conversa no Brain Cloud
- ✅ Contexto do vault é usado nas respostas

## ENTREGA

- [ ] Dashboard com dados reais do Obsidian
- [ ] Knowledge Graph funcional
- [ ] Chat processando e respondendo mensagens
- [ ] Conversas salvas no Brain Cloud
- [ ] Testes manuais passando
- [ ] Commit: "feat: integrate Obsidian Brain Cloud data, enable chat"

## BLOQUEADORES

Se OpenAI API não configurada, pode usar resposta mock mas documente no commit que precisa configurar API key.
