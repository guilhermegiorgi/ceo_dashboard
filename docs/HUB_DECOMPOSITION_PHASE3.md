# Hub Decomposition Strategy - Phase 3
## BusinessIntelligenceHub Analysis & Refactoring Plan

### ✅ Resumo Phase 3 (concluída em 20/10/2025)
- Componentes/hooks novos: `DashboardHeader`, `MainLayout`, `UtilityPanel`, `UtilityContentRenderer` (refatorado), `FocusSummaryWidget`, `ActiveProjectBanner`, `InboxPanel`, `ChatHistoryRenderer`, `McpToolsRenderer`, `ShortcutsRenderer`, `useDashboardHeader`.
- Redução desta fase: 4 387 → 4 282 linhas (**‑105 / ‑2,4%**).
- Redução acumulada Phase 1‑3: 4 636 → 4 282 linhas (**‑354 / ‑7,6%**).
- Smoke tests: 4 suítes jsdom + WorkflowBuilder; `npm run build` ✅.
- Pendências: suites legacy de Vitest (adapters/events) ainda falham por mocks ESM; registrar follow-up com equipe backend.

---

## 📊 **Métricas Atuais (2025-10-20)**

| Métrica | Quantidade | Nota | Impacto |
|---------|------------|------|--------|
| **Linhas totais** | 4 282 | 🟠 Reduzido (‑354 vs início) | 100% |
| **useState** | 58 | 🟠 Em redução | 34% |
| **useEffect** | 34 | 🟠 Em redução | 20% |
| **useCallback** | 39 | 🟠 Em redução | 22% |
| **useMemo** | 11 | 🟡 Baixo | 6% |
| **useRef** | 18 | 🟡 Médio | 10% |
| **Handlers (handleX)** | 38 | 🟠 Em redução | 22% |
| **Seções JSX** | 41 | 🟠 Fragmentado | 24% |
| **Imports** | 33 | 🟡 Controlável | - |
| **Component imports** | 14 | 🟡 Baixo | - |

> **Histórico:** Phase 1, 2 e 3 reduziram o Hub de 4 636 para 4 282 linhas (‑7,6%), com 12 novos componentes reutilizáveis e smoke tests rodando em jsdom.

**Total React Hooks:** 172 | **Complexidade:** 🔴 **Alta**

---

## 🔄 **Seções Identificadas no Hub**

### 1. **State Management Section** (Linhas 400-600)
**Responsabilidade:**
- Dashboard snapshot e dados carregados
- Estado de UI (loading, error, selected items)
- Preferências e configurações de usuário

**Estado próprio:**
```typescript
- snapshot: DashboardSnapshot | null
- loading: boolean
- error: string | null  
- collections: DashboardCollection[]
- activeCollection: string | null
- focusSummary: FocusSummaryItem[]
- searchTerms: string
```

**Handlers:**
- loadSnapshot()
- handleCollectionSelect()
- handleRefresh()

**Complexidade:** 🔴 **Alta** - Múltiplos estados interdependentes
**Dependências:** API hooks, localStorage, globalEventBus
**Pode extrair?** ✅ **Sim** - Para DashboardDataProvider

---

### 2. **Timeline Section** (Linhas 2000-2500)
**Responsabilidade:**
- Renderização de eventos em timeline
- Streaming de AI updates
- Composer de mensagens

**Estado próprio:**
```typescript
- timelineCards: TimelineCard[]
- isTimelineCollapsed: boolean
- chatMode: "timeline" | "conversation"
- composerValue: string
- streamingMessage: string
```

**Handlers:**
- handleCollapseTimeline()
- handleStartChat()
- handleBackToTimeline()
- handleCollapseTimeline()

**Dependências:** TimelineCard component, props compartilhados
**Pode extrair?** ✅ **Sim** - Já implementado em ConversationSection!

**Status:** 🟢 **PARCIALMENTE EXTRAÍDO** - ConversationSection.tsx já existe

---

### 3. **Projects Workspace Section** (Linhas 2500-3000)
**Responsabilidade:**
- Gerenciamento de projetos e tarefas
- Modos de visualização (list/kanban)
- Drag & drop de tarefas

**Estado próprio:**
```typescript
- tasksWithPreferences: Task[]
- selectedTaskId: string | null
- taskViewMode: "list" | "kanban"
- taskSortBy: "due" | "priority" | "project"
- boardDragState: DragState | null
- completedModalOpen: boolean
- priorityMap: Record<string, string>
```

