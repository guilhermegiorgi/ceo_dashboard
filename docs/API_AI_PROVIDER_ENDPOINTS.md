# AI Provider API Endpoints

## GET /api/ai/config
Retorna a configuração de provedores de IA do usuário autenticado.

**Description**: Fetch current user's AI provider configuration including API keys (masked), model selections per context, and fallback provider.

**Response** (200 OK)
```json
{
  "success": true,
  "config": {
    "apiKeys": {
      "openai": "sk-***",
      "anthropic": "sk-ant-***",
      "google": "****"
    },
    "modelSelection": {
      "chat": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "contextWindow": 128000,
        "costPer1kTokens": {"input": 0.03, "output": 0.06}
      },
      "insights": {
        "provider": "anthropic",
        "model": "claude-3-5-sonnet",
        "contextWindow": 200000,
        "costPer1kTokens": {"input": 0.003, "output": 0.015}
      },
      "global": {
        "provider": "google",
        "model": "gemini-1.5-flash",
        "contextWindow": 1000000,
        "costPer1kTokens": {"input": 0.0375, "output": 0.15}
      }
    },
    "fallbackProvider": "anthropic"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid context or missing required fields
- `401 Unauthorized`: User not authenticated
- `500 Internal Server Error`: Database or service error

---

## PATCH /api/ai/config
Atualiza seleção de provedor/modelo para um contexto específico e/ou provider fallback.

**Description**: Update model selections and fallback provider. Can update one or more contexts in a single request.

**Request**
```json
{
  "updates": [
    {
      "context": "chat",
      "provider": "openai",
      "model": "gpt-4o-mini"
    },
    {
      "context": "insights",
      "provider": "anthropic",
      "model": "claude-3-5-sonnet"
    }
  ],
  "fallbackProvider": "anthropic"
}
```

**Response** (200 OK)
```json
{
  "success": true,
  "config": {
    "modelSelection": {
      "chat": {"provider": "openai", "model": "gpt-4o-mini"},
      "insights": {"provider": "anthropic", "model": "claude-3-5-sonnet"},
      "global": {"provider": "google", "model": "gemini-1.5-flash"}
    },
    "fallbackProvider": "anthropic"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid provider/model combination, or model not available for provider
- `401 Unauthorized`: User not authenticated
- `409 Conflict`: Model no longer available or API key missing
- `500 Internal Server Error`: Database error

---

## POST /api/ai/config/test/{provider}
Valida conectividade com um provedor usando um prompt de teste.

**Description**: Test connection to specified provider. Validates API key and basic connectivity.

**URL Parameters**:
- `provider` (required): Provider name (openai, anthropic, google, perplexity, openrouter)

**Request Body** (optional)
```json
{
  "model": "gpt-4o-mini",
  "testPrompt": "Say 'test successful' in one word"
}
```

**Response** (200 OK)
```json
{
  "success": true,
  "provider": "openai",
  "model": "gpt-4o-mini",
  "connected": true,
  "latencyMs": 145,
  "fallbackUsed": false
}
```

**Error Response** (200 OK with error flag)
```json
{
  "success": false,
  "provider": "openai",
  "connected": false,
  "error": "Invalid API key",
  "code": "INVALID_KEY"
}
```

**Possible Error Codes**:
- `INVALID_KEY`: API key is invalid or missing
- `RATE_LIMIT`: Provider is rate-limiting
- `TIMEOUT`: Request timed out
- `CONNECTION_ERROR`: Network error
- `MODEL_NOT_FOUND`: Model not available for provider
- `AUTH_FAILED`: Authentication failure
- `UNKNOWN`: Unknown error

---

## GET /api/ai/config/models/{provider}
Retorna a lista dinâmica de modelos disponíveis para um provedor (CRITICAL FOR FRESHNESS).

**Description**: Fetch available models for a specific provider. This is dynamically loaded from provider APIs and should be called frequently to stay current with new model releases.

**URL Parameters**:
- `provider` (required): Provider name (openai, anthropic, google, perplexity, openrouter)

**Query Parameters**:
- `useCache` (optional, default: true): Use cached models if available and fresh (<60 min)
- `forceRefresh` (optional, default: false): Ignore cache and fetch fresh models

**Response** (200 OK)
```json
{
  "success": true,
  "provider": "openai",
  "models": [
    {
      "id": "gpt-4o",
      "name": "GPT-4 Optimized",
      "contextWindow": 128000,
      "trainingDataCutoff": "2024-10-01",
      "costPer1kTokens": {
        "input": 0.005,
        "output": 0.015
      },
      "capabilities": ["text", "vision", "streaming", "function-calling"],
      "released": "2024-05-13",
      "status": "recommended"
    },
    {
      "id": "gpt-4-turbo",
      "name": "GPT-4 Turbo",
      "contextWindow": 128000,
      "trainingDataCutoff": "2024-04-01",
      "costPer1kTokens": {
        "input": 0.01,
        "output": 0.03
      },
      "capabilities": ["text", "vision", "streaming", "function-calling"],
      "released": "2023-11-06",
      "status": "available"
    },
    {
      "id": "gpt-3.5-turbo",
      "name": "GPT-3.5 Turbo",
      "contextWindow": 16385,
      "trainingDataCutoff": "2023-04-01",
      "costPer1kTokens": {
        "input": 0.001,
        "output": 0.002
      },
      "capabilities": ["text", "streaming", "function-calling"],
      "released": "2023-03-15",
      "status": "available"
    }
  ],
  "cacheInfo": {
    "lastUpdated": "2024-10-23T11:30:00Z",
    "cacheAgeMinutes": 5,
    "isFresh": true
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid provider
- `401 Unauthorized`: User not authenticated
- `500 Internal Server Error`: Provider API error or database error
- Response still contains cached data if available: `"cacheInfo": {"fallbackToCache": true}`

**Important**: This endpoint is critical for keeping model lists current. Always call when:
- Settings modal loads
- User changes provider selection
- User clicks "Refresh Models" button
- Cache expires (60-minute TTL)

---

## POST /api/mcp/chat/stream
Inicia uma conversa de chat com suporte a streaming, honrando overrides de provedor.

**Description**: Send chat message with streaming support. Message is routed through selected provider with fallback support.

**Request**
```json
{
  "message": "Hello, what can you help me with?",
  "providerConfig": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "overrides": {
      "temperature": 0.7,
      "maxTokens": 1000
    }
  },
  "conversationId": "conv-123"
}
```

**Response**: Server-Sent Events (SSE) stream
```
data: {"type": "start", "provider": "openai", "model": "gpt-4o-mini"}
data: {"type": "content", "chunk": "Hello! I"}
data: {"type": "content", "chunk": " can help with"}
data: {"type": "content", "chunk": " many tasks."}
data: {"type": "done", "totalTokens": 42, "provider": "openai"}
```

**On Error**:
```
data: {"type": "error", "message": "Provider failed. Trying fallback...", "fallbackAttempting": "anthropic"}
data: {"type": "content", "chunk": "Hello! I can..."}
data: {"type": "done", "usedFallback": true, "fallbackProvider": "anthropic"}
```

**Error Codes**:
- `INVALID_PROVIDER`: Provider not recognized
- `NO_API_KEY`: API key not configured for provider
- `INVALID_MODEL`: Model not available
- `ALL_PROVIDERS_FAILED`: All fallback attempts exhausted
- `STREAMING_INTERRUPTED`: Connection lost during stream

---

## POST /api/insights/generate
Gera insights usando o provedor selecionado (não-streaming).

**Description**: Generate insights/summary using selected provider. No streaming, returns complete response.

**Request**
```json
{
  "context": "daily_focus",
  "forceRefresh": false,
  "providerOverride": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet"
  }
}
```

**Response** (200 OK)
```json
{
  "success": true,
  "insights": {
    "summary": "Today's focus: Complete AI Provider Framework...",
    "keyPoints": ["Point 1", "Point 2"],
    "recommendations": ["Rec 1", "Rec 2"]
  },
  "provider": "anthropic",
  "model": "claude-3-5-sonnet",
  "generatedAt": "2024-10-23T11:35:00Z",
  "usedFallback": false
}
```

**Error Response** (200 OK with error)
```json
{
  "success": false,
  "error": "All providers failed. Check API keys in Settings.",
  "code": "ALL_PROVIDERS_FAILED",
  "lastAttempt": "anthropic"
}
```

---

## Caching Strategy

### Client-Side Caching (Frontend - useAPI hook)
- `getAIConfig()`: 5-minute TTL
- `getProviderModels(provider)`: 60-minute TTL with user-visible timestamps
- Cache invalidated on logout or manual refresh

### Server-Side Considerations
- Provider model lists can be cached per provider (TTL configurable)
- Configuration changes invalidate related caches immediately
- Connection tests (POST /test) are not cached
- Chat/Insights requests are not cached (generate fresh responses)

---

## Authentication & Security
All endpoints require:
- Valid user session (cookie or Bearer token)
- CORS headers configured for frontend origin
- API keys are never returned in full; masked for display
- All requests logged for audit trail

---

## Rate Limits (Recommended)
- `GET /api/ai/config`: 100 req/min per user
- `GET /api/ai/config/models/{provider}`: 30 req/min per user
- `POST /api/ai/config/test/{provider}`: 10 req/min per user
- `POST /api/mcp/chat/stream`: 30 req/min per user
- `POST /api/insights/generate`: 10 req/min per user
