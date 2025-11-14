# 🎯 Plano de Ação - CEO Dashboard

**Branch atual:** `claude/fix-placeholders-and-mcp-integration-01PWMvqrocTQufnQexg9p6r9`
**Data:** 2025-11-14
**Status:** Análise completa realizada

---

## 📊 Diagnóstico Atual

### 🔴 Problemas Críticos Identificados

#### 1. **Arquivo `.env` Não Existe** (BLOQUEADOR)
- ❌ O arquivo `.env` não foi criado
- ❌ Variáveis `BRAINCLOUD_BASE_URL` e `BRAINCLOUD_API_TOKEN` ausentes
- ❌ **IMPACTO:** Chat NÃO consegue se conectar ao MCP/Obsidian

**Solução:**
```bash
cp .env.example .env
# Editar .env e adicionar:
BRAINCLOUD_BASE_URL=https://obsidian-mcp.ggailabs.com
BRAINCLOUD_API_TOKEN=ggai_90e2c6b20c8315906f843798bbc1598df596978a2ec79457e6d00563c76d03dc
```

#### 2. **README.md Desatualizado**
O README lista componentes como "placeholders" que já estão COMPLETAMENTE implementados:

**❌ Listados incorretamente como placeholder:**
- ✅ `FeedbackLoopTracker` - 642 linhas, totalmente funcional
- ✅ `ProjectOverview` - 362 linhas, totalmente funcional
- ✅ `UserProfileModal` - 310 linhas, totalmente funcional

**✅ Placeholders REAIS (precisam reimplementação):**
- ❌ `AIAgentOrchestrator` - 18 linhas, placeholder
- ❌ `MCPIntegration` - 13 linhas, placeholder
- ❌ `MarketIntelligenceEngine` - 13 linhas, placeholder
- ❌ `ProactiveSynergyPanel` - 12 linhas, placeholder

#### 3. **Integração MCP → Chat Não Funciona**

**Fluxo atual (QUEBRADO):**
```
User Message
  ↓
POST /api/mcp/chat/stream
  ↓
mcpSessionManager.createSession() ❌ FALHA (sem credenciais)
  ↓
Chat continua SEM ferramentas MCP
  ↓
AI não consegue acessar Obsidian
```

**Fluxo esperado (CORRETO):**
```
User Message
  ↓
POST /api/mcp/chat/stream
  ↓
mcpSessionManager.createSession() ✅ (com BRAINCLOUD_BASE_URL + TOKEN)
  ↓
30+ MCP tools carregadas (search, graph, tasks, etc.)
  ↓
Tools injetadas no prompt da AI
  ↓
AI chama tools conforme necessário
  ↓
mcpSession.callTool(name, args)
  ↓
Brain Cloud executa no Obsidian
  ↓
Resultados retornados ao chat
```

#### 4. **Documentação Desorganizada**
- 121 arquivos de documentação
- Muitos criados durante refatoração (nomes como `PROMPT_AGENT*`, `FIX_*`)
- Difícil identificar o que é relevante vs. histórico

---

## 🛠️ Plano de Ação Estruturado

### Fase 1: Correções Críticas (Prioridade MÁXIMA)

#### ✅ Tarefa 1.1: Criar arquivo `.env`
```bash
# Copiar template
cp .env.example .env

# Adicionar variáveis obrigatórias:
BRAINCLOUD_BASE_URL=https://obsidian-mcp.ggailabs.com
BRAINCLOUD_API_TOKEN=ggai_90e2c6b20c8315906f843798bbc1598df596978a2ec79457e6d00563c76d03dc

# Verificar outras variáveis necessárias:
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
SESSION_SECRET=...
```

**Responsável:** Desenvolvedor
**Estimativa:** 5 minutos
**Bloqueador para:** Chat MCP, Brain Cloud integration

---

#### ✅ Tarefa 1.2: Atualizar README.md
Corrigir seção "Componentes ainda em placeholder":

**REMOVER da lista de placeholders:**
- FeedbackLoopTracker ✅
- ProjectOverview ✅
- UserProfileModal ✅

**MANTER na lista (verdadeiros placeholders):**
- AIAgentOrchestrator ❌
- MCPIntegration ❌
- MarketIntelligenceEngine ❌
- ProactiveSynergyPanel ❌

**Adicionar seção:**
```markdown
### ✅ Componentes recentemente implementados
- `FeedbackLoopTracker` - Sistema completo de tracking de loops de feedback
- `ProjectOverview` - Visão executiva de projetos com filtros e métricas
- `UserProfileModal` - Modal de perfil do usuário com sessões e logout
- `SettingsModal` - 54KB, modal de configurações completo
- `StrategicSessionPlanner` - Planejador de sessões estratégicas
- `StrategicInsights` - Insights estratégicos com IA
```

