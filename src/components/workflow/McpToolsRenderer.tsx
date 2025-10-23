"use client";

import React from "react";
import { Loader2, AlertCircle, CheckCircle, Code } from "lucide-react";

interface McpToolsRendererProps {
  toolName: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: unknown;
  isLoading?: boolean;
  error?: string;
  timestamp?: string;
}

export default function McpToolsRenderer({
  toolName,
  toolInput,
  toolOutput,
  isLoading,
  error,
  timestamp,
}: McpToolsRendererProps) {
  // Renderizadores específicos por tipo de tool
  const renderByToolType = () => {
    switch (toolName) {
      case "search":
        return <SearchToolRenderer output={toolOutput} />;
      case "graph":
        return <GraphToolRenderer output={toolOutput} />;
      case "task":
        return <TaskToolRenderer output={toolOutput} />;
      case "vault":
        return <VaultToolRenderer output={toolOutput} />;
      default:
        return <GenericToolRenderer output={toolOutput} />;
    }
  };

  return (
    <div className="bg-slate-900 rounded-lg p-4 my-2 border border-slate-700">
      <div className="flex items-center gap-2 mb-2">
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {error && <AlertCircle className="w-4 h-4 text-red-500" />}
        {!isLoading && !error && <CheckCircle className="w-4 h-4 text-green-500" />}
        <span className="font-mono text-sm font-bold">{toolName}</span>
        {timestamp && <span className="text-xs text-slate-400 ml-auto">{timestamp}</span>}
      </div>

      {isLoading && <div className="text-sm text-slate-400">Executando...</div>}
      {error && <div className="text-sm text-red-400">{error}</div>}
      {!isLoading && !error && renderByToolType()}

      {toolInput && (
        <details className="mt-2">
          <summary className="text-xs text-slate-400 cursor-pointer">Input</summary>
          <pre className="text-xs bg-slate-950 p-2 rounded mt-1 overflow-auto max-h-32">
            {JSON.stringify(toolInput, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Renderizadores Específicos
// ─────────────────────────────────────────────────────────────

function SearchToolRenderer({ output }: { output?: unknown }) {
  if (!output || typeof output !== "object") return null;
  const results = (output as Record<string, unknown>).results as Array<Record<string, unknown>> || [];

  return (
    <div className="space-y-2">
      {results.length > 0 ? (
        results.map((result, idx) => (
          <div key={idx} className="text-sm p-2 bg-slate-800 rounded">
            <p className="font-semibold text-blue-400">{result.title}</p>
            <p className="text-slate-300">{result.snippet}</p>
            <p className="text-xs text-slate-500 mt-1">{result.path}</p>
          </div>
        ))
      ) : (
        <p className="text-sm text-slate-400">Nenhum resultado encontrado</p>
      )}
    </div>
  );
}

function GraphToolRenderer({ output }: { output?: unknown }) {
  if (!output || typeof output !== "object") return null;
  const graph = output as Record<string, unknown>;
  const nodes = (graph.nodes as Array<{ id: string; label: string }>) || [];

  return (
    <div className="text-sm">
      <p className="text-slate-300 mb-2">Nós do grafo: {nodes.length}</p>
      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
        {nodes.map((node) => (
          <div key={node.id} className="text-xs bg-slate-800 p-2 rounded">
            {node.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskToolRenderer({ output }: { output?: unknown }) {
  if (!output || typeof output !== "object") return null;
  const task = output as Record<string, unknown>;

  return (
    <div className="text-sm p-2 bg-slate-800 rounded">
      <p className="font-semibold text-green-400">{task.title}</p>
      <p className="text-slate-300 text-xs mt-1">Status: {task.status}</p>
      {task.dueDate && <p className="text-xs text-slate-500">Due: {task.dueDate}</p>}
    </div>
  );
}

function VaultToolRenderer({ output }: { output?: unknown }) {
  if (!output || typeof output !== "object") return null;
  const vault = output as Record<string, unknown>;

  return (
    <div className="text-sm p-2 bg-slate-800 rounded">
      <p className="text-slate-300">Path: <code className="text-xs text-yellow-400">{vault.path}</code></p>
      {vault.size && <p className="text-xs text-slate-500">Size: {vault.size} bytes</p>}
    </div>
  );
}

function GenericToolRenderer({ output }: { output?: unknown }) {
  return (
    <div className="text-sm">
      <pre className="bg-slate-950 p-2 rounded overflow-auto max-h-48 text-xs">
        {JSON.stringify(output, null, 2)}
      </pre>
    </div>
  );
}
