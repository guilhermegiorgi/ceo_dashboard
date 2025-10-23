# 🎯 AGENT - Fix "Foco do dia" Mocked Data (VERSÃO CORRIGIDA)

## Objetivo
Remover dados mockados do componente "Foco do dia" e integrar dados reais do Brain Cloud (Obsidian) com validação, filtros e feedback de qualidade de dados.

---

## 🔴 Problema Identificado

### Componente Afetado
"Foco do dia" na Dashboard Principal (BusinessIntelligenceHub)

### Dados Mockados
Fallback hardcoded em BusinessIntelligenceHub.tsx (linha 2838):
return "Execução do piloto multi-tenant";  // ❌ MOCKADO

Fallback também em useDashboardHeader.ts (linha 75):
focusHeadline: focusHeadline || "Execução do piloto multi-tenant",

### Descrição do Problema
1. O "Foco do dia" deveria mostrar dados reais do Brain Cloud
2. Quando o Brain Cloud retorna dados de focus, deveria exibir daily_notes[0].title ou weekly_focus.title
3. Se nenhum dado estiver disponível, deveria exibir placeholder melhor (ex: "Nenhum foco definido hoje")
4. Atualmente está retornando o string mockado "Execução do piloto multi-tenant" como fallback
5. NOVO: Daily notes retorna README.md e notas vazias que devem ser filtradas
6. NOVO: Dados antigos (>3 dias para daily, >14 dias para weekly) devem ser sinalizados

---

## 📊 Estrutura de Dados do MCP

O MCP get_current_focus retorna:

{
  success: true,
  focus: {
    daily_notes: [
      {
        path: string,
        title: string,
        excerpt: string,
        tags: string[],
        frontmatter: object,
        modified: string (ISO timestamp),
        size: number
      }
    ],
    weekly_focus: {
      path: string,
      title: string,
      excerpt: string,
      tags: string[],
      frontmatter: {
        tipo: "foco-semanal",
        semana: string,
        prioridades: string[]
      },
      modified: string,
      size: number
    },
    metadata: {
      daily_limit: 3,
      include_weekly: true,
      generated_at: string
    }
  }
}

---

## 🎯 Solution Approach

### Step 1: Improve Backend Normalization
Arquivo: server/services/dashboardService.js

