# AI Provider API Endpoints

## GET /api/ai/config
Retorna a configuração de provedores de IA do usuário autenticado.

**Response**
```json
{
  "success": true,
  "config": {
    "apiKeys": {
      "openai": "********",
      "anthropic": "********"
    },
    "modelSelection": {
      "chat": {"provider": "openai", "model": "gpt-4o-mini"},
      "insights": {"provider": "anthropic", "model": "claude-3-5-sonnet"},
      "global": {"provider": "google", "model": "gemini-1.5-flash"}
    },
    "fallbackProvider": "anthropic"
  }
}
```

## PATCH /api/ai/config
Atualiza seleção de provedor/modelo para um contexto específico.

**Request**
```json
{
  "context": "chat",
  "selection": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "customProviderId": null
  }
}
```

**Response**
```json
{
  "success": true
}
```

## POST /api/ai/config/test
Valida conectividade com o provedor atual usando `prompt` opcional.

**Request**
```json
{
  "context": "chat",
  "prompt": "Teste de conexão do provedor.",
  "selection": {
    "provider": "openai",
    "model": "gpt-4o-mini"
  }
}
```

**Response**
```json
{
  "success": true,
  "provider": "openai",
  "model": "gpt-4o-mini",
  "fallbackUsed": false
}
```

## POST /api/mcp/chat/stream
Inicia uma conversa de chat com suporte a streaming, honrando overrides de provedor.

**Request**
```json
{
  "message": "Hello",
  "providerConfig": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "overrides": {
      "temperature": 0.2
    }
  }
}
```

**Response**
- Server-Sent Events (SSE) com objetos `{ "type": "content", "chunk": "..." }`
- Mensagem final `{ "type": "done" }`
- Em caso de falha: `{ "type": "error", "message": "..." }`
