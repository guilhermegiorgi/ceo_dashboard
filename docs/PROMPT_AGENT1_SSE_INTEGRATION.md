# Prompt: Agent 1 - SSE Integration & Real-time Updates

**Sprint:** 2.5 (Preparação para Sprint 3)
**Agent Role:** Frontend Architect
**Prioridade:** 🟡 Média-Alta
**Tempo estimado:** 2-3 horas

---

## 🎯 Objetivo

Implementar integração completa com o sistema de eventos SSE do Brain Cloud, permitindo atualizações em tempo real na timeline do dashboard sem necessidade de refresh.

**Benefício:** Dashboard se atualiza automaticamente quando:
- Tarefas são criadas/atualizadas
- Notas são modificadas no vault
- Conversas são salvas
- Workflows são executados

---

## 📋 Tarefas

### **1. Hook useBrainCloudEvents()** (Prioridade Máxima)

**Localização:** `src/hooks/useBrainCloudEvents.tsx`

**Objetivo:** Hook React para consumir eventos SSE do endpoint `/api/brain/events`

**Interface esperada:**

```typescript
interface UseBrainCloudEventsOptions {
  // Filtros de eventos
  eventTypes?: BrainCloudEventType[];
  userId?: string;
  source?: 'ui' | 'sync' | 'workflow' | 'agent';

  // Configuração
  enabled?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;

  // Callbacks
  onEvent?: (event: BrainCloudEvent) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

interface UseBrainCloudEventsReturn {
  // Estado
  events: BrainCloudEvent[];
  lastEvent: BrainCloudEvent | null;
  connected: boolean;
  error: Error | null;

  // Ações
  connect: () => void;
  disconnect: () => void;
  clear: () => void;

  // Filtros específicos
  getEventsByType: (type: BrainCloudEventType) => BrainCloudEvent[];
  getFileEvents: () => BrainCloudEvent[];
  getTaskEvents: () => BrainCloudEvent[];
  getConversationEvents: () => BrainCloudEvent[];
}

function useBrainCloudEvents(
  options?: UseBrainCloudEventsOptions
): UseBrainCloudEventsReturn;
```

**Implementação sugerida:**

```typescript
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type BrainCloudEventType =
  | 'file:created' | 'file:updated' | 'file:deleted' | 'file:moved'
  | 'task:created' | 'task:updated' | 'task:completed'
  | 'note:created' | 'note:updated'
  | 'conversation:saved'
  | 'graph:updated'
  | 'focus:changed'
  | 'sync:started' | 'sync:completed' | 'sync:failed'
  | 'workflow:triggered' | 'workflow:completed' | 'workflow:failed';

export interface BrainCloudEvent {
  type: BrainCloudEventType;
  timestamp: string;
  userId?: string;
  source?: string;
  [key: string]: unknown;
}

interface UseBrainCloudEventsOptions {
  eventTypes?: BrainCloudEventType[];
  userId?: string;
  source?: 'ui' | 'sync' | 'workflow' | 'agent';
  enabled?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;
  onEvent?: (event: BrainCloudEvent) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useBrainCloudEvents(options: UseBrainCloudEventsOptions = {}) {
  const {
    eventTypes,
    userId,
    source,
    enabled = true,
    reconnect = true,
    reconnectInterval = 5000,
    onEvent,
    onError,
    onConnect,
    onDisconnect,
  } = options;

  const [events, setEvents] = useState<BrainCloudEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<BrainCloudEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();

    if (eventTypes?.length) {
      params.append('filter', eventTypes.join(','));
    }
    if (userId) {
      params.append('userId', userId);
    }
    if (source) {
      params.append('source', source);
    }

    const queryString = params.toString();
    return `/api/brain/events${queryString ? `?${queryString}` : ''}`;
  }, [eventTypes, userId, source]);

  const connect = useCallback(() => {
    if (!enabled || eventSourceRef.current) return;

    try {
      const url = buildUrl();
      const es = new EventSource(url);

      es.onopen = () => {
        console.log('[SSE] Connected to Brain Cloud events');
        setConnected(true);
        setError(null);
        onConnect?.();
      };

      es.onerror = (err) => {
        console.error('[SSE] Connection error:', err);
        const errorObj = new Error('SSE connection failed');
        setError(errorObj);
        setConnected(false);
        onError?.(errorObj);

        // Reconnect logic
        if (reconnect && enabled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[SSE] Attempting to reconnect...');
            disconnect();
            connect();
          }, reconnectInterval);
        }
      };

      // Handle connected event
      es.addEventListener('connected', (event) => {
        console.log('[SSE] Connection established:', event.data);
      });

      // Handle all Brain Cloud event types
      const eventTypesList: BrainCloudEventType[] = [
        'file:created', 'file:updated', 'file:deleted', 'file:moved',
        'task:created', 'task:updated', 'task:completed',
        'note:created', 'note:updated',
        'conversation:saved',
        'graph:updated', 'focus:changed',
        'sync:started', 'sync:completed', 'sync:failed',
        'workflow:triggered', 'workflow:completed', 'workflow:failed',
      ];

      eventTypesList.forEach((type) => {
        es.addEventListener(type, (event) => {
          try {
            const data: BrainCloudEvent = JSON.parse(event.data);
            console.log(`[SSE] Event received:`, type, data);

            setEvents((prev) => [...prev, data]);
            setLastEvent(data);
            onEvent?.(data);
          } catch (err) {
            console.error('[SSE] Failed to parse event:', err);
          }
        });
      });

      eventSourceRef.current = es;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to connect');
      setError(errorObj);
      onError?.(errorObj);
    }
  }, [enabled, buildUrl, reconnect, reconnectInterval, onEvent, onError, onConnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setConnected(false);
      onDisconnect?.();
      console.log('[SSE] Disconnected from Brain Cloud events');
    }
  }, [onDisconnect]);

  const clear = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  const getEventsByType = useCallback((type: BrainCloudEventType) => {
    return events.filter((e) => e.type === type);
  }, [events]);

  const getFileEvents = useCallback(() => {
    return events.filter((e) => e.type.startsWith('file:'));
  }, [events]);

  const getTaskEvents = useCallback(() => {
    return events.filter((e) => e.type.startsWith('task:'));
  }, [events]);

  const getConversationEvents = useCallback(() => {
    return events.filter((e) => e.type === 'conversation:saved');
  }, [events]);

  // Auto-connect/disconnect based on enabled
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    events,
    lastEvent,
    connected,
    error,
    connect,
    disconnect,
    clear,
    getEventsByType,
    getFileEvents,
    getTaskEvents,
    getConversationEvents,
  };
}
```