function normalizeFocusSnapshot(raw) {
  if (!raw) {
    console.log('[normalizeFocusSnapshot] No focus data received');
    return null;
  }

  const now = new Date();

  // NOVO: Filtrar daily notes inválidas
  const validDailyNotes = (raw.daily_notes || [])
    .filter(note => {
      // Filtrar README
      if (note.path.includes('README.md')) return false;
      
      // Filtrar notas muito pequenas (provavelmente vazias)
      if (note.size < 200) return false;
      
      // Filtrar notas sem frontmatter.date
      if (!note.frontmatter?.date) return false;
      
      return true;
    })
    .sort((a, b) => {
      // Ordenar por data de modificação (mais recente primeiro)
      return new Date(b.modified).getTime() - new Date(a.modified).getTime();
    })
    .map(note => {
      const modified = new Date(note.modified);
      const daysOld = Math.floor((now.getTime() - modified.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        ...note,
        isStale: daysOld > 3,
        daysOld
      };
    });

  // NOVO: Adicionar isStale flag no weekly_focus
  let weeklyFocus = null;
  if (raw.weekly_focus) {
    const weeklyModified = new Date(raw.weekly_focus.modified);
    const weeklyDaysOld = Math.floor((now.getTime() - weeklyModified.getTime()) / (1000 * 60 * 60 * 24));
    
    weeklyFocus = {
      ...raw.weekly_focus,
      isStale: weeklyDaysOld > 14,
      daysOld: weeklyDaysOld
    };
  }

  return {
    daily_notes: validDailyNotes,
    weekly_focus: weeklyFocus,
    metadata: {
      ...raw.metadata,
      hasFreshDaily: validDailyNotes.length > 0 && !validDailyNotes[0].isStale,
      hasFreshWeekly: weeklyFocus && !weeklyFocus.isStale,
      totalDailyNotes: validDailyNotes.length,
      hasAnyData: validDailyNotes.length > 0 || weeklyFocus !== null
    },
    timestamp: now.toISOString()
  };
}

### Step 2: Fix Frontend Display Logic
Arquivo: src/components/BusinessIntelligenceHub.tsx

const focusDisplay = useMemo(() => {
  const daily = snapshot?.data?.focus?.daily_notes?.[0];
  const weekly = snapshot?.data?.focus?.weekly_focus;
  
  // Priorizar daily se não estiver stale e tiver conteúdo válido
  if (daily && !daily.isStale && daily.title?.trim()) {
    return {
      text: daily.title,
      excerpt: daily.excerpt,
      source: 'daily',
      isStale: false,
      daysOld: daily.daysOld || 0
    };
  }
  
  // Fallback para weekly
  if (weekly && weekly.title?.trim()) {
    return {
      text: weekly.title,
      excerpt: weekly.excerpt,
      source: 'weekly',
      isStale: weekly.isStale || false,
      daysOld: weekly.daysOld || 0
    };
  }
  
  // NOVO: Retornar null em vez de string mockada
  return null;
}, [snapshot]);

return (
  <div className="focus-section">
    {focusDisplay ? (
      <div className="focus-content">
        <FocusHeadline 
          text={focusDisplay.text}
          excerpt={focusDisplay.excerpt}
          source={focusDisplay.source}
        />
        {focusDisplay.isStale && (
          <Badge variant="warning" className="stale-badge">
            Desatualizado ({focusDisplay.daysOld} dias atrás)
          </Badge>
        )}
      </div>
    ) : (
      <EmptyFocusState 
        message="Nenhum foco definido recentemente"
        onDefine={() => router.push('/focus/new')}
      />
    )}
  </div>
);

### Step 3: Create EmptyFocusState Component
Arquivo: src/components/EmptyFocusState.tsx

import { AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

interface EmptyFocusStateProps {
  message: string;
  onDefine: () => void;
}

export function EmptyFocusState({ message, onDefine }: EmptyFocusStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">{message}</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Defina seu foco para acompanhar melhor suas prioridades
      </p>
      <Button onClick={onDefine} variant="default">
        Definir foco agora
      </Button>
    </div>
  );
}

### Step 4: Remove Fallback from Hook
Arquivo: src/hooks/useDashboardHeader.ts (linha 75)

ANTES:
focusHeadline: focusHeadline || "Execução do piloto multi-tenant",

DEPOIS:
focusHeadline: focusHeadline || null,  // Let component handle empty state

### Step 5: Update FocusHeadline Component
Arquivo: src/components/FocusHeadline.tsx (se existir)

interface FocusHeadlineProps {
  text: string;
  excerpt?: string;
  source: 'daily' | 'weekly';
}

export function FocusHeadline({ text, excerpt, source }: FocusHeadlineProps) {
  return (
    <div className="focus-headline">
      <Badge variant={source === 'daily' ? 'success' : 'default'} className="mb-2">
        {source === 'daily' ? 'Foco Diário' : 'Foco Semanal'}
      </Badge>
      <h2 className="text-2xl font-bold mb-2">{text}</h2>
      {excerpt && (
        <p className="text-muted-foreground line-clamp-2">
          {excerpt.slice(0, 150)}...
        </p>
      )}
    </div>
  );
}

---

## ✅ Testing Checklist

Após implementar as mudanças, validar:

1. [ ] Backend retorna null quando sem focus (não objeto vazio)
2. [ ] Daily notes filtra README.md automaticamente
3. [ ] Daily notes filtra notas vazias (size < 200)
4. [ ] Daily notes filtra notas sem frontmatter.date
5. [ ] Flag isStale adicionada em daily_notes
6. [ ] Flag isStale adicionada em weekly_focus
7. [ ] Frontend mostra EmptyFocusState quando focusDisplay = null
8. [ ] Frontend mostra Badge "Desatualizado" quando isStale = true
9. [ ] Priorização correta: daily (fresh) > daily (stale) > weekly > empty
10. [ ] Fallback mockado removido de BusinessIntelligenceHub.tsx
11. [ ] Fallback mockado removido de useDashboardHeader.ts
12. [ ] Componente EmptyFocusState criado e funcional
13. [ ] Badge de staleness aparece quando dados antigos
14. [ ] Contador de dias (daysOld) aparece correto

---

## 🎯 Expected Behavior After Fix

### Cenário 1: Daily Note Recente (<3 dias)
- Mostra: Daily note title
- Badge: "Foco Diário" (verde)
- Sem badge de "Desatualizado"

### Cenário 2: Daily Note Antiga (>3 dias) + Weekly Atual
- Mostra: Weekly focus title
- Badge: "Foco Semanal" (azul)
- Sem badge de "Desatualizado"

### Cenário 3: Ambos Desatualizados
- Mostra: Weekly focus title (fallback)
- Badge: "Foco Semanal" + "Desatualizado (X dias atrás)"

### Cenário 4: Sem Dados
- Mostra: EmptyFocusState
- Mensagem: "Nenhum foco definido recentemente"
- Botão: "Definir foco agora"

---

## 🚨 Important Notes

1. O MCP pode retornar README.md na lista de daily_notes - DEVE ser filtrado
2. Notas vazias (size < 200) aparecem - DEVEM ser filtradas
3. Dados antigos devem ser sinalizados visualmente, não apenas ignorados
4. EmptyState é melhor UX do que string genérica mockada
5. Priorizar daily sobre weekly APENAS se daily não estiver stale

---

## 📝 Files to Modify

1. server/services/dashboardService.js (normalizeFocusSnapshot)
2. src/components/BusinessIntelligenceHub.tsx (focusDisplay logic)
3. src/hooks/useDashboardHeader.ts (remove fallback)
4. src/components/EmptyFocusState.tsx (criar novo)
5. src/components/FocusHeadline.tsx (opcional: melhorar)

---
