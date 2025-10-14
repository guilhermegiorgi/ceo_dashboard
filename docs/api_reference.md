# Referência da API REST – Obsidian Brain Cloud

A API FastAPI expõe funcionalidades de leitura/escrita sobre o vault via HTTP
tradicional. Todas as rotas vivem sob `/api/v1` e exigem **Bearer Token**.

**Última atualização:** 28/09/2025 • **Versão da API:** 1.1.0 • **Protocolo MCP:** 2024-11-05

---
## 1. Autenticação

Envie o header HTTP:
```
Authorization: Bearer SEU_TOKEN_DE_API
```

O token é definido em `server/.env` (`API_TOKEN`).

### 1.1 Obtenção via endpoint (opcional)
Para cenários de teste, existe `/api/v1/auth/token` que gera um JWT temporário:

```
POST /api/v1/auth/token
{
  "username": "demo",
  "password": "<API_TOKEN>"
}
```

Resposta:
```json
{
  "access_token": "...",
  "token_type": "bearer"
}
```

---
## 2. Endpoint base
```
http://HOST:PORT/api/v1
```
Por padrão, `HOST=localhost` e `PORT=8000`.

---
## 3. Endpoints disponíveis

### 3.1 Saúde
- **GET `/health`** – retorna status da API.

```json
{
  "status": "healthy",
  "version": "1.1.0"
}
```

### 3.2 Arquivos

#### GET `/files/`
Lista arquivos de um diretório.

Query opcional `?directory=subpasta` (relativa à raiz).

#### GET `/files/{file_path}`
Retorna conteúdo e metadados de um arquivo.

Exemplo:
```
GET /files/5%20-%20INSIGHTS-IA/README.md
```

Resposta:
```json
{
  "path": "5 - INSIGHTS-IA/README.md",
  "content": "...",
  "frontmatter": null,
  "tags": []
}
```

#### POST `/files/`
Cria ou sobrescreve arquivo.

```json
{
  "path": "5 - INSIGHTS-IA/Nova nota.md",
  "content": "Conteúdo",
  "create_parents": true
}
```

#### DELETE `/files/{file_path}`
Remove arquivo ou diretório. Operação só é permitida em áreas de escrita.

#### POST `/files/batch`
Obtém vários arquivos em uma única chamada.

```json
{
  "filepaths": ["5 - INSIGHTS-IA/Nota.md", "3 - RECURSOS/Guia.md"],
  "ignore_missing": true
}
```

Resposta inclui `files` (lista de resultados individuais com sucesso/erro) e
`missing` (quando `ignore_missing=true`).

#### POST `/files/append`
Acrescenta conteúdo a um arquivo existente (ou cria, se permitido).

```json
{
  "path": "5 - INSIGHTS-IA/Novidades.md",
  "content": "\n## Atualizações",
  "create_parents": false,
  "separator": "\n"
}
```

#### POST `/files/patch`
Insere conteúdo após/before headings ou substitui uma seção.

```json
{
  "path": "5 - INSIGHTS-IA/Projetos.md",
  "content": "Item atualizado",
  "heading": "Resultados",
  "position": "after_heading",
  "create_file": false,
  "separator": "\n\n"
}
```

#### POST `/files/move`
Move ou renomeia arquivos e pastas dentro da área liberada (`5 - INSIGHTS-IA`).

```json
{
  "source_path": "5 - INSIGHTS-IA/Notas/old.md",
  "destination_path": "5 - INSIGHTS-IA/Projetos/new.md",
  "create_parents": true,
  "overwrite": false
}
```

### 3.3 Busca
- **POST `/search/`** – Busca textual (mesma lógica de `search_files` no MCP).

```json
{
  "query": """\bProjeto\b""",
  "directories": ["5 - INSIGHTS-IA"],
  "case_sensitive": false,
  "file_extensions": [".md"]
}
```

Resposta lista caminho / trechos encontrados / score.

- **POST `/search/complex`** – Busca avançada com JsonLogic.

```json
{
  "rules": {
    "and": [
      {"glob": [{"var": "tags"}, "#prioridade"]},
      {"regexp": [{"var": "modified"}, "^2025"]}
    ]
  },
  "directories": ["5 - INSIGHTS-IA"],
  "limit": 20
}
```

