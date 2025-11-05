"use client";

import React, { useState } from "react";
import { MessageSquare, Trash2, Plus, Loader2 } from "lucide-react";

export interface ChatHistoryItem {
  id: string;  
  title: string;
  summary?: string;
  messageCount: number;
  updatedAt: string;
  tags?: string[];
}

interface ChatHistoryRendererProps {
  conversations?: ChatHistoryItem[];
  loading?: boolean;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  onCreate?: () => void;
  activeConversationId?: string | null;
}

export default function ChatHistoryRenderer({
  conversations = [],
  loading = false,
  onSelect,
  onDelete,
  onCreate,
  activeConversationId,
}: ChatHistoryRendererProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Defensive check for undefined/null conversations
  const safeConversations = conversations || [];

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-emerald-300" />
          <h3 className="text-sm font-semibold text-zinc-100">
            Histórico de Conversas
          </h3>
        </div>
        <span className="ml-auto text-xs text-zinc-500">
          {loading ? "--" : safeConversations.length}
        </span>
        {onCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-zinc-200 transition hover:border-neutral-600 hover:bg-neutral-800"
            aria-label="Nova conversa"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-sm text-zinc-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : safeConversations.length === 0 ? (
        <p className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-4 text-sm text-zinc-500">
          Nenhuma conversa encontrada. Inicie um novo chat para começar.
        </p>
      ) : (
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-2">
          {safeConversations.map((conv) => (
            <div
              key={conv.id}
              className={`group cursor-pointer rounded-lg border px-3 py-2 transition ${
                conv.id === activeConversationId
                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-100"
                  : "border-neutral-800 bg-neutral-950 text-zinc-200 hover:border-neutral-600 hover:bg-neutral-900"
              }`}
              onClick={() => {
                onSelect?.(conv.id);
                setExpandedId(expandedId === conv.id ? null : conv.id);
              }}
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {conv.title}
                  </p>
                  {expandedId === conv.id && conv.summary && (
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-400">
                      {conv.summary}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-zinc-500">
                    <span>{conv.messageCount} mensagens</span>
                    <span>{new Date(conv.updatedAt).toLocaleString()}</span>
                  </div>
                  {conv.tags && conv.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {conv.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-zinc-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete?.(conv.id);
                  }}
                  className="hidden rounded p-1 text-zinc-500 transition hover:text-rose-400 group-hover:block"
                  title="Excluir conversa"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
