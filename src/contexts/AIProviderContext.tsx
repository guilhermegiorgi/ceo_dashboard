"use client";

import React, { createContext, useContext, useCallback, useMemo, useState } from "react";
import {
  AIProvider,
  AIProviderConfig,
  ModelContext,
  ModelSelectionConfig,
  CustomProviderConfig,
} from "../components/settings/types";
import { useSettings } from "./SettingsContext";
import apiClient from "../services/apiClient";

interface ProviderDisplayInfo {
  id: AIProvider;
  label: string;
  accentColor: string;
  icon: string;
}

const PROVIDER_DISPLAY: ProviderDisplayInfo[] = [
  { id: "openai", label: "OpenAI", accentColor: "#f97316", icon: "🟠" },
  { id: "anthropic", label: "Anthropic", accentColor: "#6366f1", icon: "🔵" },
  { id: "google", label: "Google Gemini", accentColor: "#22c55e", icon: "🟢" },
  { id: "perplexity", label: "Perplexity", accentColor: "#06b6d4", icon: "🔷" },
  { id: "openrouter", label: "OpenRouter", accentColor: "#ef4444", icon: "🔺" },
];

export interface AIProviderContextValue {
  config: AIProviderConfig;
  apiKeys: AIProviderConfig["apiKeys"];
  getSelection: (context: ModelContext) => ModelSelectionConfig;
  switchModel: (
    context: ModelContext,
    selection: Partial<ModelSelectionConfig>
  ) => Promise<void> | void;
  registerCustomProvider: (id: string, provider: CustomProviderConfig) => void;
  removeCustomProvider: (id: string) => void;
  getDisplayInfo: (provider: AIProvider) => ProviderDisplayInfo;
  testProvider: (context?: ModelContext) => Promise<{ success: boolean }>;
  isSaving: boolean;
}

const AIProviderContext = createContext<AIProviderContextValue | null>(null);

export const AIProviderProvider = ({ children }: { children: React.ReactNode }) => {
  const {
    aiProviderConfig,
    setAIProviderConfig,
    saveSettings,
  } = useSettings();
  const [isSaving, setIsSaving] = useState(false);

  const getDisplayInfo = useCallback((provider: AIProvider): ProviderDisplayInfo => {
    return (
      PROVIDER_DISPLAY.find((item) => item.id === provider) || {
        id: provider,
        label: provider,
        accentColor: "#71717a",
        icon: "⚙️",
      }
    );
  }, []);

  const getSelection = useCallback(
    (context: ModelContext): ModelSelectionConfig => {
      return aiProviderConfig.modelSelection[context];
    },
    [aiProviderConfig.modelSelection]
  );

  const switchModel = useCallback(
    async (context: ModelContext, selection: Partial<ModelSelectionConfig>) => {
      setAIProviderConfig((prev) => ({
        ...prev,
        modelSelection: {
          ...prev.modelSelection,
          [context]: {
            ...prev.modelSelection[context],
            ...selection,
          },
        },
      }));
      setIsSaving(true);
      try {
        await apiClient.updateAIModelSelection(context, selection);
        await saveSettings();
      } finally {
        setIsSaving(false);
      }
    },
    [setAIProviderConfig, saveSettings]
  );

  const registerCustomProvider = useCallback(
    (id: string, provider: CustomProviderConfig) => {
      setAIProviderConfig((prev) => ({
        ...prev,
        customProviders: {
          ...(prev.customProviders || {}),
          [id]: provider,
        },
      }));
    },
    [setAIProviderConfig]
  );

  const removeCustomProvider = useCallback(
    (id: string) => {
      setAIProviderConfig((prev) => {
        if (!prev.customProviders) return prev;
        const { [id]: _removed, ...rest } = prev.customProviders;
        return {
          ...prev,
          customProviders: rest,
        };
      });
    },
    [setAIProviderConfig]
  );

  const testProvider = useCallback(
    async (context: ModelContext = "chat") => {
      try {
        await apiClient.testAIProvider(context);
        return { success: true };
      } catch {
        return { success: false };
      }
    },
    []
  );

  const value = useMemo<AIProviderContextValue>(() => ({
    config: aiProviderConfig,
    apiKeys: aiProviderConfig.apiKeys,
    getSelection,
    switchModel,
    registerCustomProvider,
    removeCustomProvider,
    getDisplayInfo,
    testProvider,
    isSaving,
  }), [
    aiProviderConfig,
    getSelection,
    switchModel,
    registerCustomProvider,
    removeCustomProvider,
    getDisplayInfo,
    testProvider,
    isSaving,
  ]);

  return (
    <AIProviderContext.Provider value={value}>
      {children}
    </AIProviderContext.Provider>
  );
};

export const useAIProviderContext = (): AIProviderContextValue => {
  const context = useContext(AIProviderContext);
  if (!context) {
    throw new Error("useAIProviderContext must be used within AIProviderProvider");
  }
  return context;
};