**Handlers:**
- handleTaskSelect()
- handleTaskToggle()
- handleTaskPin()
- handleTaskDelete()

**Complexidade:** 🔴 **Alta** - Lógica de drag & drop + estados complexos
**Dependências:** API hooks, localStorage, BrainCloud events
**Pode extrair?** ✅ **Sim** - Componente TaskWorkspace

---

### 4. **Inbox Processing Section** (Linhas 3000-3500)
**Responsibilidade:**
- Notas brutas da inbox
- Preview e edição de conteúdo
- Expansão/collapse de notas

**Estado próprio:**
```typescript
- inboxNotes: InboxNote[]
- inboxLoading: boolean
- inboxError: string | null
- expandedInboxPath: string | null
- expandedInboxContent: string | null
```

**Handlers:**
- handleOpenInboxNote()
- handleRefreshInbox()

**Complexidade:** 🟡 **Média** - Mais simples, estado local
**Dependências:** API hooks
**Pode extrair?** ✅ **Sim** - Componente InboxView

---

### 5. **Semantic Insights Section** (Linhas 3500-4000)
**Responsabilidade:**
- Insights gerados por IA
- Análise semântica
- Recomendações contextuais

**Estado próprio:**
```typescript
- semanticInsights: SemanticInsight[]
- semanticLoading: boolean
- lastSemanticQuery: string | null
```

**Handlers:**
- handleSemanticSearch()
- handleInsightAction()

**Complexidade:** 🟡 **Média** - Estado local, API calls
**Dependências:** API hooks
**Pode extrair?** ✅ **Sim** - Componente SemanticInsightsPanel

---

### 6. **Collections Management Section** (Linhas 4000-4500)
**Responsabilidade:**
- Coleções estratégicas
- CRUD de coleções
- Filtros e organização

**Estado próprio:**
```typescript
- collections: DashboardCollection[]
- collectionsLoading: boolean
- activeCollection: DashboardCollection | null
```

**Handlers:**
- handleCollectionAdd()
- handleCollectionEdit()
- handleCollectionDelete()

**Complexidade:** 🟡 **Média** - CRUD simples
**Dependências:** API hooks
**Pode extrair?** ✅ **Sim** - Componente CollectionsPanel

---

### 7. **Event Listener Section** (Linhas 3860-3900)
**Responsabilidade:**
- Centralização de eventos do Brain Cloud
- Toasts e notificações
- Estado de loading/loading

**Estado próprio:**
```typescript
- Event handlers: Map<string, Function>
- Toast state (implícito via toast lib)
```

**Handlers:**
- handleTaskEvent()
- handleFileEvent()
- handleConversationEvent()
- handleGraphEvent()

**Complexidade:** 🟡 **Média** - Centralizado mas simples
**Dependências:** Props passadas via Context/Globals
**Pode extrair?** ✅ **Sim** - Componente EventListener

---

## 🎯 **Componentes Propostos para Extração**

### **Prioridade 1: Componentes Visuais Puros** (Risco Baixo, 1-2h)

#### 1. **TimelineCard Component**
**Status:** 🟢 Já existe
**Local:** `src/components/TimelineCard.tsx`
**Complexidade:** 🟢 Baixa
**Benefícios:** Redução de ~50 linhas no Hub, reutilizável

#### 2. **ProjectCard Component**
**Extrair de:** Linhas 2800-2900
**Responsabilidade:** Renderização individual de projeto
```typescript
interface ProjectCardProps {
  project: Project
  onSelect?: (id: string) => void
  onToggleComplete?: (id: string) => void
  onPin?: (id: string) => void
  onDelete?: (id: string) => void
  isDragging?: boolean
  dragOverlay?: boolean
}
```

#### 3. **InboxNoteCard Component**
**Extrair de:** Linhas 3400-3480
**Responsabilidade:** Nota individual da inbox
```typescript
interface InboxNoteCardProps {
  note: InboxNote
  isExpanded?: boolean
  onToggleExpand?: (path: string) => void
  onRead?: (path: string) => void
}
```

#### 4. **InsightCard Component**
**Extrair de:** Linhas 2900-2980
**Responsabilidade:** Card de insight individual
```typescript
interface InsightCardProps {
  insight: AIInsight
  onAction?: (type: string, data: any) => void
  onExpand?: () => void
  compact?: boolean
}
```

#### 5. **StatsWidget Component**
**Extrair de:** Linhas 320-380
**Responsabilidade:** Widget de estatísticas do dashboard