**Responsável:** Desenvolvedor
**Estimativa:** 10 minutos

---

#### ✅ Tarefa 1.3: Testar integração MCP após configuração
```bash
# 1. Iniciar servidor
npm run dev

# 2. Testar endpoint MCP health
curl http://localhost:3001/api/brain/status

# 3. Abrir chat no frontend
# Navegar para: http://localhost:3000/chat

# 4. Enviar mensagem que requer MCP:
"Busque no meu vault do Obsidian informações sobre o projeto X"

# 5. Verificar nos logs do servidor:
# - [McpSession] Initializing MCP session
# - [McpSession] MCP session established { sessionId: '...', tools: 30 }
# - [CognitoAgent] Tool <name> executed successfully
```

**Responsável:** QA / Desenvolvedor
**Estimativa:** 15 minutos
**Critério de sucesso:** Chat consegue chamar ferramentas do Obsidian

---

### Fase 2: Reimplementar Componentes Placeholder

#### ✅ Tarefa 2.1: Reimplementar `MCPIntegration`

**Descrição:** Interface de gerenciamento de conexões MCP

**Funcionalidades esperadas:**
- Exibir status de conexão MCP (conectado/desconectado)
- Listar ferramentas MCP disponíveis
- Testar execução de ferramentas individuais
- Exibir histórico de chamadas MCP
- Configurar timeout e retry policies

**Arquivos relacionados:**
- `/home/user/ceo_dashboard/src/components/MCPIntegration.tsx` (atual placeholder)
- `/home/user/ceo_dashboard/server/services/mcpSessionManager.js` (backend)
- `/home/user/ceo_dashboard/server/routes/mcp.js` (endpoints)

**Endpoint backend necessário:**
```typescript
GET  /api/mcp/status         // Status da conexão
GET  /api/mcp/tools/list     // Lista de ferramentas
POST /api/mcp/tools/execute  // Testar ferramenta
GET  /api/mcp/history        // Histórico de chamadas
```

**Estimativa:** 4-6 horas
**Prioridade:** Alta (essencial para debugging de MCP)

---

#### ✅ Tarefa 2.2: Reimplementar `AIAgentOrchestrator`

**Descrição:** Interface de orquestração de múltiplos agentes AI

**Funcionalidades esperadas:**
- Listar agentes disponíveis (via `/api/agents`)
- Visualizar status de cada agente (idle, running, paused)
- Iniciar/pausar/parar agentes
- Ver logs em tempo real de agentes ativos
- Configurar triggers e schedules para agentes

**Arquivos relacionados:**
- `/home/user/ceo_dashboard/src/components/AIAgentOrchestrator.tsx` (placeholder)
- `/home/user/ceo_dashboard/server/routes/agents.js` (backend)
- `/home/user/ceo_dashboard/server/services/agentService.js` (lógica)

**Endpoints backend (já existem):**
```typescript
GET    /api/agents           // Listar agentes
POST   /api/agents           // Criar agente
GET    /api/agents/:id       // Detalhes do agente
PUT    /api/agents/:id       // Atualizar agente
DELETE /api/agents/:id       // Deletar agente
POST   /api/agents/:id/run   // Executar agente
```

**Estimativa:** 6-8 horas
**Prioridade:** Alta (core feature do sistema)

---

#### ✅ Tarefa 2.3: Reimplementar `MarketIntelligenceEngine`

**Descrição:** Engine de inteligência de mercado com análise de tendências

**Funcionalidades esperadas:**
- Agregação de notícias/insights de mercado
- Análise de tendências com IA
- Dashboard de métricas de mercado
- Alertas de mudanças significativas
- Integração com fontes externas (API de notícias, etc.)

**Arquivos relacionados:**
- `/home/user/ceo_dashboard/src/components/MarketIntelligenceEngine.tsx` (placeholder)
- Backend service precisa ser criado

**Endpoint backend necessário:**
```typescript
GET  /api/market-intelligence/trends       // Tendências recentes
GET  /api/market-intelligence/news         // Notícias agregadas
POST /api/market-intelligence/analyze      // Analisar tópico específico
GET  /api/market-intelligence/alerts       // Alertas configurados
```

**Estimativa:** 8-10 horas
**Prioridade:** Média (nice-to-have, não bloqueador)

---

#### ✅ Tarefa 2.4: Reimplementar `ProactiveSynergyPanel`

**Descrição:** Painel de identificação proativa de sinergias entre projetos

**Funcionalidades esperadas:**
- Analisar projetos ativos e identificar sobreposições
- Sugerir colaborações entre equipes
- Detectar recursos compartilháveis
- Recomendar ações baseadas em sinergias detectadas

