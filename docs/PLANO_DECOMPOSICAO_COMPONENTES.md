# Plano de Decomposição dos Componentes Gigantes

Contexto: os componentes abaixo concentram múltiplas responsabilidades e dificultam evolução do dashboard. Análise feita sobre o estado atual do repositório (`BusinessIntelligenceHub.tsx` ≈ 7.4k linhas, `KnowledgeGraphVisualizer.tsx` ≈ 485 linhas, `EnhancedAIInsightCard.tsx` ≈ 540 linhas).

---

## 1. BusinessIntelligenceHub.tsx
### Status de Execução (atualizado em 20/10/2025)

| Fase | Objetivo | Resultado |
| --- | --- | --- |
| Phase 1 | Extrair cards básicos (Timeline, Stats, Project, Inbox) | ✅ Concluída – 4 componentes, -215 linhas |
| Phase 2 | Isolar workflow builder e header/widgets | ✅ Concluída – 5 componentes + smoke tests, -34 linhas |
| Phase 3 | Decompor chat/timeline e utilitários dinâmicos | ✅ Concluída – 3 renderers + hooks, -105 linhas |

**Total BusinessIntelligenceHub:** 4636 → 4282 linhas (**-354 linhas / -7.6%**). Build Next.js e smoke tests executados após Phase 3.

### Diagnóstico
- Centraliza *todas* as features do hub (snapshot diário, tarefas, inbox, chat/MCP, agentes, coleções, notas semânticas).
- Carrega estados independentes (`tasks`, `collections`, `inbox`, `chat`, `semanticInsights`, `taskPreferences`, `boardDragState`, etc.) e efeitos encadeados (`useEffect` em cascata).
- Mistura responsabilidades de layout, dados (chamadas diretas `api.*`), controles de teclado/mouse (`panelRatio`, drag & drop) e persistência (`localStorage`).

### Árvore sugerida
```
BusinessIntelligenceHub
├─ DashboardDataProvider (fetch + context com snapshot/tasks/preferences)
├─ DashboardLayoutShell (split panes, persistent ratios, dock)
│  ├─ TimelinePanel
│  │   ├─ TimelineHeader
│  │   └─ TimelineFeed (mensagens/insights/notas)
│  ├─ WorkspaceArea
│  │   ├─ TaskWorkspace
│  │   │    ├─ TaskToolbar
│  │   │    ├─ TaskBoard (Kanban/List toggle)
│  │   │    ├─ TaskDetailDrawer
│  │   │    └─ TaskContextModal
│  │   ├─ InboxPanel
│  │   ├─ SemanticInsightsPanel
│  │   └─ CollectionsPanel
│  └─ RightRail
│      ├─ FocusSummary
│      ├─ PinnedInsightsList
│      ├─ AgentActivity
│      └─ UtilityDock (buttons to swap WorkspaceArea modes)
└─ ConversationSection
   ├─ ConversationHeader (model selection, status)
   ├─ ConversationThread
   └─ ComposerArea (input, streaming, MCP events)
```

### Subcomponentes e responsabilidades
- **DashboardDataProvider** (≈150-200 linhas): encapsula `loadSnapshot`, `getTaskPreferences`, `getDashboardCollections`, preserva contexto usando `React.Context`. Fornece hooks (`useDashboardData`, `useTaskPreferences`) para outras partes.
- **DashboardLayoutShell** (≈200 linhas): controla `panelRatio`, persistência em `localStorage`, listeners de `mousemove/touch` e roteia o estado global (`activeUtility`, `isTimelineCollapsed`).
- **TimelinePanel** (≈200 linhas): renderiza timeline, fallback data, controles de refresh (`loadSnapshot({silent:true})`).
- **TaskWorkspace** (≈250-280 linhas): contém modos lista/kanban, toggles de prioridade, pin, modais (`CompletedTasks`, `ContextTemplate`). Depende de `TaskPreferences`.
- **InboxPanel** (≈180 linhas): isolado para fetch de inbox, preview de nota, fallback states.
- **SemanticInsightsPanel** (≈150 linhas): comporta `fetchSemanticInsights` com spinners, resultados.
- **CollectionsPanel** (≈150 linhas): CRUD de coleções estratégicas (`api.getDashboardCollections`, `saveDashboardCollections`).
- **RightRail Widgets** (cada <120 linhas): `FocusSummaryWidget`, `PinnedInsightsWidget`, `AgentActivityWidget`.
- **ConversationSection** (≈250-280 linhas): unifica chat timeline, streaming, events, `modelOptions`.

