"use client";

import React, { useState } from "react";
import { MessageSquare, Trash2, Download } from "lucide-react";

interface ChatHistoryItem {
  id: string;  
  title: string;
  summary?: string;
  messageCount: number;
  updatedAt: string;
  tags?: string[];
}

interface ChatHistoryRendererProps {
  conversations?: ChatHistoryItem[];
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function ChatHistoryRenderer({
  conversations = [],
  onSelect,
  onDelete,
}: ChatHistoryRendererProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Defensive check for undefined/null conversations
  const safeConversations = conversations || [];

  return (
    <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 max-h-96 overflow-y-auto">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-4 h-4 text-purple-400" />
        <h3 className="font-semibold text-sm">Histórico de Conversas</h3>
        <span className="text-xs text-slate-400 ml-auto">{safeConversations.length}</span>
      </div>

      {safeConversations.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhuma conversa salva ainda</p>
      ) : (
        <div className="space-y-2">
          {safeConversations.map((conv) => (
            <div
              key={conv.id}
              className="p-2 bg-slate-800 rounded hover:bg-slate-700 transition-colors cursor-pointer"
              onClick={() => {
                onSelect?.(conv.id);
                setExpandedId(expandedId === conv.id ? null : conv.id);
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-blue-300">
                    {conv.title}
                  </p>
                  {expandedId === conv.id && conv.summary && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {conv.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500">
                      {conv.messageCount} mensagens
                    </span>
                    <span className="text-xs text-slate-600">
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {conv.tags && conv.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {conv.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-slate-700 px-2 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(conv.id);
                    }}
                    className="p-1 hover:bg-red-900 rounded transition-colors"
                    title="Deletar"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                  <button
                    className="p-1 hover:bg-slate-600 rounded transition-colors"
                    title="Exportar"
                  >
                    <Download className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
