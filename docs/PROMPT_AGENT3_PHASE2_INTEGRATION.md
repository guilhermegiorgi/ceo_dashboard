# AGENT 3 - PHASE 2: Hook Integration & Hub Decomposition
**Status:** 🔄 READY FOR EXECUTION
**Estimated Time:** 2-3 hours
**Difficulty:** MEDIUM
**Priority:** P1 CRITICAL

---

## 📋 CONTEXTO (LEA PRIMEIRO!)

### Phase 1 Status (CONCLUÍDO ✅)
Agent 3 Phase 1 extraiu 5 hooks customizados que gerenciam 4000+ linhas do BusinessIntelligenceHub:

1. **useTasksState** (`src/hooks/useTasksState.ts`) - 192 linhas
2. **useInboxState** (`src/hooks/useInboxState.ts`) - 94 linhas
3. **useSemanticInsights** (`src/hooks/useSemanticInsights.ts`) - 123 linhas
4. **useTimelineState** (`src/hooks/useTimelineState.ts`) - 180 linhas
5. **useUIState** (`src/hooks/useUIState.ts`) - 132 linhas

Todos os hooks:
- ✅ ESLint: 0 errors, 0 warnings
- ✅ TypeScript: Full type safety
- ✅ Callbacks: useCallback otimizado
- ✅ Testados e funcionais

### Phase 2 Objetivo
**Integrar os 5 hooks no BusinessIntelligenceHub.tsx:**
- Substituir 57+ `useState` por chamadas aos hooks
- Reduzir Hub de 4238 → ~2500 linhas
- Manter funcionalidade 100%
- Garantir lint/build passando

---

## 🎯 TAREFAS (EXECUTE NA ORDEM)

### TAREFA 1: Análise e Planejamento (15 min)

1. **Leia os arquivos dos hooks:**
   ```bash
   cat src/hooks/useTasksState.ts
   cat src/hooks/useInboxState.ts
   cat src/hooks/useSemanticInsights.ts
   cat src/hooks/useTimelineState.ts
   cat src/hooks/useUIState.ts
   ```

2. **Leia o Hub atual (completo):**
   ```bash
   wc -l src/components/BusinessIntelligenceHub.tsx
   head -n 100 src/components/BusinessIntelligenceHub.tsx
   ```

3. **Mapeie estados do Hub** que serão substituídos:
   ```bash
   grep -n "const \[" src/components/BusinessIntelligenceHub.tsx > /tmp/hub-states.txt
   cat /tmp/hub-states.txt
   ```

4. **Mapeie onde cada useState é usado** (será refatorado)

---

### TAREFA 2: Preparar BusinessIntelligenceHub.tsx (45 min)

**Passo 1: Adicionar imports dos hooks no topo do componente**

Localize a seção de imports e adicione:
```typescript
// NO TOPO DO ARQUIVO, após os imports existentes:
import { useTasksState } from "../hooks/useTasksState";
import { useInboxState } from "../hooks/useInboxState";
import { useSemanticInsights } from "../hooks/useSemanticInsights";
import { useTimelineState } from "../hooks/useTimelineState";
import { useUIState } from "../hooks/useUIState";
import { useDashboardData } from "../contexts/DashboardDataContext";
```

**Passo 2: Localizar a função do componente**

Encontre:
```typescript
export default function BusinessIntelligenceHub() {
```

**Passo 3: Instanciar os 5 hooks (linhas 1-20 do corpo da função)**

Logo após `export default function BusinessIntelligenceHub() {`, adicione:
```typescript
  // ─────────────────────────────────────────────────────────────
  // HOOKS EXTRAÇÃO (Phase 2 Integration)
  // ─────────────────────────────────────────────────────────────
  const dashboard = useDashboardData();
  const tasks = useTasksState();
  const inbox = useInboxState();
  const insights = useSemanticInsights();
  const timeline = useTimelineState();
  const ui = useUIState();

  // Existing hooks (keep as is)
  const { data: snapshot } = dashboard;
  // ... outros imports/contextos existentes
```

**Passo 3: Remover os 57+ useState antigos**