Retorna `{ "success": true, "total": N, "results": [...] }`.

### 3.4 Notas periódicas

- **POST `/periodic/`** – Retorna (ou cria) nota do período atual.
- **GET  `/periodic/recent/{period_type}`** – Lista últimas notas (`daily`,
  `weekly`, `monthly`, `quarterly`, `yearly`), suporta `?limit=10`.

### 3.5 Mudanças recentes
- **GET `/recent/changes`** – `?limit=` e `?days=` para filtrar arquivos
  modificados.

### 3.6 Estrutura e Estatísticas do Vault
- **GET `/vault/tree`** – retorna árvore hierárquica das notas. Parâmetros
  opcionais: `?directory=`, `?depth=` (0 = só raiz, omisso = 2; use valores
  maiores para aprofundar), `?include_files=`, `?include_dirs=` e
  `?max_entries=` (1–500) para limitar cada nível.
- **GET `/vault/graph`** – retorna nós (notas) e arestas (wikilinks). Opções:
  `?directory=`, `?include_orphans=`, `?include_unresolved=`, `?max_nodes=`
  (1–5000), `?max_edges=` (1–10000) e `?resolve_titles=` (frontmatter/heading).
  Quando os parâmetros não são informados aplicamos o limite configurado em
  `MCP_GRAPH_MAX_NODES` (default 400) e `MCP_GRAPH_MAX_EDGES` (default 1200) para
  manter as respostas dentro do teto de 1 MB do WebSocket.
- **GET `/vault/tags`** – retorna ranking de tags utilizadas. Aceita `?limit=`
  (1–200, padrão `MCP_TAGS_LIMIT`).
- **GET `/vault/links`** – lista wikilinks mais referenciados com `count`,
  `resolved_path` e flag `exists`. Aceita `?limit=` (1–200, padrão
  `MCP_LINKS_LIMIT`).

### 3.7 Contexto Operacional
- **GET `/focus/current`** – retorna visão resumida do foco recente. Parâmetros:
  `?daily_limit=` (1–10, padrão 3), `?include_weekly=` (bool), `?weekly_path=` e
  `?daily_directory=`. Resposta traz `daily_notes` (últimas notas diárias com
  título, trecho, tags) e `weekly_focus` quando o arquivo configurado existe.

### 3.8 Sincronização Git
- **POST `/sync/`** – Dispara sincronização imediata (pull/push).
- **GET `/sync/status`** – Informa estado da thread de sincronização automática.

---

### 3.9 Tarefas e prazos

#### GET `/tasks/due`
Retorna notas e tarefas com due date filtradas por janela temporal.

Parâmetros de query:
- `window` (`today`, `3d`, `week`, `month`, `overdue`, `all`; padrão `all`)
- `priority` (`alta`, `media`, `baixa`; opcional)
- `status` (`em_andamento`, `pendente`, `concluída`, ...; opcional)
- `directories` (lista separada por vírgula com paths relativos; opcional)
- `include_tasks` (bool, padrão `true`)
- `include_frontmatter` (bool, padrão `true`)
- `include_completed` (bool, padrão `false`)
- `sort_by` (`date`, `priority`, `path`; padrão `date`)
- `limit` (inteiro opcional)

Resposta típica:
```json
{
  "success": true,
  "period": "next_7_days",
  "total": 3,
  "overdue_count": 0,
  "due_today_count": 1,
  "upcoming_count": 2,
  "items": [
    {
      "title": "Revisar proposta Agro",
      "type": "task",
      "file_path": "5 - INSIGHTS-IA/Projetos/Agro.md",
      "due": "2025-09-29T10:00:00-03:00",
      "priority": "alta",
      "status": "em_andamento",
      "days_until_due": 1,
      "is_overdue": false
    }
  ],
  "summary": {
    "counts": {"overdue": 0, "due_today": 1, "upcoming": 2},
    "by_priority": {"alta": 1}
  }
}
```

#### GET `/tasks/summary`
Gera uma visão executiva com agregações por prioridade, projeto, data ou status e recomendações automáticas.

