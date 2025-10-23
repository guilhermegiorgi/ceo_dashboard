# Resumo – Preparação Sprints 2 & 3

## Principais Descobertas
- `docs/AUDITORIA_PLACEHOLDERS.md`: 6 componentes precisam ser implementados já (SettingsModal, StrategicSessionPlanner, StrategicInsights, FeedbackLoopTracker, UserProfileModal, ProjectOverview); 4 exigem discovery e 2 devem sair do escopo para reduzir dívida.
- `docs/PLANO_DECOMPOSICAO_COMPONENTES.md`: definido plano de fatiamento do `BusinessIntelligenceHub.tsx`, `KnowledgeGraphVisualizer.tsx` e `EnhancedAIInsightCard.tsx` com subcomponentes < 300 linhas, ordem de refactor e esforço estimado (~8,5 dias totais).
- Estrutura Playwright criada em `tests/e2e/` com helper de login (`tests/e2e/setup/auth.setup.ts`), fixtures compartilhadas e primeiro cenário crítico (`critical/auth-flow.spec.ts`); documentação operacional em `docs/GUIA_TESTES_E2E.md`.
- `docs/PROPOSTA_BRAIN_CLOUD_CONSOLIDACAO.md`: estratégia de consolidação via Strategy Pattern, substituindo `brainCloudREST/MCP/Hybrid/Proxy` por adapters REST/MCP sobre o `brainCloudClient` e `brainCloudService`.

## Recomendações Prioritárias
1. Implementar `SettingsModal` e `StrategicSessionPlanner` (alto impacto na UX, rotas já expostas).
2. Iniciar decomposição do `BusinessIntelligenceHub` criando `DashboardDataProvider` + `ConversationSection` (passo 1 do plano).
3. Adotar o novo `BrainCloudService` (Strategy) antes de evoluir `/api/brain`, garantindo que MCP real seja habilitado apenas após validação.
4. Expandir cobertura E2E adicionando cenários de dashboard e chat assim que componentes priorizados forem entregues.

## Riscos Identificados
- **Placeholders críticos**: rotas públicas exibem placeholders (Session Planner, Settings) — risco de percepção negativa do produto.
- **Acoplamento do hub**: mudança em qualquer parte do `BusinessIntelligenceHub` quebra múltiplos fluxos; refactor sem plano pode introduzir regressões.
- **Integração Brain Cloud**: serviços redundantes geram confusão e fallback silencioso; sem consolidação, ativar MCP pode falhar sem alerta.
- **Testes E2E**: falta de coverage além do login mantém risco alto para regressões em fluxos multi-passo (chat/MCP, projects).

## Próximos Passos Sugeridos
- Sprint 2 kick-off: executar as implementações `🟢` da auditoria e iniciar passo 1 do plano de decomposição.
- Preparar `globalSetup` Playwright reutilizando `ensureStorageState` e adicionar cenário smoke do dashboard após primeira rodada de refactor.
- Planejar spike técnico curto para validar `McpBrainCloudAdapter` (reaproveitando `brainCloudService.js`) antes da remoção definitiva dos stubs.
- Sincronizar com time de produto sobre a retirada dos placeholders `🔴` (documentar no changelog e atualizar navegação caso necessário).