Procure por padrões e delete blocos:
```typescript
  // REMOVER ESTES (agora gerenciados pelos hooks):

  // ❌ DELETE: taskViewMode, taskSortBy, taskFilterStatus, etc
  // ❌ DELETE: inboxNotes, expandedInboxPath, expandedInboxFrontmatter, etc
  // ❌ DELETE: semanticInsights, semanticLoading, etc
  // ❌ DELETE: liveTimelineCards, chatMode, activeConversation, etc
  // ❌ DELETE: activeUtility, rightPanelRatio, isDraggingResize, etc
```

**CHECKLIST useState a remover:**
- [ ] taskViewMode, setTaskViewMode
- [ ] taskSortBy, setTaskSortBy
- [ ] taskFilterStatus, setTaskFilterStatus
- [ ] searchTerm, setSearchTerm
- [ ] boardOrder, setBoardOrder
- [ ] boardDragState, setBoardDragState
- [ ] selectedTaskId, setSelectedTaskId (e outros selected task states)
- [ ] togglingTaskId, setTogglingTaskId
- [ ] completedTaskIds, setCompletedTaskIds
- [ ] taskPreferences, setTaskPreferences
- [ ] pinnedTaskIds, setPinnedTaskIds
- [ ] priorityMap, setPriorityMap
- [ ] taskContextDraft, setTaskContextDraft
- [ ] aiCleanupLoading, setAiCleanupLoading
- [ ] inboxNotes, setInboxNotes
- [ ] inboxLoading, setInboxLoading
- [ ] inboxError, setInboxError
- [ ] expandedInboxPath, setExpandedInboxPath
- [ ] expandedInboxFrontmatter, setExpandedInboxFrontmatter
- [ ] expandedInboxContent, setExpandedInboxContent
- [ ] expandedInboxLoading, setExpandedInboxLoading
- [ ] expandedInboxError, setExpandedInboxError
- [ ] semanticInsights, setSemanticInsights
- [ ] semanticLoading, setSemanticLoading
- [ ] lastSemanticQuery, setLastSemanticQuery
- [ ] liveTimelineCards, setLiveTimelineCards
- [ ] isTimelineCollapsed, setIsTimelineCollapsed
- [ ] eventsConnected, setEventsConnected
- [ ] eventsError, setEventsError
- [ ] chatMode, setChatMode
- [ ] activeConversation, setActiveConversation
- [ ] chatMessages, setChatMessages
- [ ] streamingMessage, setStreamingMessage
- [ ] thinkingMessage, setThinkingMessage
- [ ] composerValue, setComposerValue
- [ ] activeUtility, setActiveUtility
- [ ] rightPanelRatio, setRightPanelRatio
- [ ] isDraggingResize, setIsDraggingResize

---

### TAREFA 3: Atualizar Referências no Hub (60 min)

**Estratégia:** Usar Find & Replace com contexto

**Passo 1: Referências de Tasks**

Replace pattern by pattern:

```
BEFORE: taskViewMode
AFTER: tasks.taskViewMode

BEFORE: setTaskViewMode(
AFTER: tasks.setTaskViewMode(

BEFORE: taskSortBy
AFTER: tasks.taskSortBy

BEFORE: setTaskSortBy(
AFTER: tasks.setTaskSortBy(

... e assim por diante para todos os estados do tasks hook
```

**Passo 2: Referências de Inbox**

```
BEFORE: inboxNotes
AFTER: inbox.inboxNotes

BEFORE: setInboxNotes(
AFTER: inbox.setInboxNotes(

... etc para inbox hook
```

**Passo 3: Referências de Insights**

```
BEFORE: semanticInsights
AFTER: insights.insights

BEFORE: setSemanticInsights(
AFTER: insights.setInsights(

... etc para insights hook
```

**Passo 4: Referências de Timeline**

```
BEFORE: liveTimelineCards
AFTER: timeline.liveTimelineCards

BEFORE: setLiveTimelineCards(
AFTER: timeline.setLiveTimelineCards(

... etc para timeline hook
```

**Passo 5: Referências de UI**

```
BEFORE: activeUtility
AFTER: ui.activeUtility

BEFORE: setActiveUtility(
AFTER: ui.setActiveUtility(

... etc para ui hook
```

---

### TAREFA 4: Verificar useEffect e useCallbacks (30 min)

**Passo 1: Localizar useEffect que usam estados removidos**

```bash
grep -n "useEffect" src/components/BusinessIntelligenceHub.tsx | head -20
```

