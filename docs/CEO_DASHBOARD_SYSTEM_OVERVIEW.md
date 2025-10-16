# CEO Dashboard - Documento Tecnico Integrado

## 1. Escopo e Objetivo
- Este documento consolida o estado atual do repositorio `ceo_dashboard`, cobrindo frontend, backend, persistencia, integracoes de IA e operacoes.
- A sintese reflete o codigo efetivo nos diretorios `src/`, `server/`, `docs/`, `migrations/` e `data/` e mapeia pontos fortes, dependencias e lacunas.
- Use este material para onboarding tecnico, auditoria de arquitetura e planejamento de evolucao (prod, dev ou integracoes MCP/Brain Cloud).

## 2. Arquitetura Geral
### 2.1 Visao em camadas
```
Frontend SPA (React 18 + Vite + Tailwind)
        |
        | HTTP (REST, SSE)
        v
Express API Gateway (Node 18, `server/index.js`)
        |
        | Servicos (Brain Cloud, Cognito, AI Providers, Redis)
        v
Persistencia: PostgreSQL (Supabase) + SQLite (dashboard.db) + arquivos (`data/`, Brain Cloud vault)
        |
        +--> WebSocket (`ws`) para eventos em tempo real
        +--> Jobs em background (cron + timers)
```

### 2.2 Fluxo macro
- Usuario autentica via `/api/auth` e recebe JWT/refresh tokens (15min/7d).
- Frontend consome `/api/**` via `src/services/apiClient.ts`, que lida com streaming e tokens.
- Servicos orquestram dados: PostgreSQL (multi-tenant + RLS) para entidades core, SQLite para caches locais e prototipos, Brain Cloud (REST/MCP) como segundo cerebro, Redis (ou Map) para cache/blacklist.
- IA: Cognito (gateway proprietario), provedores externos (OpenAI, Anthropic, DeepSeek, Google, OpenRouter), ferramenta MCP com mais de 30 funcoes expostas.
- Observabilidade: logs estruturados (Winston), health checks, WebSocket broadcast e scripts de manutencao.

## 3. Frontend (React + Vite)
### 3.1 Stack e build
- Local: `src/`, Vite (`vite.config.ts`) com proxy `/api -> http://localhost:3001`.
- Dependencias principais: React 18, TypeScript, Tailwind, lucide-react, react-hot-toast, react-markdown.
- Scripts: `npm run dev` (Vite + Express via `concurrently`), `npm run build`, `npm run preview`.
- CSS base em `src/index.css`; Tailwind configurado em `tailwind.config.js`.

### 3.2 Estrutura e navegacao
- `src/main.tsx` monta o app com `BrowserRouter`.
- `src/App.tsx` define rotas protegidas via `<PrivateRoute>` (verifica token no `localStorage`).
- `src/components/DashboardLayout.tsx` organiza `NavigationSidebar` + `<Outlet />`.
- Navegacao lateral centraliza acessos a `BusinessIntelligenceHub`, `Chat`, `KnowledgeGraph`, `DecisionJournal`, `Projects`, `StrategicSessionPlanner`, `Agents`.

### 3.3 Estado e contextos
- `src/contexts/LanguageContext.tsx` oferece internacionalizacao basica (portugues/ingles).
- `src/contexts/SettingsModalContext.tsx` controla modal de configuracoes.
- `src/hooks/useAPI.tsx` injeta instancia unica de `APIClient`; hooks especializados (`useChat`, `useInsightsService`, `useMCP`, etc.) encapsulam chamadas especificas.

### 3.4 API client e consumo
- `src/services/apiClient.ts` agrega chamadas REST/SSE. Destaques:
  - `request()` adiciona JWT, tenta refresh automatico, gerencia fila durante renovacao.
  - Streaming via `chatStream()` (SSE) para `/api/mcp/chat/stream`.
  - Helpers para Brain Cloud (`getGraphData`, `getDueTasks`, `getRecentPeriodics`), agentes, conversas, projetos, tarefas e provedores de IA.
  - Declara interfaces tipadas para insights, tarefas, conversas, provedores, modelos, etc.