**Arquivos relacionados:**
- `/home/user/ceo_dashboard/src/components/ProactiveSynergyPanel.tsx` (placeholder)
- Backend service precisa ser criado

**Endpoint backend necessário:**
```typescript
GET  /api/synergies/detect        // Detectar sinergias automaticamente
GET  /api/synergies/suggestions   // Sugestões de colaboração
POST /api/synergies/analyze       // Analisar projetos específicos
```

**Estimativa:** 6-8 horas
**Prioridade:** Baixa (feature avançada)

---

### Fase 3: Migração de Páginas Antigas

#### ✅ Tarefa 3.1: Auditar páginas em `src/views/`

Identificar quais páginas ainda usam react-router e precisam migrar:

```bash
# Listar todas as páginas antigas
ls -la src/views/

# Comparar com rotas em app/
ls -la app/(dashboard)/
```

**Páginas conhecidas que precisam migração:**
- `ChatPage.tsx` → `app/(dashboard)/chat/page.tsx`
- `ChatPageCentered.tsx` → `app/(dashboard)/chat-centered/page.tsx` (ou remover se redundante)

**Estimativa:** 2-3 horas por página
**Prioridade:** Média

---

#### ✅ Tarefa 3.2: Remover `react-router-dom`

Após todas as páginas migrarem:

```bash
# Remover dependência
npm uninstall react-router-dom

# Verificar bundle size antes/depois
npm run analyze:bundle
```

**Economia esperada:** ~50KB no bundle
**Estimativa:** 30 minutos
**Prioridade:** Média (após migração completa)

---

### Fase 4: Organização de Documentação

#### ✅ Tarefa 4.1: Categorizar documentação

**Criar estrutura:**
```
docs/
├── archive/              # Docs históricos (PROMPT_*, FIX_*, etc.)
├── architecture/         # Diagramas e decisões arquiteturais
├── api/                  # Referências de API
├── guides/               # Guias de setup e uso
├── migration/            # Notas de migração App Router
└── README.md             # Índice principal
```

**Mover arquivos:**
```bash
# Arquivos históricos para archive/
mv docs/PROMPT_* docs/archive/
mv docs/FIX_* docs/archive/
mv docs/RUNTIME_ERRORS_* docs/archive/

# Arquivos de arquitetura
mv docs/ARCHITECTURE.md docs/architecture/
mv docs/AI_PROVIDER_ARCHITECTURE.md docs/architecture/

# Migração
mv docs/APP_ROUTER_MIGRATION_NOTES.md docs/migration/
```

**Estimativa:** 1-2 horas
**Prioridade:** Baixa (quality of life)

---

#### ✅ Tarefa 4.2: Criar índice de documentação

Criar `/home/user/ceo_dashboard/docs/README.md`:

```markdown
# 📚 Documentação do CEO Dashboard

## 🚀 Início Rápido
- [Setup do Projeto](guides/SETUP.md)
- [Variáveis de Ambiente](guides/ENVIRONMENT.md)
- [Como Rodar](../README.md#como-rodar)

## 🏗️ Arquitetura
- [Visão Geral](architecture/ARCHITECTURE.md)
- [AI Provider Architecture](architecture/AI_PROVIDER_ARCHITECTURE.md)
- [Integração Brain Cloud](INTEGRACAO_COMPLETA.md)

## 📡 APIs
- [Referência Completa](api/api_reference.md)
- [Integração de APIs](API_INTEGRATION.md)

## 🔄 Migração
- [Notas App Router](migration/APP_ROUTER_MIGRATION_NOTES.md)
- [Status da Migração](migration/MIGRATION_STATUS.md)

## 📦 Arquivo
- [Prompts Históricos](archive/)
- [Correções Antigas](archive/)
```

**Estimativa:** 30 minutos
**Prioridade:** Baixa

---

### Fase 5: Testes e Validação

#### ✅ Tarefa 5.1: Criar testes E2E para chat MCP

```typescript
// tests/e2e/chat-mcp-integration.spec.ts

import { test, expect } from '@playwright/test';

test('Chat integrates with MCP tools', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'dev@ggai.dev');
  await page.fill('[name="password"]', 'Dev@2025!');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/');

  await page.goto('/chat');

  const input = page.locator('textarea');
  await input.fill('Busque no vault informações sobre IA');
  await page.keyboard.press('Enter');

  // Aguardar resposta com tool_result
  await expect(page.locator('[data-testid="tool-result"]'))
    .toBeVisible({ timeout: 15000 });
});
```

**Estimativa:** 2-3 horas
**Prioridade:** Alta (validação crítica)

---

#### ✅ Tarefa 5.2: Adicionar health checks

Criar endpoint `/api/health/mcp`:

