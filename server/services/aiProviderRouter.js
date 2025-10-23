import { generateChatCompletion } from "./aiChatClient.js";
import { getModelConfigForUser } from "./aiConfigService.js";
import { logger } from "../src/utils/logger.js";

class AIProviderRouter {
  async routeChat({
    user,
    messages,
    systemPrompt,
    context = "chat",
    overrides = {},
    stream = false,
    tools = null,
  }) {
    if (!user || !user.id) {
      throw new Error("User context is required to resolve AI provider config");
    }

    const config = await getModelConfigForUser(user, context, overrides);

    if (!config.apiKey) {
      const providerName = config.provider || "unknown";
      throw new Error(
        `No API key configured for provider "${providerName}". Configure em Configurações → IA.`
      );
    }

    const callArgs = {
      providerName: config.provider,
      baseUrl: config.customProviderConfig?.baseUrl,
      apiKey: config.apiKey,
      model: config.model,
      messages,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      systemPrompt,
      stream,
      tools,
    };

    if (config.customProviderConfig?.customHeaders) {
      callArgs.headers = config.customProviderConfig.customHeaders;
    }

    logger.info(
      `[AIProviderRouter] Routing chat via provider=${config.provider}, model=${config.model}, stream=${stream}`
    );

    return generateChatCompletion(callArgs);
  }
}

export const aiProviderRouter = new AIProviderRouter();

export default aiProviderRouter;
