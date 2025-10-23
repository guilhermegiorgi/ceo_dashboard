# AI Provider Architecture

## Overview
The AI Provider Framework centralizes configuration, routing, and observability for all LLM vendors used by the CEO Dashboard. Requests flow from the frontend contexts/hooks, through the Express API, into the router abstraction that validates credentials, selects the appropriate provider/model, and manages fallback plus streaming.

### Components

#### Backend
- **aiProviderRouter.js** – Core router with validation, fallback, and streaming support
- **aiConfigService.js** – Loads and sanitizes user-level provider selection and API keys
- **enhancedChatService.js** – Drives chat workflows leveraging the router
- **insightService.js** – Generates insights using router with non-streaming responses
- **/api/ai/config** – Endpoints to read, update, and test configuration

#### Frontend
- **AIProviderContext** – Global state for provider selections and connection status
- **useAIProvider()** – Hook exposing helper actions (save, test, refresh)
- **useAPI()** – REST client augmented with AI helper methods
- **SettingsModal** – Interface to manage keys and defaults
- **ChatWidget** – Displays active provider badge and streams responses
- **FocusSummaryWidget** – Shows insights provider and timestamps

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
