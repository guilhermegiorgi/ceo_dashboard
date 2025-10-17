import { Router } from 'express';

import { query } from '../database/pg-pool.js';
import { getProviderApiKey } from '../services/aiProviderService.js';
import { generateChatCompletion, buildSystemPrompt } from '../services/aiChatClient.js';
import { logger } from '../src/utils/logger.js';
import mcpSessionManager from '../services/mcpSessionManager.js';

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

  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'messages are required' });
  }

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    console.log(`[CognitoAgent] Processando ${messages.length} mensagens com tools=${tools}`);

    // 1. Inicializa sessão MCP dinamicamente (sem fallback)
    let mcpSession = null;
    let allMcpTools = [];

    if (tools) {
      try {
        mcpSession = await mcpSessionManager.createSession([
          req.user?.id || "anonymous",
          sessionId || "default",
        ]);
        allMcpTools = mcpSession.llmTools;
        res.setHeader("mcp-session-id", mcpSession.sessionId);
        logger.info("[CognitoAgent] MCP session ready", {
          sessionId: mcpSession.sessionId,
          tools: allMcpTools.length,
        });
      } catch (mcpError) {
        logger.error("[CognitoAgent] Failed to initialize MCP session:", mcpError);
        res.write(
          `data: ${JSON.stringify({
            choices: [
              {
                delta: {
                  content:
                    "⚠️ Não foi possível abrir sessão com o Brain Cloud MCP. Verifique BRAINCLOUD_API_TOKEN/Base URL e tente novamente.",
                },
              },
            ],
          })}\n\n`
        );
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }
    }

    // 2. Adiciona system prompt com contexto completo do MCP
    const llmTools = tools ? allMcpTools : [];

    const enhancedMessages = [
      {
        role: "system",
        content: buildSystemPrompt({
          availableTools: llmTools.map(tool => `${tool.function.name}: ${tool.function.description}`),
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
      tools: llmTools,
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
      
      logger.info(`[CognitoAgent] Starting streaming processing with ${llmTools.length} MCP tools`);
      
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
              if (!mcpSession) {
                throw new Error('MCP session not initialized');
              }

              const toolResult = await mcpSession.callTool(existingCall.name, parsedArguments);

              functionCallResults.push({
                name: toolResult.toolName,
                result: toolResult.data || { raw: toolResult.raw }
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