### 3.5 Principais paginas/componentes
- `BusinessIntelligenceHub.tsx`: dashboard vivo combinando timeline (mensagens, insights, notas, agentes), tasks simplificadas, conversas, grafo. Usa fallback `FALLBACK_*` caso API falhe e exibe configuracoes de modelos conversacionais.
- `ChatPage.tsx`: cliente conversacional com streaming, sugestoes rapidas, painel lateral para notas/contextos (to-do), suporte a historico (`apiClient.searchConversations`). Depende de `/api/mcp/chat/stream`.
- `KnowledgeGraphPage.tsx`: visualizacao e analise do grafo, exporta JSON, dispara `/api/obsidian/analyze-graph`.
- `ProjectsPage.tsx`: CRUD de projetos (SQLite), integra com Brain Cloud para extrair diretorios/tags correlacionados.
- `DecisionJournalPage.tsx`: formulario para registrar decisoes (gera nota via Brain Cloud). `GET` ainda retorna lista vazia.
- `StrategicSessionPlanner.tsx`: agenda sessoes estrategicas (SQLite). Nota: o hook esta incorreto (`const { apiClient } = useAPI()`), causando erro; precisa de `const api = useAPI()`.
- `AgentsPage.tsx` + `components/AgentManager.tsx`: gestao de agentes de IA (PostgreSQL), execucao sob demanda, exibicao de `agent_runs`.
- Componentes auxiliares: `KnowledgeGraphVisualizer`, `ConversationView`, `SettingsModal`, `FeedbackLoopTracker`, `MCPIntegration`, `AIInsightCard`, etc., permitindo reuso e especializacao.

### 3.6 Observacoes e pontos de atencao
- O fallback massivo em `BusinessIntelligenceHub` indica dependencia forte de API; garantir que `/api/dashboard/today` esteja solido.
- Refresh de token no `APIClient` usa endpoint `/api/auth/refresh-token`, mas o backend expe `/api/auth/refresh` (deve ser ajustado).
- Algumas paginas (StrategicSessionPlanner, MarketIntelligenceEngine) ainda consomem rotas prototipo, exigindo validacao antes de habilitar em producao.
- Validar persistencia de preferencias de tarefas e colecoes (salvas em `data/settings.json` pelo backend).

## 4. Backend (Node.js + Express)
### 4.1 Inicializacao
- `server/index.js` carrega `.env`, monta Express, aplica `helmet`, `cors`, `rateLimit`, `express-session`, inicializa Passport, parsing JSON `10mb`, logging custom, expoe `/api`.
- Servidor HTTP encapsulado via `createServer` para reutilizar com `ws`.
- Inicializa cache (`initializeCache`), WebSocket (`setupWebSocketHandlers`), jobs (`startBackgroundServices`).
- Trata erros globais (`unhandledRejection`, `uncaughtException`) e desligamento gracioso (`SIGTERM`, `SIGINT`).

### 4.2 Middleware e utilitarios
- `server/middleware/auth.js`: autentica JWT (`Authorization: Bearer`), injeta `req.user`, fornece `checkRole`, `isOwnerOrAdmin`, `optionalAuth`, `generateToken`.
- `server/src/utils/logger.js`: Winston com niveis custom, logs em arquivo (`logs/app.log`, `logs/error.log`, `logs/http.log`) e console em dev.
- `server/services/cache.js`: cliente Redis com fallback Map in-memory; usado para tokens, caches de insights, etc.
- `server/services/background.js`: limpeza periodica (insights + feedback_actions), agendamento dinamico de agentes (cron expression), valida cron, revalida a cada 2 minutos.