### Dependências Entre Seções
- `DashboardDataProvider` → expõe `snapshot`, `tasksList`, `collections`, `loadSnapshot`, `persistTaskPreferences`.
- `TaskWorkspace` ↔ `SemanticInsightsPanel`: este consome `tasksList` (top 3 tarefas) para montar query; ambos via provider.
- `ConversationSection` precisa de `collections` (para sugerir contexto) e `snapshot.focus` (prefill), recebidos via props ou hooks.
- `UtilityDock` aciona `setActiveUtility`; cada painel lê esse estado e faz fetch condicional.

### Ordem de Refatoração (baixo risco → alto)
1. **Criar DashboardDataProvider** mantendo API atual como fallback; migrar `useState`/`loadSnapshot`.
2. **Extrair ConversationSection** isolando toda a lógica de chat (já dependente de estados próprios).
3. **Extrair TaskWorkspace** (maior bloco único, habilita testes isolados).
4. **Extrair TimelinePanel** e `RightRail` widgets (pouca dependência externa).
5. **Isolar InboxPanel + SemanticInsightsPanel + CollectionsPanel** e conectar através do provider.
6. **Reduzir DashboardLayoutShell** removendo responsabilidade residual (dock, ratio, toggles).

### Esforço Estimado
- Refactor completo: ~5-6 dias uteis (2 devs) + 1 dia QA.
- Testes focais necessários: snapshots do provider, smoke test de drag&drop, teste integrado do chat.

---

## 2. KnowledgeGraphVisualizer.tsx
### Diagnóstico
- Apesar de menor (≈485 linhas), agrega lógica de visualização, filtros, export/share e painel de detalhes numa única função.
- Mistura renderização do SVG, controle de estado (search, filtros, tags), operações side-effect (`analyzeGraph`, `export`, `share`).
- `typeConfig` e helpers poderiam viver fora do componente.

### Árvore sugerida
```
KnowledgeGraphVisualizer
├─ KnowledgeGraphShell (estado global: viewMode, isExpanded, filter state)
│  ├─ GraphToolbar
│  │   ├─ SearchBar
│  │   ├─ TypeFilter
│  │   └─ TagFilter
│  ├─ GraphViewport
│  │   ├─ NetworkCanvas
│  │   ├─ HierarchyView (placeholder futuro)
│  │   └─ TimelineView (placeholder futuro)
│  └─ SidePanel
│      ├─ NodeDetailsCard
│      └─ GraphStatsCard
└─ GraphActionsBar (Export, Share, Analyze, Expand toggle)
```

### Subcomponentes
- **KnowledgeGraphShell** (≈150 linhas): chama `useKnowledgeGraph`, mantém `filterState`, injeta handlers via context (`useGraphUI`).
- **GraphToolbar** (≈120 linhas): agrupa search, select, tag chips (pode reutilizar hook `useMemo` para tags).
- **GraphViewport** (≈140 linhas): escolhe `NetworkCanvas` vs outros modos, recebe `filteredNodes`.
- **NetworkCanvas** (≈120 linhas): responsável somente por desenhar connections no `<svg>`.
- **SidePanel** (≈160 linhas) dividido em `NodeDetailsCard` (metadados do nó selecionado) e `GraphStatsCard`.
- **GraphActionsBar** (≈80 linhas): botões de export/share/analyze e toggles expandir/comprimir.

### Dependências
- `useKnowledgeGraph()` fornece `nodes`, `loading`, `analyzeGraph`.
- `analyzeGraph` dispara POST `/api/obsidian/analyze-graph`.
- `filteredNodes` compartilhado entre `NetworkCanvas` e `GraphStatsCard`.
- `selectedNode` deve ser gerenciado no `KnowledgeGraphShell` e passado aos detalhes.

### Ordem de Refatoração
1. Extrair `GraphActionsBar` e `GraphToolbar` (componentes puros, sem dependências críticas).
2. Isolar `NetworkCanvas` (mover helpers de renderização; criar testes unitários para path builder).
3. Criar `SidePanel` com props claras.
4. Introduzir `KnowledgeGraphShell` + contexto para controlar estado global.
5. Ajustar `GraphViewport` para permitir modos adicionais no futuro.

