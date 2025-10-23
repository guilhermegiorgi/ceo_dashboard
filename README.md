# 🚀 CEO Dashboard — Refatoração App Router

O CEO Dashboard é a plataforma executiva da GG.AI Labs que conecta dados operacionais, Obsidian Brain Cloud e serviços MCP. Esta branch (`feature/app-router-refactor`) está migrando o frontend para **Next.js 14 (App Router)** enquanto mantemos o backend Express/Node rodando em paralelo.

## 🧭 Estado atual

| Área | Status | Observações |
| --- | --- | --- |
| App Router (Next.js 14) | ✅ Base criada | Rotas `/`, `/projects`, `/knowledge-graph`, `/session-planner`, `/agents`, `/chat`, `/chat-centered`, `/login` já usam App Router. |
| Backend Express | ✅ | Continua servindo em `server/` (porta `3001`). Integrações Supabase/PostgreSQL e Brain Cloud preservadas. |
| Integração Brain Cloud | ✅ | Endpoints REST (`/api/brain/*`) ativos. Busca semântica usada em cards do dashboard. |
| Módulos MCP / Agents legados | ⚠️ Em reconstrução | Componentes antigos foram substituídos por placeholders informativos (detalhes abaixo). |
| Lint e revisão de código | ✅ | `npm run lint` finaliza sem warnings. |

### Componentes ainda em placeholder

Para evitar warnings e manter a UX razoável durante a migração, alguns módulos continuam exibindo mensagens informativas:

- `AIAgentOrchestrator`
- `FeedbackLoopTracker`
- `MCPIntegration`
- `MarketIntelligenceEngine`
- `ProjectOverview`
- `ProactiveSynergyPanel`
- `UserProfileModal`

✅ `SettingsModal`, `StrategicSessionPlanner` e `StrategicInsights` foram implementados na fase atual e já consomem as respectivas APIs. Os placeholders `AgentManager` e `PredictiveAnalytics` foram removidos (fluxos cobertos por `AgentsPage` e roadmap futuro).

Os restantes serão reimplementados conforme cada fluxo entrar no Sprint dedicado.

---

## 🧱 Stack principal

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, TailwindCSS
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

1. Copie o exemplo de variáveis para o backend:
   ```bash
   cp server/.env.example server/.env
   ```
2. Ajuste credenciais de Supabase, Brain Cloud e OAuth conforme sua stack.

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

- `docs/APP_ROUTER_MIGRATION_NOTES.md` — status detalhado da migração
- `docs/INTEGRACAO_COMPLETA.md` — visão geral da integração Brain Cloud
- `docs/mcp_reference.md` — referência do protocolo MCP

---

Desenvolvido com ❤️ por GG.AI Labs — apoie a migração contribuindo com PRs focados em cada módulo.