### 4.3 Rotas principais
| Grupo | Prefixo | Endpoints chave | Service base | Status/Observacoes |
|-------|---------|-----------------|--------------|--------------------|
| auth | /api/auth | POST /login, /refresh, /logout, OAuth Google | `server/src/services/authService.js` | JWT + refresh + blacklist Redis; Google Passport functional |
| health | /api/health | GET /, /db, /ready, /live | `pg-pool.js` direto | Usa queries para ping de banco e estatisticas |
| brain | /api/brain | GET /status, /info, /graph, /focus, /tasks; POST /search, /context | `brainCloudHybrid.js` | Seleciona REST vs MCP dinamicamente |
| dashboard | /api/dashboard | GET /today | `dashboardService.js` | Consolida foco, tarefas, contexto temporal, agentes |
| insights | /api/insights | GET /, /weekly; POST /generate | `insightService.js` | Gera via Cognito + Brain Cloud, cache 1h |
| decisions | /api/decisions | GET / (stub), POST / | `vaultService.js` | Cria nota Markdown em Brain Cloud (`decisions/`); GET ainda vazio |
| projects | /api/projects | CRUD completo | `services/database.js` (SQLite) | Usa cache com Redis/Map e broadcast WebSocket |
| sessions | /api/sessions | CRUD, POST /:id/schedule, POST /generate | SQLite + WebSocket | Alimenta `StrategicSessionPlanner` |
| agents | /api/agents | CRUD, POST /:id/run, GET /runs | `agentService.js` (PostgreSQL + cron) | Requer `tenantId`/`userId` no token |
| ai-providers | /api/ai-providers | CRUD providers/models, sync, conversation model | `aiProviderService.js` | API keys criptografadas (AES-256-CBC) |
| conversations | /api/conversations | CRUD, mensagens, stats, respond | `conversationService.js`, `aiChatClient.js` | Persistencia PostgreSQL; streaming futuro |
| tasks | /api/tasks | POST /toggle, preferences GET/PATCH, GET /completed, POST /cleanup | `tasksService.js` | Atualiza checkboxes via Brain Cloud |
| inbox | /api/inbox | GET /, GET /content | `inboxService.js` | Lista notas recentes do vault (REST batch) |
| vault | /api/vault | GET stats, status, recent-changes; POST /sync; notas GET/POST | `vaultService.js` + Brain Cloud | Opera em cima da API REST OBC |
| obsidian | /api/obsidian | POST /save-insight, /search, /note | `vaultService.js` | Mantem compatibilidade com legado |
| tools | /api/tools | POST /execute | `toolService.js` + `mcpClient.js` | Abstrai chamadas MCP/Web (Tavily) |
| providers | /api/providers | POST /list-models | `providerService.js` | Apenas listagem Google Gemini hoje |
| cognito | /api/cognito | POST /query, /chat, /session/start | `cognitoService.js` | Suporta streaming SSE |
| feedback-actions | /api/feedback-actions | CRUD (em `feedbackActions.js`) | SQLite + seed inicial | Alimenta painel de feedback |
| knowledge-graph | /api/knowledge-graph | GET /nodes, POST /analyze, CRUD parcial | SQLite + `aiService.js` | Analise e insights sobre grafo |

> Nota: `server/routes/index.js` importa `./mcp.js`, mas **o arquivo nao existe** (apenas `mcp.js.broken`/`mcp.js.old`). Isso quebra o servidor na inicializacao. Ver lacunas (secao 11).

### 4.4 Servicos centrais
- Brain Cloud: `brainCloudClient.js` (REST), `brainCloudService.js` (MCP HTTP SSE), `brainCloudMCP.js` (quando disponivel), `brainCloudHybrid.js` (roteamento), `vaultService.js`.
- Cognito: `cognitoService.js` (consulta, streaming, insights), `aiService.js` (wrapper generico).
- IA generica: `aiProviderService.js` (CRUD provider/model, criptografia, sync), `aiChatClient.js` (OpenAI/Anthropic/OpenRouter/DeepSeek), `aiAgent` stack (`agentService.js`, `agentExecutor.js`).
- Tarefas e contexto: `tasksService.js`, `settingsService.js`, `dashboardService.js`.
- MCP tools wrapper: `toolService.js` chama `mcpClient.js` e provee fallback WebSearch via Tavily/HTTP GET.
- Outros utilitarios: `conversationService.js`, `inboxService.js`, `knowledgeGraph` stack.

### 4.5 WebSocket e eventos
- `services/websocket.js` gerencia conexoes, broadcast global (`global.broadcastToClients`), responde a `ping`, `subscribe`, `request_insights`.
- Diversos servicos disparam eventos: projetos, sessoes, background (insights), knowledge graph.

### 4.6 Jobs e agendamentos
- `background.js` limpa dados antigos (30/90 dias), agenda agentes ativos com cron expression (validacao + fallback), reprocessa schedules com intervalo de 2min.
- Agentes executados via `agentService.runAgent` (obtendo contexto RLS).

## 5. Persistencia e Dados
### 5.1 PostgreSQL (principal)
- Conexao em `server/database/pg-pool.js` (Pool, RLS via `app.current_tenant_id`, `app.current_user_id`).
- 14 tabelas (migrations `1710000000000+` via `node-pg-migrate`): `tenants`, `users`, `brain_configs`, `projects`, `messages`, `decisions`, `agents`, `agent_runs`, `conversations`, `tasks`, `workflows`, `user_settings`, `oauth_providers`, `migrations`.
- Adicao recente: `ai_providers`, `ai_models`, `conversation_model_config` (`1710000000021_create_ai_providers.sql`).
- Seeds (dev): `1710000000012_seed-development-data.cjs`.
- Scripts: `npm run db:setup` (executa `server/scripts/db-setup.js`, cria DB se local, roda migrations, testa conexao), `npm run migrate:*`.

