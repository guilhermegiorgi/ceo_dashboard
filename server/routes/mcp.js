import { Router } from 'express';

import { query } from '../database/pg-pool.js';
import { getProviderApiKey } from '../services/aiProviderService.js';
import { generateChatCompletion, buildSystemPrompt } from '../services/aiChatClient.js';
import { logger } from '../src/utils/logger.js';

const MCP_PROTOCOL_VERSION = '2024-11-05';

const buildMcpBaseUrl = () => {
  const baseUrl = (process.env.BRAINCLOUD_BASE_URL || 'https://obsidian-mcp.ggailabs.com').replace(/\/+$/, '');
  return `${baseUrl}/api/v1/mcp/http/`;
};

const buildMcpHeaders = (token, sessionId = null) => {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'Mcp-Protocol-Version': MCP_PROTOCOL_VERSION
  };
  if (sessionId) {
    headers['Mcp-Session-Id'] = sessionId;
  }
  return headers;
};

const parseMcpResponse = async (response) => {
  const raw = await response.text();
  if (!raw) {
    return { data: null, raw };
  }

  const sseLines = raw.split('\n').filter(line => line.startsWith('data:'));
  for (let idx = sseLines.length - 1; idx >= 0; idx -= 1) {
    const payload = sseLines[idx].replace(/^data:\s*/, '');
    if (!payload) continue;
    try {
      return { data: JSON.parse(payload), raw };
    } catch (err) {
      // continue searching earlier payloads
    }
  }

  try {
    return { data: JSON.parse(raw), raw };
  } catch (err) {
    return { data: null, raw };
  }
};

const extractSessionId = (response, parsedData) => {
  const headerKeys = ['mcp-session-id', 'Mcp-Session-Id', 'x-mcp-session-id'];
  for (const key of headerKeys) {
    const value = response.headers?.get?.(key);
    if (value) return value.trim();
  }
  return (
    parsedData?.result?.serverInfo?.mcpSessionId ||
    parsedData?.result?.sessionId ||
    parsedData?.result?.mcpSessionId ||
    parsedData?.result?.session?.id ||
    parsedData?.result?.session?.sessionId ||
    parsedData?.session_id ||
    parsedData?.mcpSessionId ||
    parsedData?.result?.mcp_session_id ||
    null
  );
};

const router = Router();

// Helper para obter provider ativo do usuário
async function getActiveProviders(userId) {
  try {
    
    const { rows } = await query(`
      SELECT p.id, p.provider_name, p.display_name, p.base_url, p.is_default as provider_default,
             m.model_id, m.display_name as model_display_name, m.is_default as model_default
      FROM ai_providers p
      LEFT JOIN ai_models m ON p.id = m.provider_id AND m.is_active = true
      WHERE p.user_id = $1 AND p.is_active = true
      ORDER BY p.is_default DESC, m.is_default DESC, p.display_name ASC, m.display_name ASC
    `, [userId]);
    
    const result = rows[0];
    if (result) {
      logger.info(`[getActiveProviders] Selected provider: ${result.provider_name} (default: ${result.provider_default}), model: ${result.model_id}`);
    } else {
      logger.warn(`[getActiveProviders] No active provider found for user ${userId}`);
    }
    
    return result || null;
  } catch (error) {
    logger.error('Error getting active provider:', error);
    return null;
  }
}

// Endpoint legacy - mantido para compatibilidade
router.post('/query-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  res.write(`data: ${JSON.stringify({ error: "Legacy endpoint disabled. Use /api/mcp/chat/stream" })}\n\n`);
  res.end();
});

