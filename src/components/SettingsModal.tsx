'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Settings,
  ShieldCheck,
  Wifi,
} from 'lucide-react';
import apiClient, {
  BrainCloudConnectionMode,
  BrainCloudSettings,
  defaultBrainCloudSettings,
} from '../services/apiClient';

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
};

type InterfacePreferences = {
  theme: 'system' | 'light' | 'dark';
  language: 'pt-BR' | 'en-US';
  reduceMotion: boolean;
  showBetaFeatures: boolean;
};

type AIApiKeys = {
  openai: string;
  anthropic: string;
  google: string;
  perplexity: string;
};

type SystemSettings = {
  allowEditAllDirectories: boolean;
};

const INTERFACE_PREFS_KEY = 'ggai.settings.interface';

const defaultInterfacePreferences: InterfacePreferences = {
  theme: 'system',
  language: 'pt-BR',
  reduceMotion: false,
  showBetaFeatures: false,
};

const defaultAIApiKeys: AIApiKeys = {
  openai: '',
  anthropic: '',
  google: '',
  perplexity: '',
};

const defaultSystemSettings: SystemSettings = {
  allowEditAllDirectories: false,
};

type TestStatus =
  | {
      mode: BrainCloudConnectionMode;
      success: true;
      message: string;
    }
  | {
      mode: BrainCloudConnectionMode;
      success: false;
      message: string;
    };

const fieldClass =
  'w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-60';

const labelClass = 'text-sm font-medium text-zinc-300';

const descriptionClass = 'text-xs text-zinc-500';

const loadInterfacePreferences = (): InterfacePreferences => {
  if (typeof window === 'undefined') {
    return defaultInterfacePreferences;
  }
  try {
    const stored = window.localStorage.getItem(INTERFACE_PREFS_KEY);
    if (!stored) return defaultInterfacePreferences;
    const parsed = JSON.parse(stored);
    return {
      ...defaultInterfacePreferences,
      ...(parsed || {}),
    };
  } catch (error) {
    console.warn('Failed to load interface preferences:', error);
    return defaultInterfacePreferences;
  }
};