Parâmetros de query:
- `range` (`today`, `this_week`, `next_week`, `this_month`; padrão `this_week`)
- `group_by` (`priority`, `project`, `date`, `status`; opcional)
- `include_completed` (bool, padrão `true`)

Resposta típica:
```json
{
  "success": true,
  "range": "this_week",
  "start_date": "2025-09-22T00:00:00-03:00",
  "end_date": "2025-09-28T23:59:59-03:00",
  "summary": {
    "total": 5,
    "overdue": 1,
    "due_today": 2,
    "upcoming": 2
  },
  "grouped_data": {
    "Projeto Agro": 2,
    "Projeto IA": 3
  },
  "recommendations": [
    "Priorizar tarefas em atraso (1 item high severity)",
    "Confirmar entrega do Projeto Agro até quarta"
  ],
  "tasks": [
    {
      "title": "Enviar relatório semanal",
      "due": "2025-09-27T15:00:00-03:00",
      "priority": "media",
      "status": "em_andamento"
    }
  ]
}
```

#### GET `/tasks/overdue`
Lista apenas itens atrasados e classifica a severidade.

Parâmetros de query:
- `severity` (`all`, `high`, `critical`; padrão `all`)
- `directories` (lista separada por vírgula; opcional)

Resposta típica:
```json
{
  "success": true,
  "severity": "high",
  "overdue_count": 2,
  "severity_breakdown": {
    "high": 2,
    "critical": 0
  },
  "items": [
    {
      "title": "Atualizar contrato",
      "file_path": "5 - INSIGHTS-IA/Clientes/XPTO.md",
      "due_date": "2025-09-20T18:00:00-03:00",
      "days_overdue": 8,
      "severity": "high",
      "priority": "alta"
    }
  ]
}
```

#### POST `/tasks/update`
Permite atualizar metadados de tasks em lote (status, due date, prioridade). Requer payload JSON com `updates`.

Exemplo de requisição:
```json
{
  "updates": [
    {
      "file_path": "5 - INSIGHTS-IA/Projetos/Agro.md",
      "line_number": 42,
      "status": "concluída",
      "completed_at": "2025-09-28T18:30:00-03:00"
    }
  ]
}
```

Resposta:
```json
{
  "success": true,
  "processed": 1,
  "details": [
    {"file_path": "5 - INSIGHTS-IA/Projetos/Agro.md", "status": "updated"}
  ]
}
```

#### GET `/context/time`
Entrega um pacote consolidado com últimos eventos, prazos próximos e foco sugerido, útil para agentes contextuais.

Parâmetros de query:
- `reference_date` (`YYYY-MM-DD` ou `today`; padrão `today`)
- `recent_days` (inteiro, padrão `3`)
- `upcoming_window` (`week`, `month`, `3d`; padrão `week`)

Resposta típica:
```json
{
  "success": true,
  "context": {
    "reference_date": "2025-09-28",
    "recent_activity": ["Revisão de playbook concluída"],
    "upcoming_due": [
      {"title": "Sprint demo", "due": "2025-09-30", "priority": "alta"}
    ],
    "suggested_focus": ["Confirmar requisitos do cliente XPTO"]
  }
}
```

### 3.10 Memória de conversas (cross-LLM)

#### POST `/memory/conversation/save`
Persiste uma conversa completa (Claude, ChatGPT, WhatsApp, etc.) com embeddings automáticos e salvamento opcional/automático no vault.

Payload:
```json
{
  "source": "claude",
  "conversation_id": "session-2025-10-05",
  "messages": [
    {"role": "user", "content": "Resuma o plano de marketing"},
    {"role": "assistant", "content": "Resumo gerado...", "timestamp": "2025-10-05T13:21:00Z"}
  ],
  "metadata": {
    "project": "Marketing 2026",
    "tags": ["marketing"],
    "url": "https://claude.ai/chat/..."
  },
  "chunking_strategy": "auto",
  "auto_tag": true,
  "save_to_vault": null
}
```