### 5.2 SQLite (apoio dashboard)
- `server/services/database.js` inicializa `data/dashboard.db`, cria tabelas para `insights`, `decisions`, `strategic_sessions`, `knowledge_nodes`, `projects`, `feedback_actions`, `agents`, `agent_runs`, `monitored_keywords`, `collected_data`.
- Usado por rotas de prototipacao (projects, sessions, knowledge graph, feedback actions) e por `AgentManager` legacy.
- Semente manual de `feedback_actions`.
- Observacao: coexistencia com PostgreSQL gera risco de dados duplicados/divergentes (ver Secao 11).

### 5.3 Configuracoes e cache
- `data/settings.json`: gerenciado por `settingsService.js` (braincloud baseUrl/token, taskPreferences, collections).
- Cache: Redis recomendado via `REDIS_URL`; fallback Map com TTL manual.

### 5.4 Brain Cloud Vault
- Interacao remota via REST (`/api/v1/files`, `/api/v1/search`, `/api/v1/tasks`, `/api/v1/focus`, etc.) e via MCP (HTTP SSE + WebSocket).
- Scripts auxiliares (`server/scripts/vault-setup.js`) cuidam de clone Git, sync, estrutura padrao, README.

## 6. Autenticacao, Autorizacao e Seguranca
- JWT (access 15m, refresh 7d) com claims `userId`, `email`, `role`; gerados por `generateTokenPair` (middleware) e guardados em cache (`refresh_token:*`, `blacklist:*`).
- Password hashing com `bcryptjs`; usuarios multi-tenant (RLS).
- Google OAuth: `configurePassport()` (config nao exibida, mas `server/config/passport.js`) + rotas `/api/auth/google`.
- Sessions (`express-session`) apenas para OAuth flow; cookies `secure` em prod.
- Middleware: `helmet` (hidePoweredBy, noSniff, xssFilter), `express-rate-limit` (100 req/15min), CORS restrito por ambiente, logging de requisoes e tempo de resposta.
- Politicas RLS definidas em migrations (ex: usuarios veem apenas dados do tenant).
- Dados sensiveis (API keys) criptografados via AES-256-CBC (`ENCRYPTION_KEY`).

## 7. Integracoes e Inteligencia
### 7.1 Brain Cloud (Obsidian)
- REST: `brainCloudClient` prov listagem de arquivos, busca simples/complexa, notas periodicas, tarefas, foco, sync status.
- MCP HTTP: `brainCloudService` envia `tools/call` via SSE; `initialize` captura `mcp-session-id`. Atualmente `tools/call` falha com "Invalid request parameters" (bridge em desenvolvimento).
- Hybrid router decide vantajosamente (auto/rest/mcp). Operacoes especificas (vault tree, file contents) forcam MCP.