**Testes esperados:**

```typescript
// src/hooks/__tests__/useBrainCloudEvents.test.tsx

describe('useBrainCloudEvents', () => {
  it('deve conectar ao SSE quando enabled=true', () => {
    // Mock EventSource
    // Renderizar hook
    // Verificar que connected=true
  });

  it('deve receber eventos e atualizar state', () => {
    // Mock event emission
    // Verificar que events array é atualizado
    // Verificar que lastEvent é setado
  });

  it('deve chamar onEvent callback', () => {
    // Mock onEvent
    // Emitir evento
    // Verificar callback foi chamado
  });

  it('deve filtrar eventos por tipo', () => {
    // Passar eventTypes=['task:created']
    // Verificar que apenas task:created é retornado
  });

  it('deve reconectar automaticamente após erro', () => {
    jest.useFakeTimers();
    // Simular erro
    // Avançar timer
    // Verificar tentativa de reconexão
  });

  it('deve desconectar quando enabled=false', () => {
    // Conectar
    // Mudar enabled para false
    // Verificar que desconectou
  });
});
```

---

### **2. Componente EventListener** (Prioridade Alta)

**Localização:** `src/components/EventListener.tsx`

**Objetivo:** Componente invisível que escuta eventos e dispara ações

**Interface esperada:**

```typescript
interface EventListenerProps {
  // Filtros
  eventTypes?: BrainCloudEventType[];

  // Ações por tipo de evento
  onFileEvent?: (event: BrainCloudEvent) => void;
  onTaskEvent?: (event: BrainCloudEvent) => void;
  onNoteEvent?: (event: BrainCloudEvent) => void;
  onConversationEvent?: (event: BrainCloudEvent) => void;
  onGraphEvent?: (event: BrainCloudEvent) => void;
  onSyncEvent?: (event: BrainCloudEvent) => void;
  onWorkflowEvent?: (event: BrainCloudEvent) => void;

  // Notificações
  showToasts?: boolean;
  toastDuration?: number;

  // Debug
  debug?: boolean;
}
```

**Implementação sugerida:**

