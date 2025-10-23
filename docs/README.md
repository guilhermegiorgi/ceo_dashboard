# GG.AI Labs – CEO Dashboard

Um cockpit operativo que conecta o **Segundo Cérebro** (vault Obsidian) à camada de IA **Sophia 3.0**. O sistema consolida foco, tarefas, projetos, insights, grafos e chat cognitivo em uma única experiência, com dados reais alimentados pela Brain Cloud MCP e persistência em PostgreSQL.

---

## 🚀 O que está entregue hoje

### Dashboard em tempo real
- Snapshot diário alimentado pela Brain Cloud (foco semanal, tarefas críticas, notas recentes).
- Cards de agentes e eventos em tempo real via SSE.
- Utilidades dedicadas: tarefas, inbox, notas diárias, histórico de chat, grafo e ferramentas MCP.

### Conversas com contexto do vault
- Chat streaming via assistant-ui, enriquecido com busca semântica na Brain Cloud.
- Conversas e contextos persistidos automaticamente no vault (`5 - INSIGHTS-IA/Conversas/...`).
- Seleção dinâmica de modelos/fornecedores de IA.

### Knowledge Graph acionável
- `/api/knowledge-graph/nodes` expõe nós/arestas reais do vault com fallback REST/MCP.
- Visualização carregada sob demanda (lazy) no Hub para reduzir custo inicial.

### Backend consolidado em PostgreSQL
- Rotas de projetos e coleções do dashboard migradas para `pg-pool` com escopo multi-tenant.
- Código legacy SQLite e rotas antigas removidos.

---

## 🧱 Stack Atual

| Camada | Tecnologias | Observações |
|--------|-------------|-------------|
| **Frontend/App** | [Next.js 15](https://nextjs.org/) (App Router), React 19, TypeScript, Tailwind CSS, assistant-ui | Executa em `http://localhost:3000` durante o dev; `/app` concentra as rotas do dashboard |
| **BFF / API** | Node.js + Express (`server/index.js`), Brain Cloud unified service (REST/MCP), Redis (opcional) | Sobe em `http://localhost:3002`; expõe `/api/*` consumido pelo Next |
| **Banco de Dados** | PostgreSQL (Supabase ou self-hosted) com `pg` | Migrations em `migrations/` + pool em `server/database/pg-pool.js` |
| **Integrações** | Obsidian Brain Cloud MCP, SSE event bus, provedores de IA configuráveis | Configuração via `.env` (root + `server/.env`) e painel `/settings` |

### Estrutura do repo
```
app/                # Rotas Next.js (App Router)
server/             # Express API, serviços, integrações MCP
src/components      # UI modularizada (Hub e utilitários)
src/hooks           # Hooks auxiliares
scripts/, migrations/  # automações e schema PG
```

---

## ▶️ Como rodar localmente

1. **Instale dependências**
   ```bash
   npm install
   ```

2. **Configure variáveis**
   - `.env` (raiz) para variáveis expostas ao Next (`NEXT_PUBLIC_*`, `CHAT_*`, etc.).
   - `server/.env` para segredos do backend (`PORT`, `BRAINCLOUD_*`, `OPENAI_*`, credenciais PG).

   Exemplo mínimo:
   ```env
   PORT=3002
   DATABASE_URL=postgres://user:pass@host:6543/db
   BRAINCLOUD_API_TOKEN=xxxxxxxx
   BRAINCLOUD_BASE_URL=https://obsidian-mcp.ggailabs.com
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3002
   CHAT_PROVIDER=openai
   CHAT_API_KEY=sk-...
   ```

3. **Inicie frontend + backend em paralelo**
   ```bash
   npm run dev
   ```
   - Next.js (frontend) ➜ `http://localhost:3000`
   - Express (backend) ➜ `http://localhost:3002`

4. **Outros scripts úteis**
   ```bash
   npm run dev:frontend   # apenas Next.js
   npm run dev:backend    # apenas Express (nodemon)
   npm run build          # build Next + preparar server
   npm run lint           # ESLint unificado
   ```

---

## 🧩 Componentes e Fluxos Principais

| Área | Arquivo de entrada | Destaques |
|------|---------------------|-----------|
| Business Intelligence Hub | `src/components/BusinessIntelligenceHub.tsx` | Container principal (em processo de decomposição: hooks + componentes utilitários)|
| Chat Assistente | `src/components/ChatWidget.tsx` | Streaming assistant-ui + ferramentas MCP |
| Dashboard Provider | `src/contexts/DashboardDataContext.tsx` | Carrega snapshot/coleções com caching básico |
| API Client | `src/services/apiClient.ts` | Client HTTP tipado para `/api/*` |
| Brain Cloud Service | `server/services/brainCloudService.js` + `brainCloud/BrainCloudService.ts` | Abstração REST/MCP com fallback automático |
| Projetos API | `server/routes/projects.js` | CRUD multi-tenant em PostgreSQL |

---

## 📡 Integração com Brain Cloud MCP

1. Gere um token no painel MCP (`BRAINCLOUD_API_TOKEN`).
2. Configure `BRAINCLOUD_BASE_URL`, `VITE_BRAINCLOUD_API_TOKEN`/`VITE_BRAINCLOUD_MCP_HTTP` se desejar expor ao frontend.
3. Verifique `/api/settings/braincloud` para persistir parâmetros via UI.
4. Snapshot, grafo, chat e ferramentas MCP dependem dessa configuração.

> Em ambiente local sem credenciais, o Hub exibe dados fallback. Para QA real, é recomendado apontar para o tenant Supabase + Brain Cloud oficial.

---

## 🗺 Roadmap em andamento

| Fase | Objetivo | Status |
|------|----------|--------|
| Agent 1 – Migração PostgreSQL | Migrar rotas críticas `/api/projects` e settings para PG | ✅ Concluído (pg-pool + cache por tenant) |
| Agent 2 – Brain Cloud + Chat | Snapshot real, grafo MCP e chat com contexto | ✅ Concluído (REST/MCP integrados + conversa persistida) |
| Agent 3 – Otimizações Hub | Decompor `BusinessIntelligenceHub`, lazy load, remoção de pages legadas | 🔄 Em progresso (contexto unificado + cleanup de rotas) |
| Agent 4 – (Planejado) | Storybook/testes de regressão + automações workflows | ⏳ Planejado |

Pendências ativas do Agent 3:
- Extrair hooks dedicados (`useTasks`, `useInbox`, etc.) e finalizar redução para ~2500 linhas.
- Reintroduzir tool renderers específicos (substituídos por stubs em `src/components/chat-tools.tsx`).
- Atualizar `package-lock.json` após remoção de `sqlite3` (rodar `npm install`).

---

## 📚 Documentação complementar

- `docs/README_PROXIMOS_PASSOS.md` – acompanhamento tático dos agentes.
- `docs/HUB_DECOMPOSITION_PHASE3.md` – análise detalhada e roadmap de refatoração do Hub.
- `docs/PROMPT_AGENT*_*.md` – instruções operacionais para cada agente.
- `docs/QUESTIONARIO_DEFINICAO_SISTEMA.md` / `DEFINICOES_SISTEMA_PREENCHIDO.md` – requisitos funcionais consolidados.

---

## 🤝 Contribuição & Suporte

1. Crie uma branch (`git checkout -b feature/nome`).
2. Garanta lint/tests (`npm run lint`, testes específicos quando aplicável).
3. Abra um PR descrevendo o impacto (rotas, hooks, UI, etc.).

Para dúvidas rápidas: abra uma issue ou registre contexto via `save_conversation_history` para manter o histórico no vault.