// Endpoint REAL com LLM + TODAS as ferramentas MCP dinâmicas
router.post('/chat/stream', async (req, res) => {
  const { messages, sessionId, tools = true } = req.body;
  const braincloudToken = process.env.BRAINCLOUD_API_TOKEN;

  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'messages are required' });
  }

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    console.log(`[CognitoAgent] Processando ${messages.length} mensagens com tools=${tools}`);

    // 1. Inicializa sessão MCP dinamicamente
    let mcpSessionId = null;
    let mcpBaseUrl = null;
  let allMcpTools = [];
  const toolNameMap = {};
    
    if (tools) {
      try {
        if (!braincloudToken) {
          logger.error('[CognitoAgent] BRAINCLOUD_API_TOKEN not set in environment');
          throw new Error('BRAINCLOUD_API_TOKEN environment variable is not set');
        }

        mcpBaseUrl = buildMcpBaseUrl();

        logger.info('[CognitoAgent] MCP Base URL:', mcpBaseUrl);
        logger.info('[CognitoAgent] MCP Token available:', !!braincloudToken);
        logger.info('[CognitoAgent] MCP Token length:', braincloudToken?.length || 0);

        const initPayload = {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'initialize',
          params: {
            protocolVersion: MCP_PROTOCOL_VERSION,
            clientInfo: { name: 'Cognito Agent', version: '1.0.0' },
            capabilities: {}
          }
        };

        logger.info('[CognitoAgent] MCP Initialize Payload:', initPayload);

        const initResponse = await fetch(mcpBaseUrl, {
          method: 'POST',
          headers: buildMcpHeaders(braincloudToken),
          body: JSON.stringify(initPayload)
        });

        if (!initResponse.ok) {
          const errorPayload = await initResponse.text();
          throw new Error(`MCP initialize failed: ${initResponse.status} ${initResponse.statusText} | ${errorPayload}`);
        }

        const { data: initData, raw: initRaw } = await parseMcpResponse(initResponse);
        logger.info('[CognitoAgent] MCP Init raw response:', initRaw);
        logger.info('[CognitoAgent] MCP Init parsed keys:', initData ? Object.keys(initData) : []);

        mcpSessionId = extractSessionId(initResponse, initData);

        if (!mcpSessionId) {
          throw new Error(`Failed to initialize MCP session: No session ID returned. Response: ${initRaw}`);
        }

        res.setHeader('mcp-session-id', mcpSessionId);
        logger.info(`[CognitoAgent] MCP Session initialized: ${mcpSessionId}`);

        const toolsPayload = {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/list',
          params: {
            cursor: null,
            _meta: { progressToken: null }
          }
        };

        const toolsResponse = await fetch(mcpBaseUrl, {
          method: 'POST',
          headers: buildMcpHeaders(braincloudToken, mcpSessionId),
          body: JSON.stringify(toolsPayload)
        });

        if (!toolsResponse.ok) {
          const listError = await toolsResponse.text();
          throw new Error(`MCP tools/list failed: ${toolsResponse.status} ${toolsResponse.statusText} | ${listError}`);
        }

        const { data: toolsData, raw: toolsRaw } = await parseMcpResponse(toolsResponse);
        logger.info('[CognitoAgent] MCP tools/list raw response:', toolsRaw);

        const toolsList = toolsData?.result?.tools || toolsData?.tools || [];
        if (Array.isArray(toolsList) && toolsList.length > 0) {
          allMcpTools = toolsList.map(tool => ({
            type: tool.type || 'function',
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters || tool.inputSchema || {
                type: 'object',
                properties: {},
                required: []
              }
            }
          }));
          logger.info(`[CognitoAgent] Parsed ${allMcpTools.length} tools from MCP`);
          logger.info('[CognitoAgent] Sample MCP tools:', toolsList.slice(0, 5).map(tool => ({
            name: tool.name,
            description: tool.description,
            hasInputSchema: !!tool.inputSchema
          })));
          for (const tool of toolsList) {
            const toolName = tool.name;
            if (typeof toolName === 'string') {
              const normalizedName = toolName.replace(/^obsidian-brain-cloud__/, '');
              toolNameMap[normalizedName] = toolName;
              toolNameMap[toolName] = toolName;
            }
          }
        } else {
          logger.warn('[CognitoAgent] tools/list returned no tools, falling back to static definitions');
        }
      } catch (mcpError) {
        logger.error('[CognitoAgent] Failed to initialize MCP session:', mcpError);
        logger.error('[CognitoAgent] MCP Error details:', {
          message: mcpError.message,
          stack: mcpError.stack,
          timestamp: new Date().toISOString()
        });
        logger.warn('[CognitoAgent] Working without MCP tools. Configure OBC credentials.');
      }
    }

    if (!tools || allMcpTools.length === 0) {
      allMcpTools = [
        {
          type: "function",
          function: {
            name: "semantic_search",
            description: "Busca semântica no vault do Brain Cloud",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string" },
                limit: { type: "integer", default: 10 }
              },
              required: ["query"]
            }
          },
          mcpToolName: "obsidian-brain-cloud__semantic_search"
        },
        {
          type: "function",
          function: {
            name: "get_due_tasks",
            description: "Busca tarefas com prazo do Brain Cloud",
            parameters: {
              type: "object",
              properties: {
                status: { type: "string", enum: ["active", "pending", "completed", "all"] },
                window: { type: "string", enum: ["current", "week", "month", "year"] },
                limit: { type: "integer", default: 10 }
              }
            }
          },
          mcpToolName: "obsidian-brain-cloud__get_due_tasks"
        },
        {
          type: "function",
          function: {
            name: "get_current_focus",
            description: "Retorna foco diário e notas relevantes",
            parameters: {
              type: "object",
              properties: {
                context_type: { type: "string", enum: ["daily", "weekly", "monthly"] }
              }
            }
          },
          mcpToolName: "obsidian-brain-cloud__get_current_focus"
        },
        {
          type: "function",
          function: {
            name: "get_vault_tree",
            description: "Obtém estrutura do vault para navegação",
            parameters: {
              type: "object",
              properties: {
                directory: { type: "string" },
                depth: { type: "number", default: 2 },
                include_files: { type: "boolean", default: true }
              }
            }
          },
          mcpToolName: "obsidian-brain-cloud__get_vault_tree"
        },
        {
          type: "function",
          function: {
            name: "get_graph_data",
            description: "Obtém dados do grafo de conhecimento",
            parameters: {
              type: "object",
              properties: {
                directory: { type: "string" },
                include_orphans: { type: "boolean", default: true }
              }
            }
          },
          mcpToolName: "obsidian-brain-cloud__get_graph_data"
        },
        {
          type: "function",
          function: {
            name: "get_main_tags",
            description: "Retorna ranking de tags do vault",
            parameters: {
              type: "object",
              properties: {
                limit: { type: "number", default: 20 }
              }
            }
          },
          mcpToolName: "obsidian-brain-cloud__get_main_tags"
        },
        {
          type: "function",
          function: {
            name: "get_main_links",
            description: "Retorna wikilinks mais referenciados",
            parameters: {
              type: "object",
              properties: {
                limit: { type: "number", default: 20 }
              }
            }
          },
          mcpToolName: "obsidian-brain-cloud__get_main_links"
        },
        {
          type: "function",
          function: {
            name: "get_tasks_summary",
            description: "Resumo executivo das tarefas",
            parameters: {
              type: "object",
              properties: {
                range: { type: "string", default: "this_week" },
                group_by: { type: "string", enum: ["priority", "project", "date", "status"] },
                include_completed: { type: "boolean", default: false }
              }
            }
          },
          mcpToolName: "obsidian-brain-cloud__get_tasks_summary"
        },
        {
          type: "function",
          function: {
            name: "check_overdue",
            description: "Lista tarefas atrasadas por severidade",
            parameters: {
              type: "object",
              properties: {
                severity: { type: "string", enum: ["all", "high", "medium", "low"] },
                directories: { type: "array", items: { type: "string" } }
              }
            }
          },
          mcpToolName: "obsidian-brain-cloud__check_overdue"
        },
        {
          type: "function",
          function: {
            name: "get_time_based_context",
            description: "Contexto temporal consolidado",
            parameters: {
              type: "object",
              properties: {
                reference_date: { type: "string" },
                recent_days: { type: "number", default: 3 },
                upcoming_window: { type: "string", default: "week" }
              }
            }
          },
          mcpToolName: "obsidian-brain-cloud__get_time_based_context"
        },
        {
          type: "function",
          function: {
            name: "create_note_from_template",
            description: "Cria nota baseada em template",
            parameters: {
              type: "object",
              properties: {
                template_name: { type: "string" },
                variables: { type: "object" },
                target_path: { type: "string" },
                create_directories: { type: "boolean", default: true }
              },
              required: ["template_name", "variables"]
            }
          },
          mcpToolName: "obsidian-brain-cloud__create_note_from_template"
        },
        {
          type: "function",
          function: {
            name: "search_files",
            description: "Busca arquivos com padrões glob",
            parameters: {
              type: "object",
              properties: {
                patterns: { type: "array", items: { type: "string" } },
                excludePatterns: { type: "array", items: { type: "string" } },
                directory: { type: "string" }
              },
              required: ["patterns"]
            }
          },
          mcpToolName: "obsidian-brain-cloud__search_files"
        }
      ];
      for (const tool of allMcpTools) {
        toolNameMap[tool.function.name] = tool.mcpToolName;
      }
    }

    // 2. Adiciona system prompt com contexto completo do MCP
    const enhancedMessages = [
      {
        role: "system",
        content: buildSystemPrompt({
          availableTools: allMcpTools.map(tool => `${tool.function.name}: ${tool.function.description}`),
          toolsEnabled: tools,
          context_type: req.body.context_type,
          project_name: req.body.project_name,
          context_note_path: req.body.context_note_path,
          userId: req.user?.id,
          currentUserEmail: req.user?.email || 'user@company.com',
          currentCompanyId: req.user?.companyId || 'default',
          currentRole: req.user?.role || 'user'
        })
      },
      ...messages
    ];

    // 3. Gera resposta com provider configurado das configurações do usuário
    // Obtém provider ativo do usuário
    const activeProvider = await getActiveProviders(req.user?.id);
    
    if (!activeProvider) {
      logger.warn('[CognitoAgent] No active provider found for user');
      
      // Resposta de erro sem tools
      res.write(`data: ${JSON.stringify({ 
        choices: [{ delta: { content: '❌ Nenhum provedor de IA foi configurado. Por favor, configure um provedor nas configurações primeiro.' } }] 
      })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }
    
    // Obtém API key real do provider configurado
    let apiKey;
    try {
      const keyData = await getProviderApiKey(req.user?.id, activeProvider.id);
      apiKey = keyData.apiKey;
      logger.info(`[CognitoAgent] Using real API key from provider: ${activeProvider.provider_name}`);
    } catch (keyError) {
      logger.error('[CognitoAgent] Failed to get API key:', keyError);
      
      // Resposta de erro específico
      res.write(`data: ${JSON.stringify({ 
        choices: [{ delta: { content: '❌ Falha ao obter API key do provedor configurado. Verifique as configurações do provedor.' } }] 
      })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }
    
    logger.info(`[CognitoAgent] Using provider: ${activeProvider.provider_name}, model: ${activeProvider.model_id}`);
    
    // Optimized parameters for OpenRouter free models
    let temperature = 0.7;
    let maxTokens = 2000;
    
    // Better streaming settings
    if (activeProvider.model_id?.includes(':free')) {
      temperature = 1.0; // Many free models only support temp=1
      maxTokens = 800; // Increase for better streaming experience
      logger.info(`[CognitoAgent] Using streaming-optimized settings for free model: ${activeProvider.model_id}, maxTokens: ${maxTokens}`);
    }
    
    // Special case for very slow models
    if (activeProvider.model_id?.includes('z-ai/')) {
      maxTokens = 600; // Increase but still reasonable
      logger.info(`[CognitoAgent] Using streaming settings for z-ai model, maxTokens: ${maxTokens}`);
    }
    
    const completion = await generateChatCompletion({
      providerName: activeProvider.provider_name,
      baseUrl: activeProvider.base_url,
      apiKey: apiKey,
      model: activeProvider.model_id || 'gpt-4',
      messages: enhancedMessages,
      temperature,
      maxTokens,
      systemPrompt: enhancedMessages[0]?.content, // Pass system prompt for reference
      tools: allMcpTools,
      tool_choice: tools ? 'auto' : 'none',
      stream: true,
      requestId: `cognito-${sessionId}-${Date.now()}`
    });

    // 4. Processa streaming com suporte a function calls
    if (completion && typeof completion[Symbol.asyncIterator] === 'function') {
      let buffer = '';
      let chunksProcessed = 0;
      let functionCallResults = []; // Separate buffer for function results
      const pendingToolCalls = new Map();
      
      logger.info(`[CognitoAgent] Starting streaming processing with ${allMcpTools.length} MCP tools`);
      
      for await (const chunk of completion) {
        chunksProcessed++;
        logger.info(`[CognitoAgent] Processing chunk ${chunksProcessed}:`, {
          hasContent: !!chunk.content,
          hasFunctionCalls: !!chunk.function_calls,
          contentLength: chunk.content?.length || 0
        });
        
        // Executa function calls via MCP
        if (chunk.function_calls) {
          for (const functionCall of chunk.function_calls) {
            const callId = functionCall.id || functionCall.index || `chunk-${chunksProcessed}-${Math.random().toString(16).slice(2)}`;
            const existingCall = pendingToolCalls.get(callId) || {
              id: functionCall.id,
              type: functionCall.type,
              name: functionCall.name || functionCall.function?.name || '',
              arguments: ''
            };

            if (functionCall.type && !existingCall.type) existingCall.type = functionCall.type;
            if (functionCall.name) existingCall.name = functionCall.name;
            if (functionCall.function?.name) existingCall.name = functionCall.function.name;
            if (functionCall.function?.arguments) existingCall.arguments += functionCall.function.arguments;
            if (typeof functionCall.arguments === 'string') existingCall.arguments += functionCall.arguments;

            pendingToolCalls.set(callId, existingCall);

            if (!existingCall.name) {
              logger.info(`[CognitoAgent] Awaiting tool name for call ${callId}`);
              continue;
            }

            let parsedArguments = {};
            if (existingCall.arguments) {
              try {
                parsedArguments = JSON.parse(existingCall.arguments);
              } catch (parseError) {
                logger.info(`[CognitoAgent] Tool arguments for ${existingCall.name} not complete yet (length: ${existingCall.arguments.length})`);
                continue;
              }
            }

            try {
              if (!mcpSessionId || !braincloudToken) {
                throw new Error('Missing MCP session or token');
              }

              const callUrl = mcpBaseUrl || buildMcpBaseUrl();
              const mappedName = toolNameMap[existingCall.name] || existingCall.name;
              const toolPayload = {
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'tools/call',
                params: {
                  name: mappedName,
                  arguments: parsedArguments,
                  _meta: { progressToken: null }
                }
              };

              logger.info(`[CognitoAgent] Executing MCP tool ${mappedName} with session ${mcpSessionId}`);
              logger.info('[CognitoAgent] MCP tool payload:', toolPayload);

              const mcpResult = await fetch(callUrl, {
                method: 'POST',
                headers: buildMcpHeaders(braincloudToken, mcpSessionId),
                body: JSON.stringify(toolPayload)
              });

              if (!mcpResult.ok) {
                const errorPayload = await mcpResult.text();
                throw new Error(`MCP tools/call failed: ${mcpResult.status} ${mcpResult.statusText} | ${errorPayload}`);
              }

              const { data: resultData, raw: resultRaw } = await parseMcpResponse(mcpResult);
              logger.info('[CognitoAgent] MCP tool raw response:', resultRaw);

              functionCallResults.push({
                name: mappedName,
                result: resultData || { raw: resultRaw }
              });
              pendingToolCalls.delete(callId);
              
            } catch (toolError) {
              logger.error(`[CognitoAgent] Error executing MCP tool ${existingCall.name}:`, toolError);
              functionCallResults.push({
                name: existingCall.name,
                error: toolError.message
              });
              pendingToolCalls.delete(callId);
            }
          }
        }
        
        // Stream normal - detect and handle thinking mode
        if (chunk.content) {
          let processedContent = chunk.content;
          
          // Detect thinking mode indicators
          const thinkingIndicators = [
            '🧠 **PROCESSO DE RACIOCÍNIO:**',
            'Pensando:',
            'Vou analisar:',
            'Vou considerar:',
            'Analisando:',
            'Processo de raciocínio:'
          ];
          
          const isThinkingContent = thinkingIndicators.some(indicator => 
            processedContent.includes(indicator) ||
            processedContent.includes('🧠') ||
            processedContent.includes('ANÁLISE:')
          );
          
          // Add thinking metadata for frontend detection
          if (isThinkingContent) {
            // Don't wrap - let content flow naturally for better detection
            logger.info(`[CognitoAgent] Thinking content detected:`, {
              contentPreview: processedContent.substring(0, 100) + '...'
            });
          }
          
          const responseData = `data: ${JSON.stringify({ 
            choices: [{ 
              delta: { 
                content: processedContent,
                thinking: isThinkingContent
              }, 
              function_calls: chunk.function_calls || [] 
            }] 
          })}\n\n`;
          
          logger.info(`[CognitoAgent] Writing to stream:`, {
            contentLength: chunk.content.length,
            isThinking: isThinkingContent,
            responseDataLength: responseData.length
          });
          
          res.write(responseData);
          res.flush && res.flush(); // Force immediate flush for streaming
        }
      }
      
      // After completion, if there were function call results, send them as a separate message
      if (functionCallResults.length > 0) {
        const functionCallSummary = functionCallResults.map(result => {
          if (result.error) {
            return `⚠️ Failed to execute ${result.name}: ${result.error}`;
          } else {
            return `🔧 MCP Tool Result (${result.name}):\n${JSON.stringify(result.result, null, 2)}`;
          }
        }).join('\n\n');
        
        const finalData = `data: ${JSON.stringify({ 
          choices: [{ delta: { content: `\n\n---\n\n${functionCallSummary}\n\n---` } }] 
        })}\n\n`;
        res.write(finalData);
        res.flush && res.flush();
      }
      
      logger.info(`[CognitoAgent] Stream completed: ${chunksProcessed} chunks processed, ${functionCallResults.length} function calls executed`);
      
      res.write('data: [DONE]\n\n');
      res.end();
      
    } else {
      // Non-streaming response
      logger.warn(`[CognitoAgent] Non-streaming response received`);
      logger.info(`[CognitoAgent] Completion structure:`, {
        hasContent: !!completion.content,
        hasChoices: !!completion.choices,
        hasStream: !!completion.stream,
        completionType: typeof completion,
        completionKeys: Object.keys(completion || {}),
        completionString: JSON.stringify(completion, null, 2).substring(0, 500) + '...'
      });
      
      const responseContent = completion.content || 
                             completion.choices?.[0]?.message?.content || 
                             '❌ Não consegui processar sua mensagem.';
      
      res.write(`data: ${JSON.stringify({ 
        choices: [{ delta: { content: responseContent } }] 
      })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }

  } catch (error) {
    logger.error('[CognitoAgent] Chat error:', error);
    res.write(`data: ${JSON.stringify({ 
      choices: [{ delta: { content: '\n⚠️ Erro ao processar chat. ' + (error.message || 'Por favor, tente novamente mais tarde.') } }] 
    })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

export default router;