Resposta:
```json
{
  "success": true,
  "conversation_id": "session-2025-10-05",
  "database_id": "f19da855-3df2-4bb3-9935-7c2de...",
  "chunks_created": 2,
  "embedding_ids": ["6a53b682-...", "d51a9d77-..."],
  "note_path": "5 - INSIGHTS-IA/Conversas/2025-10-05 - claude - session-2025-10.md",
  "auto_tags": ["ia"],
  "message": "Conversa salva com 2 chunks"
}
```

#### POST `/memory/conversation/search`
Executa busca semântica nas conversas armazenadas. Aceita filtros por fonte (`sources`), projeto, tags, intervalo de datas e limiar mínimo de score. Use `return_full_context=true` para recuperar a conversa inteira.

Exemplo:
```json
{
  "query": "plano de marketing 2026",
  "limit": 5,
  "return_full_context": false,
  "filters": {
    "sources": ["claude", "chatgpt"],
    "tags": ["marketing"],
    "min_score": 0.2
  }
}
```

Resposta:
```json
{
  "query": "plano de marketing 2026",
  "limit": 5,
  "results": [
    {
      "id": "6a53b682-...",
      "conversation_id": "session-2025-10-05",
      "source": "claude",
      "project": "Marketing 2026",
      "tags": ["marketing", "ia"],
      "note_path": "5 - INSIGHTS-IA/Conversas/2025-10-05 - claude - session-2025-10.md",
      "role": "assistant",
      "content": "Resumo gerado...",
      "timestamp": "2025-10-05T13:21:00",
      "score": 0.68,
      "distance": 0.47
    }
  ],
  "metadata": {
    "result_count": 1,
    "limit": 5
  }
}
```

> **Nota:** habilite com `CONVERSATION_MEMORY_ENABLED=true`, configure `MEMORY_DB_DSN`
> e garanta que a coluna `conversation_messages.embedding` tenha a mesma dimensão e tipo do modelo
> ativo (`HALFVEC(2048)` quando usando Voyage com half precision). Versões atuais do pgvector não
> permitem índices aproximados (ivfflat/hnsw) acima de 2000 dimensões; nestes casos, mantenha sem índice
> ou reduza a dimensionalidade. O Markdown é salvo em `CONVERSATION_NOTE_DIR` (default `5 - INSIGHTS-IA/Conversas`) e,
> quando `save_to_vault` não é informado, o sistema decide automaticamente com base em projeto, tags, volume e
> origem da conversa (WhatsApp/custom, URL, etc.).

---
## 4. Códigos de status

- `200` – Sucesso.
- `201` – Recurso criado (quando aplicável).
- `400` – Parâmetros inválidos / violação de segurança de caminho.
- `401` – Token ausente ou inválido.
- `403` – Acesso negado (e.g. tentativa de escrita em diretório protegido).
- `404` – Arquivo não encontrado.
- `500` – Erro interno (ver logs em `server/logs/`).

---

## 5. Exemplos práticos

### 5.1 Checar saúde da API
```bash
curl -H "Authorization: Bearer $TOKEN" "$API/health"
```
Resposta:
```json
{
  "status": "healthy",
  "version": "1.1.0"
}
```

### 5.2 Listar a raiz do vault
```bash
curl -H "Authorization: Bearer $TOKEN" "$API/files/"
```
Resposta:
```json
[
  {
    "name": "5 - INSIGHTS-IA",
    "path": "5 - INSIGHTS-IA",
    "size": 0,
    "modified": "2025-09-26T18:05:00",
    "is_directory": true
  },
  {
    "name": "README.md",
    "path": "README.md",
    "size": 2140,
    "modified": "2025-09-24T12:11:03",
    "is_directory": false
  }
]
```

### 5.3 Ler uma nota específica
```bash
curl -H "Authorization: Bearer $TOKEN" \
     "$API/files/5%20-%20INSIGHTS-IA/README.md"
```
Resposta:
```json
{
  "path": "5 - INSIGHTS-IA/README.md",
  "content": "# Visão Geral\n...",
  "frontmatter": null,
  "tags": []
}
```

