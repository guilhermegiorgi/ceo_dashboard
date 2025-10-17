# 🔌 Chat API Reference

## Base URL
```
http://localhost:3001/api/chat
```

## Authentication
Todas requisições requerem header:
```
Authorization: Bearer <JWT_TOKEN>
```

## Endpoints

### 1. Criar Conversa
```http
POST /conversations
Content-Type: application/json
Authorization: Bearer <token>

{
  "agentId": "optional-agent-uuid"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "conv-uuid-string",
    "userId": 1,
    "agentId": null,
    "workbenchSession": "session-uuid",
    "messages": [],
    "context": {
      "recentNotes": [],
      "focusAreas": [],
      "tasks": []
    },
    "createdAt": "2025-10-17T15:00:00Z",
    "updatedAt": "2025-10-17T15:00:00Z"
  }
}
```

### 2. Enviar Mensagem
```http
POST /conversations/{conversationId}/messages
Content-Type: application/json
Authorization: Bearer <token>

{
  "message": "Analise as tarefas dessa semana",
  "code": "optional javascript code",
  "language": "javascript"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "conversationId": "conv-uuid",
    "message": "Response from assistant",
    "toolsUsed": [
      {
        "tool": "mcp_get_tasks",
        "status": "completed"
      }
    ],
    "context": {
      "intention": "analyze_tasks",
      "contextUsed": ["recentMessages", "tasks"]
    }
  }
}
```

### 3. Obter Histórico
```http
GET /conversations/{conversationId}/messages?limit=50
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "role": "user",
      "content": "Quais tarefas?",
      "timestamp": "2025-10-17T15:00:00Z"
    },
    {
      "role": "assistant",
      "content": "Resposta...",
      "timestamp": "2025-10-17T15:00:10Z",
      "toolsUsed": ["mcp_get_tasks"]
    }
  ]
}
```

### 4. Stream de Conversa (SSE)
```http
GET /conversations/{conversationId}/stream
Authorization: Bearer <token>
```

**Response Stream**:
```
data: {"chunk":"primeiro chunk de resposta"}
data: {"chunk":" mais dados..."}
data: {"status":"completed"}
```

### 5. Executar Código
```http
POST /execute
Content-Type: application/json
Authorization: Bearer <token>

{
  "conversationId": "conv-uuid",
  "code": "console.log('test')",
  "language": "javascript",
  "timeout": 30000
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "exec-uuid",
    "sessionId": "session-uuid",
    "code": "...",
    "language": "javascript",
    "timestamp": "2025-10-17T15:00:00Z",
    "status": "completed",
    "result": {
      "success": true,
      "stdout": "test
",
      "stderr": "",
      "exitCode": 0
    },
    "duration": 145
  }
}
```

### 6. Deletar Conversa
```http
DELETE /conversations/{conversationId}
Authorization: Bearer <token>
```

**Response** (204): No content

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 500 | Server Error |

## Tools Automáticas

Chat automaticamente executa as ferramentas apropriadas:

| Intenção | Ferramentas |
|----------|-------------|
| `analyze_tasks` | `mcp_get_tasks`, `mcp_get_tasks_summary` |
| `search_brain` | `mcp_semantic_search` |
| `generate_insight` | `mcp_get_graph`, `mcp_get_main_tags` |
| `execute_code` | Sandbox executor |

## Exemplos cURL

### Criar e Enviar Mensagem
```bash
#!/bin/bash

TOKEN="seu_jwt_token"
BASE_URL="http://localhost:3001/api/chat"

# 1. Criar conversa
CONV_ID=$(curl -s -X POST $BASE_URL/conversations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq -r '.data.id')

echo "Conversa criada: $CONV_ID"

# 2. Enviar mensagem
curl -s -X POST $BASE_URL/conversations/$CONV_ID/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Olá!"}' | jq

# 3. Obter histórico
curl -s -X GET "$BASE_URL/conversations/$CONV_ID/messages?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq

# 4. Executar código
curl -s -X POST $BASE_URL/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"conversationId\": \"$CONV_ID\",
    \"code\": \"console.log('Sandbox test')\",
    \"language\": \"javascript\"
  }" | jq
```

## Rate Limiting

Limites padrão:
- 100 requests/minute por usuário
- 10 execuções de código simultâneas
- 30s timeout por execução

## Paginação

Use `limit` e `offset`:
```http
GET /conversations/{id}/messages?limit=20&offset=20
```

## Errors

```json
{
  "success": false,
  "error": "Descrição do erro",
  "details": {
    "field": "conversationId",
    "message": "UUID inválido"
  }
}
```

---

**Última atualização**: 2025-10-17
**Versão**: 1.0.0
