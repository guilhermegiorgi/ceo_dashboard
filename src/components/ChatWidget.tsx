"use client";

import { useState } from "react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
} from "@assistant-ui/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowUp,
  Square,
  Minimize2,
  Maximize2,
  MessageSquare,
  X,
} from "lucide-react";
import {
  GenericToolFallback,
} from "./chat-tools";
import McpToolsRenderer from "./workflow/McpToolsRenderer";
import UtilityContentRenderer from "./workflow/UtilityContentRenderer";

interface ChatWidgetProps {
  className?: string;
}

// Compact Assistant Message
const CompactAssistantMessage = () => (
  <MessagePrimitive.Root className="max-w-full">
    <div className="rounded-lg border border-emerald-500/20 bg-neutral-900/60 p-3 text-sm">
      <MessagePrimitive.Parts
        components={{
          Text: ({ text }) => (
            <div className="prose prose-invert prose-sm max-w-none text-xs leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            </div>
          ),
          tools: { Fallback: GenericToolFallback },
        }}
      />
    </div>
  </MessagePrimitive.Root>
);

// Compact User Message
const CompactUserMessage = () => (
  <div className="flex justify-end">
    <MessagePrimitive.Root className="max-w-[80%] rounded-lg bg-emerald-600/90 px-3 py-2 text-xs font-medium text-white">
      <MessagePrimitive.Content />
    </MessagePrimitive.Root>
  </div>
);

// Minimized Chat Bar
const MinimizedChatBar = ({ onClick }: { onClick: () => void }) => (
  <div className="flex items-center justify-between rounded-t-xl border border-b-0 border-neutral-800/50 bg-neutral-900/90 px-4 py-3 backdrop-blur-sm">
    <div className="flex items-center gap-2">
      <MessageSquare className="h-4 w-4 text-emerald-400" />
      <span className="text-sm font-medium text-zinc-100">
        Assistente GG.AI
      </span>
      <ThreadPrimitive.If running>
        <div className="ml-2 flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-xs text-emerald-300">Respondendo...</span>
        </div>
      </ThreadPrimitive.If>
    </div>
    <button
      onClick={onClick}
      className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
      aria-label="Expandir chat"
    >
      <Maximize2 className="h-4 w-4" />
    </button>
  </div>
);

