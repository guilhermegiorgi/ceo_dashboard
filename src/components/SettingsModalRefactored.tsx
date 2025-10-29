import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Settings as SettingsIcon,
  Loader2,
  Save,
  Cloud,
  Key,
  Sliders,
  Palette,
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Lightbulb,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { useSettingsPersistence } from "./settings/hooks/useSettingsPersistence";
import { useAPI } from "../hooks/useAPI";
import { showSuccessToast, showErrorToast } from "../lib/toast";
import { BrainCloudSettingsSection } from "./settings/BrainCloudSettingsSection";
import { InterfaceSettingsSection } from "./settings/InterfaceSettingsSection";
import { AIApiKeysSection } from "./settings/AIApiKeysSection";
import { SystemSettingsSection } from "./settings/SystemSettingsSection";
import {
  BrainCloudConnectionMode,
  TestStatus,
  AIProvider,
  ModelContext,
  ModelSelectionMap,
  ModelSelectionConfig,
  ModelInfo,
} from "./settings/types";

type ProviderKey = AIProvider | (string & {});

type ProviderModelInfo = ModelInfo & {
  id?: string;
  modelId?: string;
  displayName?: string;
  description?: string;
  supportsStreaming?: boolean;
  supportsFunctionCalling?: boolean;
  supportsVision?: boolean;
  maxTokens?: number;
  costPerInputToken?: number;
  costPerOutputToken?: number;
  costPer1kTokens?: { input: number; output: number };
  contextWindow?: number;
  capabilities?: string[];
  trainingDataCutoff?: string;
};

type ProviderModelCacheEntry = {
  models: ProviderModelInfo[];
  fetchedAt: number;
};

type TestState = {
  status: "idle" | "loading" | "success" | "error";
  message?: string;
};

type TestStateMap = Record<ModelContext | "fallback", TestState>;

const MODEL_CACHE_TTL = 60 * 60 * 1000; // 60 minutos
const MODEL_CONTEXTS: ModelContext[] = ["chat", "insights", "global"];
const PROVIDER_METADATA: Record<
  string,
  { label: string; icon: string; accent: string }
> = {
  openai: { label: "OpenAI", icon: "🟠", accent: "#f97316" },
  anthropic: { label: "Anthropic", icon: "🔵", accent: "#6366f1" },
  google: { label: "Google Gemini", icon: "🟢", accent: "#22c55e" },
  deepseek: { label: "DeepSeek", icon: "🔴", accent: "#ef4444" },
  perplexity: { label: "Perplexity", icon: "🔷", accent: "#06b6d4" },
  openrouter: { label: "OpenRouter", icon: "🔺", accent: "#f59e0b" },
  custom: { label: "Custom Provider", icon: "⚙️", accent: "#71717a" },
};

// All available providers (not just ones with API keys)
const ALL_PROVIDERS: AIProvider[] = [
  "openai",
  "anthropic",
  "google",
  "deepseek",
  "perplexity",
  "openrouter",
  "custom",
];

const CONTEXT_METADATA: Record<
  ModelContext,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  chat: {
    label: "Chat Conversations",
    description: "Respostas em tempo real para o assistente",
    icon: (props) => <MessageSquare {...props} />,
  },
  insights: {
    label: "Insights & Analysis",
    description: "Geração de insights e análises estratégicas",
    icon: (props) => <Lightbulb {...props} />,
  },
  global: {
    label: "Global Operations",
    description: "Tarefas gerais e automações do dashboard",
    icon: (props) => <Globe {...props} />,
  },
};

const cloneSelectionMap = (
  selection: ModelSelectionMap
): ModelSelectionMap => ({
  chat: { ...selection.chat },
  insights: { ...selection.insights },
  global: { ...selection.global },
});

const getProviderMeta = (provider: ProviderKey) =>
  PROVIDER_METADATA[provider] || {
    label: typeof provider === "string" ? provider.toUpperCase() : "Custom",
    icon: "⚙️",
    accent: "#71717a",
  };

const getModelIdentifier = (model: ProviderModelInfo): string => {
  const id =
    model.modelId?.trim?.() ||
    (model as { name?: string }).name?.trim?.() ||
    model.id?.toString?.()?.trim?.() ||
    "";

  // Ensure we never return an empty string - generate fallback if needed
  if (!id || id === "") {
    console.warn("[SettingsModal] ⚠️ Model has no valid identifier:", model);
    return `model-${Math.random().toString(36).substr(2, 9)}`;
  }

  return id;
};

const getModelDisplayName = (model: ProviderModelInfo): string =>
  model.displayName ??
  (model as { name?: string }).name ??
  model.modelId ??
  model.id ??
  "Modelo";

