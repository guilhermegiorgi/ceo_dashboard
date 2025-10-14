# Referência MCP – Obsidian Brain Cloud

Este documento descreve, em português, todas as ferramentas, recursos e prompts
expostos pelo servidor **FastMCP** da Obsidian Brain Cloud. Use-o como guia para
configurar clientes MCP (Claude, Cursor, Windsurf etc.) e para desenvolver
agentes que interajam com seu vault com segurança.

**Última atualização:** 28/09/2025 • **Versão FastMCP:** 1.1.0 • **Protocolo MCP:** 2024-11-05

---
## 1. Visão Geral

- **Protocolo**: [Model Context Protocol](https://modelcontextprotocol.io)
- **Transportes suportados**:
  - WebSocket (`ws://HOST:PORT/mcp`)
  - HTTP Streamable (`http://HOST:PORT/api/v1/mcp/http`) – compatível com Postman e clientes MCP 2024-11-05
  - Stdio via `obsidian-mcp-client`
- **Autenticação**:
  - Bearer token fixo (`Authorization: Bearer <API_TOKEN>`) ou query string `?access_token=<API_TOKEN>`
  - Opcional: fluxo OAuth `client_credentials` com endpoints `/.well-known/oauth-authorization-server` e `/oauth/token`
- **Diretórios com permissão de escrita**: somente `5 - INSIGHTS-IA/`
- **Pastas apenas leitura**: todo o restante (proteção configurada em
  `settings.READ_ONLY_DIRS`)

---
## 2. Ferramentas (`tools`)

Cada ferramenta MCP aceita um objeto JSON como argumento e retorna uma resposta
estruturada. Abaixo estão as ferramentas disponibilizadas atualmente.

| Nome | Finalidade resumida |
| ---- | ------------------- |
| `list_files_in_vault` | Lista arquivos/pastas em um diretório do vault |
| `get_file_contents` | Lê conteúdo + metadados de um arquivo |
| `batch_get_contents` | Recupera vários arquivos de uma vez |
| `search_files` | Busca textual simples (regex `re.findall`) |
| `complex_search` | Busca avançada com JsonLogic sobre metadados |
| `write_file` | Cria/substitui arquivo (somente área liberada) |
| `append_content` | Acrescenta texto ao final de um arquivo |
| `patch_content` | Insere conteúdo após headings/blocos |
| `delete_file` | Remove arquivo ou diretório permitido |
| `move_file` | Move ou renomeia arquivos/pastas permitidos |
| `get_periodic_note` | Retorna (ou cria) nota periódica atual |
| `get_recent_periodic_notes` | Lista últimas notas periódicas |
| `get_recent_changes` | Arquivos modificados recentemente |
| `sync_vault` | Executa sincronização Git (pull/push) imediata e retorna o status |
| `rebuild_embeddings` | Reconstrói o índice semântico do vault (opcionalmente filtrado por diretório) |
| `semantic_search` | Busca semântica com embeddings, retornando trechos relevantes |
| `get_vault_tree` | Estrutura hierárquica (diretórios/arquivos) do vault |
| `get_graph_data` | Nós/arestas de wikilinks para visualizações |
| `get_main_tags` | Ranking de tags mais frequentes |
| `get_main_links` | Notas/wikilinks mais referenciados |
| `get_current_focus` | Resumo das últimas notas diárias + foco semanal |
| `create_note_from_template` | Cria nota a partir de um template Jinja2 na área permitida |
| `list_available_templates` | Lista templates disponíveis com variáveis obrigatórias e opcionais |
| `convert_to_markdown` | Converte documentos suportados (PDF, DOCX etc.) para Markdown |
| `save_conversation_history` | Persiste histórico de conversas (LLMs, WhatsApp, etc.) em memória semântica |
| `search_conversation_history` | Busca semântica nas conversas arquivadas com filtros contextuais |


### Exemplos práticos

- **Listar últimos arquivos em uma pasta**
  ```bash
  obsidian-mcp-client call list_files_in_vault '{"directory": "5 - INSIGHTS-IA/Daily"}'
  ```
  ```jsonc
  {
    "success": true,
    "files": [
      {"path": "5 - INSIGHTS-IA/Daily/2025-09-26.md", "modified": "2025-09-26T21:18:04"},
      {"path": "5 - INSIGHTS-IA/Daily/2025-09-25.md", "modified": "2025-09-25T22:03:19"}
    ]
  }
  ```

- **Pesquisar semanticamente por um tema**
  ```bash
  obsidian-mcp-client call semantic_search '{"query": "playbook onboarding", "limit": 3}'
  ```
  ```jsonc
  {
    "success": true,
    "results": [
      {"path": "5 - INSIGHTS-IA/Playbooks/Onboarding.md", "score": 0.87, "excerpt": "Passo a passo para onboarding"}
    ]
  }
  ```

- **Criar nota a partir de template**
  ```bash
  obsidian-mcp-client call create_note_from_template '{"template_name": "daily", "variables": {"destaques": "Sprint #42"}}'
  ```
  ```jsonc
  {
    "success": true,
    "path": "5 - INSIGHTS-IA/Daily/2025/09/2025-09-28.md",
    "requires_follow_up": false
  }
  ```

- **Consultar prazos da semana**
  ```bash
  obsidian-mcp-client call get_due_tasks '{"window": "week", "priority": "alta", "limit": 5}'
  ```
  ```jsonc
  {
    "success": true,
    "period": "next_7_days",
    "total": 3,
    "items": [
      {"title": "Revisar proposta Agro", "due": "2025-09-29T10:00:00-03:00", "file_path": "5 - INSIGHTS-IA/Projetos/Agro.md"}
    ]
  }
  ```

### 2.1 `list_files_in_vault`
Lista arquivos e pastas, relative à raiz do vault.

```jsonc
{
  "directory": "5 - INSIGHTS-IA" // opcional, default ""
}
```

Resposta:
```jsonc
{
  "success": true,
  "directory": "5 - INSIGHTS-IA",
  "files": [
    {
      "name": "README.md",
      "path": "5 - INSIGHTS-IA/README.md",
      "size": 1024,
      "modified": "2025-09-17T12:00:00",
      "is_directory": false
    }
  ]
}
```

### 2.2 `get_file_contents`
Retorna conteúdo de um arquivo (markdown, tags, frontmatter etc.).

```jsonc
{
  "filepath": "5 - INSIGHTS-IA/README.md"
}
```

### 2.3 `batch_get_contents`
Busca múltiplos arquivos em uma só chamada.

```jsonc
{
  "filepaths": ["5 - INSIGHTS-IA/README.md", "3 - RECURSOS/nota.md"],
  "ignore_missing": true // opcional
}
```

Resposta contém `files` (lista com sucesso/erro individual) e `missing` (quando
`ignore_missing=true`).

### 2.4 `search_files`
Busca textual simples (usa regex `re.findall`).

```jsonc
{
  "query": "#\s*Título",
  "case_sensitive": false,
  "file_extensions": [".md", ".txt"],
  "directories": ["5 - INSIGHTS-IA"]
}
```

### 2.5 `complex_search`
Busca avançada usando [JsonLogic](https://jsonlogic.com/). O contexto avaliado
para cada arquivo inclui:

```json
{
  "path": "5 - INSIGHTS-IA/README.md",
  "name": "README.md",
  "size": 1024,
  "modified": "2025-09-17T12:00:00",
  "tags": ["#projeto"],
  "frontmatter": {"status": "ativo"},
  "content": "...texto completo..."
}
```

Exemplo para retornar notas com tag `#prioridade` modificadas este ano:

```jsonc
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

Operadores extras suportados dentro de `rules`:
- `glob`: verifica padrões estilo `fnmatch` em listas
- `regexp`: aplica expressão regular (Python) sobre strings

### 2.6 `write_file`
Cria ou substitui arquivo (apenas diretórios permitidos).

```jsonc
{
  "filepath": "5 - INSIGHTS-IA/Projetos/Novo.md",
  "content": "Conteúdo completo",
  "create_parents": true
}
```

### 2.7 `append_content`
Acrescenta texto ao final de um arquivo (ou cria se permitido).

```jsonc
{
  "filepath": "5 - INSIGHTS-IA/README.md",
  "content": "\n## Nova seção",
  "create_parents": false,
  "separator": "\n" // inserido antes do conteúdo
}
```

### 2.8 `patch_content`
Insere conteúdo relativo a um *heading* ou posição específica. Opções de
`position`:
- `after_heading` (padrão)
- `before_heading`
- `replace_heading_section` (substitui a seção inteira até o próximo heading do
  mesmo nível)
- `append` (fallback se heading não encontrado)
- `prepend`

```jsonc
{
  "filepath": "5 - INSIGHTS-IA/Projeto.md",
  "content": "Nova informação importante",
  "heading": "Resultados",
  "position": "after_heading",
  "create_file": true,
  "create_parents": true,
  "separator": "\n\n"
}
```

### 2.9 `delete_file`
Remove arquivo ou diretório permitido.

```jsonc
{
  "filepath": "5 - INSIGHTS-IA/Antigo.md"
}
```

### 2.10 `move_file`
Move ou renomeia arquivos/diretórios dentro da pasta liberada.

```jsonc
{
  "source_path": "5 - INSIGHTS-IA/nota.md",
  "destination_path": "5 - INSIGHTS-IA/Projetos/nota.md",
  "create_parents": true,
  "overwrite": false
}
```

### 2.11 `get_periodic_note`
Retorna (ou gera) a nota periódica do período atual (`daily`, `weekly`,
`monthly`, `quarterly`, `yearly`).

```jsonc
{
  "period": "daily"
}
```

### 2.12 `get_recent_periodic_notes`
Lista notas periódicas mais recentes (até 50).

```jsonc
{
  "period": "weekly",
  "limit": 10
}
```

### 2.13 `get_recent_changes`
Arquivos modificados recentemente.

```jsonc
{
  "limit": 20,
  "days": 30
}
```

### 2.14 `sync_vault`
Executa sincronização Git (pull/push) imediata.

```jsonc
{}
```

Resposta típica:

```jsonc
{
  "success": true,
  "message": "Sync completed",
  "details": {
    "pull_status": "success",
    "push_status": "success",
    "local_changes_detected": false,
    "timestamp": "2025-09-24T04:15:19.796348"
  }
}
```

Se houver conflitos ou commits pendentes, os campos `push_status`/`message`
indicam o problema para inspeção manual.

### 2.15 `rebuild_embeddings`
Reconstrói o índice semântico do vault (usa embeddings do OpenAI). Sem
parâmetros reindexa todo o cofre; informe `directory` para um subdiretório
específico (ex.: `Inbox`).

Retorno típico:

```jsonc
{
  "success": true,
  "indexed": 42,
  "total_files": 21
}
```

Depende das variáveis `OPENAI_API_KEY` e `EMBEDDING_MODEL`.

### 2.16 `semantic_search`
Executa busca semântica usando embeddings. Retorna trechos relevantes com
`path`, `chunk_id`, `score` e conteúdo.

```jsonc
{
  "query": "fluxo atendimento",
  "limit": 5
}
```

### 2.17 `get_vault_tree`
Entrega uma visão hierárquica do vault (diretórios + arquivos). Parâmetros
opcionais:

```jsonc
{
  "directory": "5 - INSIGHTS-IA",   // padrão ""
  "depth": 3,                        // padrão 2 (0 = só raiz)
  "include_files": true,             // padrão true
  "include_dirs": true,              // padrão true
  "max_entries": 50                  // padrão null (sem limite, resource usa 100)
}
```

### 2.18 `get_graph_data`
Retorna nós e arestas para visualização de grafos (wikilinks). Parâmetros
opcionais:

```jsonc
{
  "directory": "5 - INSIGHTS-IA", // restringe escopo
  "include_orphans": true,
  "include_unresolved": true,
  "max_nodes": 500,
  "max_edges": 1200,
  "resolve_titles": false
}
```

Resposta:

```jsonc
{
  "success": true,
  "graph": {
    "nodes": [
      {
        "id": "5 - INSIGHTS-IA/Nota.md",
        "title": "Nota",
        "degree": 3,
        "tags": ["#agro"],
        "exists": true
      }
    ],
    "edges": [
      {
        "source": "5 - INSIGHTS-IA/Nota.md",
        "target": "5 - INSIGHTS-IA/Projeto.md",
        "exists": true,
        "weight": 1
      }
    ],
    "metadata": {
      "node_count": 120,
      "edge_count": 340,
      "truncated_nodes": false,
      "truncated_edges": false
    }
}
}
```

> **Nota:** para evitar estouro do limite de 1 MB do WebSocket, o servidor aplica
> por padrão `400` nós e `1200` arestas quando `max_nodes`/`max_edges` não são
> informados. Esses limites máximos podem ser ajustados via variáveis de ambiente
> `MCP_GRAPH_MAX_NODES` e `MCP_GRAPH_MAX_EDGES`.

### 2.19 `get_main_tags`
Retorna o ranking de tags mais usadas no vault. Parâmetro opcional `limit`
(default `MCP_TAGS_LIMIT`).

```jsonc
{
  "limit": 50
}
```

Resposta:

```jsonc
{
  "success": true,
  "data": {
    "tags": [
      {"tag": "agro", "count": 42},
      {"tag": "ia", "count": 38}
    ],
    "total_unique": 230,
    "limit": 50
  }
}
```

### 2.20 `get_main_links`
Lista as notas/wikilinks mais referenciados. Aceita `limit` (default
`MCP_LINKS_LIMIT`).

### 2.21 `get_current_focus`
Retorna uma visão do foco recente, combinando as últimas notas diárias e, se
disponível, a nota de foco semanal.

```jsonc
{
  "daily_limit": 3,
  "include_weekly": true,
  "weekly_path": "0 - DASHBOARD/FOCO DA SEMANA.md",
  "daily_directory": "5 - INSIGHTS-IA/Daily"
}
```

Resposta inclui `daily_notes` (lista com `title`, `excerpt`, `tags`, `modified`)
e `weekly_focus` (quando encontrado), além de metadados com timestamp e limites
utilizados.

```jsonc
{
  "limit": 30
}
```

Resposta:

```jsonc
{
  "success": true,
  "data": {
    "links": [
      {
        "link": "PROJETO - AGROCULTIVIA",
        "count": 18,
        "resolved_path": "3 - RECURSOS/Projetos/PROJETO - AGROCULTIVIA.md",
        "exists": true
      }
    ],
    "total_unique": 410,
    "limit": 30
  }
}
```

Resposta segue o formato:

```jsonc
{
  "success": true,
  "tree": {
    "root": {
      "name": "5 - INSIGHTS-IA",
      "path": "5 - INSIGHTS-IA",
      "type": "directory",
      "is_directory": true,
      "size": 0,
      "modified": "2025-09-27T00:00:00",
      "children": [
        {
          "name": "Inbox",
          "path": "5 - INSIGHTS-IA/Inbox",
          "type": "directory",
          "is_directory": true,
          "size": 0,
          "modified": "2025-09-26T18:00:00",
          "children": [
            {
              "name": "nota.md",
              "path": "5 - INSIGHTS-IA/Inbox/nota.md",
              "type": "file",
              "is_directory": false,
              "size": 2048,
              "modified": "2025-09-26T18:05:00"
            }
          ]
        }
      ]
    },
    "directory": "5 - INSIGHTS-IA",
    "depth": 3,
    "include_files": true,
    "include_dirs": true,
    "max_entries": 50
  }
}
```

### 2.22 `create_note_from_template`
Renderiza um template Jinja2 armazenado no diretório configurado (`MCP_TEMPLATES_DIR`) e grava a nota resultante dentro da área liberada (`5 - INSIGHTS-IA/`).

```json
{
  "template_name": "daily",
  "variables": {
    "destaques": "..."
  },
  "target_path": "5 - INSIGHTS-IA/Daily/2025/10/2025-10-01.md",
  "create_directories": true
}
```

**Dicas:**
- `variables` deve ser um objeto JSON; cada template possui variáveis obrigatórias/ opcionais próprias (use `list_available_templates` para checar).
- `target_path` é opcional, mas precisa permanecer dentro de `5 - INSIGHTS-IA/`; se omitido, o caminho padrão definido no template é utilizado.
- O retorno inclui o campo `requires_follow_up`, útil para templates que exigem revisão humana (ex.: drafts de projeto).

**Resposta típica:**
```json
{
  "success": true,
  "template": "daily",
  "path": "5 - INSIGHTS-IA/Daily/2025/10/2025-10-01.md",
  "requires_follow_up": false,
  "variables": {
    "date": "2025-10-01",
    "destaques": "..."
  }
}
```

### 2.23 `list_available_templates`
Lista todos os templates registrados com metadados úteis para preencher `variables`.

```json
{
  "name": "list_available_templates"
}
```

Resposta:
```json
{
  "success": true,
  "count": 9,
  "templates": [
    {
      "name": "daily",
      "template_file": "TEMPLATE - Daily Note.md",
      "target_directory": "5 - INSIGHTS-IA/Daily/{year}/{month:02d}",
      "required": [],
      "optional": ["destaques", "ideias", "tarefas_concluidas"],
      "description": "Nota diária com destaques e insights"
    }
  ]
}
```

Observação: o diretório de templates é controlado pela variável `MCP_TEMPLATES_DIR`.

### 2.24 `convert_to_markdown`
Converte um arquivo existente no vault (PDF, DOCX, PPTX, imagens etc.) para Markdown usando o MarkItDown.

```json
{
  "name": "convert_to_markdown",
  "arguments": {
    "source_path": "5 - INSIGHTS-IA/Uploads/contrato.pdf",
    "target_path": "5 - INSIGHTS-IA/Converted/contrato.md",
    "extract_images": true,
    "ocr_enabled": false
  }
}
```

Retorno típico:

```json
{
  "success": true,
  "markdown_path": "5 - INSIGHTS-IA/Converted/contrato.md",
  "original_path": "5 - INSIGHTS-IA/Uploads/contrato.pdf",
  "metadata": {
    "title": "Contrato 2025",
    "extract_images": true,
    "ocr_enabled": false
  }
}
```

O caminho de saída padrão, quando não informado, é `5 - INSIGHTS-IA/Converted/<arquivo>.md`.

---
## 3. Recursos (`resources`)

| URI | Descrição |
| --- | --------- |
| `obsidian://vault/info` | Informações básicas do vault (caminho, total de arquivos) |
| `obsidian://vault/status` | Status do vault + Git (branch, últimas alterações, auto-sync) |
| `obsidian://vault/templates` | Lista de templates em `5 - INSIGHTS-IA/Sistema/Templates` (ou diretório definido em `MCP_TEMPLATES_DIR`) |
| `obsidian://vault/tree` | Snapshot da árvore de diretórios/arquivos (depth=2, máx 100 entradas/nível) |
| `obsidian://vault/graph` | Snapshot com nós/arestas (limite padrão 400 nós / 1200 arestas) |
| `obsidian://vault/tags` | Ranking de tags utilizadas no vault (conteúdo + frontmatter) |
| `obsidian://vault/links` | Principais wikilinks/refs internas mais utilizadas |
| `obsidian://embeddings/stats` | Estatísticas do índice semântico (modelo, chunks, status) |

### 3.1 `obsidian://vault/info`
Leitura retorna um JSON com `vault_path`, `total_files`, `status` e `last_sync`.

### 3.2 `obsidian://vault/status`
Combina o status geral do cofre com o estado do Git (branch atual, último
commit, lista de arquivos não commitados e se o auto-sync está habilitado).

### 3.3 `obsidian://vault/templates`
Lista arquivos `.md` do diretório configurado. Por padrão usa
`5 - INSIGHTS-IA/Sistema/Templates`; defina `MCP_TEMPLATES_DIR` (relativa ao vault) para
apontar para outra pasta.

### 3.4 `obsidian://vault/tree`
Snapshot da árvore do vault com profundidade padrão `depth=2` e até 100
entradas por diretório. Útil para dar visão geral rápida ao agente. Para uma
versão personalizável (params `directory`, `depth`, `include_*`, `max_entries`),
use também a rota REST `GET /api/v1/vault/tree`.

### 3.5 `obsidian://vault/graph`
Snapshot com até 400 nós e 1200 arestas. Ideal para visualizar clusters e
conexões principais sem precisar configurar parâmetros. Para ajustes finos (limites,
subdiretórios, remoção de orfãos), utilize o tool `get_graph_data` ou o endpoint
REST `GET /api/v1/vault/graph`.

### 3.6 `obsidian://vault/tags`
Retorna as tags mais frequentes no vault (conteúdo + frontmatter). O total
máximo retornado pode ser ajustado via `MCP_TAGS_LIMIT` (1–200, padrão 100).
Também exposto pela API REST em `GET /api/v1/vault/tags` (mesmo formato), útil
para ferramentas que não consomem resources via WebSocket.

### 3.7 `obsidian://vault/links`
Retorna as referências wikilink mais utilizadas (`[[Nota]]`, `[[Pasta/Nota#seção]]`).
O limite padrão é `MCP_LINKS_LIMIT` (1–200). Cada entrada indica o texto do link,
quantas vezes ele aparece e se o arquivo de destino existe no cofre. O mesmo
payload pode ser obtido pela rota REST `GET /api/v1/vault/links`.


## 4. Ferramentas de tarefas

Use estes tools quando precisar de visões rápidas sobre prazos e tarefas extraídas automaticamente das notas com checkbox + metadados no vault.

### `get_due_tasks`
- **O que faz**: retorna notas e tarefas com due date dentro da janela informada, ordenadas por data, prioridade ou caminho.
- **Parâmetros principais**: `window` (`today`, `3d`, `week`, `month`, `overdue`, `all`), `priority`, `status`, `directories`, `include_completed`, `sort_by`, `limit`.
- **Resposta**: inclui contadores (`overdue_count`, `due_today_count`, `upcoming_count`), a lista completa em `items` (com `title`, `due`, `file_path`, `days_until_due`, etc.) e um bloco `summary` pronto para dashboards.
- **Exemplo**:
  ```jsonc
  {
    "name": "get_due_tasks",
    "arguments": {"window": "week", "priority": "alta", "limit": 5}
  }
  ```
  ```jsonc
  {
    "success": true,
    "period": "next_7_days",
    "total": 3,
    "overdue_count": 0,
    "items": [
      {
        "title": "Revisar proposta Agro",
        "type": "task",
        "file_path": "5 - INSIGHTS-IA/Projetos/Agro.md",
        "due": "2025-09-29T10:00:00-03:00",
        "priority": "alta",
        "status": "em_andamento",
        "days_until_due": 1
      }
    ]
  }
  ```

### `get_tasks_summary`
- **O que faz**: gera um snapshot executivo por faixa temporal (`today`, `this_week`, `next_week`, `this_month`) com recomendações automáticas.
- **Parâmetros principais**: `range` (obrigatório), `group_by` (`priority`, `project`, `date`, `status`), `include_completed`.
- **Resposta**: retorna `summary` com totais, `grouped_data` para gráficos e a lista filtrada em `tasks`.
- **Exemplo**:
  ```jsonc
  {
    "name": "get_tasks_summary",
    "arguments": {"range": "this_week", "group_by": "project"}
  }
  ```

### `check_overdue`
- **O que faz**: apresenta apenas itens atrasados, permitindo filtrar severidade (`all`, `high`, `critical`).
- **Parâmetros principais**: `severity` e `directories`.
- **Resposta**: traz `items` com `due_date`, `days_overdue`, `severity` e um `severity_breakdown` pronto para alertas.
- **Exemplo**:
  ```jsonc
  {
    "name": "check_overdue",
    "arguments": {"severity": "high"}
  }
  ```

### `get_time_based_context`
- **O que faz**: consolida visão temporal (recentes, prazos, destaques) em um único payload para orquestração de agentes.
- **Parâmetros principais**: `reference_date`, `recent_days`, `upcoming_window`.
- **Resposta**: retorna `context` com blocos `recent_activity`, `upcoming_due` e `suggested_focus`.

### `save_conversation_history`
- **O que faz**: arquiva uma conversa completa (Claude, ChatGPT, WhatsApp, etc.) com chunking e embeddings automáticos.
- **Parâmetros principais**: `source` (`claude`, `chatgpt`, `gemini`, `perplexity`, `deepseek`, `custom`), `conversation_id`, `messages` (lista de `{role, content, timestamp?, metadata?}`), `metadata` (`project`, `tags`, `url`), `chunking_strategy` (`auto`, `full`, `semantic`), `auto_tag`, `save_to_vault` (quando `null`, o sistema decide de forma inteligente).
- **Resposta**: confirma o salvamento e informa `database_id`, `chunks_created`, `note_path` (quando gravado no vault) e `auto_tags` geradas.
- **Uso típico**:
  ```bash
  obsidian-mcp-client call save_conversation_history '{
    "source": "claude",
    "conversation_id": "session-2025-10-05",
    "messages": [
      {"role": "user", "content": "Resuma o plano de marketing"},
      {"role": "assistant", "content": "Aqui está o resumo..."}
    ],
    "metadata": {"project": "Marketing 2026", "tags": ["marketing"], "url": "https://claude.ai/chat/..."},
    "save_to_vault": null
  }'
  ```

### `search_conversation_history`
- **O que faz**: consulta a memória universal de conversas com filtros por fonte, projeto, tags e intervalo de datas.
- **Parâmetros principais**: `query`, `limit`, `filters` (`sources`, `projects`, `tags`, `date_range`, `min_score`), `return_full_context` (quando `true`, devolve a conversa inteira).
- **Resposta**: lista hits com `content`, `role`, `score`, `conversation_id`, `source`, `note_path` e, opcionalmente, `context` completo.

> **Requisitos:** defina `CONVERSATION_MEMORY_ENABLED=true`, configure `MEMORY_DB_DSN`, mantenha o
> diretório configurado em `CONVERSATION_NOTE_DIR` dentro da área de escrita (`5 - INSIGHTS-IA/`) e
> ajuste o schema `conversation_messages.embedding` para a mesma dimensão e tipo do provedor ativo
> (ex.: `HALFVEC(2048)` para Voyage em half precision). pgvector limita índices aproximados a 2000 dimensões;
> para embeddings maiores, deixe sem índice ou considere dimensionalidade reduzida. O salvamento em Markdown
> segue heurísticas automáticas (projeto, tags, fonte externa, url, número de mensagens), mas pode ser forçado
> via `save_to_vault=true/false` na chamada.

### 3.8 `obsidian://embeddings/stats`
Mostra informações sobre o índice de embeddings (modelo, quantidade de chunks,
data da última atualização e caminho do arquivo de índice).

---
## 4. Prompts (`prompts`)

Dois prompts padrão auxiliam a orquestração pelo agente:

- **`analyze_file`**: gera um template para análise de um arquivo específico
  (coloca automaticamente o conteúdo via `get_file_contents`).
- **`search_and_summarize`**: orienta o modelo a buscar, sumarizar e sugerir
  próximos passos para uma consulta.
- **`daily_digest`**: cria um resumo diário aproveitando `get_periodic_note`,
  `get_recent_changes` e a pasta `5 - INSIGHTS-IA/Inbox` para destacar pendências e insights.
- **`triage_inbox`**: ajuda a classificar as notas mais recentes da `5 - INSIGHTS-IA/Inbox`,
  sugerindo destino, tags e próximos passos com base em `list_files_in_vault`
  e `batch_get_contents`.
- **`semantic_answer`**: orienta a consulta semântica + síntese usando
  `semantic_search`, entregando resposta estruturada com evidências.

---
## 5. Configurando Clientes

### 5.1 Arquivo de configuração padrão
`~/.obsidian-mcp/config.json`:

```json
{
  "server_uri": "wss://seu-servidor.com/mcp",
  "api_token": "SEU_TOKEN"
}
```

### 5.2 `obsidian-mcp-client`
1. Execute `python3 client/setup_client.py`
2. Garanta `~/.local/bin` no PATH: `echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc`
3. Teste: `obsidian-mcp-client list-tools`

### 5.3 Integrações
- **Claude Desktop** / **Cursor** / **Windsurf**: informe o comando
  `obsidian-mcp-client` no arquivo de configuração MCP (ver exemplos no README).
- **Postman / Gemini / n8n**: utilize o transporte HTTP (`https://SEU-SERVIDOR/api/v1/mcp/http/`) com header
  `Authorization: Bearer SEU_TOKEN`.

### 5.4 Autenticação OAuth opcional
Para clientes que exigem fluxo OAuth (`client_credentials`, ex.: Claude.ai web):

1. Defina variáveis no servidor:
   ```env
   MCP_OAUTH_CLIENT_ID=seu_client_id
   MCP_OAUTH_CLIENT_SECRET=um_segredo_forte
   MCP_OAUTH_TOKEN_TTL=3600              # segundos (opcional, default 3600)
   MCP_OAUTH_ISSUER=https://obsidian-mcp.ggailabs.com   # opcional
   ```
2. O servidor expõe automaticamente:
   - `GET /.well-known/oauth-authorization-server` (metadata)
 - `POST /oauth/token` (grant_type `client_credentials`)
3. No cliente, configure o endpoint MCP (`https://SEU-SERVIDOR/api/v1/mcp/http/`) e informe o
   mesmo Client ID/Secret. O token obtido é aceito junto com o Bearer token tradicional.

### 5.5 Embeddings (RAG) opcional
Para habilitar busca semântica e os prompts RAG:

```env
OPENAI_API_KEY=sua_chave
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_INDEX_PATH=server/data/embeddings.json   # opcional
EMBEDDING_CHUNK_SIZE=800                            # opcional (caracteres)
EMBEDDING_CHUNK_OVERLAP=200                         # opcional
MCP_TAGS_LIMIT=100                                   # opcional
MCP_LINKS_LIMIT=50                                   # opcional
```

Após definir a chave e o modelo, execute `rebuild_embeddings` para gerar o
índice inicial. Alterações posteriores são atualizadas automaticamente quando
arquivos são escritos, alterados ou removidos.

---
## 6. Boas Práticas

1. Mantenha o token de API em local seguro (use variáveis de ambiente em produção).
2. Utilize `search_files` para buscas simples e `complex_search` para cenários
   ricos (tags, frontmatter, datas).
3. Prefira `patch_content` quando o contexto da nota for importante (e.g.
   inserir logo após um heading).
4. Monitore o diretório `server/logs/` para diagnóstico em caso de erros.
5. Respeite as pastas somente leitura — only `5 - INSIGHTS-IA` recebe escrita.

---
## 7. Solução de Problemas

| Sintoma | Possível causa | Ação sugerida |
| ------- | -------------- | ------------- |
| `Authentication failed` | Token inválido ou ausente | Verificar `API_TOKEN` e reiniciar cliente |
| `Writing to <path> is not allowed` | Diretório bloqueado | Usar `5 - INSIGHTS-IA/` ou ajustar regras |
| `Invalid JSON` | Payload malformado | Conferir JSON antes de enviar |
| Falha de conexão | Servidor parado ou porta incorreta | Verificar serviço `server/main.py` ou Docker |

Para mensagens detalhadas, consulte `server/logs/` e o stdout do cliente
(`obsidian-mcp-client`).

---
## 8. Referências

- [Repositório Oficial](https://github.com/ggailabs/obsidian-brain-cloud)
- [Especificação MCP](https://modelcontextprotocol.io)
- [Biblioteca `json-logic`](https://jsonlogic.com/)

Esta referência é mantida junto ao código. Após atualizar ferramentas, lembre-se
de ajustar este documento e executar `git push` para disponibilizar a versão
mais recente ao time.
