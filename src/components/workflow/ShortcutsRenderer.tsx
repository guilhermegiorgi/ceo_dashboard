"use client";

import React from "react";
import { Keyboard, Send } from "lucide-react";

interface Shortcut {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: string;
  description?: string;
}

interface ShortcutsRendererProps {
  onSelect?: (action: string) => void;
}

const AVAILABLE_SHORTCUTS: Shortcut[] = [
  {
    id: "search",
    label: "🔍 Buscar",
    icon: <Keyboard className="w-4 h-4" />,
    action: "/search ",
    description: "Buscar no vault",
  },
  {
    id: "today",
    label: "📅 Hoje",
    icon: <Keyboard className="w-4 h-4" />,
    action: "/today",
    description: "Ver tarefas de hoje",
  },
  {
    id: "focus",
    label: "🎯 Foco",
    icon: <Keyboard className="w-4 h-4" />,
    action: "/focus",
    description: "Resumo de foco",
  },
  {
    id: "graph",
    label: "🗺️ Grafo",
    icon: <Keyboard className="w-4 h-4" />,
    action: "/graph",
    description: "Visualizar grafo",
  },
  {
    id: "tasks",
    label: "✅ Tarefas",
    icon: <Keyboard className="w-4 h-4" />,
    action: "/tasks",
    description: "Listar tarefas",
  },
  {
    id: "context",
    label: "💡 Contexto",
    icon: <Keyboard className="w-4 h-4" />,
    action: "/context",
    description: "Carregar contexto histórico",
  },
];

export default function ShortcutsRenderer({
  onSelect,
}: ShortcutsRendererProps) {
  return (
    <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <Keyboard className="w-4 h-4 text-blue-400" />
        <h3 className="font-semibold text-sm">Atalhos Rápidos</h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {AVAILABLE_SHORTCUTS.map((shortcut) => (
          <button
            key={shortcut.id}
            onClick={() => onSelect?.(shortcut.action)}
            className="text-left p-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors group"
            title={shortcut.description}
          >
            <p className="text-sm font-medium group-hover:text-blue-400">{shortcut.label}</p>
            {shortcut.description && (
              <p className="text-xs text-slate-400 mt-1">{shortcut.description}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