### 5.4 Buscar por palavra-chave
```bash
curl -X POST "$API/search/" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
           "query": "\bProjeto\b",
           "directories": ["5 - INSIGHTS-IA"],
           "file_extensions": [".md"]
         }'
```
Resposta:
```json
{
  "success": true,
  "results": [
    {
      "path": "5 - INSIGHTS-IA/Projetos/Agro.md",
      "score": 0.78,
      "matches": ["Projeto AgroCultivia"],
      "excerpt": "## Projeto AgroCultivia\n- Objetivo: ..."
    }
  ],
  "total": 1
}
```

### 5.5 Gravar uma nova nota
```bash
curl -X POST "$API/files/" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
           "path": "5 - INSIGHTS-IA/Projetos/Nova.md",
           "content": "Anotações do dia",
           "create_parents": true
         }'
```
Resposta:
```json
{
  "success": true,
  "message": "File written successfully",
  "path": "5 - INSIGHTS-IA/Projetos/Nova.md"
}
```

### 5.6 Disparar sincronização Git
```bash
curl -X POST "$API/sync/" -H "Authorization: Bearer $TOKEN"
```
Resposta:
```json
{
  "success": true,
  "message": "Sync triggered",
  "details": {
    "pull_status": "pending",
    "push_status": "pending"
  }
}
```

---


## 6. Rate limits, segurança e quotas

1. **Rate limits recomendados**: não há throttling automático, mas mantenha até **60 requisições/minuto** por token. Endpoints de leitura pesada (`/search/*`, `/tasks/due`, `/tasks/summary`) consomem mais CPU/disk — distribua em lotes menores (ex.: 20 req/min por agente) e implemente backoff exponencial ao receber erros 5xx.
2. **Operações de escrita**: limite a **10 requisições/minuto** para `/files/*` (POST/DELETE/PATCH) e `/tasks/update` para evitar lock de arquivos e conflitos de sincronização.
3. **Diretórios protegidos**: caminhos fora de `5 - INSIGHTS-IA` são somente leitura (configurados em `settings.READ_ONLY_DIRS`). Escrever em áreas bloqueadas retorna `403`.
4. **Quota de armazenamento**: arquivos criados via API são gravados diretamente no disco; monitore o espaço e o log `server/logs/auto_sync.log`. Operações simultâneas sobre o mesmo arquivo não são serializadas — coordene os agentes ou utilize `sync/status` para verificar fila.
5. **Uploads grandes**: o payload JSON deve caber na requisição; para arquivos acima de ~1 MB prefira enviar incrementalmente (não há streaming implementado). Use `convert_to_markdown` para converter anexos em vez de subir binários grandes.

---


## 7. Troubleshooting

| Sintoma | Causa provável | Como resolver |
| ------- | -------------- | ------------- |
| `401 Unauthorized` | Header `Authorization` ausente ou token expirado | Reenvie `Bearer <API_TOKEN>` ou gere novo token com `/auth/token` |
| `403 Forbidden` | Tentativa de escrita fora de `5 - INSIGHTS-IA` | Ajuste o caminho ou atualize `READ_ONLY_DIRS` no servidor |
| `404 Not Found` | Caminho não existe ou foi movido | Verifique URL codificada (`%20` para espaços) e confirme no vault |
| `409 Conflict` | Atualização concorrente em `/files/*` ou `/tasks/update` | Leia o arquivo atual, reaplique mudanças e envie novamente |
| `422 Unprocessable Entity` | JSON inválido ou campo obrigatório faltando | Valide a carga antes do envio; confira esquemas nas seções 3.x e 3.9 |
| `429 Too Many Requests` | Rate limit recomendado excedido por agentes paralelos | Reduza frequência, implemente fila interna ou use backoff exponencial |
| `500 Internal Server Error` | Exceção no serviço (arquivo corrompido, permissão) | Consulte `server/logs/api.log` ou stdout do serviço para detalhes |
| `503 Service Unavailable` | Sincronização Git bloqueando operações de escrita temporariamente | Verifique `/sync/status` e tente novamente após a conclusão |

## 8. Logs e suporte

- Logs de API: `server/logs/`
- Sincronização Git: consulte `server/logs/auto_sync.log` (se configurado)
- Diagnóstico MCP: use `tools/mcp_inspector_test.py` ou `obsidian-mcp-client`

Em caso de dúvidas ou bugs, abra uma issue no repositório oficial informando o endpoint, payload e stack trace relevante.
