# AI Provider Architecture

## Overview
The AI Provider Framework centralizes configuration, routing, and observability for all LLM vendors used by the CEO Dashboard. Requests flow from the frontend contexts/hooks, through the Express API, into the router abstraction that validates credentials, selects the appropriate provider/model, and manages fallback plus streaming.

### System Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js 15)                       │
├──────────────────────────┬──────────────────────┬───────────────────┤
│ ChatWidget               │ FocusSummaryWidget   │ SettingsModal     │
│ ├─ Display active        │ ├─ Show insights     │ ├─ Provider list  │
│ │  provider badge        │ │  provider          │ ├─ Model dropdown │
│ └─ Stream responses      │ └─ Regenerate btn    │ └─ Test connect   │
└──────────────────────────┴──────────────────────┴───────────────────┘
         │                        │                       │
         └────────────────────────┴───────────────────────┘
                   ↓
        ┌────────────────────────┐
        │  AIProviderContext     │
        │  SettingsContext       │
        │  useAIProvider() hook  │
        │  useAPI() helpers      │
        └────────────────────────┘
                   ↓
        ┌────────────────────────┐
        │   Express API Layer    │
        │ /api/ai/config/*       │
        │ /api/mcp/chat/stream   │
        │ /api/insights/generate │
        └────────────────────────┘
                   ↓
        ┌────────────────────────────────────────┐
        │  AIProviderRouter                      │
        │  ├─ Validate config                    │
        │  ├─ Route to selected provider         │
        │  ├─ Fallback mechanism (cascading)     │
        │  └─ Stream handling & error categorization│
        └────────────────────────────────────────┘
                   ↓
        ┌──────────────────────────────────────┐
        │   Provider APIs                      │
        │ • OpenAI (GPT-4, GPT-4-turbo)       │
        │ • Anthropic (Claude 3.x)            │
        │ • Google (Gemini)                   │
        │ • Perplexity                        │
        │ • OpenRouter (compatible)           │
        └──────────────────────────────────────┘
```

### Components

#### Backend
- **aiProviderRouter.js** – Core router with validation, fallback, and streaming support
  - `routeRequest(provider, model, prompt, config)` - Standard request routing
  - `routeStreamingRequest(provider, model, prompt, config, onChunk)` - SSE streaming
  - `validateRequest(provider, model, apiKey)` - Pre-flight validation
  - Implements cascading fallback logic
  - Error categorization: recoverable vs fatal

- **aiConfigService.js** – Loads and sanitizes user-level provider selection and API keys
  - Load user configuration from database
  - Validate provider/model combinations
  - API key encryption/masking
  - Persist configuration updates

- **enhancedChatService.js** – Drives chat workflows leveraging the router
  - Integrates with aiProviderRouter for message completions
  - Handles conversation history management
  - Manages streaming responses

- **insightService.js** – Generates insights using router with non-streaming responses
  - Daily focus generation
  - Consolidated insight synthesis
  - Uses standard (non-streamed) responses

- **errors.js** – Error categorization and handling
  - ProviderError class with code classification
  - Recoverable vs non-recoverable error detection
  - User-friendly error messages

- **/api/ai/config** – Endpoints to read, update, and test configuration
  - GET `/api/ai/config` - Fetch user configuration
  - PATCH `/api/ai/config` - Update model selections and fallback
  - POST `/api/ai/config/test/{provider}` - Validate connection
  - GET `/api/ai/config/models/{provider}` - Fetch available models (dynamic)

#### Frontend
- **AIProviderContext** – Global state for provider selections and connection status
  - Maintains current selections for chat, insights, global contexts
  - Broadcasts changes to all subscribers
  - Persists to localStorage and backend

- **useAIProvider()** – Hook exposing helper actions
  - `switchProvider(provider, model)` - Change active provider
  - `testConnection(provider)` - Validate connection
  - `refreshModels()` - Clear cache and reload model list
  - Returns current provider/model info and loading states

- **useAPI()** – REST client augmented with AI helper methods
  - `getAIConfig()` - Fetch configuration with 5-min cache
  - `updateAIConfig(context, config)` - Update and persist
  - `testAIProvider(provider)` - Test connection
  - `getProviderModels(provider)` - Fetch available models (DYNAMIC, 60-min cache)
  - `sendChatWithProvider(message, override)` - Send message with provider override
  - Built-in retry logic and error handling

- **SettingsModal** – Interface to manage keys and defaults
  - AI Model Selection section in Settings
  - Provider dropdown (filtered by available API keys)
  - Model dropdown (dynamically populated)
  - Model info display (capabilities, context window, costs)
  - Test Connection button per provider
  - Fallback provider configuration
  - Current Active Models display with refresh

- **ChatWidget** – Displays active provider badge and streams responses
  - Shows "Using [Provider] - [Model]" above chat input
  - Updates in real-time when settings change
  - Streams responses via SSE with provider badge

- **FocusSummaryWidget** – Shows insights provider and timestamps
  - Displays provider/model used for insights
  - Regenerate button with provider context
  - Last updated timestamp

### Data Flow

#### Setting Provider
1. Usuário abre Settings → AI Providers
2. Ajusta provedor/modelo desejado
3. Clica em "Save" ou "Test Connection"
4. Frontend envia POST `/api/ai/config/update`
5. Backend persiste configuração no banco
6. Contexto frontend é atualizado e difunde mudanças
7. Widgets refletem provedor ativo imediatamente

#### Sending Chat Message
1. Usuário envia mensagem no ChatWidget
2. Frontend recupera provider atual do AIProviderContext
3. Chama POST `/api/mcp/chat/stream` com overrides selecionados
4. Backend delega para `aiProviderRouter`
5. Router valida provider, modelo e API key
6. Router chama API do provedor
7. Em caso de falha, executa fallback em cascata
8. Resposta stream retorna via SSE
9. ChatWidget exibe tokens com selo do provedor utilizado

#### Generating Insights
1. Dashboard solicita regeneração de insights
2. Obtém configuração via `/api/ai/config`
3. Envia POST `/api/insights/generate`
4. Service aciona `aiProviderRouter` sem streaming
5. Fallback e validações idênticas ao fluxo de chat
6. Resultados exibidos no FocusSummaryWidget com indicação do provedor

## Error Handling
- `ProviderError` class categoriza códigos (`INVALID_KEY`, `FATAL`, `ALL_FAILED`, etc.)
- Router identifica erros recuperáveis (timeout, 5xx, rate-limit) e ativa fallback automático
- Erros fatais retornam rapidamente com mensagens amigáveis para Settings
- Logs registram provedor, modelo e statusCode para auditoria

## Testing
- **Unit**: `server/services/__tests__/aiProviderRouter.spec.js` cobre happy-path, fallback, falhas fatais e streaming
- **Integration**: Playwright E2E valida troca de provedor, fallback transparente e mensagens de erro
- **Performance**: testes de latência medem tempo de validação, first-token e sobrecarga adicional em fallback