```typescript
'use client';

import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useBrainCloudEvents, BrainCloudEvent, BrainCloudEventType } from '@/hooks/useBrainCloudEvents';

interface EventListenerProps {
  eventTypes?: BrainCloudEventType[];
  onFileEvent?: (event: BrainCloudEvent) => void;
  onTaskEvent?: (event: BrainCloudEvent) => void;
  onNoteEvent?: (event: BrainCloudEvent) => void;
  onConversationEvent?: (event: BrainCloudEvent) => void;
  onGraphEvent?: (event: BrainCloudEvent) => void;
  onSyncEvent?: (event: BrainCloudEvent) => void;
  onWorkflowEvent?: (event: BrainCloudEvent) => void;
  showToasts?: boolean;
  toastDuration?: number;
  debug?: boolean;
}

const EventListener: React.FC<EventListenerProps> = ({
  eventTypes,
  onFileEvent,
  onTaskEvent,
  onNoteEvent,
  onConversationEvent,
  onGraphEvent,
  onSyncEvent,
  onWorkflowEvent,
  showToasts = false,
  toastDuration = 3000,
  debug = false,
}) => {
  const { lastEvent, connected, error } = useBrainCloudEvents({
    eventTypes,
    enabled: true,
    reconnect: true,
  });

  useEffect(() => {
    if (!lastEvent) return;

    if (debug) {
      console.log('[EventListener] Received event:', lastEvent);
    }

    // Route event to appropriate handler
    if (lastEvent.type.startsWith('file:')) {
      onFileEvent?.(lastEvent);

      if (showToasts) {
        const action = lastEvent.type.split(':')[1];
        toast.success(`Arquivo ${action}: ${lastEvent.path || 'unknown'}`, {
          duration: toastDuration,
        });
      }
    }

    if (lastEvent.type.startsWith('task:')) {
      onTaskEvent?.(lastEvent);

      if (showToasts) {
        const action = lastEvent.type.split(':')[1];
        toast.success(`Tarefa ${action}`, {
          duration: toastDuration,
        });
      }
    }

    if (lastEvent.type.startsWith('note:')) {
      onNoteEvent?.(lastEvent);

      if (showToasts) {
        toast.success('Nota atualizada', {
          duration: toastDuration,
        });
      }
    }

    if (lastEvent.type === 'conversation:saved') {
      onConversationEvent?.(lastEvent);

      if (showToasts) {
        toast.success('Conversa salva no vault', {
          duration: toastDuration,
        });
      }
    }

    if (lastEvent.type === 'graph:updated') {
      onGraphEvent?.(lastEvent);

      if (showToasts) {
        toast.success('Grafo de conhecimento atualizado', {
          duration: toastDuration,
        });
      }
    }

    if (lastEvent.type.startsWith('sync:')) {
      onSyncEvent?.(lastEvent);

      if (showToasts && lastEvent.type === 'sync:completed') {
        toast.success('Sincronização concluída', {
          duration: toastDuration,
        });
      }
    }

    if (lastEvent.type.startsWith('workflow:')) {
      onWorkflowEvent?.(lastEvent);

      if (showToasts && lastEvent.type === 'workflow:completed') {
        toast.success(`Workflow concluído: ${lastEvent.workflowName || 'unknown'}`, {
          duration: toastDuration,
        });
      }
    }
  }, [
    lastEvent,
    onFileEvent,
    onTaskEvent,
    onNoteEvent,
    onConversationEvent,
    onGraphEvent,
    onSyncEvent,
    onWorkflowEvent,
    showToasts,
    toastDuration,
    debug,
  ]);

  // Show connection status toast (only once)
  useEffect(() => {
    if (connected && showToasts) {
      toast.success('Conectado ao Brain Cloud (atualizações em tempo real)', {
        duration: 2000,
      });
    }
  }, [connected, showToasts]);

  // Show error toast
  useEffect(() => {
    if (error && showToasts) {
      toast.error('Erro na conexão com Brain Cloud', {
        duration: 3000,
      });
    }
  }, [error, showToasts]);

  // Componente invisível - não renderiza nada
  return null;
};

export default EventListener;
```

---

### **3. Integração no BusinessIntelligenceHub** (Prioridade Máxima)

**Arquivo:** `src/components/BusinessIntelligenceHub.tsx`

**Mudanças:**

