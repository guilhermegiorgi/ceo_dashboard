"use client";

import { useAIProviderContext } from "../contexts/AIProviderContext";

export function useAIProvider() {
  const ctx = useAIProviderContext();
  const chatModel = ctx.getSelection("chat");
  const insightsModel = ctx.getSelection("insights");
  const globalModel = ctx.getSelection("global");

  return {
    config: ctx.config,
    chatModel,
    insightsModel,
    globalModel,
    switchModel: ctx.switchModel,
    registerCustomProvider: ctx.registerCustomProvider,
    removeCustomProvider: ctx.removeCustomProvider,
    getDisplayInfo: ctx.getDisplayInfo,
    testProvider: ctx.testProvider,
    isSaving: ctx.isSaving,
  };
}
