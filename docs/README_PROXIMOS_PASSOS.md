# 📋 Próximos Passos - CEO Dashboard

Este documento rastreia o progresso das três frentes principais (Agents 1-3) e aponta os próximos passos imediatos.

---

## ✅ Progresso Atual

### Agent 1 — Migração PostgreSQL *(concluído)*
- `/api/projects` e `/api/settings/dashboard/collections` agora usam `pg-pool` com escopo multi-tenant e invalidam cache por tenant.
- Código SQLite removido (`server/services/database.js`, `server/routes/sessions.js`, `server/data/dashboard.db`).
- Dependência `sqlite3` excluída do `package.json`.
- **Pendências rápidas:**
  - `npm install` ➜ gerar `package-lock.json` atualizado.
  - Garantir migrations aplicadas no Supabase/SGBD-alvo (`migrations/*.cjs`).
  - Confirmar ausência de referências ao legacy (`rg "/api/sessions" -g"*.tsx" src`).

### Agent 2 — Brain Cloud + Chat *(concluído)*
- Snapshot diário (`/api/dashboard/today`) usa Brain Cloud Service (MCP + fallback REST) e fornece notas/tarefas reais.
- `/api/knowledge-graph/nodes` devolve nós/arestas reais com fallback automático.
- Chat consulta contexto histórico, envia mensagens ao modelo configurado e salva conversas no vault (`save_conversation_history`).
- **Pendências leves:**
  - Verificar credenciais dos provedores (`CHAT_PROVIDER`, `CHAT_API_KEY`, etc.).
  - Rodar smoke test autenticado (chat + knowledge graph) para validar fluxos em produção.

### Agent 3 — Hub Decomposition & Otimizações *(em andamento)*
- `BusinessIntelligenceHub` passou a consumir `useDashboardData` em vez de replicar estados locais.
- Rotas App Router legadas removidas (`chat-preview`, `chat-centered`, `chat-professional`, `session-planner`).
- Knowledge Graph renderizado via `React.lazy` + `Suspense`, diminuindo o custo inicial.

**✅ PROGRESSO PHASE 1 (Hooks Extraction - CONCLUÍDO):**
  - ✅ `useTasksState.ts` - Gerencia 57 declarações de estado de tarefas (~192 linhas)
  - ✅ `useInboxState.ts` - Gerencia estado do inbox e notas expandidas (~94 linhas)
  - ✅ `useSemanticInsights.ts` - Busca semântica via Brain Cloud (~123 linhas)
  - ✅ `useTimelineState.ts` - Timeline de eventos e conversas (~180 linhas)
  - ✅ `useUIState.ts` - Painéis e modais da UI (~132 linhas)

**🔄 PRÓXIMAS ENTREGAS (Phase 2):**
  1. ✅ Extrair hooks específicos (CONCLUÍDO - ver `docs/AGENT3_HOOKS_EXTRACTION_PROGRESS.md`)
  2. 🔄 **Integrar hooks no Hub** - Substituir 57+ `useState` chamando os hooks customizados
  3. 🔄 Reduzir Hub para ~2500 linhas (alvo após integração)
  4. ⏳ Reintroduzir renderizadores das ferramentas do chat (atualmente stubs em `src/components/chat-tools.tsx`)
  5. ⏳ Executar `npm run build` e validar warnings/performance após a refatoração.

---

## 🎯 Fluxo de Trabalho Recomendado

1. **Validar groundwork pós-Agent 1/2** (15-30 min)
   ```bash
   npm install
   npm run dev
   rg "/api/sessions" -g"*.tsx" src
   ```
   - Verifique se o dashboard sobe sem erros e se a Brain Cloud responde (snapshot/graph/chat).

2. **Continuar Agent 3 – Refatoração do Hub (2-3 h)**
   ```bash
   cat docs/PROMPT_AGENT3_OTIMIZACOES.md
   # Focar nas fases de hooks e limpeza de utilidades
   ```
   - Priorize a extração dos blocos de tarefas, inbox e insights.
   - Atualize `docs/HUB_DECOMPOSITION_PHASE3.md` com o que for concluído.

3. **Retomar ferramentas do chat e testes finais (1 h)**
   - Reimplementar UIs específicas das ferramentas MCP.
   - `npm run build` ➜ garantir 0 warnings/perda de performance.
   - Registrar pendências restantes no README e no prompt do Agent 3.

---

## 📊 Resultado Esperado após os 3 Agents

```
✅ Sistema 100% funcional com dados reais da Brain Cloud
✅ Chat com contexto e histórico persistido
✅ PostgreSQL em todo o backend (sem vestígios de SQLite)
✅ Hub reduzido e modular (~2500 linhas) com lazy/lint limpos
✅ Build de produção (`npm run build`) sem warnings
```

---

## 📝 Resumo Executivo

| Item | Tempo estimado | Entrega |
|------|----------------|---------|
| Validação pós-Agent 1/2 | 15-30 min | `npm install` + smoke tests Brain Cloud |
| Agent 3 (hooks + otimização) | 2-3 h | Redução do Hub, hooks dedicados |
| Testes & tool UIs | 1 h | Build final, restauração das ferramentas do chat |
| **Total restante** | ~4-5 h | Dashboard pronto para revisão completa |

---

## ❓ FAQ Rápido

- **Preciso reexecutar o questionário?** Não. As definições estão em `docs/DEFINICOES_SISTEMA_PREENCHIDO.md`, mas revise se novos requisitos surgirem.
- **Posso rodar agentes em paralelo?** Após validação do Agent 1, os demais podem ser executados em paralelo *apenas* se houver recursos para manter testes em sincronia.
- **E se algo quebrar?** Cada prompt possui seção **BLOQUEADORES**. Documente o problema no commit e, se necessário, reverta para preservar estabilidade.
- **Commits por agente?** Sim. Cada agente deve registrar mudanças com mensagem própria (ex.: `feat: integrate Obsidian Brain Cloud data, enable chat`).

---

## 📞 Próximas Ações

1. **Rodar `npm install` e smoke tests** ➜ fecha pendências do Agent 1/2.
2. **Retomar o Agent 3 a partir do prompt** (`docs/PROMPT_AGENT3_OTIMIZACOES.md`).
3. **Atualizar este arquivo** conforme as frentes forem concluídas.

> Qualquer contexto novo pode ser salvo via `save_conversation_history` para não se perder no vault.