Para cada useEffect:
- [ ] Verificar se dependências foram alteradas
- [ ] Se usava estado do hook, atualizar referência
- [ ] Se dependência está em um hook novo, adicionar à dependency array

**Passo 2: Localizar useCallback que usam estados**

```bash
grep -n "useCallback" src/components/BusinessIntelligenceHub.tsx | head -20
```

Similar ao useEffect - verificar se dependências estão corretas.

---

### TAREFA 5: Validar Lint e Tipos (15 min)

Execute comandos de validação:

```bash
# 1. ESLint
npm run lint 2>&1 | grep -E "error|BusinessIntelligenceHub"

# 2. TypeScript check
npx tsc --noEmit 2>&1 | grep BusinessIntelligenceHub

# 3. Build test
npm run build 2>&1 | tail -20
```

**Se houver erros:**
- [ ] Corrigir imports faltando
- [ ] Corrigir tipos incompatíveis
- [ ] Corrigir referências quebradas

---

### TAREFA 6: Testar no Navegador (30 min)

```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend
```

**Validar:**
- [ ] Dashboard sobe sem crashes
- [ ] Tasks render corretamente
- [ ] Inbox funciona
- [ ] Chat responde
- [ ] Timeline aparece
- [ ] Panels resize
- [ ] Modals abrem/fecham
- [ ] Nenhum warning no console

**Se houver bugs:**
- [ ] Identificar qual hook tem problema
- [ ] Verificar integração no Hub
- [ ] Corrigir referência quebrada

---

### TAREFA 7: Validar Redução de Linhas (10 min)

```bash
# Comparar antes/depois
wc -l src/components/BusinessIntelligenceHub.tsx

# Meta: 4238 → ~2500 linhas
# Sucesso: redução de +1700 linhas
```

Se redução < 1000 linhas:
- [ ] Procurar por useState duplicados
- [ ] Remover console.log ou código morto
- [ ] Verificar se hooks foram realmente integrados

---

### TAREFA 8: Commit (10 min)

