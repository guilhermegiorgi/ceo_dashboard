import { generateChatCompletion } from "./aiChatClient.js";
import {
  getModelConfigForUser,
  getUserAIConfig,
  MODEL_REGISTRY,
} from "./aiConfigService.js";
import { logger } from "../src/utils/logger.js";
import { ProviderError } from "./errors.js";

const FALLBACK_PRIORITY = [
  "openai",
  "anthropic",
  "google",
  "perplexity",
  "openrouter",
];

function sanitizeKey(apiKey) {
  if (!apiKey) {
    return "";
  }
  return typeof apiKey === "string" ? apiKey.trim() : "";
}

function isAsyncIterable(value) {
  return value && typeof value[Symbol.asyncIterator] === "function";
}

function extractChunkText(chunk) {
  if (!chunk) {
    return "";
  }

  if (typeof chunk === "string") {
    return chunk;
  }

  if (typeof chunk === "object") {
    if (typeof chunk.content === "string") {
      return chunk.content;
    }

    if (Array.isArray(chunk.content)) {
      return chunk.content.join("");
    }

    if (chunk.choices?.[0]?.delta?.content) {
      return chunk.choices[0].delta.content;
    }

    if (Array.isArray(chunk.choices)) {
      const first = chunk.choices[0];
      if (typeof first?.message?.content === "string") {
        return first.message.content;
      }
    }
  }

  return "";
}

export class AIProviderRouter {
  async routeChat({
    user,
    messages,
    systemPrompt,
    context = "chat",
    overrides = {},
    stream = false,
    tools = null,
    tool_choice = "auto",
    onChunk,
  }) {
    if (!user || !user.id) {
      throw new ProviderError(
        "User context is required to resolve AI provider config",
        "INVALID_CONTEXT",
        "system"
      );
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new ProviderError(
        "At least one message is required to route the request",
        "INVALID_REQUEST",
        "system"
      );
    }

    if (stream && typeof onChunk !== "function") {
      throw new ProviderError(
        "Streaming requests require an onChunk handler",
        "INVALID_REQUEST",
        "system"
      );
    }

    const [userConfig, selection] = await Promise.all([
      getUserAIConfig(user),
      getModelConfigForUser(user, context, overrides),
    ]);

    const routingConfig = {
      userConfig,
      selection,
      context,
    };

    const payload = {
      messages,
      systemPrompt,
      temperature: selection.temperature,
      maxTokens: selection.maxTokens,
      topP: selection.topP,
      stream,
      tools,
      tool_choice,
    };

    if (stream) {
      await this.routeStreamingRequest(
        selection.provider,
        selection.model,
        payload,
        routingConfig,
        onChunk
      );
      return;
    }

    return this.routeRequest(
      selection.provider,
      selection.model,
      payload,
      routingConfig
    );
  }

  async routeRequest(provider, model, payload, routingConfig) {
    const validatedModel = this.resolveModelForProvider(
      model,
      provider,
      routingConfig
    );

    const apiKey = this.resolveApiKey(provider, routingConfig);
    const validation = this.validateRequest(provider, validatedModel, apiKey);

    if (!validation.valid) {
      throw new ProviderError(
        validation.error || "Invalid provider configuration",
        "INVALID_REQUEST",
        provider,
        { model: validatedModel }
      );
    }

    try {
      logger.info(
        `[AIProviderRouter] Routing request provider=${provider}, model=${validatedModel}, stream=${
          payload.stream === true
        }`
      );

      return await this.callProvider(provider, validatedModel, payload, {
        ...routingConfig,
        apiKey,
      });
    } catch (error) {
      this.attachStatusCode(error);
      this.logError(provider, error, { attempt: "primary" });
      return this.handleProviderFailure(
        provider,
        error,
        validatedModel,
        payload,
        routingConfig
      );
    }
  }