const formatCurrency = (value?: number) => {
  if (value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
  }).format(value);
};

const formatLastUpdated = (timestamp?: number | null) => {
  if (!timestamp) {
    return "nunca atualizado";
  }
  const diff = Date.now() - timestamp;
  if (diff < 60_000) {
    return "agora mesmo";
  }
  if (diff < 3_600_000) {
    const minutes = Math.round(diff / 60_000);
    return `${minutes} min atrás`;
  }
  const hours = Math.round(diff / 3_600_000);
  return `${hours} h atrás`;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SettingsModalRefactored({ open, onClose }: Props) {
  const {
    brainCloudSettings,
    setBrainCloudSettings,
    interfacePreferences,
    setInterfacePreferences,
    aiApiKeys,
    setAIApiKeys,
    aiProviderConfig,
    setAIProviderConfig,
    systemSettings,
    setSystemSettings,
    loadSettings,
    saveSettings,
  } = useSettingsPersistence();
  const api = useAPI();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingMode, setTestingMode] =
    useState<BrainCloudConnectionMode | null>(null);
  const [brainCloudTestStatus, setBrainCloudTestStatus] =
    useState<TestStatus>(null);
  const [activeTab, setActiveTab] = useState<
    "braincloud" | "interface" | "ai" | "system"
  >("braincloud");

  const [modelSelections, setModelSelections] = useState<ModelSelectionMap>(
    () => cloneSelectionMap(aiProviderConfig.modelSelection)
  );
  const [fallbackProvider, setFallbackProvider] = useState<AIProvider>(
    aiProviderConfig.fallbackProvider
  );
  const modelCacheRef = useRef<Record<string, ProviderModelCacheEntry>>({});
  const [modelCache, setModelCache] = useState<
    Record<string, ProviderModelCacheEntry>
  >({});
  const [modelLoading, setModelLoading] = useState<Record<string, boolean>>({});
  const [modelErrors, setModelErrors] = useState<Record<string, string | null>>(
    {}
  );
  const [modelsUpdatedAt, setModelsUpdatedAt] = useState<number | null>(null);
  const [refreshingModels, setRefreshingModels] = useState(false);
  const [initializingModels, setInitializingModels] = useState(false);
  const [isModelPristine, setIsModelPristine] = useState(true);
  const [contextTestStatus, setContextTestStatus] = useState<TestStateMap>({
    chat: { status: "idle" },
    insights: { status: "idle" },
    global: { status: "idle" },
    fallback: { status: "idle" },
  });

  const availableProviders = useMemo(() => {
    const entries = Object.entries(aiApiKeys || {}) as [string, string][];
    const available = entries
      .filter(
        ([, value]) => typeof value === "string" && value.trim().length > 0
      )
      .map(([provider]) => provider as AIProvider);
    console.log("[SettingsModal] Available providers from aiApiKeys:", {
      aiApiKeysKeys: Object.keys(aiApiKeys || {}),
      aiApiKeysValues: Object.values(aiApiKeys || {}).map((v) =>
        typeof v === "string" ? `[${v.length} chars]` : v
      ),
      availableProviders: available,
    });
    return available;
  }, [aiApiKeys]);

  const providerOptions = useMemo(() => {
    // Show all providers, not just ones with API keys
    return ALL_PROVIDERS;
  }, []);

  useEffect(() => {
    if (open) {
      setLoading(true);
      // Force fresh load from server when modal opens to get latest API keys
      loadSettings(true).finally(() => setLoading(false));
      setIsModelPristine(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !isModelPristine) {
      return;
    }
    setModelSelections(cloneSelectionMap(aiProviderConfig.modelSelection));
    setFallbackProvider(aiProviderConfig.fallbackProvider);
  }, [
    open,
    isModelPristine,
    aiProviderConfig.modelSelection,
    aiProviderConfig.fallbackProvider,
  ]);

  const ensureModels = useCallback(
    async (provider: AIProvider, force = false) => {
      if (!provider) {
        return [] as ProviderModelInfo[];
      }

      const cached = modelCacheRef.current[provider];
      const now = Date.now();
      if (!force && cached && now - cached.fetchedAt < MODEL_CACHE_TTL) {
        return cached.models;
      }

      setModelLoading((prev) => ({ ...prev, [provider]: true }));
      setModelErrors((prev) => ({ ...prev, [provider]: null }));

      try {
        const models = await api.getProviderModels(provider);
        modelCacheRef.current = {
          ...modelCacheRef.current,
          [provider]: { models: models as ProviderModelInfo[], fetchedAt: now },
        };
        setModelCache({ ...modelCacheRef.current });
        setModelsUpdatedAt(now);

        setModelSelections((prev) => {
          const next = cloneSelectionMap(prev);
          let mutated = false;
          MODEL_CONTEXTS.forEach((context) => {
            if (next[context].provider === provider) {
              const identifier = next[context].model;
              const exists = (models || []).some(
                (model) =>
                  getModelIdentifier(model as ProviderModelInfo) === identifier
              );
              if (!exists && models.length > 0) {
                next[context] = {
                  ...next[context],
                  model: getModelIdentifier(models[0] as ProviderModelInfo),
                };
                mutated = true;
              }
            }
          });
          return mutated ? next : prev;
        });

        return models as ProviderModelInfo[];
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Falha ao carregar modelos";
        setModelErrors((prev) => ({ ...prev, [provider]: message }));
        throw error;
      } finally {
        setModelLoading((prev) => ({ ...prev, [provider]: false }));
      }
    },
    [api]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setInitializingModels(true);

    (async () => {
      try {
        const serverConfig = await api.getAIConfig(true);
        if (cancelled || !serverConfig) {
          return;
        }

        setAIProviderConfig((prev) => ({
          ...prev,
          modelSelection: cloneSelectionMap(serverConfig.modelSelection),
          fallbackProvider: serverConfig.fallbackProvider,
        }));

        if (isModelPristine) {
          setModelSelections(cloneSelectionMap(serverConfig.modelSelection));
          setFallbackProvider(serverConfig.fallbackProvider);
        }

        setModelsUpdatedAt(Date.now());

        // Load models for each available provider
        const providers = Object.entries(serverConfig.apiKeys || {})
          .filter(
            ([, value]) => typeof value === "string" && value.trim().length > 0
          )
          .map(([provider]) => provider as AIProvider);

        await Promise.all(
          providers.map((provider) =>
            ensureModels(provider).catch(() => undefined)
          )
        );
      } catch (error) {
        console.error(
          "[SettingsModal] Failed to load AI provider config:",
          error
        );
      } finally {
        if (!cancelled) {
          setInitializingModels(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // Only re-run when modal opens/closes

  // Removed: This was causing infinite loop by re-running on every availableProviders change
  // Models are now loaded in the main initialization effect above

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await applyModelChanges();

      const result = await saveSettings();
      if (result.success) {
        if (result.localOnly) {
          showSuccessToast(
            "Configurações salvas localmente (faça login para sincronizar)"
          );
        } else {
          showSuccessToast("Configurações salvas");

          // FORÇA RELOAD DE MODELOS após salvar API keys
          console.log("[Settings] Reloading models after saving API keys...");
          const providersWithKeys = Object.entries(aiApiKeys || {})
            .filter(
              ([, value]) =>
                typeof value === "string" && value.trim().length > 0
            )
            .map(([provider]) => provider as AIProvider);

          // Limpa cache e recarrega modelos
          modelCacheRef.current = {};
          setModelCache({});

          // Recarrega modelos de todos os provedores com API keys
          await Promise.all(
            providersWithKeys.map(async (provider) => {
              try {
                console.log(
                  `[Settings] Forcing model reload for ${provider} with forceRefresh=true...`
                );
                const models = await api.getProviderModels(provider, true); // forceRefresh=true
                if (models && models.length > 0) {
                  const now = Date.now();
                  modelCacheRef.current[provider] = {
                    models: models as ProviderModelInfo[],
                    fetchedAt: now,
                  };
                  setModelCache({ ...modelCacheRef.current });
                  const modelIds = (models as ProviderModelInfo[]).map((m) =>
                    getModelIdentifier(m)
                  );
                  console.log(
                    `[Settings] ✅ Loaded ${models.length} models for ${provider}`,
                    {
                      provider,
                      modelIds,
                      sample: models[0],
                    }
                  );
                } else {
                  console.warn(`[Settings] No models returned for ${provider}`);
                }
              } catch (error) {
                console.error(
                  `[Settings] Failed to reload models for ${provider}:`,
                  error
                );
              }
            })
          );

          // Validate that selected models still exist after reload
          // If a selected model no longer exists, use the first available model
          setModelSelections((prev) => {
            const next = cloneSelectionMap(prev);
            let changed = false;

            MODEL_CONTEXTS.forEach((context) => {
              const provider = next[context].provider;
              const selectedModelId = next[context].model;
              const availableModels =
                modelCacheRef.current[provider]?.models || [];

              // Check if selected model still exists
              const modelExists = availableModels.some(
                (model) =>
                  getModelIdentifier(model as ProviderModelInfo) ===
                  selectedModelId
              );

              if (!modelExists && availableModels.length > 0) {
                const availableIds = availableModels.map((m) =>
                  getModelIdentifier(m as ProviderModelInfo)
                );
                console.warn(
                  `[Settings] Selected model ${selectedModelId} not found for ${provider}`,
                  {
                    selectedModelId,
                    availableIds,
                    provider,
                    availableModelsCount: availableModels.length,
                  }
                );
                next[context] = {
                  ...next[context],
                  model: getModelIdentifier(
                    availableModels[0] as ProviderModelInfo
                  ),
                };
                changed = true;
              }
            });

            return changed ? next : prev;
          });

          setModelsUpdatedAt(Date.now());
        }

        // If admin mode is enabled, activate it immediately
        if (
          systemSettings.allowEditAllDirectories &&
          systemSettings.adminApiToken
        ) {
          try {
            const response = await fetch("/api/admin-mode/activate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            });

            if (response.ok) {
              const data = await response.json();

              // Dispatch event to show indicator
              if (data.expiresAt) {
                const event = new CustomEvent("admin-mode-activated", {
                  detail: { expiresAt: data.expiresAt },
                });
                window.dispatchEvent(event);
              }
            }
          } catch (adminError) {
            console.error(
              "[Settings] Error activating admin mode:",
              adminError
            );
          }
        }
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      showErrorToast("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = useCallback(
    async (mode: BrainCloudConnectionMode) => {
      setTestingMode(mode);
      setBrainCloudTestStatus(null);
      try {
        const response = await fetch("/api/settings/braincloud/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ braincloud: brainCloudSettings, mode }),
        });

        const data = await response.json();

        if (data.success) {
          setBrainCloudTestStatus({
            mode,
            status: "success",
            message:
              mode === "mcp"
                ? "Conexão MCP estabelecida com sucesso."
                : "Conexão REST verificada com sucesso.",
          });
          showSuccessToast(`Conexão ${mode.toUpperCase()} ativa`);
        } else {
          const message = data.error || "Não foi possível validar a conexão.";
          setBrainCloudTestStatus({
            mode,
            status: "error",
            message,
          });
          showErrorToast(message);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Erro inesperado ao testar conexão";
        setBrainCloudTestStatus({
          mode,
          status: "error",
          message,
        });
        showErrorToast(message);
      } finally {
        setTestingMode(null);
      }
    },
    [brainCloudSettings]
  );

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const tabs = [
    { id: "braincloud" as const, label: "Brain Cloud", icon: Cloud },
    { id: "ai" as const, label: "AI Providers", icon: Key },
    { id: "system" as const, label: "System", icon: Sliders },
    { id: "interface" as const, label: "Interface", icon: Palette },
  ];

  const hasModelChanges = useMemo(() => {
    const selectionChanged = MODEL_CONTEXTS.some((context) => {
      const current = modelSelections[context];
      const baseline = aiProviderConfig.modelSelection[context];
      return (
        current.provider !== baseline.provider ||
        current.model !== baseline.model
      );
    });

    return (
      selectionChanged || aiProviderConfig.fallbackProvider !== fallbackProvider
    );
  }, [aiProviderConfig, fallbackProvider, modelSelections]);

  const handleProviderChange = async (
    context: ModelContext,
    provider: ProviderKey
  ) => {
    setModelSelections((prev) => ({
      ...prev,
      [context]: {
        ...prev[context],
        provider: provider as AIProvider,
        model: "",
      },
    }));
    setContextTestStatus((prev) => ({
      ...prev,
      [context]: { status: "idle" },
    }));
    setIsModelPristine(false);

    if (!availableProviders.includes(provider as AIProvider)) {
      return;
    }

    try {
      const models = await ensureModels(provider as AIProvider, true);
      if (models.length > 0) {
        setModelSelections((prev) => ({
          ...prev,
          [context]: {
            ...prev[context],
            provider: provider as AIProvider,
            model: getModelIdentifier(models[0]),
          },
        }));
      }
    } catch (error) {
      console.error(
        "[SettingsModal] Failed to load models for provider",
        provider,
        error
      );
    }
  };

  const handleModelChange = (context: ModelContext, model: string) => {
    setModelSelections((prev) => ({
      ...prev,
      [context]: {
        ...prev[context],
        model,
      },
    }));
    setContextTestStatus((prev) => ({
      ...prev,
      [context]: { status: "idle" },
    }));
    setIsModelPristine(false);
  };

  const handleFallbackChange = (provider: ProviderKey) => {
    setFallbackProvider(provider as AIProvider);
    setContextTestStatus((prev) => ({
      ...prev,
      fallback: { status: "idle" },
    }));
    setIsModelPristine(false);
  };

  const handleRefreshProvider = async (provider: AIProvider) => {
    if (!provider) {
      return;
    }
    try {
      await ensureModels(provider, true);
      const meta = getProviderMeta(provider);
      showSuccessToast(`Modelos ${meta.label} atualizados`);
    } catch (error) {
      console.error("[SettingsModal] Failed to refresh provider models", error);
      const meta = getProviderMeta(provider);
      showErrorToast(`Não foi possível atualizar os modelos de ${meta.label}`);
    }
  };

  const handleRefreshModels = async () => {
    if (availableProviders.length === 0) {
      return;
    }
    setRefreshingModels(true);
    try {
      await Promise.all(
        availableProviders.map((provider) =>
          ensureModels(provider, true).catch(() => undefined)
        )
      );
      showSuccessToast("Lista de modelos atualizada");
    } catch (error) {
      console.error("[SettingsModal] Failed to refresh models list", error);
      showErrorToast("Não foi possível atualizar a lista de modelos");
    } finally {
      setRefreshingModels(false);
    }
  };

  const handleTestContext = async (context: ModelContext) => {
    const selection = modelSelections[context];
    if (!selection.provider || !selection.model) {
      setContextTestStatus((prev) => ({
        ...prev,
        [context]: {
          status: "error",
          message: "Selecione um provedor e modelo antes de testar",
        },
      }));
      return;
    }

    if (!availableProviders.includes(selection.provider)) {
      setContextTestStatus((prev) => ({
        ...prev,
        [context]: {
          status: "error",
          message: "Adicione a API key do provedor antes de testar",
        },
      }));
      return;
    }

    setContextTestStatus((prev) => ({
      ...prev,
      [context]: { status: "loading" },
    }));

    try {
      const result = await api.testAIProvider(context, {
        selection: {
          provider: selection.provider,
          model: selection.model,
        },
      });

      setContextTestStatus((prev) => ({
        ...prev,
        [context]: result.connected
          ? { status: "success", message: "Conexão estabelecida" }
          : {
              status: "error",
              message: result.error || "Falha ao conectar ao provedor",
            },
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao testar provedor";
      setContextTestStatus((prev) => ({
        ...prev,
        [context]: { status: "error", message },
      }));
    }
  };

  const handleTestFallback = async () => {
    if (!fallbackProvider) {
      return;
    }

    if (!availableProviders.includes(fallbackProvider)) {
      setContextTestStatus((prev) => ({
        ...prev,
        fallback: {
          status: "error",
          message: "Adicione a API key para testar o fallback",
        },
      }));
      return;
    }

    setContextTestStatus((prev) => ({
      ...prev,
      fallback: { status: "loading" },
    }));

    try {
      let selection = MODEL_CONTEXTS.map(
        (context) => modelSelections[context]
      ).find((item) => item.provider === fallbackProvider && item.model);

      if (!selection) {
        const models =
          modelCacheRef.current[fallbackProvider]?.models ||
          (await ensureModels(fallbackProvider, true));
        if (models.length === 0) {
          throw new Error("Nenhum modelo disponível para o fallback");
        }
        selection = {
          provider: fallbackProvider,
          model: getModelIdentifier(models[0]),
        } as ModelSelectionConfig;
      }

      const result = await api.testAIProvider("chat", {
        selection: {
          provider: selection.provider,
          model: selection.model,
        },
      });

      setContextTestStatus((prev) => ({
        ...prev,
        fallback: result.connected
          ? { status: "success", message: "Fallback conectado com sucesso" }
          : {
              status: "error",
              message: result.error || "Falha ao validar fallback",
            },
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao testar fallback";
      setContextTestStatus((prev) => ({
        ...prev,
        fallback: { status: "error", message },
      }));
    }
  };

  const applyModelChanges = useCallback(async () => {
    if (!hasModelChanges) {
      return;
    }

    let latestConfig: ModelSelectionMap | null = null;
    let latestFallback: AIProvider | null = null;

    for (const context of MODEL_CONTEXTS) {
      const current = modelSelections[context];
      const baseline = aiProviderConfig.modelSelection[context];

      if (
        current.provider === baseline.provider &&
        current.model === baseline.model
      ) {
        continue;
      }

      const response = await api.updateAIConfig(context, {
        modelSelection: {
          [context]: current,
        } as unknown as ModelSelectionMap,
      });

      if (response.config) {
        latestConfig = cloneSelectionMap(response.config.modelSelection);
        latestFallback = response.config.fallbackProvider;
      }
    }

    if (fallbackProvider !== aiProviderConfig.fallbackProvider) {
      const response = await api.updateFallbackProvider(fallbackProvider);
      if (response.config) {
        latestConfig = cloneSelectionMap(response.config.modelSelection);
        latestFallback = response.config.fallbackProvider;
      }
    }

    if (latestConfig) {
      setAIProviderConfig((prev) => ({
        ...prev,
        modelSelection: cloneSelectionMap(latestConfig as ModelSelectionMap),
        fallbackProvider: (latestFallback ?? fallbackProvider) as AIProvider,
      }));
      setModelSelections(cloneSelectionMap(latestConfig as ModelSelectionMap));
      setFallbackProvider((latestFallback ?? fallbackProvider) as AIProvider);
    } else {
      setAIProviderConfig((prev) => ({
        ...prev,
        modelSelection: cloneSelectionMap(modelSelections),
        fallbackProvider,
      }));
    }

    setIsModelPristine(true);
  }, [
    api,
    hasModelChanges,
    modelSelections,
    aiProviderConfig.modelSelection,
    fallbackProvider,
    aiProviderConfig.fallbackProvider,
    setAIProviderConfig,
  ]);

  const renderModelInfo = (model?: ProviderModelInfo) => {
    if (!model) {
      return (
        <p className="text-sm text-zinc-500">
          Selecione um modelo para visualizar informações detalhadas.
        </p>
      );
    }

    const contextWindow = model.contextWindow ?? model.maxTokens;
    const capabilities = model.capabilities || [];
    const inputCost = model.costPer1kTokens?.input ?? model.costPerInputToken;
    const outputCost =
      model.costPer1kTokens?.output ?? model.costPerOutputToken;

    return (
      <div className="space-y-2 text-sm text-zinc-300">
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Janela de contexto</span>
          <span>
            {contextWindow ? `${contextWindow.toLocaleString()} tokens` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Treinamento</span>
          <span>{model.trainingDataCutoff ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Custo / 1k tokens</span>
          <span>
            In: {formatCurrency(inputCost)} · Out: {formatCurrency(outputCost)}
          </span>
        </div>
        <div>
          <span className="text-zinc-400">Capacidades</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {capabilities.length > 0 ? (
              capabilities.map((capability) => (
                <span
                  key={capability}
                  className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200"
                >
                  {capability}
                </span>
              ))
            ) : (
              <span className="text-xs text-zinc-500">—</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderContextCard = (context: ModelContext) => {
    const selection = modelSelections[context];
    const provider = selection.provider;
    const providerHasKey = availableProviders.includes(provider);
    const providerModels = modelCache[provider]?.models ?? [];
    const selectedModel = providerModels.find(
      (model) => getModelIdentifier(model) === selection.model
    );
    const Icon = CONTEXT_METADATA[context].icon;

    // Debug logging
    console.log(
      `[renderContextCard] ${context}: provider=${provider}, models=${
        providerModels.length
      }, modelCache keys=${Object.keys(modelCache).join(
        ","
      )}, selection.model=${selection.model}`
    );

    // Check if models are from API or hardcoded fallback
    const modelsFromCache = modelCache[provider]?.fetchedAt;
    const usingFallbackModels = providerModels.length > 0 && !modelsFromCache;

    return (
      <section
        key={context}
        className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-inner shadow-black/10"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-100">
                <Icon className="h-4 w-4" />
              </span>
              {CONTEXT_METADATA[context].label}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {CONTEXT_METADATA[context].description}
            </p>
            {usingFallbackModels && (
              <p className="mt-1 flex items-center gap-1 text-xs text-amber-400">
                <AlertTriangle className="h-3 w-3" />
                Modelos padrão - conecte uma API key para modelos dinâmicos
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleRefreshProvider(provider)}
            disabled={!providerHasKey || modelLoading[provider]}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {modelLoading[provider] ? (
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
            ) : (
              <RefreshCw className="h-3 w-3" strokeWidth={2} />
            )}
            Atualizar modelos
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Provedor
            </label>
            <select
              value={provider}
              onChange={(event) =>
                handleProviderChange(context, event.target.value)
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/30"
            >
              {providerOptions.map((option) => {
                const meta = getProviderMeta(option);
                const hasKey = availableProviders.includes(
                  option as AIProvider
                );
                return (
                  <option
                    key={option}
                    value={option}
                    disabled={!hasKey && option !== provider}
                  >
                    {meta.icon} {meta.label}
                    {!hasKey && " — adicione a API key"}
                  </option>
                );
              })}
            </select>
            {!providerHasKey && (
              <p className="text-xs text-amber-400">
                Adicione a API key deste provedor para habilitar a seleção de
                modelos.
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Modelo
            </label>
            <select
              value={selection.model ?? ""}
              onChange={(event) =>
                handleModelChange(context, event.target.value)
              }
              disabled={
                !providerHasKey ||
                modelLoading[provider] ||
                providerModels.length === 0
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {modelLoading[provider] ? (
                <option value="">Carregando modelos...</option>
              ) : providerModels.length > 0 ? (
                providerModels.map((model) => {
                  const identifier = getModelIdentifier(model);
                  return (
                    <option key={identifier} value={identifier}>
                      {getModelDisplayName(model)}
                      {model.contextWindow
                        ? ` • ${model.contextWindow.toLocaleString()} tokens`
                        : ""}
                    </option>
                  );
                })
              ) : (
                <option value="">Nenhum modelo disponível</option>
              )}
            </select>
            {modelErrors[provider] && (
              <p className="flex items-center gap-1 text-xs text-rose-400">
                <AlertTriangle className="h-3 w-3" />
                {modelErrors[provider]}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Detalhes do modelo
          </p>
          <div className="mt-2">
            {modelLoading[provider] ? (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                Carregando informações...
              </div>
            ) : (
              renderModelInfo(selectedModel)
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => handleTestContext(context)}
            disabled={
              contextTestStatus[context].status === "loading" ||
              !providerHasKey ||
              !selection.model
            }
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {contextTestStatus[context].status === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            ) : (
              <ShieldCheck className="h-4 w-4" strokeWidth={2} />
            )}
            Testar conexão
          </button>

          {contextTestStatus[context].status === "success" && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              {contextTestStatus[context].message ?? "Conexão estabelecida"}
            </span>
          )}

          {contextTestStatus[context].status === "error" && (
            <span className="flex items-center gap-1 text-xs text-rose-400">
              <XCircle className="h-4 w-4" />
              {contextTestStatus[context].message ??
                "Falha ao testar o provedor"}
            </span>
          )}
        </div>
      </section>
    );
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={handleBackdropClick}
    >
      <div
        className="relative flex h-full max-h-[90vh] w-full max-w-6xl rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <aside className="w-48 border-r border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center gap-3 mb-8">
            <div className="rounded-lg bg-zinc-800 p-2">
              <SettingsIcon
                className="h-5 w-5 text-zinc-400"
                strokeWidth={1.5}
              />
            </div>
            <div>
              <h2
                id="settings-modal-title"
                className="text-lg font-semibold text-zinc-100 tracking-tight"
              >
                Settings
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Configure dashboard
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
              aria-label="Close settings"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === tab.id
                      ? "bg-zinc-800 text-zinc-100 shadow-sm border-l-2 border-zinc-400"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <form
            onSubmit={handleSave}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Content Area */}
            <div
              className="flex-1 overflow-y-auto bg-zinc-900 px-8 py-6"
              style={{ minHeight: 0 }}
            >
              {loading ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3">
                  <Loader2
                    className="h-7 w-7 animate-spin text-zinc-500"
                    strokeWidth={1.5}
                  />
                  <p className="text-sm text-zinc-500">Loading settings...</p>
                </div>
              ) : (
                <div className="max-w-2xl">
                  {activeTab === "braincloud" && (
                    <BrainCloudSettingsSection
                      settings={brainCloudSettings}
                      onChange={setBrainCloudSettings}
                      onTestConnection={handleTestConnection}
                      testStatus={brainCloudTestStatus}
                      testingMode={testingMode}
                      disabled={saving}
                    />
                  )}

                  {activeTab === "ai" && (
                    <div className="space-y-8">
                      <AIApiKeysSection
                        apiKeys={aiApiKeys}
                        onChange={setAIApiKeys}
                        disabled={saving}
                      />

                      <section className="space-y-4">
                        <header className="flex items-center justify-between">
                          <div>
                            <h3 className="text-base font-semibold text-zinc-100">
                              AI Model Selection
                            </h3>
                            <p className="text-sm text-zinc-500">
                              Defina quais provedores e modelos serão utilizados
                              em cada contexto do dashboard.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleRefreshModels}
                            disabled={
                              refreshingModels ||
                              availableProviders.length === 0
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {refreshingModels ? (
                              <Loader2
                                className="h-4 w-4 animate-spin"
                                strokeWidth={2}
                              />
                            ) : (
                              <RefreshCw className="h-4 w-4" strokeWidth={2} />
                            )}
                            Atualizar lista de modelos
                          </button>
                        </header>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-semibold text-zinc-200">
                                Modelos ativos
                              </h4>
                              <p className="text-xs text-zinc-500">
                                Visualize rapidamente o provedor e modelo em uso
                                por contexto.
                              </p>
                            </div>
                          </div>

                          {initializingModels && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-zinc-500">
                              <Loader2
                                className="h-4 w-4 animate-spin"
                                strokeWidth={2}
                              />
                              Carregando modelos disponíveis...
                            </div>
                          )}

                          <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            {MODEL_CONTEXTS.map((context) => {
                              const selection = modelSelections[context];
                              const providerMeta = getProviderMeta(
                                selection.provider
                              );
                              const providerModels =
                                modelCache[selection.provider]?.models ?? [];
                              const summaryModel = providerModels.find(
                                (model) =>
                                  getModelIdentifier(model) === selection.model
                              );
                              const Icon = CONTEXT_METADATA[context].icon;

                              return (
                                <div
                                  key={`${context}-summary`}
                                  className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3"
                                >
                                  <div className="flex items-center justify-between text-xs text-zinc-400">
                                    <div className="flex items-center gap-2 font-medium text-zinc-200">
                                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800 text-zinc-100">
                                        <Icon className="h-3.5 w-3.5" />
                                      </span>
                                      {CONTEXT_METADATA[context].label}
                                    </div>
                                  </div>
                                  <div className="mt-3 space-y-1 text-sm text-zinc-200">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                                        style={{
                                          backgroundColor: `${providerMeta.accent}20`,
                                          color: providerMeta.accent,
                                        }}
                                      >
                                        {providerMeta.icon} {providerMeta.label}
                                      </span>
                                    </div>
                                    <p className="text-xs text-zinc-400">
                                      {summaryModel
                                        ? getModelDisplayName(summaryModel)
                                        : selection.model ||
                                          "Modelo não definido"}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <p className="mt-3 text-xs text-zinc-500">
                            Última atualização:{" "}
                            {formatLastUpdated(modelsUpdatedAt)}
                          </p>
                        </div>

                        {availableProviders.length === 0 ? (
                          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-300">
                            Adicione uma API key para pelo menos um provedor de
                            IA para habilitar a seleção de modelos.
                          </div>
                        ) : (
                          <div className="space-y-5">
                            {MODEL_CONTEXTS.map(renderContextCard)}
                          </div>
                        )}

                        <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-inner shadow-black/10">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h4 className="text-sm font-semibold text-zinc-100">
                                Fallback Configuration
                              </h4>
                              <p className="text-xs text-zinc-500">
                                Provedor utilizado automaticamente caso o
                                primário apresente falha.
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div className="space-y-1">
                              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wide">
                                Provedor de fallback
                              </label>
                              <select
                                value={fallbackProvider}
                                onChange={(event) =>
                                  handleFallbackChange(event.target.value)
                                }
                                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/30"
                              >
                                {providerOptions.map((option) => {
                                  const meta = getProviderMeta(option);
                                  const hasKey = availableProviders.includes(
                                    option as AIProvider
                                  );
                                  return (
                                    <option
                                      key={`fallback-${option}`}
                                      value={option}
                                      disabled={
                                        !hasKey && option !== fallbackProvider
                                      }
                                    >
                                      {meta.icon} {meta.label}
                                      {!hasKey && " — adicione a API key"}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wide">
                                Verificação
                              </label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={handleTestFallback}
                                  disabled={
                                    contextTestStatus.fallback.status ===
                                      "loading" ||
                                    availableProviders.length === 0
                                  }
                                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {contextTestStatus.fallback.status ===
                                  "loading" ? (
                                    <Loader2
                                      className="h-4 w-4 animate-spin"
                                      strokeWidth={2}
                                    />
                                  ) : (
                                    <ShieldCheck
                                      className="h-4 w-4"
                                      strokeWidth={2}
                                    />
                                  )}
                                  Testar fallback
                                </button>

                                {contextTestStatus.fallback.status ===
                                  "success" && (
                                  <span className="flex items-center gap-1 text-xs text-emerald-400">
                                    <CheckCircle2 className="h-4 w-4" />
                                    {contextTestStatus.fallback.message ??
                                      "Fallback conectado"}
                                  </span>
                                )}

                                {contextTestStatus.fallback.status ===
                                  "error" && (
                                  <span className="flex items-center gap-1 text-xs text-rose-400">
                                    <XCircle className="h-4 w-4" />
                                    {contextTestStatus.fallback.message ??
                                      "Falha ao testar o fallback"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </section>

                        {hasModelChanges && (
                          <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                            <AlertTriangle className="h-4 w-4" />
                            Existem alterações de modelo não salvas.
                          </div>
                        )}
                      </section>
                    </div>
                  )}

                  {activeTab === "system" && (
                    <SystemSettingsSection
                      settings={systemSettings}
                      onChange={setSystemSettings}
                      disabled={saving}
                    />
                  )}

                  {activeTab === "interface" && (
                    <InterfaceSettingsSection
                      preferences={interfacePreferences}
                      onChange={setInterfacePreferences}
                      disabled={saving}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <footer className="border-t border-zinc-800 bg-zinc-950 px-8 py-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500">
                  Settings are saved locally and synchronized with the server
                </p>
                <button
                  type="submit"
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        strokeWidth={2}
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" strokeWidth={2} />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </footer>
          </form>
        </main>
      </div>
    </div>
  );
}
