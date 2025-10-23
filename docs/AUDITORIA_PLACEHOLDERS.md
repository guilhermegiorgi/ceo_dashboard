# Auditoria dos Componentes Placeholder

Base: `docs/CONTEXTO_DESENVOLVIMENTO_2025-10-19.md`, revisão de código em `src/components`, rotas Express em `server/routes` e serviços associados.

## Visão Geral
- 3 componentes permanecem para implementação nos próximos sprints.
- 4 componentes requerem discovery adicional antes de comprometer execução (dependem de decisões de produto ou consolidação técnica).
- Nenhum placeholder pendente de remoção (itens críticos já eliminados).
- 3 componentes foram implementados neste ciclo (SettingsModal, StrategicSessionPlanner, StrategicInsights).

## Classificação Detalhada

| Componente | Uso Atual | Status | Justificativa | Dependências Relevantes | Complexidade | Ordem Recomendada |
|------------|-----------|--------|---------------|-------------------------|--------------|-------------------|
| AgentManager | Não é importado; fluxo real vive em `src/views/AgentsPage.tsx` | ✅ Removido | Placeholder eliminado, `AgentsPage` cobre o fluxo completo | `/api/agents` (`server/routes/agents.js`), `apiClient.getAgents()` | P | _Concluído_ |
| AIAgentOrchestrator | Sem rota/App Router; apenas strings no `LanguageContext` | 🟡 Avaliar | Backend suporta execução (`server/services/agentExecutor.js`), mas falta desenho UX e governança de orquestração multiagente | `agentExecutor`, `agentsService`, futuras automações MCP | G | Discovery pós-estabilização dos fluxos de agentes (Sprint 3 backlog) |
| FeedbackLoopTracker | Utilizado no utilitário “Workflows” do dashboard | ✅ Implementado | Timeline com métricas e filtros consumindo `/api/feedback-actions` | `server/routes/feedbackActions.js`, `vaultService` | M | _Concluído_ |
| MCPIntegration | Não montado; nenhum health status exposto | 🟡 Avaliar | Necessário definir quais métricas da pilha MCP serão monitoradas após consolidação Brain Cloud | `server/routes/mcp.js`, `mcpSessionManager`, `app/api/mcp/*` | M | Discovery alinhada à consolidação Brain Cloud (Sprint 3) |
| MarketIntelligenceEngine | Não montado; rotas legadas em `server/src/routes/marketIntelligence.js` | 🟡 Avaliar | Precisa migrar rotas para `server/routes`, conectar fontes reais e validar use-case antes do build | Rotas mockadas de market intelligence, `apiClient.getMarketOpportunities()` | G | Discovery após unificar Brain Cloud e Cognito (Backlog) |
| PredictiveAnalytics | Não montado; ausência total de backend | ✅ Removido | Fora do roadmap imediato; evitar dívida de produto | Nenhuma (apenas strings de i18n) | P | _Concluído_ |
| ProactiveSynergyPanel | Não montado | 🟡 Avaliar | Depende de análises do grafo + sessões estratégicas; aguardar decomposição do `KnowledgeGraphVisualizer` para definir UX | `apiClient.analyzeKnowledgeGraph()`, `/api/sessions` | G | Discovery junto ao refactor do grafo (Sprint 3) |
| StrategicInsights | Integrado ao dashboard | ✅ Implementado | Consumindo `/api/insights`, filtros e cards avançados (EnhancedAIInsightCard) | `server/routes/insights.js`, `insightService` | M | _Concluído_ |
| StrategicSessionPlanner | Rota ativa em `app/(dashboard)/session-planner/page.tsx` | ✅ Implementado | CRUD completo sobre `/api/sessions`, agenda semanal e integração com insights | `server/routes/sessions.js`, SQLite `strategic_sessions` | G | _Concluído_ |
| ProjectOverview | Embutido no hub principal (aba projetos) | ✅ Implementado | Cards de status e métricas consumindo `/api/projects` | `server/routes/projects.js`, `apiClient.getProjects()` | P | _Concluído_ |
| UserProfileModal | Invocado pelo header (ver `src/components/Header.tsx`) | ✅ Implementado | Perfil com `/api/auth/me`, logout e acesso rápido às configurações | `server/routes/auth.js` (`/login`, `/logout`, `/me`), `apiClient.getCurrentUser()` | P | _Concluído_ |
| SettingsModal | Injetado pelo `SettingsModalProvider` global | ✅ Implementado | Form completo salvando `braincloud` via `/api/settings/braincloud`, testes Jest cobrindo login/submit | `server/routes/settings.js`, `settingsService` | M | _Concluído_ |

### Notas
- Complexidade indica o esforço estimado para executar a recomendação (P = pequeno, M = médio, G = grande).
- Para itens 🔴, o esforço refere-se à remoção do placeholder e ajuste de documentação.
- Itens 🟡 devem sair de “placeholder” apenas após discovery técnico-funcional específico. Documentar aprendizados antes de reintroduzir no roadmap.
