"use client";

import React, { useState } from "react";
import { Keyboard, MessageSquare, Zap, X } from "lucide-react";
import UtilityContentRenderer from "./UtilityContentRenderer";

type ActiveTab = "shortcuts" | "history" | "tools" | null;

interface UtilityPanelProps {
  onClose?: () => void;
  conversations?: Array<Record<string, unknown>>;
  onSelectConversation?: (id: string) => void;
}

export default function UtilityPanel({
  onClose,
  conversations = [],
  onSelectConversation,
}: UtilityPanelProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("shortcuts");

  const tabs: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: "shortcuts", label: "Atalhos", icon: <Keyboard className="w-4 h-4" /> },
    { id: "history", label: "Histórico", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "tools", label: "Ferramentas", icon: <Zap className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-slate-900 border-l border-slate-700 w-80 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h2 className="font-semibold text-sm">Utilidades</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-800 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
              activeTab === tab.id
                ? "bg-slate-800 text-blue-400 border-b-2 border-blue-400"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "shortcuts" && (
          <UtilityContentRenderer type="shortcuts" />
        )}

        {activeTab === "history" && (
          <UtilityContentRenderer
            type="history"
            data={conversations}
            onSelect={onSelectConversation}
          />
        )}

        {activeTab === "tools" && (
          <div className="text-sm text-slate-400">
            <p>Ferramentas MCP disponíveis</p>
            <p className="text-xs mt-2">Execute ferramentas e veja os resultados aqui</p>
          </div>
        )}
      </div>
    </div>
  );
}
