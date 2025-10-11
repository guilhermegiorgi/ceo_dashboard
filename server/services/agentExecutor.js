import vaultService from './vaultService.js';
import { dbRun, ensureDbHelpers } from './database.js';
import { queryCognito } from './cognitoService.js';
import { executeTool } from './toolService.js';

const DEFAULT_MAX_ITERATIONS = 5; // Previne loops infinitos

/**
 * Ponto de entrada para executar um agente.
 * @param {Object} agent - O objeto do agente a ser executado.
 * @returns {Promise<string>} O log da execução.
 */
export const executeAgent = async (agent) => {
  ensureDbHelpers();
  console.log(`Iniciando execução do agente: ${agent.name} (Tipo: ${agent.type})`);

  const config = typeof agent.config_json === 'string'
    ? JSON.parse(agent.config_json)
    : (agent.config_json || {});

  const promptTemplate = config.prompt || config.prompt_template || 'Analise o contexto e gere um insight acionável.';
  const allowedTools = Array.isArray(config.tools) ? config.tools : ['web_search'];
  const noteQuery = config.note_query || '';
  const noteLimit = parseInt(config.note_limit || 20);

  // Descobrir notas candidatas
  const notes = await vaultService.searchNotesWithContent(noteQuery, noteLimit);
  if (!notes || notes.length === 0) {
    return 'Nenhuma nota encontrada para análise.';
  }

  // Seleciona a primeira para foco (poderia iterar/multiplexar)
  const target = notes[0];
  const noteContent = target.content || '';

  if (!noteContent) {
    return `Não foi possível ler o conteúdo da nota alvo: ${targetNote.path}`;
  }

  let conversationHistory = [];
  let finalAnswer = null;
  let iterations = 0;
  const maxIterations = Number.isFinite(config.iterations) ? Math.max(1, Math.min(10, config.iterations)) : DEFAULT_MAX_ITERATIONS;

  // Instrução padronizada sobre uso de ferramentas
  const toolsList = allowedTools.join(', ');
  const initialPrompt = `Você tem acesso a ferramentas externas. Para chamar uma, responda APENAS com um JSON: {"tool":"nome","tool_input":"parâmetros ou string"}. Ferramentas disponíveis: [${toolsList}]. Se não precisar de ferramenta, responda diretamente com o insight.\n\nTarefa: ${promptTemplate}\n\nContexto principal (nota alvo):\n${noteContent}`;
  
  conversationHistory.push({ role: 'user', content: initialPrompt });

  while (iterations < maxIterations) {
    iterations++;
    console.log(`--- Iteração ${iterations} ---`);

    const responseText = (await queryCognito(conversationHistory, {
      useCache: false,
      provider: agent.provider,
      model: agent.model,
      apiKey: agent.api_key,
      temperature: config.temperature,
    })).answer;

    conversationHistory.push({ role: 'model', content: responseText });

    try {
      const responseObject = JSON.parse(responseText);
      if (responseObject.tool && responseObject.tool_input) {
        const requestedTool = String(responseObject.tool);
        if (!allowedTools.includes(requestedTool)) {
          conversationHistory.push({ role: 'user', content: `Ferramenta '${requestedTool}' não permitida. Ferramentas disponíveis: ${toolsList}. Responda sem usá-la ou escolha uma permitida.` });
          continue;
        }
        console.log(`Agente solicitou a ferramenta: ${requestedTool} com input: ${responseObject.tool_input}`);
        const toolResult = await executeTool(requestedTool, responseObject.tool_input);
        
        conversationHistory.push({ role: 'user', content: `Resultado da ferramenta "${responseObject.tool}":\n${toolResult}` });
        continue; 
      }
    } catch (e) {
      finalAnswer = responseText;
      break; 
    }
  }

  if (!finalAnswer) {
    finalAnswer = "O agente não conseguiu chegar a uma resposta final após o número máximo de iterações.";
  }

  console.log(`Execução concluída. Resposta final: ${finalAnswer}`);
  
  return finalAnswer;
};
