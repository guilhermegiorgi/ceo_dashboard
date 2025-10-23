"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Copy, Trash2 } from "lucide-react";
import type { BuilderNode, NodeDefinition, NodeInput } from "./types";
import { NODE_DEFINITION_MAP } from "./nodes";

interface PropertiesPanelProps {
  node: BuilderNode | null;
  onChange: (config: Record<string, unknown>) => void;
  onRemove: (nodeId: string) => void;
  onDuplicate?: (node: BuilderNode) => void;
  errors?: string[];
}

function parseJsonValue(value: string) {
  if (value.trim() === "") return {};
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error("Invalid JSON");
  }
}

function renderInputControl(
  input: NodeInput,
  value: unknown,
  onValueChange: (next: unknown) => void,
  errorMessage?: string
) {
  const baseClass =
    "w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none";

  switch (input.type) {
    case "text":
    case "cron":
    case "code":
      return (
        <input
          type={input.type === "number" ? "number" : "text"}
          value={typeof value === "string" ? value : value ?? ""}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={input.placeholder}
          className={baseClass}
        />
      );
    case "number":
      return (
        <input
          type="number"
          value={value === undefined || value === null ? "" : Number(value)}
          onChange={(event) => onValueChange(event.target.valueAsNumber)}
          placeholder={input.placeholder}
          className={baseClass}
        />
      );
    case "textarea":
      return (
        <textarea
          value={typeof value === "string" ? value : value ?? ""}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={input.placeholder}
          rows={4}
          className={`${baseClass} resize-y`}
        />
      );
    case "select":
      return (
        <select
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(event) => onValueChange(event.target.value)}
          className={baseClass}
        >
          {input.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case "multiselect":
      return (
        <div className="space-y-1 rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100">
          {input.options?.map((option) => {
            const arrayValue = Array.isArray(value) ? value : [];
            const isChecked = arrayValue.includes(option.value);
            return (
              <label key={option.value} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-[2px]"
                  checked={isChecked}
                  onChange={(event) => {
                    const next = new Set(arrayValue);
                    if (event.target.checked) {
                      next.add(option.value);
                    } else {
                      next.delete(option.value);
                    }
                    onValueChange(Array.from(next));
                  }}
                />
                <span>
                  <span className="font-medium text-zinc-200">
                    {option.label}
                  </span>
                  {option.description && (
                    <span className="block text-xs text-zinc-400">
                      {option.description}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      );
    case "json":
      return (
        <textarea
          value={JSON.stringify(value ?? {}, null, 2)}
          onChange={(event) => {
            try {
              const parsed = parseJsonValue(event.target.value);
              onValueChange(parsed);
            } catch (error) {
              onValueChange(event.target.value);
            }
          }}
          rows={6}
          className={`${baseClass} font-mono`}
        />
      );
    case "toggle":
      return (
        <label className="inline-flex items-center gap-2 text-sm text-zinc-200">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onValueChange(event.target.checked)}
          />
          <span>{input.placeholder ?? "Enable"}</span>
        </label>
      );
    default:
      return (
        <input
          type="text"
          value={typeof value === "string" ? value : value ?? ""}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={input.placeholder}
          className={baseClass}
        />
      );
  }
}

export default function PropertiesPanel({
  node,
  onChange,
  onRemove,
  onDuplicate,
  errors = [],
}: PropertiesPanelProps) {
  const definition: NodeDefinition | undefined = node
    ? NODE_DEFINITION_MAP[node.definitionId]
    : undefined;
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    setJsonError(null);
  }, [node?.id]);

  const previewConfig = useMemo(() => {
    if (!node) return {};
    return node.config;
  }, [node]);

  if (!node || !definition) {
    return (
      <aside className="flex h-full w-80 flex-col border-l border-zinc-800 bg-zinc-950/70">
        <div className="p-4 text-sm text-zinc-400">
          Select a node to configure its properties.
        </div>
      </aside>
    );
  }

  const handleInputChange = (input: NodeInput, next: unknown) => {
    if (input.type === "json") {
      if (typeof next === "string") {
        try {
          const parsed = parseJsonValue(next);
          setJsonError(null);
          onChange({ ...node.config, [input.id]: parsed });
          return;
        } catch (error) {
          setJsonError((error as Error).message);
          return;
        }
      }
    }

    onChange({ ...node.config, [input.id]: next });
  };

  return (
    <aside className="flex h-full w-80 flex-col border-l border-zinc-800 bg-zinc-950/70">
      <div className="flex items-start justify-between border-b border-zinc-900/70 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Properties
          </p>
          <p className="text-sm font-semibold text-zinc-100">
            {definition.label}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onDuplicate && (
            <button
              type="button"
              onClick={() => onDuplicate(node)}
              className="rounded border border-zinc-800 bg-zinc-900 p-1 text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100"
              aria-label="Duplicate node"
            >
              <Copy className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemove(node.id)}
            className="rounded border border-zinc-800 bg-zinc-900 p-1 text-rose-400 transition hover:border-rose-400/80 hover:bg-rose-500/10"
            aria-label="Remove node"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm text-zinc-200">
        {definition.inputs.map((input) => {
          const value = node.config[input.id] ?? input.defaultValue ?? "";
          const fieldErrors = errors.filter((error) => error.includes(input.id));
          return (
            <div key={input.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {input.label}
                </label>
                {input.required && (
                  <span className="text-[10px] uppercase tracking-wide text-rose-400">
                    Required
                  </span>
                )}
              </div>
              {renderInputControl(input, value, (next) => handleInputChange(input, next))}
              {input.helpText && (
                <p className="text-xs text-zinc-500">{input.helpText}</p>
              )}
              {fieldErrors.length > 0 && (
                <p className="flex items-center gap-1 text-xs text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  {fieldErrors[0]}
                </p>
              )}
            </div>
          );
        })}
        {jsonError && (
          <div className="rounded border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {jsonError}
          </div>
        )}
      </div>

      <div className="border-t border-zinc-900/70 bg-zinc-950/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Preview
        </p>
        <pre className="mt-2 max-h-48 overflow-auto rounded-md border border-zinc-900/70 bg-zinc-900/80 p-3 text-xs text-zinc-300">
          {JSON.stringify(previewConfig, null, 2)}
        </pre>
      </div>
    </aside>
  );
}