// Expanded Chat View
const ExpandedChatView = ({
  onMinimize,
  onClose,
  activeUtility,
  setActiveUtility,
  handleShortcutSelect,
  handleLoadConversation,
  handleDeleteConversation,
  conversations,
}: {
  onMinimize: () => void;
  onClose: () => void;
  activeUtility: "shortcuts" | "history" | null;
  setActiveUtility: (value: "shortcuts" | "history" | null) => void;
  handleShortcutSelect: (action: string) => void;
  handleLoadConversation: (id: string) => void;
  handleDeleteConversation: (id: string) => void;
  conversations: Array<Record<string, unknown>>;
}) => (
  <div className="flex h-[500px] flex-col rounded-t-xl border border-b-0 border-neutral-800/50 bg-neutral-950/90 backdrop-blur-sm">
    {/* Header */}
    <div className="flex items-center justify-between border-b border-neutral-800/50 px-4 py-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-emerald-400" />
        <span className="text-sm font-medium text-zinc-100">
          Chat Inteligente
        </span>
        <ThreadPrimitive.If running>
          <div className="ml-2 flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-xs text-emerald-300">Processando...</span>
          </div>
        </ThreadPrimitive.If>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onMinimize}
          className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
          aria-label="Minimizar chat"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-800 hover:text-rose-400"
          aria-label="Fechar chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>

    {/* Messages */}
    <ThreadPrimitive.Viewport className="flex-1 space-y-3 overflow-y-auto p-4">
      <ThreadPrimitive.Empty>
        <div className="flex h-full items-center justify-center text-center">
          <div className="space-y-2">
            <div className="mx-auto w-fit rounded-full bg-emerald-500/10 p-3">
              <MessageSquare className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-sm text-zinc-400">
              Inicie uma conversa com seu assistente
            </p>
          </div>
        </div>
      </ThreadPrimitive.Empty>

      <ThreadPrimitive.Messages
        components={{
          AssistantMessage: CompactAssistantMessage,
          UserMessage: CompactUserMessage,
        }}
      />
    </ThreadPrimitive.Viewport>

    {/* Utility Buttons */}
    <div className="flex gap-2 px-3 pb-2">
      <button
        onClick={() => setActiveUtility(activeUtility === "shortcuts" ? null : "shortcuts")}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          activeUtility === "shortcuts"
            ? "bg-blue-600 text-white"
            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
        }`}
      >
        F1: Atalhos
      </button>
      <button
        onClick={() => setActiveUtility(activeUtility === "history" ? null : "history")}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          activeUtility === "history"
            ? "bg-blue-600 text-white"
            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
        }`}
      >
        F2: Histórico
      </button>
    </div>

    {/* Utility Panels */}
    {(activeUtility === "shortcuts" || activeUtility === "history") && (
      <div className="border-t border-neutral-800/50 px-3 py-2">
        {activeUtility === "shortcuts" && (
          <div className="mb-2">
            <h4 className="text-xs font-medium text-slate-400 mb-2">Atalhos Rápidos</h4>
            <UtilityContentRenderer type="shortcuts" onAction={handleShortcutSelect} />
          </div>
        )}

        {activeUtility === "history" && (
          <div className="mb-2">
            <h4 className="text-xs font-medium text-slate-400 mb-2">Histórico de Conversas</h4>
            <UtilityContentRenderer
              type="history"
              data={conversations}
              onSelect={handleLoadConversation}
              onDelete={handleDeleteConversation}
            />
          </div>
        )}
      </div>
    )}

    {/* Composer */}
    <div className="border-t border-neutral-800/50 p-3">
      <ComposerPrimitive.Root className="flex items-end gap-2 rounded-lg border border-neutral-800/50 bg-neutral-900/50 p-2">
        <ComposerPrimitive.Input
          className="max-h-24 min-h-[32px] flex-1 resize-none bg-transparent px-2 py-1 text-sm text-zinc-100 placeholder-zinc-500 outline-none"
          placeholder="Digite sua mensagem..."
          rows={1}
        />

        <ThreadPrimitive.If running={false}>
          <ComposerPrimitive.Send asChild>
            <button
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:opacity-50"
              aria-label="Enviar"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </ComposerPrimitive.Send>
        </ThreadPrimitive.If>

        <ThreadPrimitive.If running>
          <ComposerPrimitive.Cancel asChild>
            <button
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-rose-600 text-white transition hover:bg-rose-500"
              aria-label="Cancelar"
            >
              <Square className="h-3 w-3 fill-current" />
            </button>
          </ComposerPrimitive.Cancel>
        </ThreadPrimitive.If>
      </ComposerPrimitive.Root>
    </div>
  </div>
);

export default function ChatWidget({ className = "" }: ChatWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [activeUtility, setActiveUtility] = useState<"shortcuts" | "history" | null>(null);
  const [conversations, setConversations] = useState<Array<Record<string, unknown>>>([]);

  const runtime = useChatRuntime({
    api: "/api/mcp/chat/stream",
  });

  const handleShortcutSelect = (action: string) => {
    // Simulate inserting the shortcut into the input
    console.log("Shortcut selected:", action);
  };

  const handleLoadConversation = (id: string) => {
    console.log("Load conversation:", id);
  };

  const handleDeleteConversation = (id: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg transition hover:bg-emerald-500"
      >
        <MessageSquare className="h-5 w-5" />
        Abrir Chat
      </button>
    );
  }

  return (
    <div className={`${className}`}>
      <AssistantRuntimeProvider runtime={runtime}>
        {/* Chat Interface */}
        <ThreadPrimitive.Root>
          {isExpanded ? (
            <ExpandedChatView
              onMinimize={() => setIsExpanded(false)}
              onClose={() => setIsVisible(false)}
              activeUtility={activeUtility}
              setActiveUtility={setActiveUtility}
              handleShortcutSelect={handleShortcutSelect}
              handleLoadConversation={handleLoadConversation}
              handleDeleteConversation={handleDeleteConversation}
              conversations={conversations}
            />
          ) : (
            <MinimizedChatBar onClick={() => setIsExpanded(true)} />
          )}
        </ThreadPrimitive.Root>
      </AssistantRuntimeProvider>
    </div>
  );
}
