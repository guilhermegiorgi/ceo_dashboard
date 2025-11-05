import { Router } from "express";

import {
  generateChatCompletion,
  buildSystemPrompt,
} from "../services/aiChatClient.js";
import { logger } from "../src/utils/logger.js";
import mcpSessionManager from "../services/mcpSessionManager.js";
import { getModelConfigForUser } from "../services/aiConfigService.js";

const router = Router();

const extractStructuredPayload = (output) => {
  if (!output) return null;

  if (typeof output === "string") {
    try {
      return JSON.parse(output);
    } catch (err) {
      return null;
    }
  }

  if (Array.isArray(output)) {
    return null;
  }

  if (output?.content && Array.isArray(output.content)) {
    for (const block of output.content) {
      if (block?.type === "text" && typeof block.text === "string") {
        try {
          return JSON.parse(block.text);
        } catch (err) {
          // ignore parse error
        }
      }
    }
  }

  return output;
};

const extractTextContent = (content) => {
  if (!content) return "";

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (!part) return "";
        if (typeof part === "string") return part;
        if (typeof part === "object") {
          if (typeof part.text === "string") return part.text;
          if (typeof part.content === "string") return part.content;
          if (Array.isArray(part.content)) {
            return part.content
              .map((nested) =>
                typeof nested === "string"
                  ? nested
                  : typeof nested?.text === "string"
                  ? nested.text
                  : ""
              )
              .filter(Boolean)
              .join(" ");
          }
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  if (typeof content === "object") {
    if (typeof content.text === "string") return content.text;
    if (Array.isArray(content.parts)) {
      return content.parts
        .map((part) =>
          typeof part === "string"
            ? part
            : typeof part?.text === "string"
            ? part.text
            : ""
        )
        .filter(Boolean)
        .join("\n");
    }
  }

  return "";
};

const normalizeMessages = (messages = []) =>
  messages.map((msg) => ({
    role: msg.role === "assistant" ? "assistant" : "user",
    content: extractTextContent(msg.content ?? msg.text ?? ""),
  }));

const summarizeToolResultForFallback = (result) => {
  const name = result.resolvedName || result.name || "Ferramenta";

  if (result.error) {
    return `${name}: erro (${result.error}).`;
  }

  const structured = extractStructuredPayload(result.output);

  const tags =
    structured?.data?.tags ||
    structured?.result?.data?.tags ||
    structured?.result?.tags;
  if (Array.isArray(tags) && tags.length > 0) {
    const topTags = tags
      .slice(0, 5)
      .map((tag) => {
        const label = tag?.tag || tag?.name || String(tag);
        const count = tag?.count ?? tag?.occurrences ?? null;
        return count ? `${label} (${count})` : label;
      })
      .filter(Boolean)
      .join(", ");

    if (topTags) {
      return `${name}: principais itens — ${topTags}.`;
    }
  }

  if (structured?.result?.summary) {
    return `${name}: ${structured.result.summary}`;
  }

  return `${name}: execução concluída.`;
};

async function resolveProviderSelection(req) {
  if (!req.user || !req.user.id) {
    logger.warn("[CognitoAgent] Missing user context for provider resolution");
    return null;
  }

  const context =
    req.body?.context ||
    req.body?.context_type ||
    req.body?.conversationContext ||
    "chat";

  const overridePayload = req.body?.providerOverride || {};
  const overrides = {};

  if (overridePayload.provider) {
    overrides.provider = overridePayload.provider;
  }
  if (overridePayload.model) {
    overrides.model = overridePayload.model;
  } else if (req.body?.modelId) {
    overrides.model = req.body.modelId;
  }
  if (overridePayload.customProviderId) {
    overrides.customProviderId = overridePayload.customProviderId;
  }
  if (overridePayload.temperature !== undefined) {
    overrides.temperature = overridePayload.temperature;
  }
  if (overridePayload.maxTokens !== undefined) {
    overrides.maxTokens = overridePayload.maxTokens;
  }

  try {
    const selection = await getModelConfigForUser(req.user, context, overrides);
    if (!selection?.provider) {
      logger.warn(
        `[CognitoAgent] No provider/model configured for user ${req.user.id} in context ${context}`
      );
      return null;
    }

    logger.info(
      `[CognitoAgent] Provider resolved: ${selection.provider}, model: ${selection.model}, fallbackUsed=${selection.fallbackUsed}`
    );

    return {
      ...selection,
      context,
    };
  } catch (error) {
    logger.error("[CognitoAgent] Failed to resolve provider selection:", error);
    return null;
  }
}

// Endpoint para assistant-ui usando formato AI SDK
router.post("/chat/stream", async (req, res) => {
  const { messages, temperature = 0.7, maxTokens = 2000 } = req.body;

  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: "messages are required" });
  }

  try {
    // Configurar headers para streaming compatível com AI SDK
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Enviar as mensagens para o sistema MCP existente
    // Adaptar formato do assistant-ui para nosso formato MCP
    const normalizedMessages = normalizeMessages(messages);
    const mcpMessages = normalizedMessages;

    const sessionId = `assistant-${Date.now()}`;

    // Stream de dados usando nosso sistema MCP existente
    let fullContent = "";

    const response = await fetch(
      `${req.protocol}://${req.get("host")}/api/mcp/query-stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.authorization || "",
        },
        body: JSON.stringify({
          messages: mcpMessages,
          sessionId,
          tools: true,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("Failed to get response body");
    }

    // Use Node.js stream for reading instead of web ReadableStream
    const decoder = new TextDecoder();
    let buffer = "";

    // Processar stream e converter para formato AI SDK
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep the last incomplete line

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);

            // Converter para formato AI SDK
            const deltaContent = parsed.choices?.[0]?.delta?.content || "";
            if (deltaContent) {
              fullContent += deltaContent;

              // Enviar para assistant-ui em formato AI SDK
              res.write(
                `data: ${JSON.stringify({
                  type: "text-delta",
                  textDelta: deltaContent,
                })}\n\n`
              );
            }
          } catch (e) {
            // Ignorar erros de parsing
          }
        }
      }
    }

    // Processar qualquer dado restante no buffer
    if (buffer.startsWith("data: ")) {
      const data = buffer.slice(6);
      if (data !== "[DONE]") {
        try {
          const parsed = JSON.parse(data);
          const deltaContent = parsed.choices?.[0]?.delta?.content || "";
          if (deltaContent) {
            fullContent += deltaContent;
            res.write(
              `data: ${JSON.stringify({
                type: "text-delta",
                textDelta: deltaContent,
              })}\n\n`
            );
          }
        } catch (e) {
          // Ignorar erros de parsing
        }
      }
    }

    // Finalizar stream
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    logger.error("[Assistant-UI] Chat error:", error);
    res.write(
      `data: ${JSON.stringify({
        type: "error",
        error: error.message,
      })}\n\n`
    );
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

// Endpoint LEGADO - mantido para compatibilidade com uso existente
router.post("/query-stream", async (req, res) => {
  const { messages, sessionId, tools = true } = req.body;

  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: "messages are required" });
  }

  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

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
        logger.error(
          "[CognitoAgent] Failed to initialize MCP session:",
          mcpError
        );
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

    // Normalize messages to standard format
    const normalizedMessages = normalizeMessages(messages);

    const enhancedMessages = [
      {
        role: "system",
        content: buildSystemPrompt({
          availableTools: llmTools.map(
            (tool) => `${tool.function.name}: ${tool.function.description}`
          ),
          toolsEnabled: tools,
          context_type: req.body.context_type,
          project_name: req.body.project_name,
          context_note_path: req.body.context_note_path,
          userId: req.user?.id,
          currentUserEmail: req.user?.email || "user@company.com",
          currentCompanyId: req.user?.companyId || "default",
          currentRole: req.user?.role || "user",
        }),
      },
      ...normalizedMessages,
    ];

    // 3. Gera resposta com provider configurado das configurações do usuário
    const selection = await resolveProviderSelection(req);

    if (!selection) {
      logger.warn("[CognitoAgent] No provider/model resolved for user");
      res.write(
        `data: ${JSON.stringify({
          choices: [
            {
              delta: {
                content:
                  "❌ Nenhum provedor de IA foi configurado. Acesse as configurações para habilitar o chat.",
              },
            },
          ],
        })}\n\n`
      );
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    if (!selection.apiKey) {
      logger.warn("[CognitoAgent] Provider resolved but missing API key");
      res.write(
        `data: ${JSON.stringify({
          choices: [
            {
              delta: {
                content:
                  "❌ O provedor selecionado não possui chave de API. Configure uma chave válida para continuar.",
              },
            },
          ],
        })}\n\n`
      );
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    logger.info(
      `[CognitoAgent] Using provider: ${selection.provider}, model: ${selection.model}`
    );

    // Optimized parameters for OpenRouter free models
    let temperature =
      selection.temperature !== undefined ? selection.temperature : 0.7;
    let maxTokens =
      selection.maxTokens !== undefined && selection.maxTokens !== null
        ? selection.maxTokens
        : 2000;

    // Better streaming settings
    if (selection.model?.includes(":free")) {
      temperature = 1.0; // Many free models only support temp=1
      maxTokens = 800; // Increase for better streaming experience
      logger.info(
        `[CognitoAgent] Using streaming-optimized settings for free model: ${selection.model}, maxTokens: ${maxTokens}`
      );
    }

    // Special case for very slow models
    if (selection.model?.includes("z-ai/")) {
      maxTokens = 600; // Increase but still reasonable
      logger.info(
        `[CognitoAgent] Using streaming settings for z-ai model, maxTokens: ${maxTokens}`
      );
    }

    const completion = await generateChatCompletion({
      providerName: selection.provider,
      baseUrl: selection.baseUrl,
      apiKey: selection.apiKey,
      model: selection.model || "gpt-4",
      messages: enhancedMessages,
      temperature,
      maxTokens,
      systemPrompt: enhancedMessages[0]?.content, // Pass system prompt for reference
      tools: llmTools,
      tool_choice: tools ? "auto" : "none",
      stream: true,
      requestId: `cognito-${sessionId}-${Date.now()}`,
    });

    // 4. Processa streaming com suporte a function calls
    if (completion && typeof completion[Symbol.asyncIterator] === "function") {
      let buffer = "";
      let chunksProcessed = 0;
      const pendingToolCalls = new Map();
      const functionCallResults = [];
      let toolCallHappened = false;
      let assistantContentAfterTools = false;

      logger.info(
        `[CognitoAgent] Starting streaming processing with ${llmTools.length} MCP tools`
      );

      for await (const chunk of completion) {
        chunksProcessed++;
        logger.info(`[CognitoAgent] Processing chunk ${chunksProcessed}:`, {
          hasContent: !!chunk.content,
          hasFunctionCalls: !!chunk.function_calls,
          contentLength: chunk.content?.length || 0,
          chunkKeys: Object.keys(chunk),
          chunkString: JSON.stringify(chunk).substring(0, 200),
        });

        // Executa function calls via MCP
        if (chunk.function_calls) {
          for (const functionCall of chunk.function_calls) {
            const callId =
              functionCall.id ||
              functionCall.index ||
              `chunk-${chunksProcessed}-${Math.random().toString(16).slice(2)}`;
            const existingCall = pendingToolCalls.get(callId) || {
              id: functionCall.id,
              type: functionCall.type,
              name: functionCall.name || functionCall.function?.name || "",
              arguments: "",
            };

            if (functionCall.type && !existingCall.type)
              existingCall.type = functionCall.type;
            if (functionCall.name) existingCall.name = functionCall.name;
            if (functionCall.function?.name)
              existingCall.name = functionCall.function.name;
            if (functionCall.function?.arguments)
              existingCall.arguments += functionCall.function.arguments;
            if (typeof functionCall.arguments === "string")
              existingCall.arguments += functionCall.arguments;

            pendingToolCalls.set(callId, existingCall);

            if (!existingCall.name) {
              logger.info(
                `[CognitoAgent] Awaiting tool name for call ${callId}`
              );
              continue;
            }

            let parsedArguments = {};
            if (existingCall.arguments) {
              try {
                parsedArguments = JSON.parse(existingCall.arguments);
              } catch (parseError) {
                logger.info(
                  `[CognitoAgent] Tool arguments for ${existingCall.name} not complete yet (length: ${existingCall.arguments.length})`
                );
                continue;
              }
            }

            try {
              if (!mcpSession) {
                throw new Error("MCP session not initialized");
              }

              const toolExecution = await mcpSession.callTool(
                existingCall.name,
                parsedArguments
              );

              const toolResultPayload = {
                name: existingCall.name,
                resolvedName: toolExecution.toolName || existingCall.name,
                arguments: parsedArguments,
                output:
                  toolExecution.data?.result ?? toolExecution.data ?? null,
                raw: toolExecution.raw || null,
                error: null,
              };

              logger.info(
                `[CognitoAgent] Tool ${toolResultPayload.resolvedName} executed successfully`
              );

              res.write(
                `data: ${JSON.stringify({
                  tool_result: toolResultPayload,
                })}\n\n`
              );
              res.flush && res.flush();

              functionCallResults.push(toolResultPayload);
              toolCallHappened = true;

              pendingToolCalls.delete(callId);
            } catch (toolError) {
              logger.error(
                `[CognitoAgent] Error executing MCP tool ${existingCall.name}:`,
                toolError
              );

              const errorPayload = {
                name: existingCall.name,
                resolvedName: existingCall.name,
                arguments: parsedArguments,
                output: null,
                raw: null,
                error: toolError.message || "Unknown MCP tool error",
              };

              res.write(
                `data: ${JSON.stringify({ tool_result: errorPayload })}\n\n`
              );
              res.flush && res.flush();

              functionCallResults.push(errorPayload);
              toolCallHappened = true;
              pendingToolCalls.delete(callId);
            }
          }
        }

        // Stream normal - detect and handle thinking mode
        if (chunk.content) {
          let processedContent = chunk.content;

          // Detect thinking mode indicators
          const thinkingIndicators = [
            "🧠 **PROCESSO DE RACIOCÍNIO:**",
            "Pensando:",
            "Vou analisar:",
            "Vou considerar:",
            "Analisando:",
            "Processo de raciocínio:",
          ];

          const isThinkingContent = thinkingIndicators.some(
            (indicator) =>
              processedContent.includes(indicator) ||
              processedContent.includes("🧠") ||
              processedContent.includes("ANÁLISE:")
          );

          // Add thinking metadata for frontend detection
          if (isThinkingContent) {
            // Don't wrap - let content flow naturally for better detection
            logger.info(`[CognitoAgent] Thinking content detected:`, {
              contentPreview: processedContent.substring(0, 100) + "...",
            });
          }

          const responseData = `data: ${JSON.stringify({
            choices: [
              {
                delta: {
                  content: processedContent,
                  thinking: isThinkingContent,
                },
                function_calls: chunk.function_calls || [],
              },
            ],
          })}\n\n`;

          logger.info(`[CognitoAgent] Writing to stream:`, {
            contentLength: chunk.content.length,
            isThinking: isThinkingContent,
            responseDataLength: responseData.length,
          });

          res.write(responseData);
          res.flush && res.flush(); // Force immediate flush for streaming

          if (toolCallHappened) {
            assistantContentAfterTools = true;
          }
        }
      }

      if (
        toolCallHappened &&
        !assistantContentAfterTools &&
        functionCallResults.length > 0
      ) {
        const summaries = functionCallResults
          .map(summarizeToolResultForFallback)
          .filter(Boolean);

        if (summaries.length > 0) {
          res.write(
            `data: ${JSON.stringify({
              tool_summary: {
                summaries,
                results: functionCallResults,
              },
            })}\n\n`
          );
          res.flush && res.flush();
        }
      }

      logger.info(
        `[CognitoAgent] Stream completed: ${chunksProcessed} chunks processed`
      );

      res.write("data: [DONE]\n\n");
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
        completionString:
          JSON.stringify(completion, null, 2).substring(0, 500) + "...",
      });

      const responseContent =
        completion.content ||
        completion.choices?.[0]?.message?.content ||
        "❌ Não consegui processar sua mensagem.";

      res.write(
        `data: ${JSON.stringify({
          choices: [{ delta: { content: responseContent } }],
        })}\n\n`
      );
      res.write("data: [DONE]\n\n");
      res.end();
    }
  } catch (error) {
    logger.error("[CognitoAgent] Chat error:", error);
    res.write(
      `data: ${JSON.stringify({
        choices: [
          {
            delta: {
              content:
                "\n⚠️ Erro ao processar chat. " +
                (error.message || "Por favor, tente novamente mais tarde."),
            },
          },
        ],
      })}\n\n`
    );
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

export default router;
