# Brain Cloud Migration Guide

**Data:** 2025-10-20
**Versão:** 2.0.0
**Status:** ✅ Completo

---

## 🎯 Objetivo

Guia para migrar código existente de `brainCloudHybrid` para o novo `BrainCloudService` unificado.

---

## 📦 Nova Arquitetura

### Antes (brainCloudHybrid)
```
brainCloudHybrid
├─ brainCloudREST
├─ brainCloudMCP
└─ brainCloudProxy (dead code)
```

### Agora (BrainCloudService v2.0)
```
BrainCloudService (auto-detection + fallback)
├─ RestBrainCloudAdapter (brainCloudClient)
└─ McpBrainCloudAdapter (brainCloudService)
```

---

## 🔄 Migração Passo-a-Passo

### 1. Importação

**Antes:**
```javascript
import brainCloudHybrid from "../services/brainCloudHybrid.js";
const brainService = brainCloudHybrid;
```

**Agora:**
```javascript
import { brainCloudService } from "../services/brainCloud/BrainCloudService.js";
const brainService = brainCloudService; // Singleton
```

---

### 2. Padrão de Chamada

**Antes:**
```javascript
// Passava contexto como segundo parâmetro
await brainService.checkConnection({ req });
await brainService.semanticSearch(query, limit, { req });
await brainService.getGraphData({ directory }, { req });
```

**Agora:**
```javascript
// Fluent API com withContext()
await brainService.withContext({ req }).checkConnection();
await brainService.withContext({ req }).search({ query, limit });
await brainService.withContext({ req }).getGraphData({ directory });
```

---

### 3. Métodos Renomeados

| Antigo (brainCloudHybrid) | Novo (BrainCloudService) |
|---------------------------|--------------------------|
| `semanticSearch(query, limit, context)` | `search({ query, limit })` |
| `saveConversationHistory(data, context)` | `saveConversation(payload)` |
| `getInfo()` | `getInfo()` (mesma assinatura) |

**Exemplo completo:**

```javascript
// Antes
const results = await brainService.semanticSearch(
  "inteligência artificial",
  10,
  { req }
);

// Agora
const results = await brainService
  .withContext({ req })
  .search({
    query: "inteligência artificial",
    limit: 10
  });
```

---

### 4. Salvar Conversas

**Antes:**
```javascript
await brainService.saveConversationHistory({
  source,
  conversation_id,
  messages,
  metadata,
  chunking_strategy,
  auto_tag,
  save_to_vault
}, { req });
```

**Agora:**
```javascript
await brainService.withContext({ req }).saveConversation({
  source,
  conversationId: conversation_id,  // camelCase
  messages,
  metadata,
  chunkingStrategy: chunking_strategy,  // camelCase
  autoTag: auto_tag,  // camelCase
  saveToVault: save_to_vault  // camelCase
});
```

---

### 5. Buscar Conversas (Novo Método)

```javascript
// Novo método adicionado
const results = await brainService
  .withContext({ req })
  .searchConversations({
    query: "reunião cliente",
    limit: 5,
    return_full_context: false,
    filters: {
      recent_days: 30
    }
  });
```

---

## 🆕 Novos Recursos

### Auto-detecção de Adapter

O serviço detecta automaticamente qual adapter usar:

```javascript
// Request HTTP → REST adapter
await brainService.withContext({ req }).search({ query: "test" });

// Agent MCP → MCP adapter
await brainService.withContext({ agentId: "agent-1" }).search({ query: "test" });
```

### Fallback Automático

Se MCP falhar, automaticamente tenta REST:

```javascript
// 1. Tenta MCP primeiro
// 2. Se falhar → REST automaticamente
// 3. Retorna resultado transparente
const result = await brainService
  .withContext({ req })
  .search({ query: "test" });
```

### Eventos em Tempo Real

Todas as operações emitem eventos:

```javascript
import { globalEventBus } from "../services/brainCloud/adapters/events.js";

globalEventBus.on("file:updated", (event) => {
  console.log("Arquivo atualizado:", event.path);
});

// Quando faz busca, eventos são emitidos automaticamente
await brainService.withContext({ req }).search({ query: "test" });
// ↳ Emite 'file:updated' para cada resultado
```

---

## 📋 Checklist de Migração

- [ ] Substituir importação de `brainCloudHybrid`
- [ ] Atualizar chamadas para usar `withContext({ req })`
- [ ] Mapear `semanticSearch` → `search`
- [ ] Mapear `saveConversationHistory` → `saveConversation`
- [ ] Converter parâmetros snake_case → camelCase (se necessário)
- [ ] Testar endpoints migrados
- [ ] Verificar logs para confirmar adapter selecionado

---

## 🧪 Testando a Migração

### Verificar adapter ativo:
```javascript
const info = brainService.withContext({ req }).getInfo();
console.log("Adapter ativo:", info.activeAdapter.type); // 'rest' ou 'mcp'
```

### Ver capabilities disponíveis:
```javascript
const capabilities = brainService.capabilities();
console.log("Capabilities:", capabilities);
// REST: 7 capabilities
// MCP: 11 capabilities
```

### Testar fallback:
```javascript
// Force MCP mode (vai falhar para REST se MCP indisponível)
brainService.setMode('mcp');
const result = await brainService.withContext({ req }).search({ query: "test" });
// ✅ Funciona mesmo se MCP estiver off (usa REST)
```

---

## 🚨 Breaking Changes

**Nenhum!** A API pública dos endpoints `/api/brain/*` permanece **100% compatível**.

Apenas o código interno foi refatorado. Clientes HTTP não precisam mudar nada.

---

## 📚 Referências

- [SPRINT2_BACKEND_CONSOLIDATION.md](./SPRINT2_BACKEND_CONSOLIDATION.md) - Documentação completa
- [adapters/README.md](../server/services/brainCloud/adapters/README.md) - Arquitetura dos adapters
- [BrainCloudService.ts](../server/services/brainCloud/BrainCloudService.ts) - Código fonte

---

## 🆘 Problemas Comuns

### Erro: "Cannot find module BrainCloudService"
**Solução:** Verifique o caminho da importação (`.js` no final)
```javascript
import { brainCloudService } from "../services/brainCloud/BrainCloudService.js";
```

### Erro: "Property 'search' does not exist"
**Solução:** Use `withContext()` antes de chamar métodos:
```javascript
// ❌ Errado
await brainService.search({ query });

// ✅ Correto
await brainService.withContext({ req }).search({ query });
```

### Timeout em operações MCP
**Solução:** O serviço faz fallback automático para REST. Verifique logs:
```
Brain Cloud Hybrid: Usando REST para esta chamada
```

---

**Última Atualização:** 2025-10-20 02:35 BRT
**Autor:** Backend Architect (Agent 2)