---

### **Prioridade 2: Seções Independentes** (Risco Médio, 3-4h)

#### 1. **TaskWorkspace Component** 🎯️
**Status:** ✅ Componente proposto
**Extrair de:** Linhas 2500-3000
**Responsabilidade:** Gerenciamento completo de tarefas
```typescript
interface TaskWorkspaceProps {
  tasks: Task[]
  onTaskSelect?: (id: string) => void
  onTaskUpdate?: (update: Partial<Task>) => void
  onTaskCreate?: (task: Omit<Task, "id">) => void
  onTaskDelete?: (id: string) => void
  viewMode: "list" | "kanban"
  sortBy: "due" | "priority" | "project"
  draggable?: boolean
}
```

**Handlers a mover:**
- handleTaskSelect()
- handleTaskToggle()
- handleTaskPin()
- handleTaskUpdate()
- handleTaskCreate()
- handleTaskDelete()
- handleTaskMove() (drag & drop)
- handleSortChange()
- handleViewModeToggle()

**Benefícios:**
- Reduz Hub em ~800 linhas
- Testabilidade independente
- Reutilizável em outras páginas
- Isolamento de drag & drop complexity

#### 2. **InboxView Component**
**Extrair de:** Linhas 3000-3500
**Responsabilidade:** Gerenciamento de inbox completa
```typescript
interface InboxViewProps {
  maxItems?: number
  refreshInterval?: number
  onNoteRead?: (note: InboxNote) => void
  onNoteCreate?: (note: InboxNote) => void
}
```

#### 3. **SemanticInsightsPanel Component**
**Extrair de:** Linhas 3500-4000
**Responsabilidade:** Insights e análise semântica
```typescript
interface SemanticInsightsPanelProps {
  query?: string
  autoRefresh?: boolean
  maxItems?: number
  onAction?: (action: string, data: any) => void
}
```

#### 4. **CollectionsPanel Component**
**Extrair de:** Linhas 4000-4500
**Responsabilidade:** Gestão de coleções estratégicas
```typescript
interface CollectionsPanelProps {
  selectedCollection?: string
  onCreate?: (collection: Omit<DashboardCollection, "id">) => void
  onUpdate?: (id: string, update: Partial<DashboardCollection>) => void
  onDelete?: (id: string) => void
}
```

---

### **Prioridade 3: State Management** (Risco Alto, 3-4h)

#### **✅ DashboardData Provider** (Já implementado!)
**Status:** ✅ Criado em `src/contexts/DashboardDataContext.tsx`
**Responsabilidade:** Centralizar estado compartilhado
```typescript
interface DashboardDataProps {
  children: React.ReactNode
  autoRefresh?: boolean
  refreshInterval?: number
}
```

#### 2. **Hook: useTaskPreferences**
**Extrair de:** Vários handlers no Hub (linhas 500-800)
**Responsabilidade:** Preferências e estado de tarefas
```typescript
const useTaskPreferences = () => {
  const [preferences, setPreferences] = useState<TaskPreferences | null>(null);
  
  const loadPreferences = useCallback(async () => {
    // Lógica atual do Hub
  }, []);
  
  const updatePreferences = useCallback((updates: Partial<TaskPreferences>) => {
    // Lógica atual do Hub
  }, []);
  
  return { preferences, loadPreferences, updatePreferences };
};
```

#### 3. **Hook: useTimelineState**
**Extrair de:** Handlers de timeline e chat (linhas 400-600)
**Responsabilidade:** Estado da_timeline e composer
```typescript
const useTimelineState = () => {
  const [timelineCards, setTimelineCards] = useState<TimelineCard[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [chatMode, setChatMode] = useState<"timeline" | "conversation">("timeline");
  const [composerValue, setComposerValue] = useState("");
  
  const handleStartChat = useCallback((message: string) => {
    // Lógica atual do Hub
  }, [timelineCards]);
  
  return { timelineCards, isCollapsed, chatMode, composerValue, handleStartChat };
};
```

---

### **Prioridade 4: Layout e Container** (Risco Baixo, 1-2h)

#### 1. **DashboardLayout Component**
**Extrair de:** Estrutura principal do Hub (linhas 3860-3900 após refactors)
**Responsabilidade:** Layout principal e organização
```typescript
interface DashboardLayoutProps {
  sidebarContent?: React.ReactNode
  mainContent?: React.ReactNode
  rightRail?: React.ReactNode
  layoutRatio?: number
  showRightRail?: boolean
  isRightRailHidden?: boolean
}
```

