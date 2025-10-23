# AGENT 3: Hub Decomposition + Otimizações

**Objetivo:** Reduzir BusinessIntelligenceHub, otimizar código, melhorar performance.  
**Tempo estimado:** 3-4h  
**Prioridade:** P1 IMPORTANTE

## CONTEXTO

- `BusinessIntelligenceHub.tsx` tem 4280 linhas (já reduzido de 4636)
- Fases 1-3 de decomposição já feitas (visual components extraídos)
- Precisa continuar Fases 4-7 conforme `docs/HUB_DECOMPOSITION_PHASE3.md`

## TAREFAS

### 1. Hub Decomposition - Fase 4 (2h)

**Objetivo:** Extrair lógica de estado e hooks

**Arquivos a criar:**
- `src/hooks/useDashboardData.ts`
- `src/hooks/useProjects.ts`
- `src/hooks/useTasks.ts`
- `src/hooks/useInbox.ts`

**Ações:**

1. **Extrair estado global:**
```typescript
// src/hooks/useDashboardData.ts
export function useDashboardData() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSnapshot = useCallback(async () => {
    // Move toda a lógica de loadSnapshot do Hub para cá
  }, []);

  return { snapshot, loading, loadSnapshot, refresh: loadSnapshot };
}
```

2. **Extrair hooks específicos:**
```typescript
// src/hooks/useProjects.ts
export function useProjects() {
  const [collections, setCollections] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  // ... toda lógica de projetos
  return { collections, activeProjectId, setActiveProjectId, ... };
}
```

3. **Atualizar Hub para usar hooks:**
```typescript
// BusinessIntelligenceHub.tsx
export default function BusinessIntelligenceHub() {
  const dashboard = useDashboardData();
  const projects = useProjects();
  const tasks = useTasks();
  const inbox = useInbox();

  // Muito mais limpo!
}
```

**Meta:** Reduzir Hub de 4280 → ~2500 linhas

### 2. Remover Páginas Antigas (30min)

**Verificar e deletar se não usadas:**
- `app/(dashboard)/chat-preview/` 
- `app/(dashboard)/chat-centered/`
- `app/(dashboard)/chat-professional/`
- `app/(dashboard)/session-planner/`

**Manter apenas:**
- `app/(dashboard)/page.tsx` - Dashboard principal
- `app/(dashboard)/chat/page.tsx` - Chat principal
- `app/(dashboard)/workflows/page.tsx`
- `app/(dashboard)/agents/page.tsx`
- `app/(dashboard)/projects/page.tsx`
- `app/(dashboard)/knowledge-graph/page.tsx`
- `app/(dashboard)/decision-journal/page.tsx`

### 3. Otimizações de Performance (1h)

**Ações:**

1. **Memoização:**
```typescript
// Adicionar useMemo onde falta
const sortedProjects = useMemo(() => 
  collections.sort((a, b) => a.name.localeCompare(b.name)),
  [collections]
);
```

2. **Lazy loading de componentes pesados:**
```typescript
const KnowledgeGraphVisualizer = lazy(() => 
  import('./KnowledgeGraphVisualizer')
);
```

3. **Debounce em buscas:**
```typescript
const debouncedSearch = useMemo(
  () => debounce((term: string) => {
    // search logic
  }, 300),
  []
);
```

### 4. Consolidar Rotas Backend (30min)

**Verificar rotas duplicadas:**
```bash
grep -r "router.get\|router.post" server/routes/ | sort
```

**Consolidar:**
- Se há `/api/brain/*` e `/api/obsidian/*` fazendo mesma coisa, unificar
- Remover rotas não usadas no frontend

### 5. Testar & Validar (30min)

- ✅ Hub renderiza sem erros
- ✅ Performance melhorou (usar React DevTools Profiler)
- ✅ Navegação entre páginas fluida
- ✅ Nenhum warning no console
- ✅ Build production funciona: `npm run build`

## ENTREGA

- [ ] Hub reduzido para ~2500 linhas
- [ ] Hooks customizados criados e funcionando
- [ ] Páginas desnecessárias removidas
- [ ] Performance otimizada (lazy loading, memoization)
- [ ] Build production OK
- [ ] Commit: "refactor: decompose Hub Phase 4, optimize performance"

## BLOQUEADORES

Se algum hook quebrar funcionalidade, reverter e documentar no commit. Priorizar estabilidade sobre redução de linhas.
