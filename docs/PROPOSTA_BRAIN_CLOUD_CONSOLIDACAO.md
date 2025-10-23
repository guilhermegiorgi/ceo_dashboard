# Proposta de Consolidação Brain Cloud

## 1. Estado Atual das Implementações

| Arquivo | Papel declarado | Situação real | Problemas observados |
|---------|-----------------|---------------|----------------------|
| `brainCloudREST.js` | Wrapper REST simples, lê env `VITE_BRAINCLOUD_*` | Pouco utilizado diretamente (a rota `/api/brain` chama o híbrido) e sobrepõe o cliente moderno `brainCloudClient.js` | Duplicação de código, configuração defasada (usa `VITE_*`), respostas pouco tipadas |
| `brainCloudMCP.js` | Proxy MCP para agentes | Retorna mensagens de fallback (`success: false`) em todos os métodos; não executa MCP real | Stub confunde consumidores, sem integração com `brainCloudService.js` que é quem fala com MCP HTTP |
| `brainCloudHybrid.js` | Roteia entre REST e MCP | Encapsula `brainCloudREST` + `brainCloudMCP`; como o MCP é stub, a maior parte das chamadas cai sempre no REST | Roteamento “automático” não agrega valor, logs ruidosos, impede adoção de MCP real |
| `brainCloudProxy.js` | Proxy aguardando bridge MCP↔Node | Apenas loga que o bridge não existe e devolve payloads vazios | Dead code; mantém superfície pública inútil |

Outros módulos relevantes:
- `brainCloudClient.js`: SDK REST consolidado (usa `settingsService`, headers tenant, busca, notas, tasks, sync) – **deverá ser a base da estratégia REST**.
- `brainCloudService.js`: Cliente MCP HTTP funcional (inicializa sessão, chama `tools/call`) – **deverá ser a base da estratégia MCP**.
- Rota `/api/brain/*`: Usa `brainCloudHybrid`, herdando as limitações acima.

## 2. Problemas Principais
1. **Configuração fragmentada** – `brainCloudREST` usa env `VITE_*`, enquanto as telas de configuração e o cliente novo usam `settingsService`.
2. **Stubs enganosos** – Métodos MCP retornam `success: false` mas sem lançar erro, levando a respostas vazias na API.
3. **Duplicidade** – Existem duas pilhas REST (`brainCloudREST` e `brainCloudClient`), com interfaces diferentes.
4. **Roteamento opaco** – `brainCloudHybrid` decide modo, mas não expõe claramente qual estratégia está ativa nem trata features exclusivas de cada protocolo.
5. **Ausência de Strategy** – Consumidores (rotas, serviços) precisam saber qual objeto usar, aumentando acoplamento.

## 3. Proposta de Arquitetura (Strategy Pattern)

### Interface comum
```ts
// server/services/brainCloud/adapters/BrainCloudAdapter.ts
export interface BrainCloudAdapter {
  checkConnection(): Promise<ConnectionStatus>;
  search(params: SearchParams): Promise<SearchResult>;
  getGraphData(options: GraphOptions): Promise<GraphResult>;
  getCurrentFocus(options?: FocusOptions): Promise<FocusResult>;
  getDueTasks(options?: TasksOptions): Promise<TasksResult>;
  getHistoricalContext(params: ContextParams): Promise<ContextResult>;
  saveConversation(payload: ConversationPayload): Promise<SaveResult>;
  // Métodos específicos podem ser expostos via capabilities()
  capabilities(): BrainCloudCapability[];
}
```

### Estratégias
```
BrainCloudAdapter
├─ RestBrainCloudAdapter        (usa brainCloudClient.js)
│    ├─ getGraphData → brainCloudClient.getGraphData()
│    ├─ getCurrentFocus → brainCloudClient.getCurrentFocus()
│    └─ etc.
├─ McpBrainCloudAdapter         (usa brainCloudService.js)
│    ├─ checkConnection → ensure initialize()
│    ├─ search → tools/call semantic_search
│    └─ etc.
└─ ProxyBrainCloudAdapter?      (opcional, quando bridge MCP estiver pronto)
```

### Serviço Orquestrador
```
BrainCloudService (novo)
├─ construtor({ strategy: 'auto' | 'rest' | 'mcp' })
├─ setMode(mode)
├─ detectMode(context)   // req vs agent
├─ delegate(method, args, context)
└─ expose capabilities / activeStrategy
```

