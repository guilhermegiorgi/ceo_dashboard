# PROMPT AGENT 1 - Workflow UI Builder

## 🎯 Objetivo
Criar interface visual drag-and-drop para usuários criarem workflows sem código.

## 📋 Contexto
- WorkflowManager backend COMPLETO em `server/services/brainCloud/WorkflowManager.ts`
- API endpoints prontos em `server/routes/workflows.js`
- Tipos disponíveis em `server/services/brainCloud/adapters/workflows.ts`
- Sprint 2: 97% → Agora vamos para Sprint 3 features

## 🛠️ Tarefas

### 1. Instalar Dependências (5min)
```bash
npm install @xyflow/react
# ou
npm install react-flow-renderer
```

### 2. Criar Estrutura de Componentes (4h)

#### a) WorkflowBuilder.tsx (componente principal)
**Localização:** `src/components/workflow/WorkflowBuilder.tsx`

**Funcionalidades:**
- Canvas drag-and-drop (usar @xyflow/react)
- Conectar triggers → actions
- Sidebar com biblioteca de componentes
- Properties panel para configurar nodes
- Botões: Save, Test, Clear
- Status indicator (idle/testing/success/error)

**Props:**
```typescript
interface WorkflowBuilderProps {
  workflowId?: string;      // Para editar existente
  onSave?: (workflow: WorkflowDefinition) => void;
  onTest?: (workflow: WorkflowDefinition) => void;
}
```

#### b) Biblioteca de Nodes (src/components/workflow/nodes/)
Criar node para cada tipo:

**Triggers (nodes/triggers/):**
- `EventTriggerNode.tsx` - 17 event types (task:created, file:updated, etc)
- `ScheduleTriggerNode.tsx` - Cron expressions
- `ManualTriggerNode.tsx` - Execução manual
- `WebhookTriggerNode.tsx` - HTTP webhook

**Actions (nodes/actions/):**
- `CreateNoteNode.tsx`
- `UpdateNoteNode.tsx`
- `MoveFileNode.tsx`
- `SendNotificationNode.tsx`
- `HttpRequestNode.tsx`
- `McpToolNode.tsx`
- `EmitEventNode.tsx`
- `ConditionalNode.tsx` (if/else)
- `LoopNode.tsx`
- `DelayNode.tsx`

**Cada node deve ter:**
- Ícone visual (lucide-react)
- Cor distinta por categoria
- Form para configurar parâmetros
- Validação de inputs obrigatórios

#### c) ComponentPalette.tsx
**Localização:** `src/components/workflow/ComponentPalette.tsx`

**Funcionalidades:**
- Lista categorizada de triggers/actions
- Drag from palette → drop on canvas
- Search/filter components
- Expandir/colapsar categorias

#### d) PropertiesPanel.tsx
**Localização:** `src/components/workflow/PropertiesPanel.tsx`

**Funcionalidades:**
- Mostrar quando node está selecionado
- Form dinâmico baseado no tipo do node
- Validação em tempo real
- Preview de configuração (JSON)

#### e) WorkflowToolbar.tsx
**Localização:** `src/components/workflow/WorkflowToolbar.tsx`

**Funcionalidades:**
- Input: workflow name
- Buttons: Save, Test, Clear, Export JSON
- Status indicator com loading spinner
- Undo/Redo buttons (opcional)

### 3. Página de Workflows (30min)
**Localização:** `app/(dashboard)/workflows/page.tsx`

```tsx
"use client";

import WorkflowBuilder from "@/components/workflow/WorkflowBuilder";
import { useAPI } from "@/hooks/useAPI";
import { useState } from "react";

export default function WorkflowsPage() {
  const api = useAPI();
  const [workflows, setWorkflows] = useState([]);

  const handleSave = async (workflow) => {
    const result = await api.post("/api/workflows", workflow);
    toast.success("Workflow salvo!");
  };

  const handleTest = async (workflow) => {
    const result = await api.post(`/api/workflows/${workflow.id}/execute`);
    toast.success("Workflow executado!");
  };

  return (
    <div className="h-full">
      <WorkflowBuilder onSave={handleSave} onTest={handleTest} />
    </div>
  );
}
```

### 4. Integração com API (1h)

**Endpoints a usar:**
```typescript
// Criar workflow
POST /api/workflows
Body: { name, trigger, actions, settings }

// Listar workflows
GET /api/workflows

// Atualizar workflow
PATCH /api/workflows/:id
Body: { ...updates }

// Executar workflow (teste)
POST /api/workflows/:id/execute
Body: { context?: {} }

// Ver estatísticas
GET /api/workflows/:id/stats
```

**Exemplo de workflow JSON:**
```json
{
  "name": "Auto-backup diário",
  "trigger": {
    "type": "schedule",
    "cron": "0 2 * * *",
    "timezone": "America/Sao_Paulo"
  },
  "actions": [
    {
      "id": "action-1",
      "type": "create_note",
      "config": {
        "path": "backups/{{date}}.md",
        "template": "daily-backup"
      },
      "onError": "stop"
    },
    {
      "id": "action-2",
      "type": "emit_event",
      "config": {
        "eventType": "backup:completed"
      }
    }
  ],
  "enabled": true
}
```

