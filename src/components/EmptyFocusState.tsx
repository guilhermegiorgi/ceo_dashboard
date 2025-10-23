import React from "react";
import { AlertCircle } from "lucide-react";

interface EmptyFocusStateProps {
  message: string;
  onDefine: () => void;
}

export function EmptyFocusState({ message, onDefine }: EmptyFocusStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-neutral-800/50 bg-neutral-900/30 px-4 py-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
      <div className="flex items-center gap-3">
        <AlertCircle
          className="h-8 w-8 flex-shrink-0 text-zinc-500"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-zinc-100">{message}</h3>
          <p className="text-sm text-zinc-500">
            Defina seu foco para acompanhar melhor suas prioridades.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onDefine}
        className="inline-flex items-center justify-center rounded-md border border-emerald-500/60 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:ring-offset-2 focus:ring-offset-neutral-900"
      >
        Definir foco agora
      </button>
    </div>
  );
}
