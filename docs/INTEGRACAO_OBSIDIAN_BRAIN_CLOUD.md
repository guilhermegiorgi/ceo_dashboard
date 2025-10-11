# Integração com Obsidian Brain Cloud (OBC)

Para que o CEO Dashboard consuma (e opcionalmente alimente) seu Segundo Cérebro via OBC, configure as variáveis de ambiente e use o cliente REST.  
> **Importante:** o dashboard não monta nem escreve diretamente no vault; toda interação (leitura ou escrita) ocorre por meio dos endpoints REST/MCP do Obsidian Brain Cloud.

## Variáveis de Ambiente

O dashboard não depende mais de variáveis obrigatórias no `.env`; os endpoints e tokens do Brain Cloud são definidos (e podem ser trocados) diretamente na tela **Configurações → Obsidian Brain Cloud**.

Ainda assim, você pode prover valores padrão via `.env` na pasta `server/`:

```
BRAINCLOUD_BASE_URL=http://localhost:8000
BRAINCLOUD_API_TOKEN=seu_token_api_ou_jwt
BRAINCLOUD_TENANT_ID=cliente-xyz          # opcional
BRAINCLOUD_TENANT_PLAN=enterprise         # opcional
```

Observações:
- `BRAINCLOUD_API_TOKEN`: a API do OBC aceita o token fixo de API (mais simples) ou JWT emitido por `/api/v1/auth/token`.
- Valores definidos pelo usuário na tela de Configurações têm prioridade sobre o `.env`.

> 💡 **Configuração via UI** – Os campos `baseUrl`, `apiToken`, `tenant`, `MCP WS/HTTP` e as feature flags podem ser testados e salvos via REST (`PUT /api/settings/braincloud`). A interface também expõe botões de “Testar REST” e “Testar MCP”.

### Multi-tenant (beta)

Se estiver usando o OBC em modo multi-tenant, configure os headers opcionais:

```
BRAINCLOUD_TENANT_ID=cliente-xyz
BRAINCLOUD_TENANT_PLAN=enterprise
```

- `BRAINCLOUD_TENANT_ID`: propaga `X-Tenant-Id` e força o OBC a usar `WORKSPACES_DIR/<tenant>`.
- `BRAINCLOUD_TENANT_PLAN`: define o plano para cálculo de quotas (`X-Tenant-Plan`).
- Não há acesso direto ao filesystem do vault; todas as leituras/escritas (quando habilitadas) ocorrem via API do OBC.

## Uso no Backend

O módulo `server/services/brainCloudClient.js` encapsula as rotas REST do OBC (arquivos, busca, contexto temporal, foco recente, tarefas com due date, sync, status, notas periódicas etc.). O `vaultService` foi refatorado para utilizá-lo em vez de acessar o filesystem/git diretamente.

Fluxos principais que passaram a usar o OBC:
- Criar e salvar notas (insights) → `writeFile`/`patchContent`
- Sincronização → `syncNow`
- Busca de notas/conteúdo → `complexSearch` + `batchGet`
- Métricas do vault → `vaultStatus`
- Snapshot executivo do dashboard (`GET /api/dashboard/today`) → consolida foco diário, contexto temporal, tarefas críticas e status dos agentes consumindo apenas as rotas REST/MCP do Brain Cloud.

## Ferramentas externas (web e APIs)

Para permitir buscas na web e consumo de APIs como ferramentas dos agentes:

```
TAVILY_API_KEY=seu_token_tavily    # recomendado
# ou
SERPAPI_KEY=seu_token_serpapi
```

Também há uma ferramenta genérica `http_get` (uso com cautela) para obter JSON/texto de endpoints públicos:

```json
{"tool":"http_get","tool_input":"{\"url\":\"https://api.example.com/data\"}"}
```

## Teste Rápido

1. Suba o Obsidian Brain Cloud (ver repositório do OBC) e obtenha um token de API.
2. Configure o `.env` do dashboard com as variáveis acima.
3. Reinicie o backend do dashboard (`npm run dev:backend`).
4. Use as rotas:
   - `POST /api/obsidian/save-insight` (salva insight como nota via OBC)
   - `GET /api/dashboard/today` (retorna snapshot com foco, contexto temporal, tarefas e agentes para a UI)
   - `GET /api/vault/stats` (status do vault via OBC)
   - `POST /api/vault/sync` (aciona sync via OBC)

Caso a escrita falhe, verifique no OBC se o caminho alvo está dentro do diretório liberado (`READ_WRITE_DIR`).