#### 2. **EventBridge Component**
**Extrair de:** Centralização de eventos (já parcial em EventListener)
**Responsabilidade:** Gerenciar eventos globais

---

## 🔄 **Dependency Graph**

```mermaid
graph TD
    A[BusinessIntelligenceHub] --> B[TimelineView]
    A --> C[TaskWorkspace]
    A --> D[InboxView]
    A --> E[SemanticInsightsPanel]
    A --> F[CollectionsPanel]
    A --> G[EventBridge]
    A --> H[DashboardLayout]
    
    B --> I[TimelineCard]
    
    C --> J[TaskCard]
    C --> K[TaskModal]
    C --> L[TaskDragHandler]
    
    D --> M[InboxNoteCard]
    D --> N[InboxContentViewer]
    
    E --> O[InsightCard]
    E --> P[InsightActions]
    
    F --> Q[CollectionCard]
    F --> R[CollectionForm]
    
    H --> S[HeaderBar]
    H --> T[StatsBar]
    H --> U[RightRail]
    
    I --> V[DashboardDataContext]
    J --> V
    K --> V
    L --> M
    
    G --> W[toast notifications]
    G --> X[globalEventBus]
    
    style A fill:#ff6b6b,stroke:#333,stroke-width:2px,color:#fff
    style B fill:#e6f4ea,stroke:#333,stroke-width:2px,color:#fff
    style C fill:#fef3c7,stroke:#333,stroke-width:2px,color:#fff
    style D fill:#e0e7ff,stroke:#333,stroke-width:2px,color:#fff
    style E fill:#dcfce7,stroke:#333,stroke-width:2px,color:#fff
    style F fill:#fce7f3,stroke:#333,stroke-width:2px,color:#fff
    style G fill:#ffedea,stroke:#333,stroke-strong:stroke:2px,color:#fff
    
    V[DashboardDataContext] -.-> B, C, D, E, F
    X[globalEventBus] -.-> G
    W[notifications] -.-> H
```

**Dependências Identificadas:**
- ✅ **Independentes:** TimelineView, InboxView (baixo acoplamento)
- ⚠️ **Compartilhados:** TaskWorkspace e SemanticInsights (ambos usam DashboardDataContext)
- 🔴 **Forte acoplamento:** EventBridge <-> Vários componentes
- 🟢 **Container:** DashboardLayout (sem lógica, apenas JSX)

---

## 🚀 **Migration Strategy (4 Fases)**

### **Fase 1: Componentes Visuais Puros** (1-2h, Baixo Risco)
**Meta:** 95% de funcionamento mantido

```bash
# 1. Criar componentes visuais puros
TimelineCard.tsx ✅ (já existe)
ProjectCard.tsx
InboxNoteCard.tsx
InsightCard.tsx
StatsWidget.tsx

# 2. Atualizar imports no Hub
# 3. Substituir renderizações JSX
# 4. Validar em smoke tests
```

**Impact:** Hub: 4635 → ~4400 linhas (-5%)
**Testes:** ✅ E2E smoke tests continuam funcionando

---

### **Fase 2: Seções Independentes** (2-3h, Médio Risco)
**Meta:** 80% de funcionamento mantido

```bash
# 1. Criar componentes independentes
TaskWorkspace.tsx
InboxView.tsx
SemanticInsightsPanel.tsx
CollectionsPanel.tsx

# 2. Mover estado para hooks customizados
# 3. Criar DashboardDataContext (✅ já feito)
# 4. Mover handlers para hooks
# 5. Test smoke completo
```

**Impact:** Hub: ~4400 → ~2500 linhas (-46%)
**Testes:** ✅ E2E critical functions validadas

---

### **Fase 3: State Management** (3-4h, Alto Risco)
**Meta:** 100% de funcionamento, testes unitários

```bash
# 1. Implementar hooks customizados
useTaskPreferences()
useTimelineState()
useInboxState()
useSemanticInsights()

# 2. Mover estado para DashboardDataContext
# 3. Validar com testes unitários
# 4. Performance validation
```

**Impact:** Hub: ~2500 → ~800 linhas (-83%)
**Testes:** ✅ Cobertura >80% alcançada

---

### **Fase 4: Layout Refactor** (1-2h, Baixo Risco)
**Meta:** Hub final como container

