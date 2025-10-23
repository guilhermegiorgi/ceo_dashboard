"use client";

import React from "react";
import {
  ChevronRight,
  Sparkles,
  Mic,
  FilePlus2,
  Play,
  Loader2,
} from "lucide-react";
import type {
  Conversation,
  ChatMessage,
  ConversationModelConfig,
} from "../services/apiClient";
import ConversationView from "../ConversationView";
import TimelineCard from "../TimelineCard";

interface TimelineCard {
  id: string;
  [key: string]: unknown;
}

interface Snapshot {
  warnings?: Array<{ scope?: string; message: string }>;
  [key: string]: unknown;
}

interface ModelOption {
  id: string;
  [key: string]: unknown;
}

interface ConversationSectionProps {
  chatMode: "timeline" | "conversation";
  activeConversation: Conversation | null;
  chatMessages: ChatMessage[];
  streamingMessage: string;
  thinkingMessage: string;
  chatLoading: boolean;
  isThinking: boolean;
  composerValue: string;
  timelineCards: TimelineCard[];
  loading: boolean;
  snapshot: Snapshot;
  onSendMessage: (message: string) => void;
  onBackToTimeline: () => void;
  handleModelChange: (modelId: string) => void;
  modelsLoading: boolean;
  modelUpdating: boolean;
  conversationModelConfig: ConversationModelConfig | null;
  selectedModelId: string | null;
  modelOptions: ModelOption[];
  handleCollapseTimeline: () => void;
  _isTimelineCollapsed: boolean;
  setComposerValue: (value: string) => void;
  handleStartChat: (message: string) => void;
}

export default function ConversationSection({
  chatMode,
  activeConversation,
  chatMessages,
  streamingMessage,
  thinkingMessage,
  chatLoading,
  isThinking,
  composerValue,
  timelineCards,
  loading,
  snapshot,
  onSendMessage,
  onBackToTimeline,
  handleModelChange,
  modelsLoading,
  modelUpdating,
  conversationModelConfig,
  selectedModelId,
  modelOptions,
  handleCollapseTimeline,
  _isTimelineCollapsed,
  setComposerValue,
  handleStartChat,
}: ConversationSectionProps) {
  if (chatMode === "conversation") {
    return (
      <ConversationView
        conversation={activeConversation}
        messages={chatMessages}
        streamingMessage={streamingMessage}
        thinkingMessage={thinkingMessage}
        isLoading={chatLoading}
        isThinking={isThinking}
        onSendMessage={onSendMessage}
        onBackToTimeline={onBackToTimeline}
        models={modelOptions}
        selectedModelId={selectedModelId}
        onModelChange={handleModelChange}
        modelsLoading={modelsLoading || modelUpdating}
        currentModelConfig={conversationModelConfig}
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-neutral-800/60 px-6 py-3">
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
          Timeline IA
        </p>
        <button
          onClick={handleCollapseTimeline}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-zinc-300 transition hover:border-neutral-600 hover:text-zinc-100"
          aria-label="Recolher timeline"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
        {snapshot?.warnings && snapshot.warnings.length > 0 && (
          <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            {snapshot.warnings.map((warning, index: number) => (
              <p key={index}>
                <strong className="uppercase tracking-wide">
                  {warning.scope || "Aviso"}:
                </strong>{" "}
                {warning.message}
              </p>
            ))}
          </div>
        )}
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-zinc-400" />
            Carregando inteligência em tempo real...
          </div>
        ) : (
          timelineCards.map((card) => (
            <TimelineCard key={card.id} event={card} />
          ))
        )}
      </div>
      <div className="border-t border-neutral-800/60 bg-neutral-950/60 px-6 py-4">
        <div className="flex flex-col gap-3 rounded-lg border border-neutral-700 bg-neutral-950/70 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-zinc-500">
            <span className="flex items-center gap-1 rounded-full border border-neutral-800 bg-neutral-900 px-2 py-0.5">
              <Sparkles className="h-3 w-3 text-emerald-300" />
              Assistente IA ativo
            </span>
            <span className="flex items-center gap-1 rounded-full border border-neutral-800 bg-neutral-900 px-2 py-0.5">
              <Mic className="h-3 w-3 text-zinc-300" />
              Pressione M para falar
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-1 items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950/90 px-4 py-3">
              <Sparkles className="h-5 w-5 text-emerald-300" />
              <input
                value={composerValue}
                onChange={(event) => setComposerValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && composerValue.trim()) {
                    handleStartChat(composerValue.trim());
                    setComposerValue("");
                  }
                }}
                placeholder="Pergunte, capture uma nota ou gere um insight..."
                className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
              />
            </div>
            <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-zinc-200 transition hover:border-neutral-600 hover:bg-neutral-800">
              <Mic className="h-5 w-5 text-zinc-200" />
            </button>
            <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-zinc-200 transition hover:border-neutral-600 hover:bg-neutral-800">
              <FilePlus2 className="h-5 w-5 text-zinc-200" />
            </button>
            <button
              onClick={() => {
                if (composerValue.trim()) {
                  handleStartChat(composerValue.trim());
                  setComposerValue("");
                }
              }}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-200 text-zinc-950 transition hover:border-neutral-500 hover:bg-neutral-100"
            >
              <Play className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span>
              Use{" "}
              <kbd className="rounded border border-neutral-800 bg-neutral-950 px-1">
                /nota
              </kbd>{" "}
              <kbd className="rounded border border-neutral-800 bg-neutral-950 px-1">
                /tarefa
              </kbd>{" "}
              <kbd className="rounded border border-neutral-800 bg-neutral-950 px-1">
                /resumo
              </kbd>
            </span>
            <span>{composerValue.length}/500</span>
          </div>
        </div>
      </div>
    </>
  );
}
