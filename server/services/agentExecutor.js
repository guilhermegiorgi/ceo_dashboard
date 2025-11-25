import vaultService from "./vaultService.js";
import { queryCognito } from "./cognitoService.js";
import { executeTool } from "./toolService.js";

const DEFAULT_MAX_ITERATIONS = 5; // Previne loops infinitos

/**
 * Ponto de entrada para executar um agente.
 * @param {Object} agent - O objeto do agente a ser executado.
 * @returns {Promise<string>} O log da execução.
 */
export const executeAgent = async (agent) => {
  console.log(
    `Iniciando execução do agente: ${agent.name} (Tipo: ${agent.type})`
  );

  const config =
    typeof agent.config_json === "string"
      ? JSON.parse(agent.config_json)
      : agent.config_json || {};

  const promptTemplate =
    config.prompt ||
    config.prompt_template ||
    "Analise o contexto e gere um insight acionável.";

  // Ferramentas disponíveis - agora incluindo todas as ferramentas MCP!
  const allowedTools = Array.isArray(config.tools)
    ? config.tools
    : [
        "web_search",
        "mcp_get_graph",
        "mcp_get_main_tags",
        "mcp_get_tasks",
        "mcp_semantic_search",
      ];

  const noteQuery = config.note_query || "";
  const noteLimit = parseInt(config.note_limit || 20);

  // Descobrir notas candidatas
  const notes = await vaultService.searchNotesWithContent(noteQuery, noteLimit);
  if (!notes || notes.length === 0) {
    return "Nenhuma nota encontrada para análise.";
  }

  // Seleciona a primeira para foco (poderia iterar/multiplexar)
  const target = notes[0];
  const noteContent = target.content || "";

  if (!noteContent) {
    return `Não foi possível ler o conteúdo da nota alvo: ${target.path}`;
  }

  let conversationHistory = [];
  let finalAnswer = null;
  let iterations = 0;
  const maxIterations = Number.isFinite(config.iterations)
    ? Math.max(1, Math.min(10, config.iterations))
    : DEFAULT_MAX_ITERATIONS;

  // Instrução enriquecida sobre ferramentas MCP
  const toolsList = allowedTools.join(", ");
  const toolsDescription = `
🔧 FERRAMENTAS MCP DO SEGUNDO CÉREBRO:

DESCOBERTA:
- mcp_get_file: Lê nota específica {"filepath":"caminho/arquivo.md"}
- mcp_search_files: Busca textual {"query":"termo de busca"}
- mcp_semantic_search: Busca semântica {"query":"conceito", "limit":5}
- mcp_list_files: Lista arquivos {"directory":"pasta"} ou ""

CONTEXTO & ANÁLISE:
- mcp_get_graph: Grafo de conhecimento (nós e conexões)
- mcp_get_main_tags: Tags mais usadas {"limit":10}
- mcp_get_main_links: Links mais referenciados {"limit":10}
- mcp_get_vault_tree: Estrutura do vault {"depth":2}
- mcp_get_focus: Foco recente (daily + weekly notes)

TAREFAS & PRAZOS:
- mcp_get_tasks: Tarefas {"window":"week"} ou "all"
- mcp_get_tasks_summary: Resumo {"range":"this_week"}

NOTAS PERIÓDICAS:
- mcp_get_periodic_note: Nota periódica {"period":"daily"}
- mcp_get_recent_periodic: Notas recentes {"period":"daily", "limit":5}

MEMÓRIA:
- mcp_search_conversations: Busca conversas {"query":"termo"}
- mcp_get_historical_context: Contexto histórico {"query":"tema"}

ESCRITA:
- mcp_write_file: Cria/sobrescreve {"filepath":"path", "content":"texto"}
- mcp_append_content: Adiciona ao final {"filepath":"path", "content":"texto"}

TRADICIONAIS:
- web_search: Busca Google/SerpAPI (string ou {"query":"termo"})
- http_get: GET HTTP {"url":"https://..."}

📋 FORMATO: Responda APENAS JSON: {"tool":"nome","tool_input":"params"}
   Exemplo: {"tool":"mcp_get_graph","tool_input":"{}"}
`;

  const initialPrompt = `${toolsDescription}

🎯 VOCÊ É UM AGENTE ANALÍTICO DO SEGUNDO CÉREBRO

FERRAMENTAS PERMITIDAS: [${toolsList}]

MISSÃO: ${promptTemplate}

CONTEXTO INICIAL (nota foco):
${noteContent.substring(0, 2000)}${noteContent.length > 2000 ? "..." : ""}

🚀 ESTRATÉGIA RECOMENDADA:
1. Use mcp_get_graph para ver conexões entre notas
2. Use mcp_get_main_tags/links para identificar temas centrais
3. Use mcp_semantic_search para encontrar conteúdo relacionado
4. Use mcp_get_tasks para ver prioridades atuais
5. Use mcp_get_focus para entender foco recente
6. Cruze as informações e identifique:
   - Padrões e tendências
   - Oportunidades não exploradas
   - Riscos ou lacunas
   - Correlações surpreendentes

QUANDO TERMINAR: Retorne texto livre (não JSON) com seu insight final.`;

  conversationHistory.push({ role: "user", content: initialPrompt });

  while (iterations < maxIterations) {
    iterations++;
    console.log(`--- Iteração ${iterations} ---`);

    const responseText = (
      await queryCognito(conversationHistory, {
        useCache: false,
        provider: agent.provider,
        model: agent.model,
        apiKey: agent.api_key,
        temperature: config.temperature,
      })
    ).answer;

    conversationHistory.push({ role: "model", content: responseText });

    try {
      const responseObject = JSON.parse(responseText);
      if (responseObject.tool && responseObject.tool_input) {
        const requestedTool = String(responseObject.tool);
        if (!allowedTools.includes(requestedTool)) {
          conversationHistory.push({
            role: "user",
            content: `Ferramenta '${requestedTool}' não permitida. Ferramentas disponíveis: ${toolsList}. Responda sem usá-la ou escolha uma permitida.`,
          });
          continue;
        }
        console.log(
          `Agente solicitou a ferramenta: ${requestedTool} com input: ${responseObject.tool_input}`
        );
        const toolResult = await executeTool(
          requestedTool,
          responseObject.tool_input,
          agent.userId // Passa o userId do agente
        );

        conversationHistory.push({
          role: "user",
          content: `Resultado da ferramenta "${responseObject.tool}":\n${toolResult}`,
        });
        continue;
      }
    } catch (e) {
      finalAnswer = responseText;
      break;
    }
  }

  if (!finalAnswer) {
    finalAnswer =
      "O agente não conseguiu chegar a uma resposta final após o número máximo de iterações.";
  }

  console.log(`Execução concluída. Resposta final: ${finalAnswer}`);

  return finalAnswer;
};
