import fetch from "node-fetch";
import { logger } from "../src/utils/logger.js";

const OPENAI_DEFAULT_BASE_URL = "https://api.openai.com/v1";
const ANTHROPIC_DEFAULT_BASE_URL = "https://api.anthropic.com/v1";
const DEEPSEEK_DEFAULT_BASE_URL = "https://api.deepseek.com/v1";
const OPENROUTER_DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const GEMINI_DEFAULT_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta";

function buildUrl(baseUrl, path) {
  const sanitizedBase = baseUrl?.replace(/\/$/, "") || "";
  const sanitizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${sanitizedBase}${sanitizedPath}`;
}

function clamp(value, min, max) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return undefined;
  }
  return Math.min(Math.max(value, min), max);
}

function toOpenAIMessages(messages, systemPrompt) {
  const formatted = messages.map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content,
  }));

  if (systemPrompt) {
    formatted.unshift({ role: "system", content: systemPrompt });
  }

  return formatted;
}

function toAnthropicMessages(messages) {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: [
      {
        type: "text",
        text: message.content,
      },
    ],
  }));
}

function sanitizeMaxTokens(maxTokens, fallback = 1024) {
  if (!maxTokens || Number.isNaN(maxTokens) || maxTokens <= 0) {
    return fallback;
  }
  return Math.min(maxTokens, 4096);
}

async function openAiStyleRequest({
  url,
  apiKey,
  body,
  headers = {},
  retryWithDefaults = true,
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  const run = async () => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      // Enhanced error handling for nested error structure
      const errorMessage =
        data?.error?.error?.message ||
        data?.error?.message ||
        data?.message ||
        response.statusText;

      // Retry with minimal parameters if this is a parameter error
      if (
        retryWithDefaults &&
        (errorMessage.includes("Unsupported parameter") ||
          errorMessage.includes("does not support") ||
          errorMessage.includes("temperature") ||
          errorMessage.includes("max_tokens") ||
          errorMessage.includes("max_completion_tokens"))
      ) {
        logger.warn(
          `[openAiStyleRequest] Parameter error, retrying with defaults: ${errorMessage}`
        );

        // Remove problematic parameters and retry
        const minimalBody = {
          model: body.model,
          messages: body.messages,
        };

        // Use correct parameter name based on provider
        if (url.includes("openrouter.ai")) {
          if (body.max_completion_tokens || body.max_tokens) {
            minimalBody.max_completion_tokens = 500; // Safe default for OpenRouter
          }
        } else if (url.includes("api.openai.com")) {
          if (body.max_completion_tokens || body.max_tokens) {
            minimalBody.max_completion_tokens = 500; // Safe default for OpenAI
          }
        } else {
          if (body.max_completion_tokens || body.max_tokens) {
            minimalBody.max_tokens = 500; // Generic fallback
          }
        }

        logger.info(
          `[openAiStyleRequest] Retry with minimal body:`,
          minimalBody
        );

        return await openAiStyleRequest({
          url,
          apiKey,
          body: minimalBody,
          headers,
          retryWithDefaults: false, // Prevent infinite recursion
        });
      }

      throw new Error(`Provider error ${response.status}: ${errorMessage}`);
    }

    return data;
  };

  try {
    const result = await run();
    clearTimeout(timeout);
    return result;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

// Provider-specific parameter mappings
const PROVIDER_PARAMETER_CONFIGS = {
  openai: {
    supportsMaxTokens: true,
    maxTokensField: "max_completion_tokens", // Updated OpenAI API
    temperatureRange: [0, 2],
    supportsTopP: true,
    defaultModel: "gpt-4o",
  },
  anthropic: {
    supportsMaxTokens: true,
    maxTokensField: "max_tokens", // Anthropic uses max_tokens
    temperatureRange: [0, 1],
    supportsTopP: true,
    defaultModel: "claude-3-5-sonnet-20241022",
  },
  deepseek: {
    supportsMaxTokens: true,
    maxTokensField: "max_tokens", // DeepSeek uses max_tokens
    temperatureRange: [0, 2],
    supportsTopP: true,
    defaultModel: "deepseek-chat",
  },
  openrouter: {
    supportsMaxTokens: true,
    maxTokensField: "max_completion_tokens", // OpenRouter follows OpenAI spec
    temperatureRange: [0, 2],
    supportsTopP: true,
    defaultModel: "anthropic/claude-3.5-sonnet",
  },
};

const OPENROUTER_PROVIDER_HINTS = {
  anthropic: ["Anthropic"],
  openai: ["OpenAI"],
  meta: ["Meta"],
  mistral: ["Mistral"],
  google: ["Google"],
  perplexity: ["Perplexity"],
  deepseek: ["DeepSeek"],
  xai: ["xAI"],
  minimax: ["MiniMax"],
};

function inferOpenRouterProviders(model) {
  if (!model || typeof model !== "string") return null;
  const prefix = model.split("/")[0]?.toLowerCase();
  if (!prefix) return null;
  return OPENROUTER_PROVIDER_HINTS[prefix] || null;
}

function buildFallbackProviderHint(model) {
  if (!model || typeof model !== "string") return null;
  const rawPrefix = model.split("/")[0];
  if (!rawPrefix) return null;

  const normalized = rawPrefix
    .split(/[\W_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return normalized ? [normalized] : null;
}

async function callOpenAI({
  baseUrl,
  apiKey,
  messages,
  model,
  temperature,
  maxTokens,
  topP,
  systemPrompt,
  stream = false,
  tools = null,
  tool_choice = "auto",
}) {
  const url = buildUrl(baseUrl || OPENAI_DEFAULT_BASE_URL, "/chat/completions");
  const config = PROVIDER_PARAMETER_CONFIGS.openai;

  const body = {
    model,
    messages: toOpenAIMessages(messages, systemPrompt),
  };

  // Somente injeta providers quando usando OpenRouter (OpenAI puro rejeita esse campo)
  const isOpenRouter =
    typeof baseUrl === "string" &&
    baseUrl.toLowerCase().includes("openrouter");

  if (isOpenRouter && tools && tools.length > 0 && !body.providers) {
    const providerHint =
      inferOpenRouterProviders(model) || buildFallbackProviderHint(model);
    if (providerHint) {
      body.providers = providerHint;
      logger.info(
        `[OpenRouter] Provider hint injected for tool use: ${providerHint.join(",")}`
      );
    }
  }

  // Adiciona tools se fornecidos
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = tool_choice;
  }

  // Apply provider-specific parameters
  if (typeof temperature === "number") {
    body.temperature = clamp(
      temperature,
      config.temperatureRange[0],
      config.temperatureRange[1]
    );
  }

  if (maxTokens && config.supportsMaxTokens) {
    body[config.maxTokensField] = maxTokens;
  }

  if (topP !== undefined && config.supportsTopP) {
    body.top_p = clamp(topP, 0, 1);
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  body.stream = stream;
  logger.info(
    `[OpenAI] Using model: ${model}, maxTokens field: ${config.maxTokensField}, maxTokens: ${maxTokens}, stream: ${stream}`
  );

  if (stream) {
    // Streaming response for OpenAI
    return await openAiStreamRequest({ url, apiKey, body, headers });
  } else {
    const data = await openAiStyleRequest({ url, apiKey, body, headers });
    const content = data?.choices?.[0]?.message?.content || "";
    const totalTokens = data?.usage?.total_tokens || 0;

    return {
      content,
      usage: data?.usage || null,
      tokensUsed: totalTokens,
    };
  }
}

async function openAiStreamRequest({ url, apiKey, body, headers = {} }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  const run = async () => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...headers,
      },
      body: JSON.stringify({ ...body, stream: true }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const errorMessage =
        data?.error?.error?.message ||
        data?.error?.message ||
        data?.message ||
        response.statusText;

      // Check if it's a parameter error that can be retried
      if (
        errorMessage.includes("Unsupported parameter") ||
        errorMessage.includes("does not support") ||
        errorMessage.includes("temperature") ||
        errorMessage.includes("max_tokens") ||
        errorMessage.includes("max_completion_tokens")
      ) {
        logger.warn(
          `[openAiStreamRequest] Parameter error, retrying with minimal parameters: ${errorMessage}`
        );

        // Remove problematic parameters and retry with the same streaming function
        const minimalBody = {
          model: body.model,
          messages: body.messages,
          stream: true,
        };

        // Add safe max_tokens for OpenAI
        if (url.includes("api.openai.com")) {
          minimalBody.max_completion_tokens = 500;
        }

        logger.info(
          `[openAiStreamRequest] Retry streaming with minimal body:`,
          minimalBody
        );

        // Retry with minimal parameters using the original streaming logic
        const retryResponse = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            ...headers,
          },
          body: JSON.stringify(minimalBody),
          signal: controller.signal,
        });

        if (!retryResponse.ok) {
          const retryData = await retryResponse.json().catch(() => null);
          const retryErrorMessage =
            retryData?.error?.error?.message ||
            retryData?.error?.message ||
            retryData?.message ||
            retryResponse.statusText;
          throw new Error(
            `OpenAI Streaming error ${retryResponse.status}: ${retryErrorMessage}`
          );
        }

        // Check if retry response is actually returning JSON instead of stream
        const contentType = retryResponse.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const jsonData = await retryResponse.json().catch(() => null);
          if (jsonData) {
            logger.info(
              `[openAiStreamRequest] Retry returned JSON response instead of stream`
            );
            return {
              stream: false,
              content: jsonData.choices?.[0]?.message?.content || "",
              choices: jsonData.choices || [],
              usage: jsonData.usage || null,
            };
          }
        }

        // If it's still a stream, we need to consume it and extract the content
        if (retryResponse.body) {
          logger.info(
            `[openAiStreamRequest] Consuming retry stream to extract content`
          );
          logger.info(
            `[openAiStreamRequest] Response body type:`,
            typeof retryResponse.body,
            retryResponse.body.constructor.name
          );

          // Check if the body has getReader method (ReadableStream)
          if (typeof retryResponse.body.getReader === "function") {
            let content = "";
            const reader = retryResponse.body.getReader();
            const decoder = new TextDecoder();

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");

                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    try {
                      const data = JSON.parse(line.substring(6));
                      if (data.choices?.[0]?.delta?.content) {
                        content += data.choices[0].delta.content;
                      }
                    } catch (e) {
                      // Skip invalid JSON
                    }
                  }
                }
              }

              logger.info(
                `[openAiStreamRequest] Extracted content from retry stream: ${content.length} chars`
              );

              return {
                stream: false,
                content: content || "❌ Não consegui processar sua mensagem.",
                choices: [{ message: { content: content } }],
                usage: null,
              };
            } catch (error) {
              logger.error(
                `[openAiStreamRequest] Error consuming retry stream:`,
                error
              );
              throw new Error(
                `OpenAI Streaming: Failed to process retry response: ${error.message}`
              );
            } finally {
              reader.releaseLock();
            }
          } else {
            // Not a ReadableStream - try to parse as JSON or SSE
            logger.info(
              `[openAiStreamRequest] Response body is not a ReadableStream, trying JSON/SSE parse`
            );
            try {
              const responseText = await retryResponse.text();

              // Handle different response types
              let text = responseText;

              // If the response is a JSON string with numeric keys, reconstruct it
              try {
                const parsed = JSON.parse(responseText);
                if (
                  typeof parsed === "object" &&
                  Object.keys(parsed).every((key) => /^\d+$/.test(key))
                ) {
                  logger.info(
                    `[openAiStreamRequest] Reconstructing text from object with numeric keys`
                  );
                  // Check if values are strings (characters) or objects
                  const firstValue = parsed["0"];
                  if (
                    typeof firstValue === "string" &&
                    firstValue.length === 1
                  ) {
                    // It's character-by-character encoding
                    text = Object.values(parsed).join("");
                  } else {
                    // It's an object array that got serialized weird, keep original
                    logger.info(
                      `[openAiStreamRequest] Object values are not characters, using original text`
                    );
                  }
                }
              } catch (e) {
                // Not JSON, use original text
                logger.info(
                  `[openAiStreamRequest] Using original text (not JSON)`
                );
              }

              logger.info(
                `[openAiStreamRequest] Processing reconstructed text (length: ${text.length})`
              );
              logger.info(
                `[openAiStreamRequest] Text preview:`,
                text.substring(0, 200) + "..."
              );

              // Check if it's SSE format (starts with data:)
              if (text.includes("data: ")) {
                logger.info(
                  `[openAiStreamRequest] Processing SSE format response`
                );
                logger.info(
                  `[openAiStreamRequest] Full reconstructed text:`,
                  text
                );
                let content = "";
                const lines = text.split("\n");
                logger.info(
                  `[openAiStreamRequest] Number of lines: ${lines.length}`
                );

                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i];
                  logger.info(
                    `[openAiStreamRequest] Line ${i}: ${line.substring(
                      0,
                      100
                    )}...`
                  );

                  if (line.startsWith("data: ")) {
                    try {
                      const dataStr = line.substring(6);
                      logger.info(
                        `[openAiStreamRequest] Parsing SSE data: ${dataStr.substring(
                          0,
                          200
                        )}...`
                      );

                      if (dataStr === "[DONE]") {
                        logger.info(
                          `[openAiStreamRequest] Found [DONE] marker, stopping`
                        );
                        break;
                      }

                      logger.info(
                        `[openAiStreamRequest] dataStr type: ${typeof dataStr}, preview: ${dataStr.substring(
                          0,
                          100
                        )}`
                      );
                      let data = JSON.parse(dataStr);
                      logger.info(
                        `[openAiStreamRequest] Parsed data keys: ${Object.keys(
                          data
                        )}`
                      );
                      logger.info(
                        `[openAiStreamRequest] data.choices type after parse: ${typeof data.choices}, isArray: ${Array.isArray(
                          data.choices
                        )}`
                      );
                      if (
                        typeof data.choices === "object" &&
                        !Array.isArray(data.choices)
                      ) {
                        logger.info(
                          `[openAiStreamRequest] choices is object with keys:`,
                          Object.keys(data.choices).slice(0, 10)
                        );
                      }

                      // Normalize objects with numeric keys recursively
                      const normalizeNumericKeys = (obj) => {
                        if (typeof obj !== "object" || obj === null) return obj;

                        // Check if object has only numeric keys
                        const keys = Object.keys(obj);
                        const allNumeric =
                          keys.length > 0 &&
                          keys.every((key) => /^\d+$/.test(key));

                        if (allNumeric) {
                          // Check if it's character encoding (single char strings)
                          const firstVal = obj["0"];
                          if (
                            typeof firstVal === "string" &&
                            firstVal.length === 1
                          ) {
                            // Reconstruct string from characters
                            const reconstructed = Object.keys(obj)
                              .sort((a, b) => parseInt(a) - parseInt(b))
                              .map((k) => obj[k])
                              .join("");

                            // Try to parse as JSON if it looks like JSON
                            if (
                              reconstructed.trim().startsWith("[") ||
                              reconstructed.trim().startsWith("{")
                            ) {
                              try {
                                const parsed = JSON.parse(reconstructed);
                                // Recursively normalize the parsed result
                                return normalizeNumericKeys(parsed);
                              } catch (e) {
                                return reconstructed;
                              }
                            }
                            return reconstructed;
                          } else {
                            // Convert to array
                            const arr = Object.keys(obj)
                              .sort((a, b) => parseInt(a) - parseInt(b))
                              .map((k) => normalizeNumericKeys(obj[k]));
                            return arr;
                          }
                        }

                        // Recursively normalize nested objects
                        const normalized = {};
                        for (const key of keys) {
                          normalized[key] = normalizeNumericKeys(obj[key]);
                        }
                        return normalized;
                      };

                      data = normalizeNumericKeys(data);
                      logger.info(
                        `[openAiStreamRequest] After normalization - data keys: ${Object.keys(
                          data
                        )}`
                      );
                      logger.info(
                        `[openAiStreamRequest] After normalization - choices type: ${typeof data.choices}, isArray: ${Array.isArray(
                          data.choices
                        )}`
                      );

                      const choices = data.choices;

                      if (choices?.[0]?.delta?.content) {
                        const deltaContent = choices[0].delta.content;
                        content += deltaContent;
                        logger.info(
                          `[openAiStreamRequest] Added delta content: ${deltaContent}`
                        );
                      } else if (choices?.[0]?.message?.content) {
                        content = choices[0].message.content;
                        logger.info(
                          `[openAiStreamRequest] Set full content: ${content.length} chars`
                        );
                      } else if (choices?.[0]) {
                        // Check if choices[0] has other properties with content
                        const choice = choices[0];
                        logger.info(
                          `[openAiStreamRequest] Choice properties:`,
                          Object.keys(choice)
                        );

                        if (choice.delta) {
                          logger.info(
                            `[openAiStreamRequest] Delta properties:`,
                            Object.keys(choice.delta)
                          );

                          // Extract delta content even if it's a numeric-keyed object
                          let deltaContent = "";
                          const delta = choice.delta;

                          if (
                            typeof delta === "object" &&
                            Object.keys(delta).every((key) => /^\d+$/.test(key))
                          ) {
                            // Delta is also numeric-keyed, extract content manually
                            const contentKeyId = Object.keys(delta).find(
                              (key) => {
                                const value = delta[key];
                                return (
                                  typeof value === "string" && value.length > 5
                                ); // Likely actual content
                              }
                            );

                            if (contentKeyId) {
                              deltaContent = delta[contentKeyId];
                              logger.info(
                                `[openAiStreamRequest] Found delta content at key ${contentKeyId}: ${deltaContent.substring(
                                  0,
                                  50
                                )}...`
                              );
                            }
                          } else if (delta.content) {
                            deltaContent = delta.content;
                            logger.info(
                              `[openAiStreamRequest] Found delta.content: ${deltaContent}`
                            );
                          }

                          if (deltaContent) {
                            content += deltaContent;
                            logger.info(
                              `[openAiStreamRequest] Added delta content: ${deltaContent}`
                            );
                          }
                        }

                        if (choice.text) {
                          const textContent = choice.text;
                          content += textContent;
                          logger.info(
                            `[openAiStreamRequest] Added text content: ${textContent}`
                          );
                        }
                      } else {
                        logger.info(
                          `[openAiStreamRequest] No content in this data chunk - choices:`,
                          choices
                        );
                      }
                    } catch (e) {
                      logger.warn(
                        `[openAiStreamRequest] Failed to parse SSE line: ${line.substring(
                          0,
                          100
                        )} | Error: ${e.message}`
                      );
                    }
                  }
                }

                logger.info(
                  `[openAiStreamRequest] Final extracted content from SSE: ${content.length} chars`
                );
                logger.info(
                  `[openAiStreamRequest] Content preview: ${content.substring(
                    0,
                    200
                  )}...`
                );

                return {
                  stream: false,
                  content: content || "❌ Não consegui processar sua mensagem.",
                  choices: [{ message: { content: content } }],
                  usage: null,
                };
              }

              // Try to parse as regular JSON
              const jsonData = JSON.parse(text);
              return {
                stream: false,
                content:
                  jsonData.choices?.[0]?.message?.content ||
                  jsonData.content ||
                  text,
                choices: jsonData.choices || [],
                usage: jsonData.usage || null,
              };
            } catch (parseError) {
              logger.error(
                `[openAiStreamRequest] Failed to parse response as JSON/SSE:`,
                parseError
              );
              throw new Error(
                `OpenAI Streaming: Could not process retry response format`
              );
            }
          }
        }

        throw new Error(`OpenAI Streaming: No response body from retry`);
      }

      throw new Error(
        `OpenAI Streaming error ${response.status}: ${errorMessage}`
      );
    }

    const responseBody = response.body;
    if (!responseBody) {
      throw new Error("OpenAI Streaming: No response body");
    }

    const decoder = new TextDecoder();
    const reader =
      typeof responseBody.getReader === "function" ? responseBody.getReader() : null;
    const asyncIterator =
      !reader && typeof responseBody[Symbol.asyncIterator] === "function"
        ? responseBody[Symbol.asyncIterator]()
        : null;

    async function* generator() {
      let buffer = "";

      // Handle both WebStream reader and Node.js async iterator
      const readChunk = async () => {
        if (reader && (reader.getReader || reader.read)) {
          // WebStream API
          return await reader.read();
        }
        if (asyncIterator && typeof asyncIterator.next === "function") {
          const { value, done } = await asyncIterator.next();
          return { done, value };
        }
        throw new Error("OpenAI Streaming: Body is not readable");
      };

      while (true) {
        const { done, value } = await readChunk();
        if (done) {
          if (buffer.length > 0) {
            // Process any remaining data in the buffer
            try {
              const parsed = JSON.parse(buffer);
              const yieldValue = {};
              if (parsed.choices?.[0]?.delta?.content)
                yieldValue.content = parsed.choices[0].delta.content;
              if (parsed.choices?.[0]?.delta?.tool_calls)
                yieldValue.function_calls = parsed.choices[0].delta.tool_calls;
              if (Object.keys(yieldValue).length > 0) yield yieldValue;
            } catch (e) {
              logger.warn("[generator] Failed to parse final stream chunk", e);
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Keep the last partial line in the buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6).trim();
            if (data === "[DONE]") {
              return;
            }
            if (data) {
              try {
                const parsed = JSON.parse(data);
                const yieldValue = {};
                if (parsed.choices?.[0]?.delta?.content)
                  yieldValue.content = parsed.choices[0].delta.content;
                if (parsed.choices?.[0]?.delta?.tool_calls)
                  yieldValue.function_calls =
                    parsed.choices[0].delta.tool_calls;

                if (Object.keys(yieldValue).length > 0) {
                  yield yieldValue;
                }
              } catch (e) {
                logger.warn(
                  `[generator] Failed to parse stream chunk: ${data}`,
                  e
                );
              }
            }
          }
        }
      }
    }

    return generator();
  };

  try {
    const result = await run();
    clearTimeout(timeout);
    return result;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

async function openRouterStreamRequest({ url, apiKey, body, headers = {} }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  const run = async () => {
    logger.debug("[openRouterStreamRequest] Fetch helper available");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...headers,
      },
      body: JSON.stringify({ ...body, stream: true }),
      signal: controller.signal,
    });
    logger.debug(
      `[openRouterStreamRequest] Response status: ${response.status}`
    );

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      // Enhanced error handling for OpenRouter nested error structure
      const errorMessage =
        data?.error?.error?.message ||
        data?.error?.message ||
        data?.message ||
        response.statusText;

      // Check if it's a parameter error that can be retried
      if (
        errorMessage.includes("Unsupported parameter") ||
        errorMessage.includes("does not support") ||
        errorMessage.includes("temperature") ||
        errorMessage.includes("max_tokens") ||
        errorMessage.includes("max_completion_tokens")
      ) {
        logger.warn(
          `[openRouterStreamRequest] Parameter error, retrying with minimal parameters: ${errorMessage}`
        );

        // Remove problematic parameters and retry
        const minimalBody = {
          model: body.model,
          messages: body.messages,
          stream: true,
        };

        // Add safe max_tokens for OpenRouter
        if (url.includes("openrouter.ai")) {
          minimalBody.max_completion_tokens = 200;
        }

        logger.info(
          `[openRouterStreamRequest] Retry streaming with minimal body:`,
          minimalBody
        );

        // Retry with minimal parameters
        const retryResponse = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            ...headers,
          },
          body: JSON.stringify(minimalBody),
          signal: controller.signal,
        });

        if (!retryResponse.ok) {
          const retryData = await retryResponse.json().catch(() => null);
          const retryErrorMessage =
            retryData?.error?.error?.message ||
            retryData?.error?.message ||
            retryData?.message ||
            retryResponse.statusText;
          throw new Error(
            `OpenRouter Streaming error ${retryResponse.status}: ${retryErrorMessage}`
          );
        }

        if (!retryResponse.body) {
          throw new Error("OpenRouter Streaming: No response body");
        }

        return retryResponse.body;
      }

      throw new Error(
        `OpenRouter Streaming error ${response.status}: ${errorMessage}`
      );
    }

    if (!response.body) {
      throw new Error("OpenRouter Streaming: No response body");
    }

    logger.debug(
      `[openRouterStreamRequest] response.body constructor: ${response.body.constructor.name}`
    );

    // Handle Node.js PassThrough stream
    const responseBody = response.body;
    let reader =
      responseBody && typeof responseBody.getReader === "function"
        ? responseBody.getReader()
        : typeof responseBody?.[Symbol.asyncIterator] === "function"
        ? responseBody[Symbol.asyncIterator]()
        : null;

    if (!reader) {
      throw new Error("OpenRouter Streaming: Body is not readable");
    }
    const decoder = new TextDecoder();

    async function* generator() {
      let buffer = "";

      // Handle both WebStream reader and Node.js async iterator
      const readChunk = async () => {
        if (reader.getReader || reader.read) {
          // WebStream API
          return await reader.read();
        } else {
          // Node.js async iterator
          const { value, done } = await reader.next();
          return { done, value };
        }
      };

      while (true) {
        const { done, value } = await readChunk();
        if (done) {
          if (buffer.length > 0) {
            // Process any remaining data in the buffer
            try {
              const parsed = JSON.parse(buffer);
              const yieldValue = {};
              if (parsed.choices?.[0]?.delta?.content)
                yieldValue.content = parsed.choices[0].delta.content;
              if (parsed.choices?.[0]?.delta?.tool_calls)
                yieldValue.function_calls = parsed.choices[0].delta.tool_calls;
              if (Object.keys(yieldValue).length > 0) yield yieldValue;
            } catch (e) {
              logger.warn("[generator] Failed to parse final stream chunk", e);
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Keep the last partial line in the buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6).trim();
            if (data === "[DONE]") {
              return;
            }
            if (data) {
              try {
                const parsed = JSON.parse(data);
                const yieldValue = {};
                if (parsed.choices?.[0]?.delta?.content)
                  yieldValue.content = parsed.choices[0].delta.content;
                if (parsed.choices?.[0]?.delta?.tool_calls)
                  yieldValue.function_calls =
                    parsed.choices[0].delta.tool_calls;

                if (Object.keys(yieldValue).length > 0) {
                  yield yieldValue;
                }
              } catch (e) {
                logger.warn(
                  `[generator] Failed to parse stream chunk: ${data}`,
                  e
                );
              }
            }
          }
        }
      }
    }

    return generator();
  };

  try {
    const result = await run();
    clearTimeout(timeout);
    return result;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

async function callOpenRouter({
  baseUrl,
  apiKey,
  messages,
  model,
  temperature,
  maxTokens,
  topP,
  systemPrompt,
  stream = false,
  tools = null,
  tool_choice = "auto",
}) {
  const url = buildUrl(
    baseUrl || OPENROUTER_DEFAULT_BASE_URL,
    "/chat/completions"
  );
  const config = PROVIDER_PARAMETER_CONFIGS.openrouter;

  // Debug API key issue
  logger.info(
    `[OpenRouter] Debug - API Key length: ${
      apiKey?.length
    }, starts with: ${apiKey?.substring(0, 10)}...`
  );

  if (!apiKey || apiKey.length < 20) {
    throw new Error(`Invalid OpenRouter API key: length=${apiKey?.length}`);
  }

  const body = {
    model,
    messages: toOpenAIMessages(messages, systemPrompt),
  };

  // Adiciona tools se fornecidos
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = tool_choice;
  }

  // Apply provider-specific parameters with model restrictions
  if (typeof temperature === "number") {
    // Some OpenRouter models only support temperature = 1
    const restrictedModels = ["gpt-5-nano-2025-08-07", "z-ai/glm-4.5-air:free"]; // Add free models
    if (!restrictedModels.includes(model)) {
      body.temperature = clamp(
        temperature,
        config.temperatureRange[0],
        config.temperatureRange[1]
      );
    } else {
      logger.warn(
        `[OpenRouter] Model ${model} only supports temperature=1, skipping temperature parameter`
      );
    }
  }

  // Ultra-fast optimization for free models
  if (model.includes(":free")) {
    let finalMaxTokens = 300; // Base ultra-fast

    // Special case for very slow models
    if (model.includes("z-ai/")) {
      finalMaxTokens = 200; // MEGA-FAST for z-ai
    }

    if (maxTokens && config.supportsMaxTokens) {
      body[config.maxTokensField] = Math.min(maxTokens, finalMaxTokens);
    } else {
      body[config.maxTokensField] = finalMaxTokens;
    }

    // Remove all unnecessary parameters for speed
    body.stream = true;
    delete body.top_p;
    delete body.frequency_penalty;
    delete body.presence_penalty;

    logger.info(
      `[OpenRouter] Ultra-fast mode: maxTokens=${
        body[config.maxTokensField]
      }, stream=true`
    );
  } else {
    // Normal paid models
    if (maxTokens && config.supportsMaxTokens) {
      body[config.maxTokensField] = maxTokens;
    }
    if (topP !== undefined && config.supportsTopP) {
      body.top_p = topP;
    }
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://gg.ai",
    "X-Title": process.env.OPENROUTER_APP_NAME || "CEO Dashboard",
  };

  body.stream = stream;
  logger.info(
    `[OpenRouter] Using model: ${model}, temperature: ${
      body.temperature || "default"
    }, maxTokens field: ${config.maxTokensField}, maxTokens: ${
      body[config.maxTokensField] || "default"
    }, stream: ${body.stream}`
  );

  if (stream) {
    // Streaming response for OpenRouter
    return await openRouterStreamRequest({ url, apiKey, body, headers });
  } else {
    const data = await openAiStyleRequest({ url, apiKey, body, headers });

    // Enhanced debugging for OpenRouter responses
    logger.info(`[OpenRouter] Response debug:`, {
      status: data?.choices?.[0]?.message ? "has_content" : "no_content",
      choices_count: data?.choices?.length || 0,
      usage: data?.usage || "no_usage",
      model: data?.model || "unknown",
    });

    if (!data?.choices?.[0]?.message?.content) {
      logger.error(`[OpenRouter] No content in response:`, data);

      // Check if it's a rate limit or model error
      const errorDetail =
        data?.error?.message || data?.error?.detail || JSON.stringify(data);

      if (errorDetail.includes("rate_limit") || errorDetail.includes("quota")) {
        throw new Error(
          `OpenRouter rate limit exceeded on free model. Try a different model or upgrade API key.`
        );
      }

      throw new Error(
        `OpenRouter model ${model} returned no content. Check model availability or API key.`
      );
    }

    const content = data?.choices?.[0]?.message?.content || "";
    const totalTokens = data?.usage?.total_tokens || 0;

    logger.info(
      `[OpenRouter] Success: content_length=${
        content?.length || 0
      }, tokens=${totalTokens}`
    );

    return {
      content,
      usage: data?.usage || null,
      tokensUsed: totalTokens,
    };
  }
}

async function callGoogle({
  baseUrl,
  apiKey,
  messages,
  model,
  temperature,
  maxTokens,
  topP,
  systemPrompt,
  stream = false,
  tools = null,
  tool_choice = "auto",
}) {
  console.error(`[Google] DEBUG: callGoogle invoked with model=${model}`);
  console.error(`[Google] DEBUG: apiKey present=${!!apiKey}`);
  console.error(
    `[Google] DEBUG: baseUrl=${baseUrl || GEMINI_DEFAULT_BASE_URL}`
  );

  // Google Generative AI (Gemini) API
  // Note: GEMINI_DEFAULT_BASE_URL already includes /v1beta, so we just add /models/
  const url = `${
    baseUrl || GEMINI_DEFAULT_BASE_URL
  }/models/${model}:generateContent?key=${apiKey}`;

  console.error(
    `[Google] DEBUG: Constructed URL: ${url.substring(
      0,
      url.lastIndexOf("?")
    )}?key=***`
  );

  // Transform messages to Gemini format
  const contents = messages.map((msg) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }],
  }));

  const body = {
    contents,
    generationConfig: {},
  };

  // Add system prompt if provided (Gemini uses systemInstruction)
  if (systemPrompt) {
    body.systemInstruction = {
      parts: [{ text: systemPrompt }],
    };
  }

  // Apply temperature
  if (typeof temperature === "number") {
    body.generationConfig.temperature = clamp(temperature, 0, 2);
  }

  // Apply maxTokens as maxOutputTokens
  if (maxTokens) {
    body.generationConfig.maxOutputTokens = sanitizeMaxTokens(maxTokens, 1024);
  }

  // Apply topP
  if (typeof topP === "number") {
    body.generationConfig.topP = clamp(topP, 0, 1);
  }

  logger.info(
    `[Google] Using model: ${model}, temperature: ${temperature}, maxTokens: ${maxTokens}`
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = data?.error?.message || response.statusText;
      console.error(
        `[Google] API Error - Status: ${response.status}, Message: ${errorMessage}`
      );
      console.error(`[Google] Full response:`, JSON.stringify(data));
      throw new Error(`Provider error ${response.status}: ${errorMessage}`);
    }

    // Extract text from Gemini response format
    const candidates = data?.candidates || [];
    const content = candidates
      .flatMap((c) => c.content?.parts || [])
      .filter((p) => p.text)
      .map((p) => p.text)
      .join("\n");

    const usageMetadata = data?.usageMetadata || {};
    const totalTokens =
      (usageMetadata.inputTokenCount || 0) +
      (usageMetadata.outputTokenCount || 0);

    return {
      content,
      usage: usageMetadata,
      tokensUsed: totalTokens,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function callAnthropic({
  baseUrl,
  apiKey,
  messages,
  model,
  temperature,
  maxTokens,
  topP,
  systemPrompt,
  stream = false,
  tools = null,
  tool_choice = "auto",
}) {
  const url = buildUrl(baseUrl || ANTHROPIC_DEFAULT_BASE_URL, "/messages");
  const config = PROVIDER_PARAMETER_CONFIGS.anthropic;

  const body = {
    model,
    messages: toAnthropicMessages(messages),
  };

  // Adiciona tools se fornecidos
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = tool_choice;
  }

  // Apply provider-specific parameters
  if (maxTokens && config.supportsMaxTokens) {
    body[config.maxTokensField] = sanitizeMaxTokens(maxTokens, 1024);
  }

  if (typeof temperature === "number") {
    body.temperature = clamp(
      temperature,
      config.temperatureRange[0],
      config.temperatureRange[1]
    );
  }

  if (typeof topP === "number" && config.supportsTopP) {
    body.top_p = clamp(topP, 0, 1);
  }

  if (systemPrompt) {
    body.system = systemPrompt;
  }

  logger.info(
    `[Anthropic] Using model: ${model}, maxTokens field: ${config.maxTokensField}, maxTokens: ${maxTokens}`
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": process.env.ANTHROPIC_API_VERSION || "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      // Enhanced error handling for nested error structure
      const errorMessage =
        data?.error?.error?.message ||
        data?.error?.message ||
        data?.message ||
        response.statusText;
      throw new Error(`Provider error ${response.status}: ${errorMessage}`);
    }

    const textParts =
      data?.content?.filter?.((item) => item.type === "text") || [];
    const content = textParts.map((item) => item.text).join("\n");
    const totalTokens = data?.usage?.output_tokens || 0;

    return {
      content,
      usage: data?.usage || null,
      tokensUsed: totalTokens,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateChatCompletion({
  providerName,
  baseUrl,
  apiKey,
  model,
  messages,
  temperature,
  maxTokens,
  topP,
  systemPrompt,
  stream = false,
  tools = null,
  tool_choice = "auto",
}) {
  if (!messages?.length) {
    throw new Error(
      "At least one message is required to generate a completion"
    );
  }

  logger.info(
    `[generateChatCompletion] Request: provider=${providerName}, model=${model}, stream=${stream}, tools=${
      tools?.length || 0
    }`
  );

  switch (providerName) {
    case "openai":
      return callOpenAI({
        baseUrl,
        apiKey,
        messages,
        model,
        temperature,
        maxTokens,
        topP,
        systemPrompt,
        stream,
        tools,
        tool_choice,
      });
    case "anthropic":
      return callAnthropic({
        baseUrl,
        apiKey,
        messages,
        model,
        temperature,
        maxTokens,
        topP,
        systemPrompt,
        stream,
        tools,
        tool_choice,
      });
    case "deepseek":
      return callOpenAI({
        baseUrl: baseUrl || DEEPSEEK_DEFAULT_BASE_URL,
        apiKey,
        messages,
        model,
        temperature,
        maxTokens,
        topP,
        systemPrompt,
        stream,
        tools,
        tool_choice,
      });
    case "openrouter":
      return callOpenRouter({
        baseUrl,
        apiKey,
        messages,
        model,
        temperature,
        maxTokens,
        topP,
        systemPrompt,
        stream,
        tools,
        tool_choice,
      });
    case "google":
      return callGoogle({
        baseUrl,
        apiKey,
        messages,
        model,
        temperature,
        maxTokens,
        topP,
        systemPrompt,
        stream,
        tools,
        tool_choice,
      });
    default:
      throw new Error(`Unsupported provider: ${providerName}`);
  }
}

export function buildSystemPrompt(conversation) {
  const basePrompt = `# Your role

<identity>
- your name is Sophia (also known as CEO Dashboard Agent)
- you are a powerful AI assistant inside of the CEO Dashboard app
- you are an "AI Agent", a powerful LLM-powered entity that can act & make decisions, with the goal of making the User more productive
- expert em estratégia empresarial e análise de dados para executivos
- integrado ao Brain Cloud com acesso completo ao vault Obsidian e 38+ ferramentas MCP
</identity>

<goal>
- THE ONLY GOAL is to make the User more productive.
- your job is to
  1. communicate with the User
  2. if needed, use MCP tools para achieve what was requested by the user
- only use MCP tools when you need to! if you have enough info to answer, just answer!
- follow the user's instructions for outputting and formatting your message
- the User is using CEO Dashboard in his browser, which allows him to see all the parts of the UI
</goal>

# IMPORTANT: BE DECISIVE

- DO NOT OVERTHINK - trust your gut and go with the most obvious option
- Be aggressive and decisive in your responses - don't second-guess yourself
- When in doubt, GO WITH THE MOST OBVIOUS OPTION immediately
- Keep responses concise and to the point
- Do not waste the user's time. Go with the obvious option.
- If the next step is obvious, do it.

# CURRENT MODE

<current_mode>
AGENTIC
</current_mode>

# Available MCP Tools

- estas ferramentas MCP podem ser usadas quando necessário
- se você está faltando informação que uma das ferramentas pode fornecer, use para obter a info
- quando usar ferramentas MCP, assuma que o usuário está falando sobre tarefas/notas/projetos ATIVOS, aka status=active
- mesmo quando o usuário diz "all tasks", assuma que ele quer "all active tasks" (a menos que explicitamente mencione o contrário)

## CRITICAL RULE: Always Respond Before Tool Calls
**MANDATORY**: You MUST provide a natural response explaining what you're about to do BEFORE making any MCP tool call.
- **NEVER** call a tool sem primeiro explicar o que você está fazendo
- **ALWAYS** include conversational explanation antes de qualquer tool call
- This makes the interaction feel natural and keeps the user informed
- **ALWAYS** return human-readable information when listing. Reply com nomes de tarefas/projetos/notas em vez de IDs

# Instructions

<instructions>
- make the response concise, straight to the point
- !! NEVER DO STUFF THE USER DID NOT ASK FOR !!
- You have to be as reliable and predictable as possible
- Do not end with opt-in questions or hedging closers. Do **not** say: "quer que eu; posso fazer; se você quiser; gostaria que eu; deveria eu"
- Ask AT MOST one necessary clarifying question at the start, not the end
- if the user has attached an image, make sure to analyze it FIRST
- you cannot do multiple things at once, when situation required multiple steps, start with the first step
- **CRITICAL BATCHING RULE**: When user requests multiple operations, batch into single tool call
- **TASK STATUS DEFAULT RULE**: Always work with ACTIVE tasks only unless user explicitly mentions completed/archived/deleted tasks
- **MCP INTEGRATION**: Use Brain Cloud tools para enriquecer respostas com dados reais do vault
- **EXECUTIVE CONTEXT**: Adapte o nível de detalhe ao contexto executivo do CEO Dashboard
</instructions>

# Response format

## MANDATORY: MCP Tool Usage Flow
1. **FIRST**: Always provide response explaining what you're about to do
2. **THEN**: Call the necessary MCP tool(s)
3. **FINALLY**: After tools complete, provide final response with results

Your response MUST always have content, especially when using MCP tools:
- Before tools: Explain what you're about to do
- After tools: Provide the results or confirmation

# Thinking Mode Protocol
When thinking mode is enabled, structure your response in two clear parts:
1. **PROCESSO DE RACIOCÍNIO**: Step-by-step analysis, premises, sources
2. **RESPOSTA FINAL**: Direct, actionable answer

Use format:
---
🧠 **PROCESSO DE RACIOCÍNIO:**
[Detailed reasoning process]

📝 **RESPOSTA FINAL:**
[Direct answer]
---`;

  if (!conversation) {
    return basePrompt;
  }

  const contextualParts = [basePrompt];

  if (conversation.context_type === "project" && conversation.project_name) {
    contextualParts.push(
      `\n**Contexto do Projeto:** Esta conversa está associada ao projeto "${conversation.project_name}". Use este contexto para personalizar suas respostas.`
    );
  }

  if (conversation.context_type === "note" && conversation.context_note_path) {
    contextualParts.push(
      `\n**Contexto da Nota:** Referência à nota ${conversation.context_note_path}. Considere este documento como background relevante.`
    );
  }

  if (conversation.availableTools && conversation.availableTools.length > 0) {
    contextualParts.push(
      `\n**Ferramentas MCP Disponíveis:**\n${conversation.availableTools
        .map((tool) => `- ${tool}`)
        .join("\n")}`
    );
  }

  if (conversation.toolsEnabled) {
    contextualParts.push(
      `\n**Instruções de Tools:** Use as ferramentas MCP proativamente quando relevantes. Priorize semantic_search para buscar conhecimento existente.`
    );
  }

  return contextualParts.join("\n");
}

export function convertMessagesForLLM(messages) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}
