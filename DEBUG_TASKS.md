# 🔍 DEBUG: Tasks Não Carregando

## 🎯 Problema
INBOX funciona, TASKS não carrega nada.

## ✅ O que JÁ está funcionando

### Backend
1. ✅ Endpoint existe: `/api/brain/tasks`
2. ✅ DashboardService inclui tasks no snapshot
3. ✅ `simplifyDueItems()` transforma tasks corretamente
4. ✅ Snapshot retorna `data.tasks.simplified`

### Frontend  
1. ✅ Hook `useTasksState` existe (gerencia UI)
2. ✅ `tasksList` vem de `snapshot?.data?.tasks?.simplified`
3. ✅ `tasksWithPreferences` mapeia tasksList
4. ✅ `filteredTasks` filtra por utility "tasks"

## ❌ O que pode estar quebrado

### Hipótese 1: Dados não chegam do Brain Cloud
- Brain Cloud MCP/REST pode estar retornando vazio
- Verificar warnings no snapshot

### Hipótese 2: Tasks vazio mas sem erro
- API retorna success mas array vazio
- Verificar se há tasks no Obsidian

### Hipótese 3: Renderização quebrada
- Dados chegam mas não renderizam
- Check loading states

## 🧪 Testes para executar no Console

### 1. Verificar Snapshot
```javascript
// No console do navegador
fetch('http://localhost:3002/api/dashboard/today', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
}).then(r => r.json()).then(data => {
  console.log('📦 SNAPSHOT COMPLETO:', data);
  console.log('📋 TASKS:', data.data?.tasks);
  console.log('🔢 TASKS SIMPLIFICADAS:', data.data?.tasks?.simplified);
  console.log('⚠️  WARNINGS:', data.warnings);
});
```

### 2. Verificar Tasks Direto
```javascript
fetch('http://localhost:3002/api/brain/tasks?window=all', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
}).then(r => r.json()).then(data => {
  console.log('✅ TASKS DIRETO:', data);
});
```

### 3. Verificar Estado do React
```javascript
// Inspecionar componente BusinessIntelligenceHub
// Procurar por "tasksList" no React DevTools
```

## 🔧 Próximos Passos

1. **Executar teste 1** para ver snapshot
2. **Executar teste 2** para ver tasks direto
3. **Verificar warnings** se houver
4. **Checar console** por erros silenciosos
5. **Verificar React DevTools** state do componente

## 📝 Resultado Esperado

Se tudo estiver OK, você deve ver:
```json
{
  "data": {
    "tasks": {
      "simplified": [
        {
          "id": "path/to/note.md:123",
          "title": "Task title",
          "status": "upcoming",
          "dueDate": "2025-01-25"
        }
      ]
    }
  }
}
```

Se `simplified` estiver vazio `[]`, o problema é no Brain Cloud ou Obsidian.