const persistInterfacePreferences = (prefs: InterfacePreferences) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(
      INTERFACE_PREFS_KEY,
      JSON.stringify(prefs)
    );
  } catch (error) {
    console.warn('Failed to persist interface preferences:', error);
  }
};

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const [brainCloudSettings, setBrainCloudSettings] =
    useState<BrainCloudSettings>(defaultBrainCloudSettings);
  const [interfacePreferences, setInterfacePreferences] =
    useState<InterfacePreferences>(defaultInterfacePreferences);
  const [aiApiKeys, setAIApiKeys] = useState<AIApiKeys>(defaultAIApiKeys);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(defaultSystemSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingMode, setTestingMode] =
    useState<BrainCloudConnectionMode | null>(null);
  const [testStatus, setTestStatus] = useState<TestStatus | null>(null);
  const [dirty, setDirty] = useState(false);

  const hasBrainCloudConfig = useMemo(() => {
    const { baseUrl, apiToken, mcpHttp, mcpWs } = brainCloudSettings;
    return Boolean(
      baseUrl?.trim() ||
        apiToken?.trim() ||
        mcpHttp?.trim() ||
        mcpWs?.trim()
    );
  }, [brainCloudSettings]);

  const resetState = useCallback(() => {
    setTestStatus(null);
    setDirty(false);
    setTestingMode(null);
  }, []);

  const hydrateSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [settings] = await Promise.all([
        apiClient.getBrainCloudSettings(),
      ]);
      setBrainCloudSettings({
        ...defaultBrainCloudSettings,
        ...(settings || {}),
      });
      setInterfacePreferences(loadInterfacePreferences());
      resetState();
    } catch (error) {
      console.error('Failed to load settings modal data:', error);
      toast.error('Não foi possível carregar as configurações.');
    } finally {
      setLoading(false);
    }
  }, [resetState]);

  useEffect(() => {
    if (!open) {
      return;
    }
    hydrateSettings();
  }, [open, hydrateSettings]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleBrainCloudChange = <
    Field extends keyof BrainCloudSettings,
    Value extends BrainCloudSettings[Field],
  >(
    field: Field,
    value: Value
  ) => {
    setBrainCloudSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
    setDirty(true);
  };

  const handleInterfacePreferencesChange = <
    Field extends keyof InterfacePreferences,
    Value extends InterfacePreferences[Field],
  >(
    field: Field,
    value: Value
  ) => {
    setInterfacePreferences((prev) => {
      const next = { ...prev, [field]: value };
      persistInterfacePreferences(next);
      return next;
    });
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await apiClient.updateBrainCloudSettings(
        brainCloudSettings
      );
      setBrainCloudSettings({
        ...defaultBrainCloudSettings,
        ...(updated || {}),
      });
      setDirty(false);
      toast.success('Configurações salvas com sucesso.');
      persistInterfacePreferences(interfacePreferences);
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Não foi possível salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (mode: BrainCloudConnectionMode) => {
    setTestingMode(mode);
    setTestStatus(null);
    try {
      const response = await apiClient.testBrainCloudConnection(
        brainCloudSettings,
        mode
      );
      if (response?.success) {
        setTestStatus({
          mode,
          success: true,
          message:
            mode === 'mcp'
              ? 'Conexão MCP estabelecida com sucesso.'
              : 'Conexão REST verificada com sucesso.',
        });
        toast.success(
          mode === 'mcp'
            ? 'Conexão MCP ativa!'
            : 'Conexão REST ativa!'
        );
      } else {
        const message =
          response?.error ||
          'Não foi possível validar a conexão. Verifique as credenciais.';
        setTestStatus({
          mode,
          success: false,
          message,
        });
        toast.error(message);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro inesperado ao testar a conexão.';
      setTestStatus({
        mode,
        success: false,
        message,
      });
      toast.error(message);
    } finally {
      setTestingMode(null);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={handleBackdropClick}
    >
      <div className="relative flex h-full max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        <header className="border-b border-neutral-800 bg-neutral-900 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2
                id="settings-modal-title"
                className="flex items-center gap-2 text-lg font-semibold text-zinc-100"
              >
                <Settings className="h-5 w-5 text-emerald-400" />
                Configurações do Sistema
              </h2>
              <p className="text-sm text-zinc-400">
                Ajuste integrações, preferências visuais e conectividade com o
                Brain Cloud.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-700 px-3 py-1 text-sm text-zinc-300 transition hover:border-neutral-500 hover:text-white"
            >
              Fechar
            </button>
          </div>
        </header>

        <form
          onSubmit={handleSave}
          className="flex-1 overflow-y-auto px-6 py-6"
        >
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4 text-sm text-zinc-400">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
              Carregando configurações do Brain Cloud...
            </div>
          ) : (
            <div className="space-y-10">
              <section className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-inner shadow-black/20">
                <header>
                  <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-100">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    Integração Brain Cloud
                  </h3>
                  <p className="text-sm text-zinc-400">
                    Configure os endpoints e chaves de acesso para sincronizar o
                    dashboard com o Obsidian Brain Cloud.
                  </p>
                </header>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5 md:col-span-2">
                    <label htmlFor="braincloud-base-url" className={labelClass}>
                      Base URL
                    </label>
                    <input
                      id="braincloud-base-url"
                      type="url"
                      placeholder="https://obsidian-mcp.ggailabs.com"
                      className={fieldClass}
                      value={brainCloudSettings.baseUrl}
                      onChange={(event) =>
                        handleBrainCloudChange('baseUrl', event.target.value)
                      }
                      required
                    />
                    <p className={descriptionClass}>
                      Endereço da instância Brain Cloud (REST). Utilize HTTPS em
                      produção.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="braincloud-api-token" className={labelClass}>
                      API Token
                    </label>
                    <input
                      id="braincloud-api-token"
                      type="password"
                      placeholder="Token seguro"
                      className={fieldClass}
                      value={brainCloudSettings.apiToken}
                      onChange={(event) =>
                        handleBrainCloudChange('apiToken', event.target.value)
                      }
                    />
                    <p className={descriptionClass}>
                      Token de autenticação para chamadas REST/MCP. Fica
                      armazenado somente no backend.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="braincloud-tenant-id" className={labelClass}>
                      Tenant ID
                    </label>
                    <input
                      id="braincloud-tenant-id"
                      type="text"
                      placeholder="cliente-xyz"
                      className={fieldClass}
                      value={brainCloudSettings.tenantId}
                      onChange={(event) =>
                        handleBrainCloudChange('tenantId', event.target.value)
                      }
                    />
                    <p className={descriptionClass}>
                      Opcional. Define o workspace utilizado em ambientes
                      multi-tenant.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="braincloud-tenant-plan"
                      className={labelClass}
                    >
                      Tenant Plan
                    </label>
                    <input
                      id="braincloud-tenant-plan"
                      type="text"
                      placeholder="enterprise"
                      className={fieldClass}
                      value={brainCloudSettings.tenantPlan}
                      onChange={(event) =>
                        handleBrainCloudChange(
                          'tenantPlan',
                          event.target.value
                        )
                      }
                    />
                    <p className={descriptionClass}>
                      Opcional. Informativo para cálculo de limites e quotas.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="braincloud-mcp-http" className={labelClass}>
                      MCP HTTP Endpoint
                    </label>
                    <input
                      id="braincloud-mcp-http"
                      type="url"
                      placeholder="https://.../api/v1/mcp/http"
                      className={fieldClass}
                      value={brainCloudSettings.mcpHttp}
                      onChange={(event) =>
                        handleBrainCloudChange('mcpHttp', event.target.value)
                      }
                    />
                    <p className={descriptionClass}>
                      Endpoint HTTP do MCP (necessário para agentes e
                      ferramentas).
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="braincloud-mcp-ws" className={labelClass}>
                      MCP WebSocket Endpoint
                    </label>
                    <input
                      id="braincloud-mcp-ws"
                      type="url"
                      placeholder="wss://.../api/v1/mcp/ws"
                      className={fieldClass}
                      value={brainCloudSettings.mcpWs}
                      onChange={(event) =>
                        handleBrainCloudChange('mcpWs', event.target.value)
                      }
                    />
                    <p className={descriptionClass}>
                      Endpoint WebSocket do MCP (opcional, usado para sessões de
                      longa duração).
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/80 px-4 py-3">
                    <div>
                      <span className="block text-sm font-medium text-zinc-200">
                        Habilitar REST
                      </span>
                      <span className={descriptionClass}>
                        Necessário para o dashboard consumir notas, tarefas e
                        coleções.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-emerald-500"
                      checked={brainCloudSettings.enableRest}
                      onChange={(event) =>
                        handleBrainCloudChange(
                          'enableRest',
                          event.target.checked
                        )
                      }
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/80 px-4 py-3">
                    <div>
                      <span className="block text-sm font-medium text-zinc-200">
                        Habilitar MCP
                      </span>
                      <span className={descriptionClass}>
                        Recomendado para agentes, chat avançado e ferramentas de
                        automação.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-emerald-500"
                      checked={brainCloudSettings.enableMcp}
                      onChange={(event) =>
                        handleBrainCloudChange(
                          'enableMcp',
                          event.target.checked
                        )
                      }
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-emerald-500/60 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => handleTestConnection('rest')}
                    disabled={testingMode !== null}
                  >
                    {testingMode === 'rest' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                    ) : (
                      <Wifi className="h-4 w-4 text-emerald-400" />
                    )}
                    Testar REST
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-emerald-500/60 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => handleTestConnection('mcp')}
                    disabled={testingMode !== null || !hasBrainCloudConfig}
                  >
                    {testingMode === 'mcp' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                    ) : (
                      <ExternalLink className="h-4 w-4 text-emerald-400" />
                    )}
                    Testar MCP
                  </button>
                  {testStatus && (
                    <div
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                        testStatus.success
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                          : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                      }`}
                    >
                      {testStatus.success ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5" />
                      )}
                      {testStatus.message}
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-inner shadow-black/20">
                <header>
                  <h3 className="text-base font-semibold text-zinc-100">
                    Preferências de Interface
                  </h3>
                  <p className="text-sm text-zinc-400">
                    Personalize a experiência do dashboard. Futuramente essas
                    opções serão compartilhadas entre dispositivos.
                  </p>
                </header>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="interface-theme" className={labelClass}>
                      Tema
                    </label>
                    <select
                      id="interface-theme"
                      className={fieldClass}
                      value={interfacePreferences.theme}
                      onChange={(event) =>
                        handleInterfacePreferencesChange(
                          'theme',
                          event.target.value as InterfacePreferences['theme']
                        )
                      }
                    >
                      <option value="system">Seguir sistema</option>
                      <option value="light">Claro</option>
                      <option value="dark">Escuro</option>
                    </select>
                    <p className={descriptionClass}>
                      Ainda em beta — ajuste visual aplicado apenas nesta
                      máquina.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="interface-language" className={labelClass}>
                      Idioma preferido
                    </label>
                    <select
                      id="interface-language"
                      className={fieldClass}
                      value={interfacePreferences.language}
                      onChange={(event) =>
                        handleInterfacePreferencesChange(
                          'language',
                          event.target
                            .value as InterfacePreferences['language']
                        )
                      }
                    >
                      <option value="pt-BR">Português (Brasil)</option>
                      <option value="en-US">English (US)</option>
                    </select>
                    <p className={descriptionClass}>
                      Influencia textos auxiliares e futuros relatórios.
                    </p>
                  </div>

                  <label className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/80 px-4 py-3 md:col-span-2">
                    <div>
                      <span className="block text-sm font-medium text-zinc-200">
                        Reduzir animações
                      </span>
                      <span className={descriptionClass}>
                        Minimiza transições e efeitos visuais para reduzir carga
                        cognitiva.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-emerald-500"
                      checked={interfacePreferences.reduceMotion}
                      onChange={(event) =>
                        handleInterfacePreferencesChange(
                          'reduceMotion',
                          event.target.checked
                        )
                      }
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/80 px-4 py-3 md:col-span-2">
                    <div>
                      <span className="block text-sm font-medium text-zinc-200">
                        Habilitar recursos beta
                      </span>
                      <span className={descriptionClass}>
                        Exibe protótipos experimentais quando disponíveis.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-emerald-500"
                      checked={interfacePreferences.showBetaFeatures}
                      onChange={(event) =>
                        handleInterfacePreferencesChange(
                          'showBetaFeatures',
                          event.target.checked
                        )
                      }
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 text-sm text-zinc-400">
                <p className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-amber-400" />
                  <span>
                    As configurações do Brain Cloud são persistidas no backend
                    (tabela <code>user_settings</code> no PostgreSQL; fallback
                    de sistema). Os valores do token são protegidos e não ficam
                    acessíveis ao cliente.
                  </span>
                </p>
              </section>
            </div>
          )}
        </form>

        <footer className="flex flex-col gap-3 border-t border-neutral-800 bg-neutral-900/80 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="text-xs text-zinc-500">
            Ajustes realizados serão propagados para os módulos do dashboard ao
            salvar. Recomenda-se testar as conexões após qualquer alteração de
            URL ou credenciais.
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-neutral-500 hover:text-white"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              formNoValidate
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving || loading || !dirty}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Salvar alterações
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default SettingsModal;
