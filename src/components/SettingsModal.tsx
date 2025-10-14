import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import toast from "react-hot-toast";
import {
  Cloud,
  RefreshCw,
  Save,
  ShieldCheck,
  Eye,
  EyeOff,
  Settings2,
  Workflow,
  Layers,
  X,
  Brain,
  Trash2,
  Plus,
} from "lucide-react";
import api, {
  AIProvider,
  AIProviderCreatePayload,
  AIModel,
} from "../services/apiClient";

type BrainCloudSettings = {
  baseUrl: string;
  apiToken: string;
  tenantId: string;
  tenantPlan: string;
  mcpWs: string;
  mcpHttp: string;
  enableRest: boolean;
  enableMcp: boolean;
};

const DEFAULT_SETTINGS: BrainCloudSettings = {
  baseUrl: "",
  apiToken: "",
  tenantId: "",
  tenantPlan: "",
  mcpWs: "",
  mcpHttp: "",
  enableRest: true,
  enableMcp: true,
};

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
};

const SECTIONS = [
  {
    id: "general",
    label: "General",
    description: "Preferências gerais do workspace.",
    icon: <Settings2 className="h-4 w-4" />,
  },
  {
    id: "braincloud",
    label: "Brain Cloud",
    description: "Configurações REST/MCP do Obsidian Brain Cloud.",
    icon: <Cloud className="h-4 w-4" />,
  },
  {
    id: "aiproviders",
    label: "AI Providers",
    description: "Configurar provedores de IA e modelos para chat.",
    icon: <Brain className="h-4 w-4" />,
  },
  {
    id: "integrations",
    label: "Integrations",
    description: "Outras integrações e automações (em breve).",
    icon: <Workflow className="h-4 w-4" />,
  },
  {
    id: "dataops",
    label: "Data Ops",
    description: "Pipelines de dados e sync (em breve).",
    icon: <Layers className="h-4 w-4" />,
  },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const [activeSection, setActiveSection] = useState<
    "general" | "braincloud" | "aiproviders" | "integrations" | "dataops"
  >("braincloud");
  const [settings, setSettings] = useState<BrainCloudSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingMode, setTestingMode] = useState<"rest" | "mcp" | null>(null);
  const [showToken, setShowToken] = useState(false);

  // AI Providers state
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [newProvider, setNewProvider] = useState<AIProviderCreatePayload>({
    providerName: "openai",
    displayName: "",
    apiKey: "",
  });
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [providerModels, setProviderModels] = useState<Record<string, AIModel[]>>({});
  const [providerModelsLoading, setProviderModelsLoading] = useState<
    Record<string, boolean>
  >({});
  const [syncingProviderId, setSyncingProviderId] = useState<string | null>(
    null
  );

  const mergedSettings = useMemo(
    () => settings ?? DEFAULT_SETTINGS,
    [settings]
  );

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.request<{
        success?: boolean;
        braincloud?: Partial<BrainCloudSettings> | null;
      }>("/api/settings/braincloud");

      setSettings({ ...DEFAULT_SETTINGS, ...(data?.braincloud || {}) });
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível carregar as configurações.");
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchSettings();
  }, [open, fetchSettings]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const handleChange =
    (field: keyof BrainCloudSettings) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSettings((prev) => ({
        ...(prev || DEFAULT_SETTINGS),
        [field]: value,
      }));
    };

  const handleToggle = (field: keyof BrainCloudSettings) => () => {
    setSettings((prev) => ({
      ...(prev || DEFAULT_SETTINGS),
      [field]: !(prev?.[field] as boolean),
    }));
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const data = await api.request<{
        success?: boolean;
        braincloud?: Partial<BrainCloudSettings> | null;
      }>("/api/settings/braincloud", {
        method: "PUT",
        body: { braincloud: settings },
      });

      setSettings({ ...DEFAULT_SETTINGS, ...(data?.braincloud || {}) });
      toast.success("Configurações salvas com sucesso");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Falha ao salvar configurações"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (mode: "rest" | "mcp") => {
    if (!settings) return;
    setTestingMode(mode);
    try {
      const payload = await api.request<{
        success: boolean;
        mode: string;
        response?: Record<string, unknown>;
      }>("/api/settings/braincloud/test", {
        method: "POST",
        body: { braincloud: settings, mode },
      });

      toast.success(
        `${mode === "rest" ? "REST" : "MCP"} ok: ${
          payload?.response?.status || "sucesso"
        }`
      );
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Teste falhou");
    } finally {
      setTestingMode(null);
    }
  };

  // AI Providers functions
  const loadProviderModels = useCallback(
    async (providerId: string) => {
      setProviderModelsLoading((prev) => ({ ...prev, [providerId]: true }));
      try {
        const response = await api.getProviderModels(providerId);
        setProviderModels((prev) => ({
          ...prev,
          [providerId]: response.models || [],
        }));
      } catch (error) {
        console.error("Error fetching provider models:", error);
        toast.error("Falha ao carregar modelos do provedor");
      } finally {
        setProviderModelsLoading((prev) => ({
          ...prev,
          [providerId]: false,
        }));
      }
    },
    []
  );

  const fetchProviders = useCallback(async () => {
    setLoadingProviders(true);
    try {
      const response = await api.getAIProviders();
      setProviders(response.providers);

      await Promise.all(
        response.providers.map(async (provider) => {
          await loadProviderModels(provider.id);
        })
      );
    } catch (error) {
      console.error("Error fetching providers:", error);
      toast.error("Não foi possível carregar os provedores de IA");
    } finally {
      setLoadingProviders(false);
    }
  }, [loadProviderModels]);

  const handleSaveProvider = async () => {
    try {
      if (!newProvider.displayName || !newProvider.apiKey) {
        toast.error("Nome e API Key são obrigatórios");
        return;
      }

      const provider = await api.upsertAIProvider(newProvider);
      try {
        await api.syncProviderModels(provider.id);
      } catch (error) {
        console.error("Error syncing models after provider save:", error);
        toast.error("Provedor salvo, mas não foi possível sincronizar modelos");
      }
      toast.success("Provedor salvo com sucesso");
      setShowProviderForm(false);
      setNewProvider({
        providerName: "openai",
        displayName: "",
        apiKey: "",
      });
      fetchProviders();
    } catch (error) {
      console.error("Error saving provider:", error);
      toast.error("Erro ao salvar provedor");
    }
  };

  const handleSetDefaultModel = async (
    providerId: string,
    modelId: string
  ) => {
    const models = providerModels[providerId] || [];
    const targetModel = models.find((model) => model.id === modelId);
    if (!targetModel) {
      toast.error("Modelo não encontrado para este provedor");
      return;
    }

    try {
      await api.upsertModel(providerId, {
        modelId: targetModel.modelId,
        displayName: targetModel.displayName,
        description: targetModel.description,
        supportsStreaming: targetModel.supportsStreaming,
        supportsFunctionCalling: targetModel.supportsFunctionCalling,
        supportsVision: targetModel.supportsVision,
        maxTokens: targetModel.maxTokens,
        contextWindow: targetModel.contextWindow,
        costPerInputToken: targetModel.costPerInputToken,
        costPerOutputToken: targetModel.costPerOutputToken,
        isActive: true,
        isDefault: true,
      });

      toast.success("Modelo padrão atualizado com sucesso");
      await loadProviderModels(providerId);
    } catch (error) {
      console.error("Error updating default model:", error);
      toast.error("Não foi possível definir o modelo padrão");
    }
  };

  const handleSyncModels = useCallback(
    async (providerId: string) => {
      try {
        setSyncingProviderId(providerId);
        const response = await api.syncProviderModels(providerId);
        setProviderModels((prev) => ({
          ...prev,
          [providerId]: response.models,
        }));
        toast.success("Modelos sincronizados com sucesso");
      } catch (error) {
        console.error("Error syncing provider models:", error);
        toast.error("Não foi possível sincronizar modelos");
      } finally {
        setSyncingProviderId(null);
        loadProviderModels(providerId);
      }
    },
    // 'api' é um singleton importado; mudança no objeto não dispara re-render
    [loadProviderModels]
  );

  const handleDeleteProvider = async (providerId: string) => {
    if (!confirm("Tem certeza que deseja remover este provedor?")) return;

    try {
      await api.deleteAIProvider(providerId);
      toast.success("Provedor removido");
      fetchProviders();
    } catch (error) {
      console.error("Error deleting provider:", error);
      toast.error("Erro ao remover provedor");
    }
  };

  useEffect(() => {
    if (open && activeSection === "aiproviders") {
      fetchProviders();
    }
  }, [open, activeSection, fetchProviders]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-5xl rounded-3xl border border-neutral-800 bg-neutral-950/95 text-zinc-100 shadow-2xl shadow-black/40">
        <div className="flex h-[75vh] overflow-hidden rounded-3xl">
          <aside className="w-60 border-r border-neutral-800 bg-neutral-950/80 p-6">
            <div className="mb-6">
              <p className="text-sm font-medium text-emerald-300">
                Advanced Settings
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Ajuste conexões e integrações do CEO Dashboard.
              </p>
            </div>
            <nav className="space-y-2">
              {SECTIONS.map((item) => {
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() =>
                      setActiveSection(item.id as typeof activeSection)
                    }
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                      active
                        ? "bg-neutral-800 text-zinc-100"
                        : "text-zinc-400 hover:bg-neutral-900 hover:text-zinc-200"
                    }`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900">
                      {item.icon}
                    </span>
                    <span className="text-left">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="flex-1 overflow-y-auto p-8">
            <header className="flex items-start justify-between gap-4 border-b border-neutral-800 pb-4">
              <div>
                <p className="text-lg font-semibold">
                  {SECTIONS.find((sec) => sec.id === activeSection)?.label ||
                    "Configurações"}
                </p>
                <p className="text-sm text-zinc-500">
                  {SECTIONS.find((sec) => sec.id === activeSection)
                    ?.description || ""}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full border border-neutral-800 bg-neutral-900 p-2 text-zinc-400 transition hover:border-neutral-600 hover:text-zinc-100"
                aria-label="Fechar configurações"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {activeSection === "braincloud" && (
              <div className="mt-6 space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handleTest("rest")}
                    disabled={testingMode === "rest" || loading}
                    className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-zinc-200 transition hover:border-neutral-500 disabled:cursor-wait disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        testingMode === "rest" ? "animate-spin" : ""
                      }`}
                    />
                    Testar REST
                  </button>
                  <button
                    onClick={() => handleTest("mcp")}
                    disabled={testingMode === "mcp" || loading}
                    className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-zinc-200 transition hover:border-neutral-500 disabled:cursor-wait disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        testingMode === "mcp" ? "animate-spin" : ""
                      }`}
                    />
                    Testar MCP
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || loading}
                    className="flex items-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/30 disabled:cursor-wait disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    Salvar
                  </button>
                </div>

                {loading ? (
                  <div className="h-40 animate-pulse rounded-xl border border-neutral-800 bg-neutral-900/60" />
                ) : (
                  <div className="space-y-6">
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6">
                      <div className="flex items-center gap-3 text-zinc-100">
                        <Cloud className="h-5 w-5" />
                        <div>
                          <h2 className="text-sm font-semibold">
                            Obsidian Brain Cloud • REST
                          </h2>
                          <p className="text-xs text-zinc-400">
                            URL e credenciais para operações via API.
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        <Field
                          label="Base URL"
                          placeholder="https://braincloud.ggai.dev"
                          value={mergedSettings.baseUrl}
                          onChange={handleChange("baseUrl")}
                        />

                        <Field
                          label="Token de API"
                          type={showToken ? "text" : "password"}
                          placeholder="••••••"
                          value={mergedSettings.apiToken}
                          onChange={handleChange("apiToken")}
                          rightAdornment={
                            <button
                              type="button"
                              onClick={() => setShowToken((prev) => !prev)}
                              className="text-zinc-400 transition hover:text-zinc-200"
                            >
                              {showToken ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          }
                        />

                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field
                            label="Tenant ID (opcional)"
                            placeholder="cliente-xpto"
                            value={mergedSettings.tenantId}
                            onChange={handleChange("tenantId")}
                          />
                          <Field
                            label="Tenant Plan"
                            placeholder="enterprise"
                            value={mergedSettings.tenantPlan}
                            onChange={handleChange("tenantPlan")}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6">
                      <div className="flex items-center gap-3 text-zinc-100">
                        <ShieldCheck className="h-5 w-5" />
                        <div>
                          <h2 className="text-sm font-semibold">
                            Model Context Protocol
                          </h2>
                          <p className="text-xs text-zinc-400">
                            Endpoints de WebSocket e HTTP para ferramentas MCP.
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        <Field
                          label="MCP WebSocket"
                          placeholder="ws://localhost:8000/mcp"
                          value={mergedSettings.mcpWs}
                          onChange={handleChange("mcpWs")}
                        />
                        <Field
                          label="MCP HTTP"
                          placeholder="http://localhost:8000/api/v1/mcp/http"
                          value={mergedSettings.mcpHttp}
                          onChange={handleChange("mcpHttp")}
                        />

                        <div className="grid gap-3 sm:grid-cols-2">
                          <ToggleField
                            label="Habilitar features REST"
                            description="Permite que o dashboard use a API REST da Brain Cloud."
                            checked={mergedSettings.enableRest}
                            onToggle={handleToggle("enableRest")}
                          />
                          <ToggleField
                            label="Habilitar features MCP"
                            description="Libera uso de ferramentas MCP (semantic search, templates, etc.)."
                            checked={mergedSettings.enableMcp}
                            onToggle={handleToggle("enableMcp")}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSection === "aiproviders" && (
              <div className="mt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400">
                      Configure seus provedores de IA para usar no chat
                    </p>
                  </div>
                  <button
                    onClick={() => setShowProviderForm(!showProviderForm)}
                    className="flex items-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/30"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Provedor
                  </button>
                </div>

                {showProviderForm && (
                  <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6">
                    <h3 className="mb-4 text-sm font-semibold text-zinc-100">
                      Novo Provedor de IA
                    </h3>
                    <div className="space-y-4">
                      <label className="block text-sm">
                        <span className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">
                          Provedor
                        </span>
                        <select
                          value={newProvider.providerName}
                          onChange={(event) =>
                            setNewProvider((prev) => ({
                              ...prev,
                              providerName:
                                event.target.value as AIProviderCreatePayload["providerName"],
                            }))
                          }
                          className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-zinc-100 focus:border-neutral-600 focus:outline-none"
                        >
                          <option value="openai">OpenAI</option>
                          <option value="anthropic">Anthropic</option>
                          <option value="deepseek">DeepSeek</option>
                          <option value="google">Google AI</option>
                          <option value="openrouter">OpenRouter</option>
                          <option value="azure">Azure OpenAI</option>
                          <option value="custom">Custom</option>
                        </select>
                      </label>

                      <Field
                        label="Nome de Exibição"
                        placeholder="Ex: Meu OpenAI"
                        value={newProvider.displayName}
                        onChange={(e) =>
                          setNewProvider({
                            ...newProvider,
                            displayName: e.target.value,
                          })
                        }
                      />

                      <Field
                        label="API Key"
                        type="password"
                        placeholder="sk-..."
                        value={newProvider.apiKey}
                        onChange={(e) =>
                          setNewProvider({
                            ...newProvider,
                            apiKey: e.target.value,
                          })
                        }
                      />

                      {newProvider.providerName === "custom" && (
                        <Field
                          label="Base URL (opcional)"
                          placeholder="https://api.example.com/v1"
                          value={newProvider.baseUrl || ""}
                          onChange={(e) =>
                            setNewProvider({
                              ...newProvider,
                              baseUrl: e.target.value,
                            })
                          }
                        />
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveProvider}
                          className="flex-1 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/30"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => setShowProviderForm(false)}
                          className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-zinc-200 transition hover:border-neutral-500"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {loadingProviders ? (
                  <div className="h-40 animate-pulse rounded-xl border border-neutral-800 bg-neutral-900/60" />
                ) : providers.length === 0 ? (
                  <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/60 text-zinc-400">
                    <Brain className="h-8 w-8" />
                    <p className="text-sm">Nenhum provedor configurado ainda</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {providers.map((provider) => (
                      <div
                        key={provider.id}
                        className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/60 p-4"
                      >
                        <div className="flex flex-1 gap-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
                                provider.isActive
                                  ? "border-emerald-500/50 bg-emerald-500/10"
                                  : "border-neutral-700 bg-neutral-800"
                              }`}
                            >
                              <Brain
                                className={`h-5 w-5 ${
                                  provider.isActive
                                    ? "text-emerald-300"
                                    : "text-zinc-500"
                                }`}
                              />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-zinc-100">
                                {provider.displayName}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {provider.providerName}
                                {provider.isDefault && (
                                  <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-emerald-300">
                                    Padrão
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-1 flex-col gap-2">
                            <label className="block text-xs uppercase tracking-wide text-zinc-500">
                              Modelo padrão
                            </label>
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                {providerModelsLoading[provider.id] ? (
                                  <div className="h-10 animate-pulse rounded-lg border border-neutral-800 bg-neutral-900/60" />
                                ) : providerModels[provider.id]?.length ? (
                                  <select
                                    value={
                                      providerModels[provider.id].find(
                                        (model) => model.isDefault
                                      )?.id || ""
                                    }
                                    onChange={(event) =>
                                      handleSetDefaultModel(
                                        provider.id,
                                        event.target.value
                                      )
                                    }
                                    className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                  >
                                    <option value="" disabled>
                                      Selecione o modelo padrão
                                    </option>
                                    {providerModels[provider.id].map((model) => (
                                      <option key={model.id} value={model.id}>
                                        {model.displayName}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <div className="rounded-lg border border-amber-700/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                                    Nenhum modelo disponível. Verifique se a API key é válida.
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => handleSyncModels(provider.id)}
                                disabled={syncingProviderId === provider.id}
                                className="flex h-10 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-xs text-zinc-300 transition hover:border-neutral-500 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <RefreshCw
                                  className={`mr-2 h-4 w-4 ${
                                    syncingProviderId === provider.id
                                      ? "animate-spin"
                                      : ""
                                  }`}
                                />
                                Atualizar modelos
                              </button>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteProvider(provider.id)}
                          className="ml-4 rounded-lg border border-red-900/50 bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20"
                          title="Remover provedor"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSection !== "braincloud" &&
              activeSection !== "aiproviders" && (
                <div className="mt-12 flex h-full flex-col items-center justify-center gap-4 text-center text-zinc-400">
                  <div className="rounded-full border border-neutral-800 bg-neutral-900/60 p-4">
                    <ShieldCheck className="h-6 w-6 text-zinc-300" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-zinc-100">
                      Em breve
                    </p>
                    <p className="text-sm text-zinc-500">
                      Estamos trazendo estas configurações para a próxima versão
                      do dashboard.
                    </p>
                  </div>
                </div>
              )}
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
};

type FieldProps = {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  rightAdornment?: React.ReactNode;
};

const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  rightAdornment,
}) => (
  <label className="block text-sm text-zinc-300">
    <span className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">
      {label}
    </span>
    <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 focus-within:border-neutral-600">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
      />
      {rightAdornment}
    </div>
  </label>
);

type ToggleFieldProps = {
  label: string;
  description?: string;
  checked: boolean;
  onToggle: () => void;
};

const ToggleField: React.FC<ToggleFieldProps> = ({
  label,
  description,
  checked,
  onToggle,
}) => (
  <button
    type="button"
    onClick={onToggle}
    className="flex items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-left transition hover:border-neutral-600"
  >
    <span
      className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
        checked
          ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
          : "border-neutral-700 text-neutral-400"
      }`}
    >
      {checked ? "●" : ""}
    </span>
    <span className="flex-1 text-sm text-zinc-200">
      {label}
      {description && (
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
      )}
    </span>
  </button>
);

export default SettingsModal;