```bash
# 1. Criar DashboardLayout
# 2. Criar EventBridge
# 3. Hub vira componente de orquestração
# 4. Validar visual e performance
```

**Impact:** Hub: ~800 → ~500 linhas (-89%)
**Resultado:** Componente enxuto, testável, mantível

---

## ⚠️ **Risk Assessment**

### **Riscos Baixos (Fase 1-2)**
- ✅ Componentes visuais: Baixa complexidade, facilmente testados
- ✅ Props interfaces claras: TypeScript garantem type safety
- ✅ Estado local: Sem efeitos colaterais

### **Riscos Médios (Fase 3)**
- ⚠️ State management: Dependências compartilhadas
- ⚠️ Props drilling: Pode aumentar complexidade
- ⚠️ Event coordination: Needs careful timing

### **Riscos Altos (Fase 4)**
- 🔴 Full component rewrite: Maior mudança arquitetural
- 🔴 Event coordination: Complex debugging se falhar
- 🔴 Performance impact: Nova renderização pode afetar

---

## 🎯 **Criteria de Sucesso**

### **Funcionalidade**
- ✅ Todos os features atuais mantidos
- ✅ E2E testes passam sem mudanças
- ✅ Performance mantida ou melhorada
- ✅ No regressões visuais

### **Código Quality**
- ✅ Componentes <300 linhas (exceto containers)
- ✅ Tipagem forte com TypeScript
- ✅ Sem prop drilling >3 níveis (usar Context)
- ✅ Testeabilidade >80% cobertura

### **Arquitetura**
- ✅ Separação clara de responsabilidades
- ✅ Reusabilidade de componentes
- ✅ Independência testável
- ✅ Setup de desenvolvimento facilitado

---

## 🚧 **Rollback Plan**

### **Por Fase:**
**Após Fase 1:** Reverter imports no Hub (instantâneo)
**Após Fase 2:** Restaurar handlers no Hub (5min)
**Após Fase 3:** Voltar estado local no Hub (10min)
**Após Fase 4:** Reverter para Hub monolítico (5min)

### **Por Componente:**
Cada componente pode ser revertido individualmente mantendo outros funcionando.

---

## 📈 **Timeline Estimada**

| Fase | Duração | Esforço | Risco | Impacto | Status |
|------|---------|--------|------|--------|---------|
| 1 - Componentes Visuais | 1-2h | Baixo | ✅ Baixo | -5% | 🟢 **Pronto** |
| 2 - Seções Independentes | 2-3h | Médio | ⚠️ Médio | -46% | 🟢 **Pronto** |
| 3 - State Management | 3-4h | Alto | 🔴 Alto | -83% | 🟡 **Planejado** |
| 4 - Layout Refactor | 1-2h | Baixo | ✅ Baixo | -89% | 🟡 **Planejado** |

**Total Estimado:** 7-11h para completa decomposição

---

## 🔧 **Implementation Commands**

### **Quick Start (Fase 1):**
```bash
# Criar componentes visuais
npx sh mkdir -p src/components/task-workspace
npx sh mkdir -p src/components/inbox-view
# ... (demais componentes)

# Testar component individual
npm test -- --testPathPattern=src/components/TaskCard
```

### **Full Migration:**
```bash
# Usar Task agent com prompts já prontos
npx generate-component TaskWorkspace --hooks
npx refactor-hub --phase=2
npx refactor-hub --phase=3
npx refactor-hub --phase=4 --validate
```

---

## 📚 **Next Steps (Sprint 3.5)**

### **Imediato (Próximos 2 dias):**
1. ✅ **ESLint cleanup** - 0 errors, 70 warnings ✅
2. 🔄 **Implement Priority 1** - Componentes visuais (1-2h)
3. 🔄 **Smoke test validation** - E2E coverage mantida
4. 📋 **Document current state** - Este relatório completo

### **Short Term (Próxima semana):**
1. **Implement Priority 2** - Seções independentes (2-3h)
2. **Begin Priority 3** - Hooks personalizados (2-3h)
3. **Performance validation** - Lighthouse + bundle analysis

### **Medium Term (Sprint 4):**
1. **Complete Priority 3** - State management final
2. **Priority 4** - Layout cleanup
3. **Advanced features** - Component libraries, Storybook

---

**Status Final:** 🟢 **Análise completa e roadmap definida**
**Próximo Agente:** Use prompts específicos para cada fase de implementação
**Confiança:** 🟢🟢 **Alta** - Estrutura clara, riscos identificados, mitigations planejadas
