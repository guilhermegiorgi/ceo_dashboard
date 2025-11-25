# Settings Integration - Frontend ↔ Backend

## 📋 **Overview**

Este documento explica como as configurações do Settings Modal afetam o comportamento real do backend ao buscar dados do Obsidian Brain Cloud.

## 🔄 **Fluxo Completo**

```
┌─────────────────────────────────────────────────────────────┐
│  1. User edita Settings Modal (Frontend)                    │
│     • Connection Mode: auto/rest/mcp/hybrid                  │
│     • REST API URL, API Key                                  │
│     • MCP Server URL                                         │
│     • Habilitar/desabilitar REST e MCP                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  2. POST /api/settings (Frontend → Backend)                 │
│     • useSettingsPersistence.ts → API                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Mapeamento de Campos (settings.js)                      │
│     Frontend Format     →  Backend Format                    │
│     connectionMode      →  connectionMode                    │
│     restEnabled         →  enableRest                        │
│     mcpEnabled          →  enableMcp                         │
│     restApiUrl          →  baseUrl                           │
│     restApiKey          →  apiToken                          │
│     mcpServerUrl        →  mcpWs                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Persistência no PostgreSQL (user_settings)              │
│     • settingsServiceDB → INSERT/UPSERT                      │
│     • ui_preferences guarda taskPreferences/coleções         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Próxima Requisição ao Dashboard                         │
│     GET /api/dashboard/today                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Backend lê Settings (brainCloudClient.js)               │
│     • getRuntimeConfig() → loadSystemSettings/loadUserSettings │
│     • Usa baseUrl, apiToken, enableRest, enableMcp          │
│     • Cache de 60s (CONFIG_CACHE_TTL)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  7. Chamada Real ao Obsidian Brain Cloud                    │
│     • HTTP Request com headers corretos                      │
│     • Authorization: Bearer {apiToken}                       │
│     • X-Tenant-Id: {tenantId}                                │
│     • Base URL: {baseUrl}                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  8. Dados REAIS retornam para o Dashboard                   │
│     • Tasks do Obsidian                                      │
│     • Notas recentes                                         │
│     • Focus context                                          │
└─────────────────────────────────────────────────────────────┘
```

## 🗂️ **Estrutura de Arquivos**

### **Frontend**

```
src/components/settings/
├── SettingsModalRefactored.tsx         # Modal principal
├── BrainCloudSettingsSection.tsx       # Seção Brain Cloud Settings
├── types.ts                             # Tipos TypeScript
└── hooks/
    └── useSettingsPersistence.ts       # Load/Save settings
```

### **Backend**

```
server/
├── routes/
│   └── settings.js                     # API endpoints + mapeamento
├── services/
│   ├── settingsService.js              # Delegação para DB (registro system)
│   ├── settingsServiceDB.js            # Load/save em user_settings (PostgreSQL)
│   ├── brainCloudClient.js             # REST client (LÊ SETTINGS!)
│   └── brainCloud/
│       ├── BrainCloudService.ts        # Serviço unificado
│       └── adapters/
│           └── RestBrainCloudAdapter.ts # Usa brainCloudClient
```

## 🔌 **Como as Settings Afetam o Backend**

### **1. REST API Calls**

```javascript
// brainCloudClient.js - getRuntimeConfig()
const settings = await loadSettings();
const config = {
  baseUrl: settings.braincloud.baseUrl,      // Da UI!
  apiToken: settings.braincloud.apiToken,    // Da UI!
  enableRest: settings.braincloud.enableRest // Da UI!
};

// Se enableRest === false, lança erro:
if (!config.enableRest) {
  throw new Error("BrainCloud REST integration is disabled via settings.");
}
```

### **2. HTTP Headers**

```javascript
// brainCloudClient.js - buildHeaders()
const headers = {
  'Authorization': `Bearer ${config.apiToken}`,  // Vem do Settings!
  'X-Tenant-Id': config.tenantId,
  'Content-Type': 'application/json'
};
```

### **3. URL Construction**

```javascript
// brainCloudClient.js - request()
const baseUrl = config.baseUrl || 'http://localhost:8000';
const url = new URL('/api/v1/tasks', baseUrl);  // baseUrl vem do Settings!
```