```javascript
// server/routes/health.js

router.get('/mcp', async (req, res) => {
  try {
    const hasCredentials = mcpSessionManager.hasCredentials();

    if (!hasCredentials) {
      return res.status(503).json({
        status: 'unhealthy',
        mcp: 'missing_credentials',
        message: 'BRAINCLOUD_BASE_URL or BRAINCLOUD_API_TOKEN not configured'
      });
    }

    // Testar conexão
    const session = await mcpSessionManager.createSession(['health-check']);
    await mcpSessionManager.closeSession(session.id);

    res.json({
      status: 'healthy',
      mcp: 'connected',
      tools: session.llmTools.length
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      mcp: 'connection_failed',
      error: error.message
    });
  }
});
```

**Estimativa:** 1 hora
**Prioridade:** Alta (monitoramento)

---

## 📋 Checklist de Execução

### Fase 1: Correções Críticas (FAZER AGORA)
- [ ] 1.1 Criar arquivo `.env` com credenciais MCP
- [ ] 1.2 Atualizar README.md com status correto de componentes
- [ ] 1.3 Testar integração MCP end-to-end

### Fase 2: Placeholders (PRÓXIMA SPRINT)
- [ ] 2.1 Reimplementar `MCPIntegration` (4-6h)
- [ ] 2.2 Reimplementar `AIAgentOrchestrator` (6-8h)
- [ ] 2.3 Reimplementar `MarketIntelligenceEngine` (8-10h) - OPCIONAL
- [ ] 2.4 Reimplementar `ProactiveSynergyPanel` (6-8h) - OPCIONAL

### Fase 3: Migração (PARALELO)
- [ ] 3.1 Auditar e migrar páginas de `src/views/`
- [ ] 3.2 Remover `react-router-dom` do bundle

### Fase 4: Documentação (QUALITY OF LIFE)
- [ ] 4.1 Reorganizar estrutura de docs/
- [ ] 4.2 Criar índice de documentação

### Fase 5: Testes (CONTÍNUO)
- [ ] 5.1 Testes E2E para MCP integration
- [ ] 5.2 Health checks para monitoramento

---

## 🎯 Métricas de Sucesso

### Fase 1 (Crítico)
- ✅ Chat consegue chamar ferramentas MCP
- ✅ Logs mostram "MCP session established"
- ✅ Ferramentas do Obsidian retornam resultados

### Fase 2 (Placeholders)
- ✅ 4 componentes placeholder reimplementados
- ✅ Interfaces funcionais com backend
- ✅ Testes unitários para novos componentes

### Fase 3 (Migração)
- ✅ 0 dependências de react-router-dom
- ✅ Todas as páginas em app/ (App Router)
- ✅ Bundle size reduzido em ~50KB

### Fase 4 (Docs)
- ✅ Estrutura organizada de documentação
- ✅ Índice navegável
- ✅ Docs históricos arquivados

### Fase 5 (Testes)
- ✅ Coverage > 70% em componentes críticos
- ✅ E2E tests para fluxos principais
- ✅ Health checks em produção

---

## 🚨 Riscos e Mitigações

### Risco 1: Credenciais MCP inválidas
**Probabilidade:** Média
**Impacto:** Alto
**Mitigação:** Validar credenciais no setup, adicionar health check

### Risco 2: AI Provider não suporta function calling
**Probabilidade:** Baixa
**Impacto:** Alto
**Mitigação:** Documentar modelos compatíveis, adicionar fallback

### Risco 3: Componentes placeholder complexos demais
**Probabilidade:** Alta
**Impacto:** Médio
**Mitigação:** Implementar MVP primeiro, iterar depois

### Risco 4: Quebra durante migração de páginas
**Probabilidade:** Média
**Impacto:** Médio
**Mitigação:** Migrar incrementalmente, manter coexistência temporária

---

## 📅 Timeline Sugerido

| Fase | Duração Estimada | Prioridade |
|------|------------------|------------|
| Fase 1: Correções Críticas | 30 min | 🔴 CRÍTICA |
| Fase 2: Placeholders | 24-32 horas | 🟠 ALTA |
| Fase 3: Migração | 6-8 horas | 🟡 MÉDIA |
| Fase 4: Documentação | 2-3 horas | 🟢 BAIXA |
| Fase 5: Testes | 4-6 horas | 🟠 ALTA |

**Total:** 36-49 horas (~5-6 dias de trabalho)

---

## 🎬 Próximos Passos Imediatos

1. **AGORA:** Criar arquivo `.env`
2. **AGORA:** Testar chat MCP
3. **HOJE:** Atualizar README.md
4. **ESTA SEMANA:** Implementar `MCPIntegration`
5. **ESTA SEMANA:** Implementar `AIAgentOrchestrator`

---

**Última atualização:** 2025-11-14
**Autor:** Claude (Anthropic AI Assistant)
**Revisão:** Pendente
