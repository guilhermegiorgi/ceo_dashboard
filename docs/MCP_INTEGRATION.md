# Integração MCP - Agentes e Segundo Cérebro

## 🎯 Visão Geral

Este documento descreve como os agentes do Dashboard CEO estão integrados com o **Obsidian Brain Cloud via MCP (Model Context Protocol)**, permitindo acesso completo às 30+ ferramentas para análise profunda do Segundo Cérebro.

## 📊 Arquitetura da Integração

```
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (React)                          │
│  - AgentsPage.tsx                                           │
│  - ChatPage.tsx                                             │
│                                                              │
│  ✅ Usa: apiClient (REST)                                  │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP REST
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Node.js/Express)                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ agentExecutor.js                                        ││
│  │  - Orquestra execução de agentes                       ││
│  │  - Loop de iterações com LLM                           ││
│  │  ✅ Usa: toolService para ferramentas                  ││
│  └─────────────────┬───────────────────────────────────────┘│
│                    │                                         │
│  ┌─────────────────▼───────────────────────────────────────┐│
│  │ toolService.js                                          ││
│  │  - Roteador de ferramentas                             ││
│  │  - 2 tradicionais: web_search, http_get               ││
│  │  - 18+ MCP: mcp_get_graph, mcp_semantic_search, etc   ││
│  │  ✅ Usa: MCPClient para chamadas MCP                   ││
│  └─────────────────┬───────────────────────────────────────┘│
│                    │                                         │
│  ┌─────────────────▼───────────────────────────────────────┐│
│  │ mcpClient.js                                            ││
│  │  - Cliente HTTP para Brain Cloud MCP                   ││
│  │  - Implementa todas as 30+ ferramentas                 ││
│  │  - Base URL: https://obsidian-mcp.ggailabs.com        ││
│  └─────────────────┬───────────────────────────────────────┘│
└────────────────────┼────────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           OBSIDIAN BRAIN CLOUD MCP SERVER                   │
│  - 30+ ferramentas MCP disponíveis                          │
│  - Acesso ao vault Obsidian                                 │
│  - Busca semântica, grafo, tarefas, etc                     │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Ferramentas MCP Disponíveis

### **DESCOBERTA** (5 ferramentas)
| Ferramenta | Descrição | Parâmetros |
|------------|-----------|------------|
| `mcp_list_files` | Lista arquivos em diretório | `{"directory":"pasta"}` |
| `mcp_get_file` | Lê conteúdo de nota específica | `{"filepath":"path/file.md"}` |
| `mcp_search_files` | Busca textual/regex | `{"query":"termo"}` |
| `mcp_semantic_search` | Busca semântica com embeddings | `{"query":"conceito", "limit":5}` |
| `mcp_list_files` | Lista arquivos em diretório | `{"directory":""}` |

### **CONTEXTO & ANÁLISE** (5 ferramentas)
| Ferramenta | Descrição | Parâmetros |
|------------|-----------|------------|
| `mcp_get_graph` | Grafo de conhecimento (nós + conexões) | `{}` ou `{"directory":""}` |
| `mcp_get_main_tags` | Tags mais usadas | `{"limit":10}` |
| `mcp_get_main_links` | Links mais referenciados | `{"limit":10}` |
| `mcp_get_vault_tree` | Estrutura hierárquica | `{"depth":2}` |
| `mcp_get_focus` | Foco recente (daily + weekly) | `{}` |

### **TAREFAS & PRAZOS** (2 ferramentas)
| Ferramenta | Descrição | Parâmetros |
|------------|-----------|------------|
| `mcp_get_tasks` | Tarefas com prazo | `{"window":"week"}` ou `"all"` |
| `mcp_get_tasks_summary` | Resumo de tarefas | `{"range":"this_week"}` |

### **NOTAS PERIÓDICAS** (2 ferramentas)
| Ferramenta | Descrição | Parâmetros |
|------------|-----------|------------|
| `mcp_get_periodic_note` | Nota periódica atual | `{"period":"daily"}` |
| `mcp_get_recent_periodic` | Notas periódicas recentes | `{"period":"daily", "limit":5}` |

### **MEMÓRIA** (2 ferramentas)
| Ferramenta | Descrição | Parâmetros |
|------------|-----------|------------|
| `mcp_search_conversations` | Busca em conversas históricas | `{"query":"termo", "limit":5}` |
| `mcp_get_historical_context` | Contexto histórico relevante | `{"query":"tema"}` |

### **ESCRITA** (2 ferramentas)
| Ferramenta | Descrição | Parâmetros |
|------------|-----------|------------|
| `mcp_write_file` | Cria ou sobrescreve nota | `{"filepath":"path", "content":"texto"}` |
| `mcp_append_content` | Adiciona ao final da nota | `{"filepath":"path", "content":"texto"}` |

## 💡 Como os Agentes Usam MCP

### **1. Configuração do Agente**

Ao criar ou editar um agente, configure as ferramentas MCP permitidas:

```json
{
  "name": "Analisador de Insights",
  "type": "minerador_de_conhecimento",
  "provider": "google",
  "model": "gemini-1.5-flash",
  "config_json": {
    "prompt_template": "Analise o Segundo Cérebro e gere insights estratégicos",
    "tools": [
      "mcp_get_graph",
      "mcp_get_main_tags",
      "mcp_semantic_search",
      "mcp_get_tasks",
      "web_search"
    ],
    "note_query": "",
    "note_limit": 20,
    "temperature": 0.3,
    "iterations": 5
  }
}
```

### **2. Fluxo de Execução**

```
1. Usuário clica "Executar Agente"
   ↓
