import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import apiClient, {
  APIClient,
  type RequestOptions,
} from "../services/apiClient";
import type {
  AIProvider as ProviderKey,
  AIProviderConfig,
  ModelContext,
  ModelInfo,
} from "../components/settings/types";

const APIContext = createContext<APIClient | null>(null);

type APIHookError = {
  success: false;
  error: string;
  code?: string;
};

type APIHelpers = {
  client: APIClient;
  loading: boolean;
  error: APIHookError | null;
  clearError: () => void;
  get: <T>(endpoint: string, options?: Omit<RequestOptions, "method">) => Promise<T>;
  post: <T>(endpoint: string, options?: Omit<RequestOptions, "method">) => Promise<T>;
  put: <T>(endpoint: string, options?: Omit<RequestOptions, "method">) => Promise<T>;
  del: <T>(endpoint: string, options?: Omit<RequestOptions, "method">) => Promise<T>;
  delete: <T>(endpoint: string, options?: Omit<RequestOptions, "method">) => Promise<T>;
  getAIConfig: (forceRefresh?: boolean) => Promise<AIProviderConfig>;
  updateAIConfig: (
    context: ModelContext | null,
    configPatch: Partial<AIProviderConfig>
  ) => Promise<{ success: boolean; config?: AIProviderConfig }>;
  testAIProvider: (
    providerOrContext: ProviderKey | ModelContext,
    options?: { apiKey?: string; selection?: { provider: ProviderKey; model: string } }
  ) => Promise<{ connected: boolean; error?: string; code?: string; provider?: ProviderKey; model?: string }>;
  getProviderModels: (provider: ProviderKey) => Promise<ModelInfo[]>;
  sendChatWithProvider: (
    message: string,
    providerOverride?: { provider: ProviderKey; model: string }
  ) => Promise<Response>;
  updateFallbackProvider: (
    provider: ProviderKey
  ) => Promise<{ success: boolean; config?: AIProviderConfig }>;
};

type APIWithHelpers = APIClient & APIHelpers;

const isDev =
  typeof process !== "undefined" && process.env.NODE_ENV === "development";

const normalizeError = (error: unknown): APIHookError => {
  if (error && typeof error === "object") {
    type ErrorShape = {
      message?: unknown;
      error?: unknown;
      code?: unknown;
    };

    const errObj = error as ErrorShape;
    const message =
      typeof errObj.message === "string"
        ? errObj.message
        : typeof errObj.error === "string"
        ? errObj.error
        : "Falha ao executar requisição.";

    const code =
      typeof errObj.code === "string" ? errObj.code : undefined;

    return { success: false, error: message, code };
  }

  if (typeof error === "string" && error.length > 0) {
    return { success: false, error };
  }

  return { success: false, error: "Falha ao executar requisição." };
};

export const APIProvider = ({ children }: { children: React.ReactNode }) => (
  <APIContext.Provider value={apiClient}>{children}</APIContext.Provider>
);

export const useAPI = (): APIWithHelpers => {
  const client = useContext(APIContext);
  if (!client) {
    throw new Error("useAPI must be used within an APIProvider");
  }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<APIHookError | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const executeBase = useCallback(
    async (label: string, fn: () => Promise<unknown>): Promise<unknown> => {
      setLoading(true);
      setError(null);
      try {
        if (isDev) {
          console.debug(`[useAPI] ${label} - start`);
        }
        const result = await fn();
        if (isDev) {
          console.debug(`[useAPI] ${label} - success`);
        }
        return result;
      } catch (err) {
        const normalized = normalizeError(err);
        setError(normalized);
        if (isDev) {
          console.debug(`[useAPI] ${label} - error`, err);
        }
        if (err instanceof Error) {
          throw err;
        }
        throw new Error(normalized.error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  type ExecuteFn = <T>(label: string, fn: () => Promise<T>) => Promise<T>;
  const execute = executeBase as ExecuteFn;

  const getAIConfig = useCallback(
    (forceRefresh = false) =>
      execute("getAIConfig", () => client.getAIConfig(forceRefresh)),
    [client, execute]
  );

  const updateAIConfig = useCallback(
    (context: ModelContext | null, configPatch: Partial<AIProviderConfig>) =>
      execute("updateAIConfig", () =>
        client.updateAIConfig(context, configPatch)
      ),
    [client, execute]
  );

  const testAIProvider = useCallback(
    (
      providerOrContext: ProviderKey | ModelContext,
      options?: { apiKey?: string; selection?: { provider: ProviderKey; model: string } }
    ) =>
      execute("testAIProvider", () =>
        client.testAIProvider(providerOrContext, options)
      ),
    [client, execute]
  );

  const updateFallbackProvider = useCallback(
    (provider: ProviderKey) =>
      execute("updateFallbackProvider", () =>
        client.updateFallbackProvider(provider)
      ),
    [client, execute]
  );

  const getProviderModels = useCallback(
    (provider: ProviderKey) =>
      execute("getProviderModels", () => client.getProviderModels(provider)),
    [client, execute]
  );

  const sendChatWithProvider = useCallback(
    (message: string, providerOverride?: { provider: ProviderKey; model: string }) =>
      execute("sendChatWithProvider", () =>
        client.sendChatMessage(message, providerOverride)
      ),
    [client, execute]
  );

  const handler = useMemo<ProxyHandler<APIWithHelpers>>(
    () => ({
      get(_target, prop) {
        if (prop === "client") return client;
        if (prop === "loading") return loading;
        if (prop === "error") return error;
        if (prop === "clearError") return clearError;
        if (prop === "get") {
          const fn: APIHelpers["get"] = (endpoint, options = {}) =>
            execute(`GET ${endpoint}`, () =>
              client.request(endpoint, { ...options, method: "GET" })
            );
          return fn;
        }

        if (prop === "post") {
          const fn: APIHelpers["post"] = (endpoint, options = {}) =>
            execute(`POST ${endpoint}`, () =>
              client.request(endpoint, { ...options, method: "POST" })
            );
          return fn;
        }

        if (prop === "put") {
          const fn: APIHelpers["put"] = (endpoint, options = {}) =>
            execute(`PUT ${endpoint}`, () =>
              client.request(endpoint, { ...options, method: "PUT" })
            );
          return fn;
        }

        if (prop === "del" || prop === "delete") {
          const fn: APIHelpers["delete"] = (endpoint, options = {}) =>
            execute(`DELETE ${endpoint}`, () =>
              client.request(endpoint, { ...options, method: "DELETE" })
            );
          return fn;
        }
        if (prop === "getAIConfig") return getAIConfig;
        if (prop === "updateAIConfig") return updateAIConfig;
        if (prop === "testAIProvider") return testAIProvider;
        if (prop === "getProviderModels") return getProviderModels;
        if (prop === "sendChatWithProvider") return sendChatWithProvider;
        if (prop === "updateFallbackProvider") return updateFallbackProvider;

        if (typeof prop === "string" || typeof prop === "symbol") {
          const value = Reflect.get(client as object, prop) as unknown;
          if (typeof value === "function") {
            return (value as (...args: unknown[]) => unknown).bind(client);
          }
          return value;
        }
        return undefined;
      },
    }),
    [
      client,
      loading,
      error,
      clearError,
      execute,
      getAIConfig,
      updateAIConfig,
      testAIProvider,
      getProviderModels,
      sendChatWithProvider,
      updateFallbackProvider,
    ]
  );

  return useMemo(
    () => new Proxy({} as APIWithHelpers, handler),
    [handler]
  );
};