```typescript
import EventListener from './EventListener';
import { BrainCloudEvent } from '@/hooks/useBrainCloudEvents';

// Dentro do componente BusinessIntelligenceHub:

const handleTaskEvent = useCallback((event: BrainCloudEvent) => {
  console.log('[Hub] Task event received:', event);

  // Recarregar tarefas
  if (event.type === 'task:created' || event.type === 'task:updated') {
    // Trigger refresh do snapshot silencioso
    loadSnapshot({ silent: true });
  }
}, [loadSnapshot]);

const handleConversationEvent = useCallback((event: BrainCloudEvent) => {
  console.log('[Hub] Conversation saved:', event);

  // Mostrar indicador visual na timeline
  // Adicionar item à timeline sem refresh completo
  if (event.conversationId) {
    setTimelineCards((prev) => [
      {
        id: event.conversationId,
        type: 'conversation',
        title: 'Nova conversa salva',
        timestamp: event.timestamp,
        // ... demais campos
      },
      ...prev,
    ]);
  }
}, []);

const handleFileEvent = useCallback((event: BrainCloudEvent) => {
  console.log('[Hub] File event:', event);

  // Atualizar indicador de sincronização
  if (event.type === 'file:updated') {
    toast.success(`Arquivo atualizado: ${event.path}`, {
      duration: 2000,
    });
  }
}, []);

return (
  <div className="...">
    {/* Adicionar EventListener no início do JSX */}
    <EventListener
      eventTypes={['task:created', 'task:updated', 'task:completed', 'conversation:saved', 'file:updated']}
      onTaskEvent={handleTaskEvent}
      onConversationEvent={handleConversationEvent}
      onFileEvent={handleFileEvent}
      showToasts={false} // Controlamos toasts manualmente
      debug={process.env.NODE_ENV === 'development'}
    />

    {/* Resto do componente... */}
  </div>
);
```

---

### **4. Melhorias Visuais (Opcional)**

**Indicador de conexão SSE:**

```tsx
// No Header ou no Hub
const ConnectionIndicator: React.FC = () => {
  const { connected, error } = useBrainCloudEvents({ enabled: true });

  if (!connected && !error) return null; // Conectando...

  return (
    <div className="flex items-center gap-2 text-xs">
      {connected ? (
        <>
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-slate-400">Live</span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-rose-500 rounded-full" />
          <span className="text-slate-400">Offline</span>
        </>
      )}
    </div>
  );
};
```

**Timeline com animação de novos itens:**

```tsx
// Adicionar animação quando novo item aparece
<motion.div
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  {/* Item da timeline */}
</motion.div>
```

---

## 📊 Critérios de Sucesso

### **Funcional:**
- ✅ Hook `useBrainCloudEvents()` conecta ao SSE
- ✅ Eventos são recebidos e processados
- ✅ Componente `EventListener` dispara callbacks corretos
- ✅ Hub atualiza timeline em tempo real
- ✅ Reconexão automática após erro

### **Qualidade:**
- ✅ Testes unitários do hook (>80% cobertura)
- ✅ Sem memory leaks (disconnect limpa listeners)
- ✅ Performance não impactada (< 10ms por evento)
- ✅ TypeScript 100% type-safe

### **UX:**
- ✅ Indicador visual de conexão
- ✅ Toasts informativos (opcionais)
- ✅ Timeline se atualiza suavemente
- ✅ Sem flicker ou reloads desnecessários

---

## 🧪 Testes Manuais

```bash
# 1. Iniciar dev server
npm run dev

# 2. Abrir dashboard
# 3. Verificar que "Connected to Brain Cloud events" aparece no console
# 4. Em outro terminal, criar uma tarefa via API:
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Nova tarefa teste","status":"pending"}'

# 5. Verificar que:
#    - Evento task:created é recebido no console
#    - Timeline é atualizada automaticamente
#    - Toast aparece (se showToasts=true)

# 6. Testar desconexão:
#    - Parar o servidor
#    - Verificar que tenta reconectar automaticamente
#    - Reiniciar servidor
#    - Verificar que reconecta
```

---

## 📚 Referências

1. **EventSource API:** https://developer.mozilla.org/en-US/docs/Web/API/EventSource
2. **SSE Backend:** `server/routes/brainEvents.js`
3. **Event Types:** `server/services/brainCloud/adapters/events.ts`
4. **Testes E2E:** `tests/e2e/critical/dashboard.spec.ts`

---

## ✅ Checklist de Entrega

- [ ] Hook `useBrainCloudEvents()` implementado
- [ ] Testes unitários do hook (>5 testes)
- [ ] Componente `EventListener` criado
- [ ] Integração no BusinessIntelligenceHub
- [ ] Indicador de conexão visual
- [ ] Testes manuais realizados
- [ ] Documentação do hook (JSDoc)
- [ ] 0 erros TypeScript
- [ ] 0 warnings ESLint

---

## 🎯 Resultado Esperado

**Após completar:**

```
✅ Dashboard com atualizações em tempo real
✅ Timeline atualiza sem refresh
✅ Toasts informativos de eventos
✅ Indicador de conexão visível
✅ Sistema robusto com reconexão automática

Usuário percebe:
- Dashboard "vivo" (updates instantâneos)
- Feedback visual imediato de ações
- Experiência moderna e fluida
```

**Tempo estimado:** 2-3 horas
**Prioridade:** 🟡 Média-Alta
**Complexidade:** Média

**Boa sorte!** 🚀