2. agentService.runAgent(agentId)
   ↓
3. agentExecutor.executeAgent(agent)
   ↓
4. Loop de iterações (max 5):
   ├─ LLM recebe contexto + ferramentas disponíveis
   ├─ LLM decide qual ferramenta usar
   ├─ LLM retorna: {"tool":"mcp_get_graph","tool_input":"{}"}
   ├─ toolService.executeTool() chama MCPClient
   ├─ MCPClient faz requisição HTTPS ao Brain Cloud
   ├─ Resultado é adicionado ao contexto
   └─ Loop continua até LLM retornar insight final
   ↓
5. Insight final é salvo em agent_runs
```

### **3. Exemplo de Conversação**

**Iteração 1 - Agente solicita grafo:**
```json
{"tool":"mcp_get_graph","tool_input":"{}"}
```

**Sistema retorna:**
```json
{
  "nodes": [
    {"id":"projeto-a.md", "title":"Projeto A"},
    {"id":"projeto-b.md", "title":"Projeto B"}
  ],
  "edges": [
    {"source":"projeto-a.md", "target":"projeto-b.md"}
  ]
}
```

**Iteração 2 - Agente solicita tags:**
```json
{"tool":"mcp_get_main_tags","tool_input":"10"}
```

**Sistema retorna:**
```json
[
  {"tag":"#ia", "count":45},
  {"tag":"#agro", "count":32}
]
```

**Iteração 3 - Agente retorna insight final:**
```
INSIGHT ESTRATÉGICO:

Detectei forte conexão entre projetos de IA (#ia - 45 menções) e
agronegócio (#agro - 32 menções).

OPORTUNIDADE: Integrar tecnologias de IA nos projetos agrícolas
existentes pode gerar sinergia significativa.

PRÓXIMOS PASSOS:
1. Revisar Projeto A e Projeto B (conectados no grafo)
2. Identificar pontos de integração
3. Criar roadmap técnico conjunto
```

## 🚀 Como Configurar Novos Agentes

### **Agente de Análise de Tarefas**

```javascript
{
  "name": "Monitor de Prazos",
  "tools": [
    "mcp_get_tasks",
    "mcp_get_tasks_summary",
    "mcp_semantic_search"
  ],
  "prompt_template": "Analise tarefas atrasadas e identifique riscos de prazo"
}
```

### **Agente de Descoberta de Padrões**

```javascript
{
  "name": "Descobridor de Padrões",
  "tools": [
    "mcp_get_graph",
    "mcp_get_main_tags",
    "mcp_get_main_links",
    "mcp_semantic_search"
  ],
  "prompt_template": "Identifique padrões emergentes e correlações inesperadas"
}
```

### **Agente de Revisão Semanal**

```javascript
{
  "name": "Revisor Semanal",
  "tools": [
    "mcp_get_focus",
    "mcp_get_recent_periodic",
    "mcp_get_tasks",
    "mcp_semantic_search"
  ],
  "prompt_template": "Revise foco semanal e gere relatório de progresso"
}
```

## 🔐 Autenticação e Segurança

### **Variáveis de Ambiente**

```bash
# .env
VITE_BRAINCLOUD_BASE_URL=https://obsidian-mcp.ggailabs.com
VITE_BRAINCLOUD_API_TOKEN=ggai_90e2c6b20c8315906f843798bbc1598df596978a2ec79457e6d00563c76d03dc
```

### **Headers HTTP**

Todas as requisições ao Brain Cloud incluem:
```
Authorization: Bearer <token>
Content-Type: application/json
```

## 📈 Métricas e Monitoramento

### **Logs de Execução**

Cada execução de agente registra:
- Timestamp início/fim
- Ferramentas utilizadas
- Número de iterações
- Resultado final
- Erros (se houver)

### **Tabela agent_runs**

```sql
SELECT
  agent_id,
  start_time,
  end_time,
  status,
  log
FROM agent_runs
ORDER BY start_time DESC;
```

## 🐛 Troubleshooting

### **Erro: "Ferramenta desconhecida: mcp_xxx"**

**Causa:** Ferramenta não registrada em toolService.js

**Solução:** Adicione a ferramenta em `toolService.js` no switch case

### **Erro: "MCP Request failed: 401"**

**Causa:** Token inválido ou expirado

**Solução:** Verifique `VITE_BRAINCLOUD_API_TOKEN` no .env

### **Erro: "Nenhuma nota encontrada para análise"**

**Causa:** Vault vazio ou query muito restritiva

**Solução:** Ajuste `note_query` na configuração do agente

### **Agente não usa ferramentas MCP**

**Causa:** LLM não está formatando resposta corretamente

**Solução:**
1. Verifique `temperature` (0.2-0.4 funciona melhor)
2. Aumente `iterations` para dar mais chances
3. Revise `prompt_template` para ser mais específico

## 📚 Recursos Adicionais

- [Documentação MCP Tools](./mcp_reference.md)
- [API Reference](./api_reference.md)
- [Obsidian Brain Cloud](https://obsidian-mcp.ggailabs.com)

## ✅ Checklist de Integração

- [x] Cliente MCP criado (`mcpClient.js`)
- [x] 18+ ferramentas MCP implementadas (`toolService.js`)
- [x] Executor de agentes atualizado (`agentExecutor.js`)
- [x] Agente padrão configurado com MCP (`agentService.js`)
- [x] Prompt enriquecido com instruções MCP
- [x] Documentação completa
- [ ] Testes end-to-end
- [ ] Deploy em produção

---

**Última atualização:** 2025-10-13
**Versão:** 1.0.0
**Status:** ✅ Integração Completa