  async routeStreamingRequest(
    provider,
    model,
    payload,
    routingConfig,
    onChunk
  ) {
    const streamingPayload = { ...payload, stream: true };

    const apiKey = this.resolveApiKey(provider, routingConfig);
    const validatedModel = this.resolveModelForProvider(
      model,
      provider,
      routingConfig
    );
    const validation = this.validateRequest(provider, validatedModel, apiKey);

    if (!validation.valid) {
      throw new ProviderError(
        validation.error || "Invalid provider configuration",
        "INVALID_REQUEST",
        provider,
        { model: validatedModel }
      );
    }

    try {
      const result = await this.callProvider(
        provider,
        validatedModel,
        streamingPayload,
        {
          ...routingConfig,
          apiKey,
        }
      );
      await this.processStream(result, onChunk);
    } catch (error) {
      this.attachStatusCode(error);
      this.logError(provider, error, { attempt: "primary", stream: true });
      const fallbackResult = await this.handleProviderFailure(
        provider,
        error,
        validatedModel,
        streamingPayload,
        routingConfig
      );

      if (fallbackResult) {
        await this.processStream(fallbackResult, onChunk);
      }
    }
  }

  async handleProviderFailure(
    originalProvider,
    error,
    model,
    payload,
    routingConfig
  ) {
    if (!this.isRecoverableError(error)) {
      throw new ProviderError(
        error.message || "Unrecoverable provider error",
        "FATAL",
        originalProvider,
        { cause: error }
      );
    }

    const fallbackProviders = this.getFallbackProviders(
      originalProvider,
      routingConfig
    );

    if (!fallbackProviders.length) {
      throw new ProviderError(
        "All providers failed. Check API keys and connection.",
        "ALL_FAILED",
        originalProvider,
        {
          cause: error,
          fallbackAttempts: 0,
        }
      );
    }

    for (const fallbackProvider of fallbackProviders) {
      const apiKey = this.resolveApiKey(fallbackProvider, routingConfig);
      const fallbackModel = this.resolveModelForProvider(
        model,
        fallbackProvider,
        routingConfig
      );

      const validation = this.validateRequest(
        fallbackProvider,
        fallbackModel,
        apiKey
      );

      if (!validation.valid) {
        this.logError(fallbackProvider, new Error(validation.error), {
          attempt: "fallback_validation",
        });
        continue;
      }

      try {
        logger.warn(
          `[AIProviderRouter] Fallback attempt provider=${fallbackProvider}, model=${fallbackModel}`
        );

        return await this.callProvider(
          fallbackProvider,
          fallbackModel,
          payload,
          {
            ...routingConfig,
            apiKey,
          }
        );
      } catch (fallbackError) {
        this.attachStatusCode(fallbackError);
        this.logError(fallbackProvider, fallbackError, {
          attempt: "fallback",
        });
      }
    }

    throw new ProviderError(
      "All providers failed. Check API keys and connection.",
      "ALL_FAILED",
      originalProvider,
      {
        cause: error,
        fallbackAttempts: fallbackProviders.length,
      }
    );
  }

  validateRequest(provider, model, apiKey) {
    if (!provider || !model) {
      return {
        valid: false,
        error: "Provider and model required",
      };
    }

    if (!sanitizeKey(apiKey)) {
      return {
        valid: false,
        error: `No API key for ${provider}`,
      };
    }

    // Note: We don't validate against MODEL_REGISTRY here because:
    // 1. Users load models dynamically from provider APIs
    // 2. MODEL_REGISTRY is just a hardcoded fallback for when API calls fail
    // 3. New models are added to providers frequently, so static validation is unreliable
    // 4. The provider API itself will validate the model during the actual call
    // 5. Trust the user's selection if they have a valid API key

    return { valid: true };
  }

  getFallbackProviders(originalProvider, routingConfig) {
    const providerSet = new Set();
    const userConfig = routingConfig?.userConfig || {};
    const fallbackPreference = userConfig.fallbackProvider;

    for (const provider of FALLBACK_PRIORITY) {
      if (provider === originalProvider) {
        continue;
      }

      if (sanitizeKey(this.resolveApiKey(provider, routingConfig))) {
        providerSet.add(provider);
      }
    }

    if (
      fallbackPreference &&
      fallbackPreference !== originalProvider &&
      sanitizeKey(this.resolveApiKey(fallbackPreference, routingConfig))
    ) {
      providerSet.add(fallbackPreference);
    }

    return Array.from(providerSet);
  }

