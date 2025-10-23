# Status Atual do Sistema - CEO Dashboard
**Data:** 2025-10-20  
**Sessão:** Sprint 2 - Refatoração App Router

## ✅ O QUE ESTÁ FUNCIONANDO

### Infraestrutura
- ✅ Frontend: Next.js 15 + App Router (porta 3000)
- ✅ Backend: Express + Node.js (porta 3002)
- ✅ PostgreSQL: Supabase conectado
- ✅ Redis: Cache funcionando
- ✅ Autenticação: JWT + dev-login funcionando
- ✅ WorkflowManager: PostgreSQL integrado

### Componentes
- ✅ BusinessIntelligenceHub: Renderiza (4280 linhas, decomposição iniciada)
- ✅ NavigationSidebar: Funcional
- ✅ EventListener: SSE conectando (com autenticação)
- ✅ Layout dashboard: Sidebar + áreas funcionais

## ⚠️ PROBLEMAS CRÍTICOS

### 1. Dados Mockados Sem Sentido
- ❌ `/api/projects` → retorna array vazio (era SQLite, agora mock)
- ❌ `/api/knowledge-graph/nodes` → mock vazio
- ❌ `/api/dashboard/today` → provavelmente mockado
- ❌ Falta integração real com Obsidian Brain Cloud MCP

### 2. Chat Não Funciona
- ❌ Interface existe mas não processa mensagens
- ❌ Falta integração com Brain Cloud para contexto
- ❌ Modelos AI não configurados

### 3. Rotas/Páginas Desnecessárias
- ❌ Páginas antigas do Vite podem ainda existir
- ❌ Rotas duplicadas ou não utilizadas
- ❌ Componentes importados mas não usados (TimelineCardComponent, etc)

### 4. SQLite Legacy
- ❌ `server/services/database.js` ainda existe (SQLite)
- ❌ Várias rotas dependem de `ensureDbHelpers()` do SQLite
- ⚠️ Precisa migrar tudo para PostgreSQL

## 📋 ARQUIVOS CHAVE

### Backend
- `server/index.js` - Servidor principal
- `server/routes/index.js` - Registro de rotas
- `server/services/brainCloud/` - Brain Cloud integração
- `server/services/database.js` - **REMOVER (SQLite legacy)**
- `server/database/pg-pool.js` - PostgreSQL ativo

### Frontend
- `app/(dashboard)/page.tsx` - Página principal
- `src/components/BusinessIntelligenceHub.tsx` - Hub principal (4280 linhas)
- `src/services/apiClient.ts` - Cliente API
- `src/hooks/useAPI.tsx` - Hook de API

### Configuração
- `.env` - Variáveis de ambiente (PORT=3002)
- `next.config.mjs` - Config Next.js
- `tsconfig.json` - TypeScript

## 🎯 PRIORIDADES

### P0 - CRÍTICO (Quebra funcionalidade)
1. **Migrar SQLite → PostgreSQL** (dashboard, projects, settings)
2. **Integrar Obsidian Brain Cloud** (dados reais do vault)
3. **Fazer chat funcionar** (com contexto do Brain Cloud)

### P1 - IMPORTANTE (Qualidade)
4. **Remover código legacy** (SQLite, páginas antigas, imports não usados)
5. **Continuar Hub decomposition** (reduzir de 4280 → ~500 linhas)

### P2 - MELHORIAS (Features)
6. **Workflows UI** (já tem backend, falta testar)
7. **Knowledge Graph** (visualização real)
8. **Agents page** (gestão de agentes)

## 🔧 PRÓXIMOS PASSOS

Ver: `PROMPT_AGENT*.md` para tarefas específicas de cada agente.