### 5. Testes (30min)
Criar testes básicos:
- `src/components/workflow/__tests__/WorkflowBuilder.test.tsx`
- Testar drag-and-drop
- Testar save workflow
- Testar validação

## 📐 Design/UX Guidelines

### Layout:
```
┌─────────────────────────────────────────────────────────┐
│ Toolbar: [Name Input] [Save] [Test] [Clear] [Status]   │
├──────────┬──────────────────────────────┬───────────────┤
│          │                              │               │
│ Palette  │     Canvas (React Flow)      │  Properties   │
│          │                              │   Panel       │
│ Triggers │   ┌──────┐                   │               │
│ ✓ Event  │   │Trigger│                  │ Selected:     │
│ - Schedule│   └───┬──┘                   │ Event Trigger │
│ - Manual │       │                      │               │
│          │   ┌───▼──┐                   │ Event Type:   │
│ Actions  │   │Action│                   │ [task:created]│
│ - Create │   └──────┘                   │               │
│ - Update │                              │ [Apply]       │
│          │                              │               │
└──────────┴──────────────────────────────┴───────────────┘
```

### Cores por categoria:
- **Triggers:** Blue (#3B82F6)
- **Actions:** Green (#10B981)
- **Conditionals:** Yellow (#F59E0B)
- **Loops:** Purple (#8B5CF6)
- **Utilities:** Gray (#6B7280)

### Ícones (lucide-react):
- Event Trigger: `Zap`
- Schedule: `Clock`
- Manual: `Play`
- Webhook: `Webhook`
- Create Note: `FilePlus`
- Update Note: `FileEdit`
- Move File: `FolderOpen`
- HTTP Request: `Globe`
- Conditional: `GitBranch`
- Loop: `Repeat`

## 📦 Estrutura Final de Arquivos

```
src/components/workflow/
├── WorkflowBuilder.tsx           (main component)
├── ComponentPalette.tsx
├── PropertiesPanel.tsx
├── WorkflowToolbar.tsx
├── WorkflowCanvas.tsx
├── nodes/
│   ├── triggers/
│   │   ├── EventTriggerNode.tsx
│   │   ├── ScheduleTriggerNode.tsx
│   │   ├── ManualTriggerNode.tsx
│   │   └── WebhookTriggerNode.tsx
│   └── actions/
│       ├── CreateNoteNode.tsx
│       ├── UpdateNoteNode.tsx
│       ├── MoveFileNode.tsx
│       ├── SendNotificationNode.tsx
│       ├── HttpRequestNode.tsx
│       ├── McpToolNode.tsx
│       ├── EmitEventNode.tsx
│       ├── ConditionalNode.tsx
│       ├── LoopNode.tsx
│       └── DelayNode.tsx
├── types.ts                      (TypeScript types)
└── __tests__/
    └── WorkflowBuilder.test.tsx

app/(dashboard)/workflows/
└── page.tsx                      (página principal)
```

## ✅ Critério de Sucesso

1. **Funcional:**
   - ✅ Drag-and-drop funciona
   - ✅ Conectar nodes funciona
   - ✅ Salvar workflow via API funciona
   - ✅ Testar workflow via API funciona
   - ✅ Validação impede workflows inválidos

2. **Visual:**
   - ✅ Design consistente com dashboard
   - ✅ Responsivo (mínimo 1280px width)
   - ✅ Cores e ícones consistentes
   - ✅ Loading states visíveis

3. **Qualidade:**
   - ✅ TypeScript sem errors
   - ✅ ESLint warnings < 5
   - ✅ Testes básicos passam

## 📚 Referências

**Tipos do Backend:**
- `server/services/brainCloud/adapters/workflows.ts`

**API Endpoints:**
- `server/routes/workflows.js`

**Manager:**
- `server/services/brainCloud/WorkflowManager.ts`

**Exemplos de React Flow:**
- https://reactflow.dev/learn
- https://reactflow.dev/examples

## ⏱️ Estimativa de Tempo

- Setup + deps: 15min
- WorkflowBuilder main: 1.5h
- Nodes (10 nodes × 15min): 2.5h
- Palette + Properties: 1h
- Página + API integration: 1h
- Testes + ajustes: 30min
- **TOTAL: ~5-6h**

## 🎯 Entregável Final

Ao final, o usuário deve conseguir:
1. Abrir /workflows no dashboard
2. Arrastar trigger do palette → canvas
3. Arrastar actions → canvas
4. Conectar trigger → actions
5. Configurar cada node
6. Salvar workflow
7. Testar workflow (execute)
8. Ver resultado (success/error toast)

**Boa sorte! 🚀**
