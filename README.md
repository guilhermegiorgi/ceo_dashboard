# 🚀 CEO Dashboard — Refatoração App Router

O CEO Dashboard é a plataforma executiva da GG.AI Labs que conecta dados operacionais, Obsidian Brain Cloud e serviços MCP. Esta branch (`feature/app-router-refactor`) consolida o frontend em **Next.js 15 (App Router)** enquanto mantemos o backend Express/Node rodando em paralelo.

## 🧭 Estado atual

| Área | Status | Observações |
| --- | --- | --- |
| App Router (Next.js 15) | ✅ Base criada | Rotas `/`, `/projects`, `/knowledge-graph`, `/session-planner`, `/agents`, `/chat`, `/chat-centered`, `/login` já usam App Router. |
| Backend Express | ✅ | Continua servindo em `server/` (porta `3001`). Integrações Supabase/PostgreSQL e Brain Cloud preservadas. |
| Integração Brain Cloud | ✅ | Endpoints REST (`/api/brain/*`) ativos. Busca semântica usada em cards do dashboard. |
| Módulos MCP / Agents legados | ⚠️ Em reconstrução | Componentes antigos foram substituídos por placeholders informativos (detalhes abaixo). |
| Lint e revisão de código | ✅ | `npm run lint` finaliza sem warnings. |

### ✅ Componentes recentemente implementados

Os seguintes componentes foram totalmente implementados e estão funcionais:

- **`FeedbackLoopTracker`** (642 linhas) — Sistema completo de tracking de loops de feedback com métricas, filtros e timeline
- **`ProjectOverview`** (362 linhas) — Visão executiva de projetos com filtros, progresso e métricas de risco
- **`UserProfileModal`** (310 linhas) — Modal de perfil do usuário com informações de sessão e logout
- **`SettingsModal`** (54KB) — Modal de configurações completo com múltiplas seções
- **`StrategicSessionPlanner`** — Planejador de sessões estratégicas
- **`StrategicInsights`** — Insights estratégicos gerados por IA

### ⚠️ Componentes ainda em placeholder

Para evitar warnings e manter a UX razoável durante a migração, **4 módulos** continuam exibindo mensagens informativas:

- **`AIAgentOrchestrator`** — Orquestração de múltiplos agentes AI (prioridade alta)
- **`MCPIntegration`** — Interface de gerenciamento e debug de conexões MCP (prioridade alta)
- **`MarketIntelligenceEngine`** — Engine de inteligência de mercado e análise de tendências
- **`ProactiveSynergyPanel`** — Painel de detecção proativa de sinergias entre projetos

Os restantes serão reimplementados conforme cada fluxo entrar no Sprint dedicado. Veja `PLANO_DE_ACAO.md` para detalhes de implementação.

---

## 🧱 Stack principal

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, TailwindCSS
- **Backend**: Node.js 18+, Express, PostgreSQL (Supabase)
- **Autenticação**: JWT + refresh token, Passport Google OAuth2
- **Integrações**: Obsidian Brain Cloud REST, serviços MCP (refatoração)
- **Ferramentas**: ESLint, prettier (via lint), node-pg-migrate, react-hot-toast

---

## ⚙️ Como rodar

```bash
npm install
npm run dev     # inicia Next (porta 3000) + backend Express (porta 3001)
```

### Variáveis de ambiente

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```
2. **IMPORTANTE:** Configure as variáveis críticas para MCP/Obsidian:
   - `BRAINCLOUD_BASE_URL` — URL do Brain Cloud MCP (já preenchido)
   - `BRAINCLOUD_API_TOKEN` — Token de autenticação (já preenchido)
   - `DATABASE_URL` — String de conexão PostgreSQL/Supabase
   - `JWT_SECRET` e `JWT_REFRESH_SECRET` — Secrets para autenticação

   **Nota:** As variáveis `BRAINCLOUD_*` já estão configuradas no `.env.example` com valores de desenvolvimento válidos.

### Credenciais de desenvolvimento

- Email: `dev@ggai.dev`
- Senha: `Dev@2025!`

## 💬 Preview Assistant UI

- Acesse `/chat-preview` (já autenticado) para testar a nova experiência baseada na biblioteca [assistant-ui](https://github.com/assistant-ui/assistant-ui).
- O preview conversa com o endpoint existente `/api/mcp/chat/stream`, exibindo streaming de mensagens, raciocínio e retornos de ferramentas.
- Use essa rota para validar UI/UX antes de substituir o chat principal.

---

## 📡 Endpoints principais

Backend continua exposto em `http://localhost:3001`.

### Autenticação
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/google`

### Health
- `GET /api/health`
- `GET /api/health/db`
- `GET /api/health/ready`
- `GET /api/health/live`

### Brain Cloud
- `GET /api/brain/status`
- `POST /api/brain/search`
- `GET /api/brain/graph`
- `GET /api/brain/focus`
- `GET /api/brain/tasks`

---

## 🧪 Lint e verificação

```bash
npm run lint
```

Os warnings foram zerados nesta branch; mantenha-os assim ao implementar novos módulos.

---

## 🗂 Estrutura relevante

```
app/                    # Rotas Next.js App Router
├─ (dashboard)/         # Seções autenticadas (DashboardLayout + RequireAuth)
├─ (auth)/              # Fluxo de login e callback OAuth
src/
├─ components/          # Componentes React; vários placeholders aguardam reimplementação
├─ pages/               # Páginas antigas (react-router); em processo de migração
├─ services/            # apiClient + integrações
├─ hooks/contexts/      # Hooks e providers compartilhados
server/                 # Backend Express
migrations/             # Migrations node-pg-migrate (ASCII)
```

---

## 🛣 Próximos passos sugeridos

1. **Reimplementar módulos placeholder** usando o App Router (seguir ordem de prioridade do produto).
2. **Migrar páginas antigas** em `src/pages/` para rotas dentro de `app/(dashboard)` e remover `react-router-dom` do bundle.
3. **Restaurar as configurações avançadas** (Settings, User Profile, MCP Integration) com a nova estrutura de dados.
4. **Automatizar tests/build** com `next build` e pipelines CI, após estabilizar os fluxos principais.

---

## 📚 Documentação relacionada

- **`PLANO_DE_ACAO.md`** — Plano completo de correções e próximos passos (LEIA PRIMEIRO!)
- `docs/APP_ROUTER_MIGRATION_NOTES.md` — status detalhado da migração
- `docs/INTEGRACAO_COMPLETA.md` — visão geral da integração Brain Cloud
- `docs/mcp_reference.md` — referência do protocolo MCP

---

Desenvolvido com ❤️ por GG.AI Labs — apoie a migração contribuindo com PRs focados em cada módulo.
