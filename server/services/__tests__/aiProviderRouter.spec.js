import { describe, it, expect, vi, beforeEach } from "vitest";
import { AIProviderRouter } from "../aiProviderRouter.js";
import { MODEL_REGISTRY } from "../aiConfigService.js";

function createRoutingConfig(overrides = {}) {
  const baseModel = MODEL_REGISTRY.openai?.[0] || "gpt-4o-mini";

  const defaultConfig = {
    selection: {
      provider: "openai",
      model: baseModel,
      apiKey: "primary-key",
      temperature: 0.2,
      maxTokens: 256,
    },
    userConfig: {
      apiKeys: {
        openai: "primary-key",
        anthropic: "fallback-key",
        google: "google-key",
      },
      fallbackProvider: "anthropic",
      customProviders: {},
    },
    context: "chat",
  };

  return {
    ...defaultConfig,
    ...overrides,
    selection: {
      ...defaultConfig.selection,
      ...(overrides.selection || {}),
    },
    userConfig: {
      ...defaultConfig.userConfig,
      ...(overrides.userConfig || {}),
      apiKeys: {
        ...defaultConfig.userConfig.apiKeys,
        ...(overrides.userConfig?.apiKeys || {}),
      },
    },
  };
}

function createPayload(overrides = {}) {
  return {
    messages: [{ role: "user", content: "Hello" }],
    systemPrompt: "sys",
    temperature: 0.1,
    maxTokens: 128,
    topP: 1,
    stream: false,
    tools: null,
    tool_choice: "auto",
    ...overrides,
  };
}

function createStream(chunks) {
  return (async function* () {
    for (const chunk of chunks) {
      yield chunk;
    }
  })();
}

describe("AIProviderRouter", () => {
  let router;

  beforeEach(() => {
    router = new AIProviderRouter();
  });

  it("routes request via primary provider", async () => {
    const payload = createPayload();
    const routingConfig = createRoutingConfig();

    const response = { content: "ok" };
    router.callProvider = vi.fn(async () => response);

    const result = await router.routeRequest(
      routingConfig.selection.provider,
      routingConfig.selection.model,
      payload,
      routingConfig
    );

    expect(result).toBe(response);
    expect(router.callProvider).toHaveBeenCalledWith(
      routingConfig.selection.provider,
      routingConfig.selection.model,
      expect.objectContaining({ messages: payload.messages }),
      expect.objectContaining({ apiKey: routingConfig.selection.apiKey })
    );
  });

  it("falls back to secondary provider when primary fails", async () => {
    const payload = createPayload();
    const routingConfig = createRoutingConfig();

    const primaryError = Object.assign(
      new Error("Provider error 500: failure"),
      { statusCode: 500 }
    );

    router.callProvider = vi.fn(async (provider) => {
      if (provider === "openai") {
        throw primaryError;
      }
      return { content: "fallback" };
    });

    const result = await router.routeRequest(
      routingConfig.selection.provider,
      routingConfig.selection.model,
      payload,
      routingConfig
    );

    expect(result).toEqual({ content: "fallback" });
    expect(router.callProvider).toHaveBeenCalledTimes(2);
    expect(router.callProvider.mock.calls[1][0]).toBe("anthropic");
  });

  it("throws ProviderError when all providers fail", async () => {
    const payload = createPayload();
    const routingConfig = createRoutingConfig();

    router.callProvider = vi.fn(async () => {
      throw Object.assign(new Error("Provider error 500: failure"), {
        statusCode: 500,
      });
    });

    await expect(
      router.routeRequest(
        routingConfig.selection.provider,
        routingConfig.selection.model,
        payload,
        routingConfig
      )
    ).rejects.toMatchObject({
      code: "ALL_FAILED",
      provider: routingConfig.selection.provider,
    });
  });

  it("streams chunks when stream=true", async () => {
    const payload = createPayload({ stream: true });
    const routingConfig = createRoutingConfig();

    router.callProvider = vi.fn(async () => createStream(["foo", "bar"]));

    const chunks = [];

    await router.routeStreamingRequest(
      routingConfig.selection.provider,
      routingConfig.selection.model,
      payload,
      routingConfig,
      (chunk) => chunks.push(chunk)
    );

    expect(chunks).toEqual(["foo", "bar"]);
    expect(router.callProvider).toHaveBeenCalledTimes(1);
  });

  it("rejects when API key is missing", async () => {
    const payload = createPayload();
    const routingConfig = createRoutingConfig({
      selection: { apiKey: "" },
      userConfig: { apiKeys: { openai: "" } },
    });

    await expect(
      router.routeRequest(
        routingConfig.selection.provider,
        routingConfig.selection.model,
        payload,
        routingConfig
      )
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });

  it("propagates fatal errors without fallback", async () => {
    const payload = createPayload();
    const routingConfig = createRoutingConfig();

    const fatalError = Object.assign(
      new Error("Provider error 401: invalid key"),
      { code: "INVALID_KEY", statusCode: 401 }
    );

    router.callProvider = vi.fn(async () => {
      throw fatalError;
    });

    await expect(
      router.routeRequest(
        routingConfig.selection.provider,
        routingConfig.selection.model,
        payload,
        routingConfig
      )
    ).rejects.toMatchObject({
      code: "FATAL",
      provider: routingConfig.selection.provider,
    });

    expect(router.callProvider).toHaveBeenCalledTimes(1);
  });
});
