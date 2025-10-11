# Agentes de Inteligência – Configuração

Os agentes são registros no banco (`agents`) com um campo `config_json` que define seu comportamento. Estrutura sugerida:

```
{
  "prompt_template": "Analise o contexto e gere 1 insight estratégico acionável (oportunidade, risco ou recomendação). Use evidências do conteúdo.",
  "tools": ["web_search", "http_get"],
  "note_query": "",           // regex para nome de notas ou vazio para todas
  "note_limit": 20,            // quantas notas carregar com conteúdo
  "temperature": 0.3,          // repassado ao provedor de IA
  "iterations": 3              // máximo de iterações ferramenta→resposta
}
```

- `tools` atuais:
  - `web_search`: requer `TAVILY_API_KEY` (recomendado) ou `SERPAPI_KEY`.
  - `http_get`: faz GET simples em uma URL pública e retorna o corpo (JSON ou texto).
- As notas são carregadas via Obsidian Brain Cloud (ver INTEGRACAO_OBSIDIAN_BRAIN_CLOUD.md).
- O executor (`server/services/agentExecutor.js`) constrói um prompt padronizado com instruções para chamar ferramentas no formato JSON e injeta o contexto da nota alvo.

## Execução

- A rota `POST /api/agents/:id/run` executa o agente, registrando a execução em `agent_runs`.
- Logs e status são atualizados automaticamente.

## Roadmap

- Suporte a múltiplas notas por execução com sumarização incremental.
- Ferramentas para APIs específicas (ex.: notícias, mercado, finanças) e MCP de terceiros.
- Políticas de custo/limite por agente (tokens, chamadas externas).

