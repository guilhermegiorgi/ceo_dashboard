# PROMPT AGENT 1 - Hub Decomposition Phase 1

## 🎯 Objetivo
Extrair componentes visuais puros do BusinessIntelligenceHub (4635 linhas → reduzir).

## 📋 Referência
- **Doc base:** `docs/HUB_DECOMPOSITION_PHASE3.md`
- **Alvo:** `src/components/BusinessIntelligenceHub.tsx`

## 🛠️ Tarefas (2-3h)

### 1. TimelineCard Component (30min)
**Criar:** `src/components/TimelineCard.tsx`

**Extrair de:** Hub linhas ~2100-2200 (renderização de card)

**Props:**
```typescript
interface TimelineCardProps {
  event: TimelineCard;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
}
```

**Output:** Componente puro, ~80 linhas

### 2. ProjectCard Component (30min)
**Criar:** `src/components/ProjectCard.tsx`

**Extrair de:** Hub linhas ~2600-2700

**Props:**
```typescript
interface ProjectCardProps {
  project: {
    id: string;
    title: string;
    status: string;
    progress: number;
    dueDate?: string;
  };
  onClick?: (id: string) => void;
}
```

### 3. InboxNoteCard Component (30min)
**Criar:** `src/components/InboxNoteCard.tsx`

**Extrair de:** Hub linhas ~3100-3200

**Props:**
```typescript
interface InboxNoteCardProps {
  note: InboxNote;
  onExpand?: (path: string) => void;
  isExpanded?: boolean;
}
```

### 4. StatsWidget Component (30min)
**Criar:** `src/components/StatsWidget.tsx`

**Extrair de:** Hub linhas ~1600-1700

**Props:**
```typescript
interface StatsWidgetProps {
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}
```

### 5. Refactor Hub - Usar Novos Componentes (30min)
**Modificar:** `BusinessIntelligenceHub.tsx`

**Trocar:**
```tsx
// Antes: JSX inline ~100 linhas
<div className="timeline-card">...</div>

// Depois: Component ~1 linha
<TimelineCard event={event} onSelect={handleSelect} />
```

**Redução esperada:** 4635 → ~4200 linhas (-10%)

## ✅ Critério de Sucesso
- ✅ 4 componentes criados (~80 linhas cada)
- ✅ Hub usa novos components
- ✅ 0 quebras visuais (mesma UI)
- ✅ Build passa (`npm run build`)
- ✅ Redução >400 linhas no Hub

## ⏱️ Tempo
2-3h total

**Boa sorte!**