ASCII do diagrama:
```
                 ┌────────────────────┐
                 │ BrainCloudService  │
                 │  (context aware)   │
                 ├────────────────────┤
                 │ - restAdapter      │
                 │ - mcpAdapter       │
                 │ - mode (auto/...)  │
                 └───────┬────────────┘
                         │ delegates
        ┌────────────────┴───────────────┐
        │                                │
┌───────────────┐                ┌───────────────┐
│ RestAdapter    │                │ McpAdapter     │
│ (brainCloudClient) │            │ (brainCloudService) │
└───────────────┘                └───────────────┘
```

- `RestAdapter` reaproveita totalmente `brainCloudClient`. Ganho: single source of truth para REST.
- `McpAdapter` encapsula `brainCloudService`, padronizando payloads de retorno (converter `tools/call` para objetos úteis).
- `BrainCloudService` substitui `brainCloudHybrid` e `brainCloudREST`, fornece `setMode('rest' | 'mcp' | 'auto')` e `withContext({ req, agentId })`.

### Recursos exclusivos
- Métodos que só existem no MCP (ex.: `getVaultTree`, `listResources`) permanecem expostos via `capabilities()`. Quando modo atual não suporta, retornar erro claro `CapabilityNotSupportedError`.
- `ProxyBrainCloudAdapter` opcionalmente substitui `brainCloudProxy` quando o bridge MCP↔Node estiver disponível; até lá mantemos TODO isolado.

## 4. Impacto e Dependências
- **Rotas afetadas**: `/api/brain/*` (usarão novo `BrainCloudService`), `/api/dashboard/today` (depende de `brainCloudClient` via `dashboardService` – sem alteração direta).
- **Serviços**: `tasksService`, `inboxService`, `vaultService` continuam usando `brainCloudClient` direto; opcionalmente podem migrar para consumir `BrainCloudService` em modo `rest` (ganham fallback automático).
- **Configurações**: `SettingsModal` deverá ajustar toggle “habilitar MCP” para chamar `BrainCloudService.setMode('rest' | 'mcp' | 'auto')`.
- **Logs/monitoramento**: centralizar logger no novo serviço (modo ativo, tempos de resposta, falhas).
- **Teste**: será possível mockar a interface `BrainCloudAdapter` nos testes unitários.

## 5. Plano de Migração (sem breaking changes)
1. **Criar pasta `server/services/brainCloud/adapters`** com interface + adapters REST/MCP reaproveitando código existente.
2. **Implementar `BrainCloudService` unificado** (expondo `withContext(context).search(params)` etc).
3. **Migrar rota `/api/brain`** para usar o serviço novo; garantir respostas idênticas à API atual (onde MCP for incapaz, lançar erro 501 com mensagem clara).
4. **Deprecar `brainCloudHybrid`, `brainCloudREST`, `brainCloudMCP`, `brainCloudProxy`** mantendo wrappers que apenas reexportam/avisam (até remover definitivo).
5. **Atualizar consumidores** (futuros) para usar `BrainCloudService` direto, reduzindo importações múltiplas.
6. **Documentar capabilities** em `docs/INTEGRACAO_OBSIDIAN_BRAIN_CLOUD.md` e expor no endpoint `/api/brain/info`.

## 6. Estimativa de Esforço

| Entrega | Escopo | Esforço estimado |
|---------|--------|------------------|
| Refatorar adapters + serviço (`BrainCloudService`) | Interface, wrappers REST/MCP, cobertura unitária básica | 2,5 dias dev |
| Atualizar rota `/api/brain` + testes de regressão | Ajustar respostas, adicionar mocks, smoke manual | 1 dia dev + 0,5 dia QA |
| Remover/arquivar serviços antigos | Substituir imports, atualizar docs | 0,5 dia dev |
| Total | | **~4 dias úteis dev + 0,5 dia QA** |

### Riscos & Mitigações
- **MCP instável**: encapsular inicialização em `McpAdapter` com retry/backoff; se falhar, degradar automaticamente para REST (modo `auto`).
- **Tokens/tenants divergentes**: garantir que ambos adapters consumam `settingsService` (usar `brainCloudClient.getBrainCloudRuntimeConfig()` para compartilhar config).
- **Mudança de contratos**: manter transformação de respostas na camada do serviço para que os controladores não mudem. Validar com testes integrados (rotas `/api/brain/*`).

---

Com o Strategy Pattern, reduzimos código morto, padronizamos respostas e abrimos caminho para alternar entre REST/MCP de forma controlada, alinhando o roadmap de consolidação do Brain Cloud às demandas dos Sprints 2 e 3.