### Esforço Estimado
- ~2 dias dev + 0.5 dia QA (migrar gradualmente, evitar regressões).
- Testes sugeridos: render snapshot da toolbar, mock `analyzeGraph` (para garantir UX de loading).

---

## 3. EnhancedAIInsightCard.tsx
### Diagnóstico
- Combina cartão principal, formulário de plano de ação, formulário de questionamento, badges e seção expandida num único componente.
- Controla estados complexos (`showActionPlan`, `actionPlan`, `showQuestionPremise`, `questionText`, `isCreatingPlan`) e interage com três hooks de dados (`useInsights`, `useObsidian`, `useProjects`).
- Necessita separar UI vs lógica de criação de notas (para testar fluxos).

### Árvore sugerida
```
EnhancedAIInsightCard
├─ InsightCardShell (header/meta + slot)
│  ├─ InsightMeta (title, prioridade, confiança)
│  ├─ InsightSummary (texto principal + badges)
│  └─ InsightActionsBar (botões Expand/Notes/Plan/Question)
├─ InsightExpandedSection
│  ├─ ConnectedNotesList
│  └─ SuggestedActionsList
├─ ActionPlanDrawer
│  ├─ ActionPlanForm
│  └─ ActionPlanFooter
├─ QuestionPremiseDrawer
│  └─ QuestionForm
└─ hooks/useInsightAutomation (wrap em funções createActionPlan, createQuestionNote)
```

### Subcomponentes
- **InsightCardShell** (≈150 linhas): recebe props da insight, renderiza header + children; controla apenas `isExpanded`.
- **InsightActionsBar** (≈80 linhas): expõe callbacks para abrir modais/drawers.
- **InsightExpandedSection** (≈120 linhas): renderiza notas, ações sugeridas, projetos relacionados.
- **ActionPlanDrawer** (≈160 linhas): formulário completo (`tasks`, `deadline`, `assignedProject`), usa hook para submit.
- **QuestionPremiseDrawer** (≈140 linhas): textarea + submit para criar nota de questionamento.
- **useInsightAutomation** (≈80 linhas): encapsula interação com `useInsights`, `useObsidian`, `useProjects`, responsável por tratar erros/sucesso.

### Dependências
- `useInsights().createActionPlan` → POST custom (verificar implementação).
- `useObsidian().createNote` → escreve notas no Brain Cloud.
- `useProjects()` provê lista de projetos (usada no select).
- Traduções via `useLanguage()` (`t('insights.*')`).

### Ordem de Refatoração
1. Extrair `useInsightAutomation` para isolar chamadas e reduzir dependência direta nos hooks originais.
2. Separar `ActionPlanDrawer` e `QuestionPremiseDrawer` (renderização condicional atual).
3. Reestruturar `InsightCardShell` + `InsightActionsBar` para limpar componente principal.
4. Mover `InsightExpandedSection` para arquivo dedicado.
5. Ajustar importador para montar fluxo completo (garantir que fallback/alerts continuam funcionando).

### Esforço Estimado
- ~2,5 dias dev + 0,5 dia QA.
- Testes sugeridos: mock de `useInsightAutomation` para garantir criação de planos/notas e validação dos formulários.

---

## Sequenciamento Geral de Refatoração
1. **Preparação (Sprint 2 início)**: implementar `DashboardDataProvider` e testes de fumaça (garantir que `BusinessIntelligenceHub` continua montando).
2. **Sprint 2 meio**: extrair blocos independentes (`ConversationSection`, `TaskWorkspace`, `ActionPlanDrawer`, `QuestionPremiseDrawer`).
3. **Sprint 2 fim / Sprint 3 início**: finalizar desmontagem do hub (painéis restantes) e decompor `KnowledgeGraphVisualizer`.
4. **Sprint 3**: refinar `EnhancedAIInsightCard`, introduzir testes unitários e Storybook para novos subcomponentes.
5. **Após decomposição**: reativar `typedRoutes`, remover `typescript.ignoreBuildErrors`, adicionar testes E2E que cubram fluxos do hub e insights.

> Ao final, cada subcomponente deve ter responsabilidade única, props tipadas e superfície adequada para testes isolados (<300 linhas cada).
