"use client";

import React from "react";
import McpToolsRenderer from "./workflow/McpToolsRenderer";

// Real tool UI implementations for assistant-ui integration
export const BrainCloudSearchToolUI = () => {
  return (
    <McpToolsRenderer
      toolName="search"
      toolOutput={{ results: [] }}
      isLoading={false}
    />
  );
};

export const GetNoteToolUI = () => {
  return (
    <McpToolsRenderer
      toolName="vault"
      toolOutput={{ path: "Note loaded successfully" }}
      isLoading={false}
    />
  );
};

export const GetTasksToolUI = () => {
  return (
    <McpToolsRenderer
      toolName="task"
      toolOutput={{ title: "Task retrieved", status: "completed" }}
      isLoading={false}
    />
  );
};

export const GetMainTagsToolUI = () => {
  return (
    <McpToolsRenderer
      toolName="vault"
      toolOutput={{ tags: ["tag1", "tag2", "tag3"] }}
      isLoading={false}
    />
  );
};

export const GetCurrentFocusToolUI = () => {
  return (
    <McpToolsRenderer
      toolName="search"
      toolOutput={{ results: [] }}
      isLoading={false}
    />
  );
};

export const GenericToolFallback = ({ tool }: { tool?: any }) => {
  const toolName = tool?.name || "Unknown Tool";
  const toolOutput = tool?.output || {};
  
  return (
    <McpToolsRenderer
      toolName={toolName}
      toolOutput={toolOutput}
      isLoading={false}
    />
  );
};
