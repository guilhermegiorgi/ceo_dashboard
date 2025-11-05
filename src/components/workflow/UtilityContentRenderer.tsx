"use client";

import React from "react";
import McpToolsRenderer from "./McpToolsRenderer";
import ShortcutsRenderer from "./ShortcutsRenderer";
import ChatHistoryRenderer, {
  type ChatHistoryItem,
} from "./ChatHistoryRenderer";

export type UtilityType = "mcp-tools" | "shortcuts" | "history";

interface UtilityContentRendererProps {
  type: UtilityType;
  data?: unknown;
  onAction?: (action: string) => void;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function UtilityContentRenderer({
  type,
  data,
  onAction,
  onSelect,
  onDelete,
}: UtilityContentRendererProps) {
  switch (type) {
    case "mcp-tools": {
      if (!data || typeof data !== "object") return null;
      const toolData = data as Record<string, unknown>;
      return (
        <McpToolsRenderer
          toolName={String(toolData.toolName || "unknown")}
          toolInput={toolData.toolInput as Record<string, unknown> | undefined}
          toolOutput={toolData.toolOutput}
          isLoading={Boolean(toolData.isLoading)}
          error={toolData.error as string | undefined}
          timestamp={toolData.timestamp as string | undefined}
        />
      );
    }

    case "shortcuts":
      return <ShortcutsRenderer onSelect={onAction} />;

    case "history":
      if (!Array.isArray(data)) return null;
      return (
        <ChatHistoryRenderer
          conversations={data as ChatHistoryItem[]}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      );

    default:
      return null;
  }
}