  isRecoverableError(error) {
    if (!error) {
      return false;
    }

    if (error instanceof ProviderError) {
      return error.recoverable;
    }

    const statusCode = this.extractStatusCode(error);
    const code = error.code || error.name;

    if (statusCode) {
      if (statusCode >= 500 || statusCode === 429 || statusCode === 408) {
        return true;
      }

      if ([401, 402, 403, 404].includes(statusCode)) {
        return false;
      }
    }

    if (typeof code === "string") {
      const fatalCodes = [
        "INVALID_KEY",
        "AUTH_FAILED",
        "MODEL_NOT_FOUND",
        "FATAL",
      ];

      if (fatalCodes.includes(code)) {
        return false;
      }

      const recoverableCodes = [
        "ETIMEDOUT",
        "ECONNRESET",
        "EAI_AGAIN",
        "TIMEOUT",
        "ENOTFOUND",
      ];

      if (recoverableCodes.includes(code)) {
        return true;
      }
    }

    return true;
  }

  async callProvider(provider, model, payload, routingConfig) {
    const { apiKey } = routingConfig;
    const baseUrl = this.resolveBaseUrl(provider, routingConfig);

    const callArgs = {
      providerName: provider,
      baseUrl,
      apiKey,
      model,
      messages: payload.messages,
      temperature: payload.temperature,
      maxTokens: payload.maxTokens,
      topP: payload.topP,
      systemPrompt: payload.systemPrompt,
      stream: payload.stream === true,
      tools: payload.tools,
      tool_choice: payload.tool_choice,
    };

    return generateChatCompletion(callArgs);
  }

  async processStream(result, onChunk) {
    if (!result) {
      return;
    }

    if (isAsyncIterable(result)) {
      for await (const chunk of result) {
        const text = extractChunkText(chunk);
        if (text) {
          onChunk(text);
        }
      }
      return;
    }

    const text = extractChunkText(result);
    if (text) {
      onChunk(text);
    }
  }

  resolveApiKey(provider, routingConfig) {
    const selection = routingConfig?.selection;
    const userConfig = routingConfig?.userConfig || {};
    const apiKeys = userConfig.apiKeys || {};

    if (!provider) {
      return "";
    }

    if (selection && provider === selection.provider) {
      if (sanitizeKey(selection.apiKey)) {
        return selection.apiKey;
      }

      if (selection.customProviderId) {
        return apiKeys[selection.customProviderId] || "";
      }
    }

    return apiKeys[provider] || "";
  }

  resolveBaseUrl(provider, routingConfig) {
    const selection = routingConfig?.selection;
    const userConfig = routingConfig?.userConfig || {};
    const customProviders = userConfig.customProviders || {};

    if (selection && provider === selection.provider) {
      if (selection.baseUrl) {
        return selection.baseUrl;
      }

      if (selection.customProviderId) {
        const customConfig = customProviders[selection.customProviderId];
        if (customConfig?.baseUrl) {
          return customConfig.baseUrl;
        }
      }
    }

    const customConfig = customProviders[provider];
    if (customConfig?.baseUrl) {
      return customConfig.baseUrl;
    }

    return undefined;
  }

  resolveModelForProvider(model, provider, routingConfig) {
    const selection = routingConfig?.selection;

    if (selection && provider === selection.provider) {
      return selection.model || model;
    }

    const registry = MODEL_REGISTRY?.[provider];

    if (Array.isArray(registry) && registry.length > 0) {
      if (registry.includes(model)) {
        return model;
      }
      return registry[0];
    }

    return model;
  }

  logError(provider, error, context = {}) {
    const statusCode = error?.statusCode || this.extractStatusCode(error);

    logger.error(`[AIProviderRouter] ${provider} error`, {
      message: error?.message,
      code: error?.code,
      statusCode,
      context,
    });
  }

  attachStatusCode(error) {
    if (!error) {
      return;
    }

    if (typeof error.statusCode === "number") {
      return;
    }

    const status = this.extractStatusCode(error);
    if (status) {
      error.statusCode = status;
    }
  }

  extractStatusCode(error) {
    if (!error) {
      return undefined;
    }

    if (typeof error.statusCode === "number") {
      return error.statusCode;
    }

    const source = typeof error === "string" ? error : error.message;
    if (!source) {
      return undefined;
    }

    const statusMatch = source.match(/\b(\d{3})\b/);
    if (statusMatch) {
      const statusCode = Number.parseInt(statusMatch[1], 10);
      if (!Number.isNaN(statusCode)) {
        return statusCode;
      }
    }

    return undefined;
  }
}

export const aiProviderRouter = new AIProviderRouter();

export default aiProviderRouter;
