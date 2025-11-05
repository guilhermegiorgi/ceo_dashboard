import { useMemo } from "react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";
import type { ModelContext } from "@/components/settings/types";
import { useAIProvider } from "./useAIProvider";

const resolveSelectionForContext = (
  context: ModelContext,
  {
    chatModel,
    insightsModel,
    globalModel,
  }: {
    chatModel: ReturnType<typeof useAIProvider>["chatModel"];
    insightsModel: ReturnType<typeof useAIProvider>["insightsModel"];
    globalModel: ReturnType<typeof useAIProvider>["globalModel"];
  }
) => {
  switch (context) {
    case "insights":
      return insightsModel;
    case "global":
      return globalModel;
    default:
      return chatModel;
  }
};

export function useAssistantChatRuntime(context: ModelContext = "chat") {
  const { chatModel, insightsModel, globalModel } = useAIProvider();

  const selection = resolveSelectionForContext(context, {
    chatModel,
    insightsModel,
    globalModel,
  });

  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: "/api/mcp/chat/stream",
        headers: async () => {
          if (typeof window === "undefined") return {};
          const token = window.localStorage.getItem("token");
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        body: async () => ({
          providerOverride: selection
            ? {
                provider: selection.provider,
                model: selection.model,
                customProviderId: selection.customProviderId,
                temperature: selection.temperature,
                maxTokens: selection.maxTokens,
              }
            : undefined,
          context,
        }),
      }),
    [selection, context]
  );

  const runtime = useChatRuntime({
    transport,
  });

  return {
    runtime,
    selection,
  };
}
