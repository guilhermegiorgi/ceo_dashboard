# AGENT 1: Migração PostgreSQL + Limpeza de Código

**Objetivo:** Eliminar SQLite legacy, migrar para PostgreSQL, remover código morto.  
**Tempo estimado:** 3-4h  
**Prioridade:** P0 CRÍTICO

## CONTEXTO

Sistema está rodando mas com dados mockados porque várias rotas ainda dependem de SQLite (`server/services/database.js`). WorkflowManager já migrado para PostgreSQL com sucesso. Precisa fazer o mesmo para o resto.

## TAREFAS

### 1. Migrar Dashboard Routes para PostgreSQL (1.5h)

**Arquivos:**
- `server/routes/dashboard.js`
- `server/routes/settings.js`
- `server/routes/projects.js`

**Ações:**
- Remover imports de `server/services/database.js` (SQLite)
- Usar `import { query } from '../database/pg-pool.js'`
- Criar schemas PostgreSQL:
  ```sql
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT,
    progress INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS dashboard_collections (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- Implementar CRUD completo (não mock)

### 2. Remover SQLite Completamente (1h)

**Arquivos para DELETAR:**
- `server/services/database.js`
- `server/database/ceo_dashboard.db` (se existir)

**Arquivos para ATUALIZAR:**
- Buscar todos os imports de `database.js`: `grep -r "from.*database.js" server/`
- Substituir por PostgreSQL ou remover se não usado

### 3. Limpar Código Morto (1h)

**Frontend:**
- Remover imports não usados em `BusinessIntelligenceHub.tsx`:
  - `TimelineCardComponent` (linha 66) - não usado
  - `DashboardHeader`, `MainLayout` - verificar uso
  - `ConversationView`, `InboxNoteCard`, `StatsWidget` - verificar uso

**Backend:**
- Remover rotas não registradas em `server/routes/`
- Consolidar rotas duplicadas

### 4. Testar & Validar (30min)

- ✅ `npm run dev` sobe sem erros
- ✅ `/api/projects` retorna dados reais (não array vazio)
- ✅ `/api/dashboard/today` retorna snapshot real
- ✅ `/api/settings/dashboard/collections` funciona
- ✅ Nenhum erro 404/500 no console do browser

## ENTREGA

- [ ] SQLite completamente removido
- [ ] Todas as rotas usando PostgreSQL
- [ ] Dados reais (não mock) funcionando
- [ ] Testes manuais passando
- [ ] Commit com mensagem: "feat: migrate SQLite to PostgreSQL, remove dead code"

## BLOQUEADORES

Se encontrar código que precisa de decisão de negócio (ex: schema de tabela), documente no commit message e siga em frente com schema razoável.