### 7.2 Cognito AI
- `cognitoService` fala com `COGNITO_API_URL` (default http://localhost:8000) usando API key, streaming SSE, caching de respostas.
- Utilizado para gerar insights semanais (estrategia "Batedor + Sniper") com prompts padronizados, armazenar insights de alta confianca no vault.

### 7.3 Provedores de LLM
- Gerenciamento em `/api/ai-providers` e `/api/ai-providers/:id/models`. `aiProviderService`:
  - Cria providers com `provider_name` (openai, anthropic, deepseek, google, openrouter, azure, custom).
  - Cria modelos padrao (const `DEFAULT_MODELS`).
  - Sincroniza modelos via API especifica (ex: planejar fetch do provider).
  - Registra uso (tokens, requests) e configura modelo por conversa (`conversation_model_config`).
- `aiChatClient` normaliza chamadas (OpenAI style, Anthropic, OpenRouter). `generateChatCompletion` (na parte final do arquivo) combina provider ativo + system prompt (MCP) para responder conversas.

### 7.4 Ferramentas MCP e automacao
- `toolService.executeTool` despacha para funcoes MCP (list/search files, get tasks, periodic notes, memory) e funcoes web (`web_search`, `http_get`).
- `mcpClient` implementa JSON-RPC sobre HTTP/WS.

### 7.5 Outros
- Script `server/scripts/e2e-obc-flow.js` valida integracao Brain Cloud end-to-end.
- `server/scripts/test-stack.js` verifica disponibilidade de Postgres, Redis, Brain Cloud, Cognito.
- Integracao Tavily opcional (`TAVILY_API_KEY`).

## 8. Observabilidade, Background e Operacoes
- Logs: `logs/` (app/error/http). Winston JSON nos arquivos, color console em dev.
- Health endpoints (ver secao 4.3) suportam readiness/liveness para Kubernetes.
- Background jobs: limpeza de dados e cron de agentes.
- WebSocket: broadcast de eventos (novos projetos, sessoes, insights).
- Scripts CLI: `setup.js`, `db-setup.js`, `vault-setup.js`, `create-test-user.js`, `test-stack.js`, `vault-sync`.
- Tests disponiveis mas nao automatizados (`vitest`, `jest` para backend, `playwright` para E2E).
- Build pipeline: `npm run build` (Vite + artefatos `dist/`), `npm run server` para iniciar backend isolado.

## 9. Fluxos Criticos
1. **Login**  
   - Frontend envia `POST /api/auth/login` (`authService.login`) -> valida senha (bcrypt) -> gera access/refresh -> salva refresh no cache -> retorna usuario + tokens.  
   - Refresh: `POST /api/auth/refresh` -> `authService.refreshToken` (valida blacklist, gera novo par). Ajustar `apiClient` para usar endpoint correto.
2. **Dashboard diario**  
   - `BusinessIntelligenceHub` chama `GET /api/dashboard/today`.  
   - `dashboardService` consulta Brain Cloud (focus, time context, due tasks, summary) e agentes (PostgreSQL) em paralelo, agrega warnings quando servicos falham, devolve `DashboardSnapshot`.
3. **Chat Cognitivo**  
   - Frontend compila mensagens -> `POST /api/mcp/chat/stream` (SSE).  
   - **Problema atual**: rota `mcp.js` inexistente; fallback historico era Cognito (`/api/cognito/chat`).  
   - Objetivo: `mcp.js` deveria inicializar sessao MCP, listar ferramentas, construir system prompt via `buildSystemPrompt`, usar provider ativo (`aiProviderService`) e transmitir resposta incremental.
4. **Insights semanais**  
   - `GET /api/insights/weekly` -> `insightService.generateWeeklyInsights`.  
   - Sincroniza vault (`vaultService.syncFromGit`), busca notas (Brain Cloud), monta prompts, consulta Cognito, parseia JSON, salva insights confiaveis no vault, cacheia resultado.
5. **Gestao de tarefas**  
   - `POST /api/tasks/toggle` -> Brain Cloud `getFile` -> ajusta checkbox no arquivo -> `writeFile`.  
   - Preferencias (board, pinned) persistidas em `settings.json`.
6. **Projetos e sessoes estrategicas**  
   - CRUD em `/api/projects` e `/api/sessions` usando SQLite + broadcasting.  
   - Servem hoje como prototipo; migracao para PostgreSQL recomendada para multi-tenant.
7. **Agentes de IA**  
   - `GET /api/agents` -> `agentService.getAllAgents` (PostgreSQL + stats).  
   - `POST /api/agents/:id/run` -> executa agente via `agentExecutor` (detalhes custom), registra `agent_runs`.  
   - Agendamentos reavaliados por cron.

## 10. Configuracao e Deploy
### 10.1 Variaveis de ambiente (ver `.env.example`)
- Backend: `NODE_ENV`, `PORT`, `DATABASE_URL` ou `DB_*`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`, `ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID/SECRET`, `FRONTEND_URL`, `REDIS_URL`.
- Brain Cloud: `VITE_BRAINCLOUD_BASE_URL`, `VITE_BRAINCLOUD_API_TOKEN`, `BRAINCLOUD_WRITE_DIR`, `BRAINCLOUD_TENANT_ID/PLAN`, `BRAINCLOUD_INBOX_DIR`.
- Cognito/IA: `COGNITO_API_URL`, `COGNITO_API_KEY`, `OPENROUTER_APP_NAME`, `TAVILY_API_KEY`, `OPENAI/ANTHROPIC` chaves.
- Frontend: `VITE_API_BASE_URL`, `VITE_ENABLE_MCP_FEATURES`, `VITE_WEBSOCKET_URL`, `VITE_LOG_LEVEL`.
- Vault git: `OBSIDIAN_VAULT_PATH`, `OBSIDIAN_VAULT_GIT_REPO`.

### 10.2 Scripts NPM relevantes
- `npm run dev`: Vite + Nodemon (`server/index.js`).
- `npm run server`: backend isolado (Node).
- `npm run db:setup`: cria banco, roda migrations, testa conexao.
- `npm run migrate:*`: `node-pg-migrate`.
- `npm run test`, `npm run test:backend`, `npm run test:e2e`, `npm run test:stack`.
- `npm run vault:*`: gerencia vault (setup/sync/status).

### 10.3 Implantacao
- Backend pode rodar em Node >=18, preferir `PORT=3001`.
- Frontend `npm run build` gera `dist/`; em producao `server/index.js` serve `../../client/dist`.
- Health endpoints suportam probes; logs em arquivo para shipper (e.g., Fluentd).
- Configurar Redis externo e `ENCRYPTION_KEY` seguro em producao.
- Brain Cloud requer token valido e configuracao do vault (scripts `vault-setup`).

## 11. Lacunas, Riscos e Itens de Acompanhamento
1. **Rota MCP ausente**: `server/routes/index.js` importa `./mcp.js`, mas o arquivo nao existe. Resultado: `ERR_MODULE_NOT_FOUND` na inicializacao. Resolver renomeando `mcp.js.broken` (ajustar imports CommonJS) ou reimplementar rota com ESM.
2. **Refresh token**: frontend chama `/api/auth/refresh-token`, backend espera `/api/auth/refresh`. Atualizar `apiClient.request()` para endpoint correto e alinhar payload (`refreshToken`).
3. **StrategicSessionPlanner**: `const { apiClient } = useAPI()` causa erro. Ajustar para `const api = useAPI();` e atualizar chamadas.
4. **Decisions e outros prototipos**: `GET /api/decisions` retorna vazio; persistencia real depende de Brain Cloud (fase beta).
5. **Duplicidade de dados**: coexistencia PostgreSQL (multi-tenant) e SQLite (single-tenant) exige plano de migracao; features chave (projects, knowledge graph, feedback) ainda nao usam banco principal.
6. **MCP tools/call**: `brainCloudService` acusa "Invalid request parameters" (FastMCP HTTP). Ver `docs/MCP_INTEGRATION.md` para plano de bridge (usar transporte stdio ou proxy dedicado).
7. **Seguranca**: `JWT_SECRET` de exemplo e `ENCRYPTION_KEY` padrao sao inseguros; reforcar em deploy.
8. **Testes automatizados**: Suites existem mas nao configuradas (scripts apontam para `vitest`, `jest`, `playwright` sem especificacoes). Criar cobertura real.
9. **Logs**: `console.log` ainda presente em varios servicos (ex: insights, inbox) junto ao Winston. Padronizar.
10. **Fallbacks**: `BusinessIntelligenceHub` exibe dados sinteticos quando API falha; garantir feedback ao usuario e logs quando isso ocorre.

## 12. Referencias e Documentacao Complementar
- Documentos internos (`docs/`):  
  - `ARCHITECTURE.md`, `INTEGRACAO_COMPLETA.md`, `MCP_INTEGRATION.md`, `INTELLIGENCE_AGENTS_ARCHITECTURE.md`, `API_INTEGRATION.md`, `INTEGRACAO_OBSIDIAN_BRAIN_CLOUD.md`, `ROADMAP.md`, `SUPABASE_SETUP.md`.  
  - Exemplos e prototipos (`PROTOTIPO_CEO_DASHBOARD.md`, `DASHBOARD_REDESIGN_BACKLOG.md`, `ADVANCED_FEATURES_SPEC.md`).
- Referencias externas:  
  - Obsidian Brain Cloud API Swagger: https://obsidian-mcp.ggailabs.com/docs  
  - Model Context Protocol: https://modelcontextprotocol.io
- Scripts utilitarios: veja `server/scripts/` (setup, vault, tests).
- Contas dev: email `dev@ggai.dev`, senha `Dev@2025!` (documentado em `README.md`).

---

**Resumo**: O CEO Dashboard combina React/Vite no frontend, Express no backend, PostgreSQL (Supabase) como fonte de verdade multi-tenant, SQLite para modulos locais, Brain Cloud (REST/MCP) como repositrio cognitivo, e integraes com mltiplos provedores de IA. Pontos criticos atuais incluem a rota MCP ausente, desalinhamento do refresh token e migrao de dados prototipo para PostgreSQL. Este documento serve como mapa abrangente para estabilizar, evoluir e operar a plataforma.