Execute:
```bash
git add src/components/BusinessIntelligenceHub.tsx
git commit -m "$(cat <<'EOF'
refactor: integrate 5 extracted hooks into Hub (Phase 2)

Agent 3 Phase 2 Complete:

Integration Summary:
- Replaced 57+ useState declarations with 5 custom hooks
- Reduced BusinessIntelligenceHub.tsx: 4238 → ~2500 lines (-1700+)
- All state now managed by: useTasksState, useInboxState, useSemanticInsights, useTimelineState, useUIState

Changes:
✅ Tasks state management (via useTasksState)
✅ Inbox state management (via useInboxState)
✅ Semantic insights (via useSemanticInsights)
✅ Timeline & chat (via useTimelineState)
✅ UI panels & modals (via useUIState)

Validation:
✅ ESLint: 0 errors, X warnings
✅ TypeScript: All types correct
✅ Build: Successful
✅ Runtime: Dashboard functional
✅ All features working: tasks, inbox, chat, timeline, panels

Performance:
- Code reusability: High (hooks are independent)
- Component complexity: Greatly reduced
- Maintainability: Improved (separation of concerns)

Next: Chat tool renderers & final optimizations

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## 🧩 MAPA DE REFERÊNCIAS (Use para Find & Replace)

### Tasks Hook Mappings
```
ESTADO ANTIGO              →  NOVO
taskViewMode              →  tasks.taskViewMode
setTaskViewMode           →  tasks.setTaskViewMode
taskSortBy                →  tasks.taskSortBy
setTaskSortBy             →  tasks.setTaskSortBy
taskFilterStatus          →  tasks.taskFilterStatus
setTaskFilterStatus       →  tasks.setTaskFilterStatus
searchTerm                →  tasks.searchTerm
setSearchTerm             →  tasks.setSearchTerm
boardOrder                →  tasks.boardOrder
setBoardOrder             →  tasks.setBoardOrder
boardDragState            →  tasks.boardDragState
setBoardDragState         →  tasks.setBoardDragState
selectedTaskId            →  tasks.selectedTaskId
setSelectedTaskId         →  tasks.setSelectedTaskId
selectedTaskPath          →  tasks.selectedTaskPath
setSelectedTaskPath       →  tasks.setSelectedTaskPath
selectedTaskTitle         →  tasks.selectedTaskTitle
setSelectedTaskTitle      →  tasks.setSelectedTaskTitle
selectedTaskHeading       →  tasks.selectedTaskHeading
setSelectedTaskHeading    →  tasks.setSelectedTaskHeading
selectedTaskContent       →  tasks.selectedTaskContent
setSelectedTaskContent    →  tasks.setSelectedTaskContent
selectedTaskLoading       →  tasks.selectedTaskLoading
setSelectedTaskLoading    →  tasks.setSelectedTaskLoading
selectedTaskError         →  tasks.selectedTaskError
setSelectedTaskError      →  tasks.setSelectedTaskError
togglingTaskId            →  tasks.togglingTaskId
setTogglingTaskId         →  tasks.setTogglingTaskId
completedTaskIds          →  tasks.completedTaskIds
setCompletedTaskIds       →  tasks.setCompletedTaskIds
taskPreferences           →  tasks.taskPreferences
setTaskPreferences        →  tasks.setTaskPreferences
pinnedTaskIds             →  tasks.pinnedTaskIds
setPinnedTaskIds          →  tasks.setPinnedTaskIds
priorityMap               →  tasks.priorityMap
setPriorityMap            →  tasks.setPriorityMap
taskContextDraft          →  tasks.taskContextDraft
setTaskContextDraft       →  tasks.setTaskContextDraft
aiCleanupLoading          →  tasks.aiCleanupLoading
setAiCleanupLoading       →  tasks.setAiCleanupLoading
applyTaskPreferences      →  tasks.applyTaskPreferences
clearSelectedTask         →  tasks.clearSelectedTask
toggleTaskCompletion      →  tasks.toggleTaskCompletion
togglePinnedTask          →  tasks.togglePinnedTask
```

### Inbox Hook Mappings
```
inboxNotes                →  inbox.inboxNotes
setInboxNotes             →  inbox.setInboxNotes
inboxLoading              →  inbox.inboxLoading
setInboxLoading           →  inbox.setInboxLoading
inboxError                →  inbox.inboxError
setInboxError             →  inbox.setInboxError
expandedInboxPath         →  inbox.expandedInboxPath
setExpandedInboxPath      →  inbox.setExpandedInboxPath
expandedInboxFrontmatter  →  inbox.expandedInboxFrontmatter
setExpandedInboxFrontmatter → inbox.setExpandedInboxFrontmatter
expandedInboxContent      →  inbox.expandedInboxContent
setExpandedInboxContent   →  inbox.setExpandedInboxContent
expandedInboxLoading      →  inbox.expandedInboxLoading
setExpandedInboxLoading   →  inbox.setExpandedInboxLoading
expandedInboxError        →  inbox.expandedInboxError
setExpandedInboxError     →  inbox.setExpandedInboxError
selectInboxNote           →  inbox.selectInboxNote
clearSelectedInboxNote    →  inbox.clearSelectedInboxNote
updateExpandedNote        →  inbox.updateExpandedNote
```

### Insights Hook Mappings
```
semanticInsights          →  insights.insights
setSemanticInsights       →  insights.setInsights
semanticLoading           →  insights.loading
setSemanticLoading        →  insights.setLoading
semanticError             →  insights.error
setSemanticError          →  insights.setError
lastSemanticQuery         →  insights.lastQuery
setLastSemanticQuery      →  (remover, gerenciado internamente)
fetchSemanticInsights     →  insights.fetchInsights
clearSemanticInsights     →  insights.clearInsights
retrySemanticSearch       →  insights.retry
```

### Timeline Hook Mappings
```
liveTimelineCards         →  timeline.liveTimelineCards
setLiveTimelineCards      →  timeline.setLiveTimelineCards
isTimelineCollapsed       →  timeline.isTimelineCollapsed
setIsTimelineCollapsed    →  timeline.setIsTimelineCollapsed
eventsConnected           →  timeline.eventsConnected
setEventsConnected        →  timeline.setEventsConnected
eventsError               →  timeline.eventsError
setEventsError            →  timeline.setEventsError
chatMode                  →  timeline.chatMode
setChatMode               →  timeline.setChatMode
activeConversation        →  timeline.activeConversation
setActiveConversation     →  timeline.setActiveConversation
chatMessages              →  timeline.chatMessages
setChatMessages           →  timeline.setChatMessages
streamingMessage          →  timeline.streamingMessage
setStreamingMessage       →  timeline.setStreamingMessage
thinkingMessage           →  timeline.thinkingMessage
setThinkingMessage        →  timeline.setThinkingMessage
composerValue             →  timeline.composerValue
setComposerValue          →  timeline.setComposerValue
selectedChatUtility       →  timeline.selectedChatUtility
setSelectedChatUtility    →  timeline.setSelectedChatUtility
pushLiveTimelineCard      →  timeline.pushLiveTimelineCard
removeLiveTimelineCard    →  timeline.removeLiveTimelineCard
clearTimeline             →  timeline.clearTimeline
switchChatMode            →  timeline.switchChatMode
switchConversation        →  timeline.switchConversation
addChatMessage            →  timeline.addChatMessage
updateStreamingMessage    →  timeline.updateStreamingMessage
updateThinkingMessage     →  timeline.updateThinkingMessage
handleCollapseTimeline    →  timeline.handleCollapseTimeline
handleExpandTimeline      →  timeline.handleExpandTimeline
clearChat                 →  timeline.clearChat
```

### UI Hook Mappings
```
activeUtility             →  ui.activeUtility
setActiveUtility          →  ui.setActiveUtility
rightPanelRatio           →  ui.rightPanelRatio
setRightPanelRatio        →  ui.setRightPanelRatio
isDraggingResize          →  ui.isDraggingResize
setIsDraggingResize       →  ui.setIsDraggingResize
showSettingsModal         →  ui.showSettingsModal
setShowSettingsModal      →  ui.setShowSettingsModal
showUserProfileModal      →  ui.showUserProfileModal
setShowUserProfileModal   →  ui.setShowUserProfileModal
switchUtility             →  ui.switchUtility
toggleUtility             →  ui.toggleUtility
handleUtilitySelect       →  ui.handleUtilitySelect
toggleSettingsModal       →  ui.toggleSettingsModal
toggleUserProfileModal    →  ui.toggleUserProfileModal
setViewParam              →  ui.setViewParam
handleResizeStart         →  ui.handleResizeStart
handleResizeEnd           →  ui.handleResizeEnd
updatePanelRatio          →  ui.updatePanelRatio
```

---

## ✅ SUCCESS CRITERIA

- [x] All 57+ useState removed from Hub
- [x] All references updated to use hooks
- [x] ESLint: 0 errors (warnings OK)
- [x] TypeScript: No type errors
- [x] npm run build: Successful
- [x] Dashboard renders without errors
- [x] All features functional: tasks, inbox, chat, timeline, UI
- [x] Hub lines reduced: 4238 → ~2500 (min -1700 lines)
- [x] No console warnings about state
- [x] Commit with detailed message

---

## ⚠️ BLOQUEADORES & SOLUÇÕES

### Se useState não consegue ser deletado:
**Causa:** Provavelmente o estado está em um useEffect que é executado antes do hook estar inicializado
**Solução:** Mover a lógica do useEffect para dentro do hook ou depois que o hook foi instanciado

### Se referências quebram:
**Causa:** Find & replace foi incorreto ou faltou alguma referência
**Solução:** Procurar por `Cannot read property` no console e corrigir manualmente

### Se build falha:
**Causa:** Import faltando ou tipo incompatível
**Solução:** Rodar `npm run lint` para identificar exato onde está o erro

### Se performance piorar:
**Causa:** Hooks podem estar causando renders desnecessários
**Solução:** Adicionar React.memo aos componentes que consomem os hooks

---

## 📞 PRÓXIMAS ETAPAS (Após Phase 2)

1. ✅ Phase 2 Integration (VOCÊ ESTÁ AQUI)
2. ⏳ Chat Tool Renderers (Agent 4)
3. ⏳ Final optimizations & tests
4. ⏳ Build production final

---

## 🚀 COMEÇAR AGORA!

1. Leia este prompt inteiro
2. Execute TAREFA 1-2 (análise e preparação)
3. Execute TAREFA 3-5 (integração e validação)
4. Execute TAREFA 6-8 (teste, commit)

**Tempo estimado:** 2-3 horas
**Dificuldade:** MEDIUM (é Find & Replace sistemático)
**Complexidade:** Baixa (nenhuma lógica nova, só refatoração)

✅ **Ready to execute!**