## 📝 **Mapeamento de Campos**

### **Frontend → Backend (Salvar)**

| Frontend Field      | Backend Field    | Descrição                           |
|---------------------|------------------|-------------------------------------|
| `connectionMode`    | `connectionMode` | auto/rest/mcp/hybrid                |
| `restEnabled`       | `enableRest`     | Habilita REST API                   |
| `mcpEnabled`        | `enableMcp`      | Habilita MCP                        |
| `restApiUrl`        | `baseUrl`        | URL da API REST                     |
| `restApiKey`        | `apiToken`       | Token de autenticação               |
| `mcpServerUrl`      | `mcpWs`          | WebSocket URL do MCP                |

### **Backend → Frontend (Carregar)**

Mapeamento inverso para exibir valores corretos na UI.

## 🧪 **Como Testar**

### **Teste 1: Mudar REST API URL**

```bash
# 1. Abra Settings (Avatar → Settings)
# 2. Vá na aba "Brain Cloud"
# 3. Mude "REST API URL" para: http://localhost:8000/api/v1
# 4. Clique "Save"
# 5. Recarregue o Dashboard
# 6. Backend agora usa a nova URL!
```

**Verificação:**
```bash
# No terminal do backend, veja logs:
# "BrainCloud settings unavailable, falling back..." → ERRADO
# Sem erro → Está usando as settings! ✅
```

### **Teste 2: Desabilitar REST**

```bash
# 1. Settings → Brain Cloud
# 2. Desmarque "Habilitar REST"
# 3. Save
# 4. Recarregue Dashboard
# 5. Deve mostrar erro: "BrainCloud REST integration is disabled"
```

### **Teste 3: Verificar Cache**

```bash
# Settings têm cache de 60s no backend
# Mudanças levam até 1 minuto para afetar
# Ou reinicie o backend para aplicar imediatamente
```

## ⚙️ **Configuração Padrão**

### **Prioridade de Configuração**

```
1. Registro em PostgreSQL (user_settings) — por usuário/tenant; registro “system” para fluxos sem usuário
2. Variáveis de ambiente (.env) lidas pelo brainCloudClient (BRAINCLOUD_*/OBSIDIAN_API_*)
3. Defaults hardcoded
```

## 🚀 **Próximos Passos**

### **Funcionalidades Implementadas** ✅
- [x] Load/Save settings via API
- [x] Mapeamento frontend ↔ backend
- [x] Backend lê settings em runtime
- [x] Cache de configuração (60s)
- [x] Fallback para ENV vars

### **Melhorias Futuras** 📋
- [ ] Invalidar cache ao salvar settings (force refresh)
- [ ] Settings por usuário (multi-tenant)
- [ ] Validação de URL/token antes de salvar
- [ ] Retry automático com fallback REST ↔ MCP
- [ ] Settings para AI API Keys (OpenAI, Anthropic, etc)
- [ ] Health check ao mudar configurações

## 🐛 **Troubleshooting**

### **"BrainCloud REST integration is disabled"**
✅ **Causa:** `enableRest` está `false` no settings  
✅ **Solução:** Settings → Brain Cloud → Marque "Habilitar REST"

### **"Request failed: 401 Unauthorized"**
✅ **Causa:** `apiToken` inválido ou vazio  
✅ **Solução:** Settings → Brain Cloud → Cole API Key válida

### **"Request failed: connect ECONNREFUSED"**
✅ **Causa:** `baseUrl` incorreta ou servidor offline  
✅ **Solução:** Verifique URL e servidor Obsidian Brain Cloud

### **Mudanças não aplicam imediatamente**
✅ **Causa:** Cache de 60s no backend  
✅ **Solução:** Aguarde 1min OU reinicie backend

## 📚 **Referências**

- `server/services/brainCloudClient.js` - Cliente REST que lê settings
- `server/services/settingsService.js` - Proxy para registro “system” em user_settings
- `server/services/settingsServiceDB.js` - CRUD de settings por usuário/tenant (PostgreSQL)
- `server/routes/settings.js` - API endpoints + mapeamento
- `src/components/settings/hooks/useSettingsPersistence.ts` - Frontend persistence

---

**Última atualização:** 2025-01-22  
**Autor:** Guilherme Giorgi + Factory Droid
