"use client";

import React from "react";
import { Loader2, PlayCircle, RotateCcw, Save, Share2 } from "lucide-react";
import type { BuilderStatus } from "./types";

interface WorkflowToolbarProps {
  name: string;
  description: string;
  status: BuilderStatus;
  statusMessage?: string;
  disableActions?: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSave: () => void;
  onTest: () => void;
  onClear: () => void;
  onExport: () => void;
}

const STATUS_COPY: Record<BuilderStatus, { label: string; intent: string }> = {
  idle: { label: "Idle", intent: "text-zinc-400" },
  saving: { label: "Saving...", intent: "text-emerald-300" },
  testing: { label: "Testing...", intent: "text-sky-300" },
  success: { label: "Success", intent: "text-emerald-300" },
  error: { label: "Error", intent: "text-rose-300" },
};

export default function WorkflowToolbar({
  name,
  description,
  status,
  statusMessage,
  disableActions,
  onNameChange,
  onDescriptionChange,
  onSave,
  onTest,
  onClear,
  onExport,
}: WorkflowToolbarProps) {
  const statusInfo = STATUS_COPY[status];
  const isBusy = status === "saving" || status === "testing";

  return (
    <header className="flex items-center justify-between border-b border-zinc-900/70 bg-zinc-950/80 px-6 py-4">
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Untitled workflow"
            className="min-w-[240px] flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-lg font-semibold text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onSave}
            disabled={disableActions || isBusy}
            className="inline-flex items-center gap-2 rounded-md border border-emerald-500/60 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:border-emerald-400 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy && status === "saving" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </button>
          <button
            type="button"
            onClick={onTest}
            disabled={disableActions || isBusy}
            className="inline-flex items-center gap-2 rounded-md border border-sky-500/60 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-200 transition hover:border-sky-400 hover:text-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy && status === "testing" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            Test
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Share2 className="h-4 w-4" />
            Export JSON
          </button>
        </div>
        <textarea
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="Describe what this workflow automates..."
          rows={2}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none"
        />
      </div>
      <div className="ml-6 flex items-center gap-3 text-sm">
        {isBusy ? (
          <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
        ) : null}
        <div className={`text-sm font-medium ${statusInfo.intent}`}>
          {statusInfo.label}
        </div>
        {statusMessage && (
          <div className="max-w-xs text-xs text-zinc-400">{statusMessage}</div>
        )}
      </div>
    </header>
  );
}
