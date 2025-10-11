# Plano de Refatoração – CEO Dashboard + Obsidian Brain Cloud

Documento base para alinhar a modernização completa do CEO Dashboard com a infraestrutura Obsidian Brain Cloud (OBC). Objetivo: transformar o dashboard na camada visual e operacional do segundo cérebro, eliminando acessos diretos ao filesystem e mocks de IA, e adotando os serviços oficiais expostos pela API/MCP.

---
## 1. Objetivos Estratégicos
- **Unificar fonte de dados**: todas as notas/insights devem trafegar via OBC (REST + MCP). Nada de Phoenix cognito mock, acesso direto ao vault ou Chromadb local.
- **Elevar o produto**: dashboard passa a ser “cockpit” executivo para founders/CEOs, com agentes especializados e fluxos reais (insights, decisões, lembretes, pesquisa externa).
- **Preparar comercialização**: arquitetura escalável, segura, com observabilidade, habilitando oferta B2B premium.

---
## 2. Fases da Refatoração

### Fase 0 – Fundamentos (Infra e alinhamento)
- Consolidar backend (`server/` único). Remover pasta duplicada `server/src/` ou transformá-la em módulo real.
- Reorganizar entrypoint HTTP+WS (um único `WebSocketServer` em `server/index.js`).
- Revisar estrutura de configuração (dotenv) para suportar credenciais OBC, Cognito e clientes externos.
- Documentar dependências obrigatórias (OBC URI/token, Redis, SQLite/Postgres, Cognito) no README e scripts de setup.

### Fase 1 – Integração Obsidian Brain Cloud
- Criar SDK interno `brainCloudClient` com wrappers REST/MCP: `listFiles`, `batchGetContents`, `writeFile`, `patchContent`, `syncStatus`, etc.
- Reescrever `vaultService` para usar SDK em vez de `fs`/`git`. (Salvar insight => `POST /api/v1/files/append` ou `patch`.)
- Refatorar rotas `/api/vault`, `/api/obsidian`, `/api/tools` para delegar ao SDK.
- Implementar autenticação com tokens OBC (login inicial obtém JWT via `/api/v1/auth/token`). Guardar refresh tokens de forma segura.
- Ativar consumo de webhooks OBC (via fila interna) para atualizar dashboard em tempo real (sync, write, delete).

### Fase 2 – Engine de Insights Real
- Substituir mocks em `insightService` e `aiService` por pipeline real:
  1. **Seleção de notas**: usar `complex_search`/`batch_get_contents` do OBC.
  2. **Contextualização**: montar prompts consistentes com link para notas originais.
  3. **Geração**: chamar Cognito/MCP com providers reais (Google/Gemini, OpenAI, etc.).
  4. **Persistência**: salvar metadados (SQLite) + nota resumida via OBC.
- Registrar histórico de execuções (tabela `agent_runs`), métricas (tempo, tokens, notas envolvidas).
- Criar configuração declarativa de agentes (prompt, agenda, escopo, thresholds) carregada do banco ou YAML versionado.

### Fase 3 – Experiência de Dashboard
- Redesenhar páginas principais com dados reais:
  - **Hub executivo**: insights recentes, status do vault, próximos lembretes.
  - **Agentes**: gerenciar agentes (criação, parâmetros, logs, triggers).
  - **Chat do Segundo Cérebro**: conversa persistente com streaming via `/api/mcp/query-stream`, histórico gravado.
  - **Insights → Decisões**: remodelar Decision Journal / Strategic Planner para acionar fluxos (salvar notas, criar tarefas, agendar sessões).
  - **Radar externo**: integrar ferramentas reais (ex: web search) e vincular resultados ao vault.
- Introduzir visualizações executivas (OKRs, timeline de decisões, status de projetos) baseadas em notas do OBC.

### Fase 4 – Comercialização e Escala
- Multiusuário + RBAC (CEO, Chief of Staff, Advisor). Tokens individuais, auditoria de ações.
- Observabilidade (logs estruturados, métricas Prometheus/OTEL, alertas).
- Automação de deploy: Docker Compose unificado com OBC + Dashboard; pipeline CI/CD.
- Preparar vault demo e scripts de onboarding (seeding de notas, agentes, dashboards pré-configurados).

---
## 3. Backlog Prioritário
- [ ] Remover dependências de `fs`/`git` direto: `server/services/vaultService.js` → `brainCloudClient`.
- [ ] Implementar `brainCloudClient` com autenticação JWT renovável e fallback MCP.
- [ ] Atualizar `insightService` para sequência: sync status → complex search → Cognito → salvar nota via OBC.
- [ ] Refatorar `apiClient.ts` para múltiplas bases (`/api` do dashboard + OBC) e refresh tokens corretos.
- [ ] Centralizar secrets e credenciais (dotenv + config).
- [ ] Ajustar testes para usar mocks da API OBC em vez de filesystem.

---
## 4. Arquitetura Alvo
```
[CEO Dashboard Frontend]
      │ REST/WS
      ▼
[CEO Dashboard Backend]
  ├─ Auth & Users
  ├─ Agents & Insights Engine
  ├─ DB (Postgres/SQLite + Redis)
  ├─ Integradores externos (Market APIs)
  └─ Cliente OBC (REST + MCP)
          │
          ▼
 [Obsidian Brain Cloud]
  ├─ Vault service
  ├─ Git sync & webhooks
  ├─ MCP tools
  └─ Segurança por diretórios
```

---
## 5. Riscos & Mitigações
- **Lock-in de API**: manter client modular para lidar com mudanças nas rotas OBC. Documentar versões.
- **Custos de IA/LLM**: implementar limites e métricas por agente. Permitir providers configuráveis.
- **Concorrência Git**: delegar totalmente a OBC (sem `git push` manual). Usar webhooks para sincronismo.
- **Complexidade multi-agente**: aplicar feature flags e piloto interno antes de abertura comercial.

---
## 6. Próximos Passos Imediatos
1. Realizar cleanup do repositório (`server/src`), padronizando bootstrap.
2. Escrever `brainCloudClient` (REST) e refatorar `vaultService` para usá-lo.
3. Atualizar `README.md` / `docs/DEVELOPMENT.md` com novas dependências e fluxo de autenticação.
4. Criar testes end-to-end simulando fluxo “Salvar Insight → Nota no OBC → Dashboard mostra”.

---
## 7. Indicadores de Sucesso
- Dashboard opera sem tocar filesystem local do vault.
- Geração de insight utiliza notas reais do OBC e registra referências.
- Chat e consultas executivas entregam contexto do segundo cérebro em tempo real.
- Pipeline de deploy/operacional pronto para ambiente cliente.

---
Com este plano, o CEO Dashboard se torna a interface premium sobre o Obsidian Brain Cloud, habilitando um produto vendável para executivos que desejam transformar seu vault em um cockpit estratégico inteligente.
