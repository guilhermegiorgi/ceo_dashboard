"use client";

import {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  type ChangeEvent,
  type FormEvent,
  type ComponentType,
} from "react";
import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowUp,
  Minimize2,
  Maximize2,
  MessageSquare,
  X,
  Loader2,
  Mic,
  FilePlus2,
  Sparkles,
  Command,
  History,
  CircuitBoard,
} from "lucide-react";
import { useAssistantChatRuntime } from "../hooks/useAssistantChatRuntime";
import type { ModelContext } from "./settings/types";
import { useAPI } from "../hooks/useAPI";
import type { ChatMessage, Conversation } from "../services/apiClient";
import { showErrorToast } from "../lib/toast";
import UtilityContentRenderer from "./workflow/UtilityContentRenderer";
import type { ChatHistoryItem } from "./workflow/ChatHistoryRenderer";

interface ChatWidgetProps {
  className?: string;
  context: ModelContext;
  providerLabel?: string;
}

export const STREAMING_PLACEHOLDER = "⌛️ Processando...";

const resolveConversationContext = (
  context: ModelContext
): "global" | "project" | "note" => {
  switch (context) {
    case "global":
    case "chat":
      return "global";
    case "insights":
      return "note";
    default:
      return "global";
  }
};

const CompactAssistantMessage = () => (
  <MessagePrimitive.Root className="max-w-full">
    <div className="space-y-2 rounded-lg border border-emerald-500/20 bg-neutral-900/60 p-3 text-sm">
      <MessagePrimitive.If hasContent={false}>
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
          <Loader2 className="h-3 w-3 animate-spin" />
          Elaborando resposta...
        </div>
      </MessagePrimitive.If>
      <MessagePrimitive.Parts
        components={{
          Text: ({ text }) => (
            <div className="prose prose-invert prose-sm max-w-none text-xs leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            </div>
          ),
          Reasoning: ({ text }) => (
            <div className="space-y-1 rounded border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-100">
              <p className="text-[9px] uppercase tracking-wide text-amber-200/80">
                Processo de raciocínio
              </p>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            </div>
          ),
        }}
      />
    </div>
  </MessagePrimitive.Root>
);

const CompactUserMessage = () => (
  <div className="flex justify-end">
    <MessagePrimitive.Root className="max-w-[80%] rounded-lg bg-emerald-600/90 px-3 py-2 text-xs font-medium text-white">
      <MessagePrimitive.Content />
    </MessagePrimitive.Root>
  </div>
);

const MinimizedChatBar = ({
  onClick,
  providerLabel,
  messageCount,
}: {
  onClick: () => void;
  providerLabel?: string;
  messageCount: number;
}) => (
  <Card className="w-full max-w-[440px] overflow-hidden border-emerald-500/30 bg-gradient-to-r from-neutral-950 via-neutral-900/90 to-emerald-950/30 shadow-[0_20px_60px_-25px_rgba(16,185,129,0.45)] backdrop-blur">
    <button
      onClick={onClick}
      className="group flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:bg-white/5"
      aria-label="Expandir chat"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-100">
              Assistente GG.AI
            </span>
            <ThreadPrimitive.If running>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-200 ring-1 ring-emerald-500/30">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                Processando
              </div>
            </ThreadPrimitive.If>
          </div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-zinc-400">
            <Badge
              variant="outline"
              className="border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
            >
              {providerLabel || "Assistente IA"}
            </Badge>
            <Badge
              variant="secondary"
              className="bg-neutral-800 text-zinc-200 ring-1 ring-neutral-700/80"
            >
              {messageCount} msg
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-200 ring-1 ring-emerald-500/30">
          <Sparkles className="h-3.5 w-3.5" />
          MCP
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-100 transition group-hover:border-emerald-400/70">
          <Maximize2 className="h-4 w-4" />
        </span>
      </div>
    </button>
  </Card>
);

const UtilityToggleButton = ({
  label,
  active,
  onClick,
  icon: Icon,
  hotkey,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: ComponentType<{ className?: string }>;
  hotkey?: string;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition",
      active
        ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-50 shadow-[0_10px_30px_-18px_rgba(52,211,153,0.6)]"
        : "border-neutral-800 bg-neutral-900/70 text-zinc-400 hover:border-neutral-600 hover:text-zinc-100"
    )}
    aria-pressed={active}
    type="button"
  >
    {Icon && <Icon className="h-3.5 w-3.5" />}
    {label}
    {hotkey ? (
      <span className="rounded bg-neutral-800 px-1 py-0.5 text-[10px] font-semibold text-zinc-400">
        {hotkey}
      </span>
    ) : null}
  </button>
);

const ExpandedChatView = ({
  onMinimize,
  onClose,
  activeUtility,
  setActiveUtility,
  handleShortcutSelect,
  handleLoadConversation,
  handleDeleteConversation,
  conversations,
  providerLabel,
  messageCount,
  chatLoading,
  isThinking,
  composerValue,
  onComposerChange,
  onComposerSubmit,
}: {
  onMinimize: () => void;
  onClose: () => void;
  activeUtility: "shortcuts" | "history" | null;
  setActiveUtility: (value: "shortcuts" | "history" | null) => void;
  handleShortcutSelect: (action: string) => void;
  handleLoadConversation: (id: string) => void;
  handleDeleteConversation: (id: string) => void;
  conversations: ChatHistoryItem[];
  providerLabel?: string;
  messageCount: number;
  chatLoading: boolean;
  isThinking: boolean;
  composerValue: string;
  onComposerChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onComposerSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) => (
  <Card className="flex h-[580px] w-[440px] flex-col overflow-hidden border-emerald-500/30 bg-gradient-to-b from-neutral-950 via-neutral-950/95 to-emerald-950/35 shadow-[0_30px_80px_-35px_rgba(16,185,129,0.6)] backdrop-blur">
    <div className="flex items-start justify-between gap-3 border-b border-neutral-800/60 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/40">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-zinc-100">Chat Inteligente</p>
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-zinc-400">
            <Badge
              variant="outline"
              className="border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
            >
              {providerLabel || "Assistente IA"}
            </Badge>
            <Badge
              variant="secondary"
              className="bg-neutral-800 text-zinc-200 ring-1 ring-neutral-700/80"
            >
              {messageCount} mensagem{messageCount === 1 ? "" : "s"}
            </Badge>
            {(chatLoading || isThinking) && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 ring-1 ring-emerald-500/30">
                <Loader2 className="h-3 w-3 animate-spin" />
                Processando
              </span>
            )}
          </div>
        </div>
        <ThreadPrimitive.If running>
          <div className="ml-1 flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 ring-1 ring-emerald-500/30">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
            Em execução
          </div>
        </ThreadPrimitive.If>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-200 ring-1 ring-emerald-500/30 sm:flex">
          <CircuitBoard className="h-3.5 w-3.5" />
          Ferramentas MCP
        </div>
        <Button
          onClick={onMinimize}
          variant="ghost"
          size="icon"
          className="text-neutral-400 hover:text-white"
          aria-label="Minimizar chat"
        >
          <Minimize2 className="h-4 w-4" />
        </Button>
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="text-neutral-400 hover:text-rose-400"
          aria-label="Fechar chat"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>

    <ThreadPrimitive.Viewport className="relative flex-1 space-y-3 overflow-y-auto px-4 py-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08)_0,_transparent_38%)]" />
      <ThreadPrimitive.Empty>
        <div className="relative flex h-full items-center justify-center text-center">
          <div className="space-y-2">
            <div className="mx-auto w-fit rounded-full border border-emerald-500/40 bg-emerald-500/10 p-3 shadow-inner shadow-emerald-900/30">
              <MessageSquare className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-sm text-zinc-400">
              Inicie uma conversa com seu assistente
            </p>
            <p className="text-xs text-zinc-500">
              Dica: use F1 para atalhos e F2 para acessar o histórico
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

    <div className="flex flex-wrap items-center gap-2 border-t border-neutral-800/60 bg-neutral-900/70 px-4 py-2">
      <UtilityToggleButton
        label="Atalhos"
        hotkey="F1"
        icon={Command}
        active={activeUtility === "shortcuts"}
        onClick={() =>
          setActiveUtility(activeUtility === "shortcuts" ? null : "shortcuts")
        }
      />
      <UtilityToggleButton
        label="Histórico"
        hotkey="F2"
        icon={History}
        active={activeUtility === "history"}
        onClick={() =>
          setActiveUtility(activeUtility === "history" ? null : "history")
        }
      />
      <div className="ml-auto flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-200 ring-1 ring-emerald-500/30">
        <Sparkles className="h-3.5 w-3.5" />
        MCP pronto
      </div>
    </div>

    {(activeUtility === "shortcuts" || activeUtility === "history") && (
      <div className="border-t border-neutral-800/60 bg-neutral-900/80 px-4 py-3">
        {activeUtility === "shortcuts" && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-zinc-400">
              <span>Atalhos rápidos</span>
              <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] text-emerald-200">
                Usa modelos com MCP
              </span>
            </div>
            <UtilityContentRenderer
              type="shortcuts"
              onAction={handleShortcutSelect}
            />
          </div>
        )}

        {activeUtility === "history" && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-zinc-400">
              <span>Histórico de conversas</span>
              <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] text-zinc-300">
                {conversations.length} conversa{conversations.length === 1 ? "" : "s"}
              </span>
            </div>
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

    <div className="border-t border-neutral-800/60 bg-neutral-950/90 p-3">
      <ComposerPrimitive.Root
        className="flex items-end gap-2 rounded-xl border border-neutral-800/60 bg-neutral-900/70 p-3 shadow-inner shadow-black/30"
        onSubmit={onComposerSubmit}
      >
        <ComposerPrimitive.Input
          className="max-h-32 min-h-[38px] flex-1 resize-none bg-transparent px-2 py-1 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
          placeholder="Digite sua mensagem..."
          rows={1}
          value={composerValue}
          onChange={onComposerChange}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 border border-neutral-800/80 bg-neutral-900 text-zinc-300 hover:border-neutral-600 hover:text-white"
          aria-label="Atalho de voz"
        >
          <Mic className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 border border-neutral-800/80 bg-neutral-900 text-zinc-300 hover:border-neutral-600 hover:text-white"
          aria-label="Adicionar arquivo"
        >
          <FilePlus2 className="h-4 w-4" />
        </Button>

        <Button
          type="submit"
          size="icon"
          className="h-9 w-9 flex-shrink-0 bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
          aria-label="Enviar"
          disabled={
            chatLoading || isThinking || composerValue.trim().length === 0
          }
        >
          {chatLoading || isThinking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </Button>
      </ComposerPrimitive.Root>
    </div>
  </Card>
);

const mapToThreadMessages = (
  messages: ChatMessage[],
  streamingMessage: string,
  thinkingMessage: string
): ThreadMessageLike[] => {
  const base = messages.map<ThreadMessageLike>((message) => ({
    id: message.id,
    role: message.role,
    content: [{ type: "text", text: message.content }],
    createdAt: new Date(message.createdAt),
    status:
      message.role === "assistant"
        ? ({ type: "complete", reason: "stop" } as const)
        : undefined,
  }));

  if (thinkingMessage) {
    base.push({
      id: "thinking",
      role: "assistant",
      content: [
        {
          type: "reasoning",
          text: thinkingMessage,
        },
      ],
      status: { type: "running" },
      createdAt: new Date(),
    });
  }

  if (streamingMessage) {
    base.push({
      id: "streaming",
      role: "assistant",
      content: [
        {
          type: "text",
          text:
            streamingMessage === STREAMING_PLACEHOLDER ? "" : streamingMessage,
        },
      ],
      status: { type: "running" },
      createdAt: new Date(),
    });
  }

  return base;
};

export default function ChatWidget({
  className = "",
  context,
  providerLabel,
}: ChatWidgetProps) {
  const api = useAPI();
  const { runtime, selection } = useAssistantChatRuntime(context);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [activeUtility, setActiveUtility] = useState<"shortcuts" | "history" | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [composerValue, setComposerValue] = useState("");

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [thinkingMessage, setThinkingMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const messagesRef = useRef<ChatMessage[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const threadMessages = useMemo(
    () => mapToThreadMessages(messages, streamingMessage, thinkingMessage),
    [messages, streamingMessage, thinkingMessage]
  );

  const serializedThreadMessages = useMemo(
    () =>
      JSON.stringify(
        threadMessages,
        (key, value) =>
          value instanceof Date ? value.toISOString() : value
      ),
    [threadMessages]
  );

  const lastSerializedThreadRef = useRef<string | null>(null);

  useEffect(() => {
    if (!runtime) return;

    let retryHandle: ReturnType<typeof setTimeout> | null = null;

    const syncThread = () => {
      if (serializedThreadMessages === lastSerializedThreadRef.current) {
        runtime.thread.composer.setText(composerValue);
        return;
      }

      try {
        runtime.thread.reset(threadMessages as readonly ThreadMessageLike[]);
        runtime.thread.composer.setText(composerValue);
        lastSerializedThreadRef.current = serializedThreadMessages;
      } catch (error) {
        if (error instanceof Error && error.message.includes("empty thread")) {
          if (retryHandle === null) {
            retryHandle = window.setTimeout(() => {
              retryHandle = null;
              syncThread();
            }, 40);
          }
          return;
        }
        console.error("ChatWidget failed to sync assistant runtime thread", error);
      }
    };

    syncThread();

    return () => {
      if (retryHandle !== null) {
        clearTimeout(retryHandle);
      }
    };
  }, [runtime, threadMessages, serializedThreadMessages, composerValue]);

  useEffect(() => {
    let cancelled = false;

    const loadInitialConversation = async () => {
      try {
        const contextType = resolveConversationContext(context);
        const { conversations: list } = await api.getConversations({
          limit: 20,
          contextType,
        });
        if (cancelled) return;

        setConversations(list);

        if (list.length === 0) {
          setConversationId(null);
          setMessages([]);
          messagesRef.current = [];
          setStreamingMessage("");
          setThinkingMessage("");
          return;
        }

        const active = await api.getConversation(list[0].id);
        if (cancelled) return;

        const initialMessages = Array.isArray(active.messages)
          ? active.messages
          : [];

        setConversationId(active.id);
        setMessages(initialMessages);
        messagesRef.current = initialMessages;
        setStreamingMessage("");
        setThinkingMessage("");
      } catch (error) {
        if (!cancelled) {
          console.error(
            "ChatWidget failed to load conversation history:",
            error
          );
        }
      }
    };

    loadInitialConversation();

    return () => {
      cancelled = true;
    };
  }, [api, context]);

  const ensureConversation = useCallback(async () => {
    if (conversationId) return conversationId;
    try {
      const conversation = await api.createConversation({
        contextType: resolveConversationContext(context),
      });
      const initialMessages = Array.isArray(conversation.messages)
        ? conversation.messages
        : [];
      setConversationId(conversation.id);
      setMessages(initialMessages);
      messagesRef.current = initialMessages;
      setConversations((prev) => [
        conversation,
        ...prev.filter((item) => item.id !== conversation.id),
      ]);
      return conversation.id;
    } catch (error) {
      console.error("ChatWidget failed to create conversation:", error);
      showErrorToast("Não foi possível iniciar a conversa rápida.");
      return null;
    }
  }, [api, context, conversationId]);

  const handleComposerChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const nextValue = event.target.value;
      setComposerValue(nextValue);
      runtime.thread.composer.setText(nextValue);
    },
    [runtime]
  );

  const handleSendMessage = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = composerValue.trim();
      if (!trimmed) return;

      if (!selection?.provider || !selection?.model) {
        showErrorToast(
          "Configure um provedor e modelo de IA nas configurações antes de usar o chat rápido."
        );
        return;
      }

      const providerOverride = {
        provider: selection.provider,
        model: selection.model,
        customProviderId: selection.customProviderId,
        temperature: selection.temperature,
        maxTokens: selection.maxTokens,
      };

      const ensuredConversationId = await ensureConversation();
      if (!ensuredConversationId) return;

      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => {
        const next = [...prev, tempMessage];
        messagesRef.current = next;
        return next;
      });

      setComposerValue("");
      runtime.thread.composer.setText("");
      setChatLoading(true);
      setThinkingMessage("");
      setStreamingMessage(STREAMING_PLACEHOLDER);
      setIsThinking(false);

      let savedMessage: ChatMessage | null = null;

      try {
        savedMessage = await api.addMessage(ensuredConversationId, {
          role: "user",
          content: trimmed,
        });

        setMessages((prev) => {
          const next = prev.map((message) =>
            message.id === tempMessage.id ? savedMessage! : message
          );
          messagesRef.current = next;
          return next;
        });
      } catch (error) {
        console.error("ChatWidget failed to save user message:", error);
        showErrorToast("Não foi possível enviar a mensagem.");
        setMessages((prev) => {
          const next = prev.filter((message) => message.id !== tempMessage.id);
          messagesRef.current = next;
          return next;
        });
        setChatLoading(false);
        setStreamingMessage("");
        return;
      }

      const baseMessages = messagesRef.current;

      let streamedContent = "";
      let thinkingBuffer = "";
      let inThinkingPhase = false;

      await api.chatStream(
        [
          {
            role: "system",
            content:
              "Você é um assistente IA com acesso às ferramentas MCP. Sempre use as ferramentas quando disponíveis para ajudar o usuário.",
          },
          ...baseMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          { role: "user", content: trimmed },
        ],
        ensuredConversationId,
        (chunk) => {
          if (!chunk) return;
          if (inThinkingPhase) {
            inThinkingPhase = false;
            setIsThinking(false);
          }
          streamedContent += chunk;
          setStreamingMessage((prev) =>
            !prev || prev === STREAMING_PLACEHOLDER ? chunk : prev + chunk
          );
        },
        (error) => {
          console.error("ChatWidget streaming error:", error);
          const message =
            error instanceof Error ? error.message : "Falha no streaming";
          const normalizedStreamMessage = message.toLowerCase();
          const isToolSupportError = normalizedStreamMessage.includes(
            "no endpoints found that support tool use"
          );
          const friendlyMessage = isToolSupportError
            ? "O modelo selecionado não suporta uso de ferramentas MCP. Ajuste o provedor/modelo nas configurações."
            : `Erro ao processar a resposta da IA: ${message}`;
          showErrorToast(friendlyMessage);
          setIsThinking(false);
          setThinkingMessage("");
          setStreamingMessage(
            isToolSupportError
              ? "⚠️ O modelo selecionado não suporta uso de ferramentas MCP."
              : `⚠️ Erro ao processar a resposta da IA: ${message}`
          );
          setChatLoading(false);
        },
        async () => {
          setChatLoading(false);

          if (thinkingBuffer.trim()) {
            try {
              const thinkingMessageSaved = await api.addMessage(
                ensuredConversationId,
                {
                  role: "assistant",
                  content: thinkingBuffer.trim(),
                }
              );
              setMessages((prev) => {
                const next = [...prev, thinkingMessageSaved];
                messagesRef.current = next;
                return next;
              });
            } catch (error) {
              console.error(
                "ChatWidget failed to persist thinking message:",
                error
              );
            }
          }

          if (streamedContent.trim()) {
            try {
              const savedResponse = await api.addMessage(
                ensuredConversationId,
                {
                  role: "assistant",
                  content: streamedContent,
                }
              );
              setMessages((prev) => {
                const next = [...prev, savedResponse];
                messagesRef.current = next;
                return next;
              });
            } catch (error) {
              console.error(
                "ChatWidget failed to persist assistant response:",
                error
              );
              setMessages((prev) => {
                const fallback = {
                  id: `assistant-${Date.now()}`,
                  role: "assistant" as const,
                  content: streamedContent,
                  createdAt: new Date().toISOString(),
                };
                const next = [...prev, fallback];
                messagesRef.current = next;
                return next;
              });
            }
          }

          setStreamingMessage("");
          setThinkingMessage("");
        },
        {
          providerOverride,
          context,
          conversationId: ensuredConversationId,
          tools: true,
        },
        (event) => {
          if (!event) return;
          if (event.type === "thinking") {
            if (!inThinkingPhase) {
              inThinkingPhase = true;
              thinkingBuffer = "";
            }
            thinkingBuffer += event.content;
            setThinkingMessage(thinkingBuffer);
            setIsThinking(true);
          }
          if (event.type === "content") {
            inThinkingPhase = false;
            setIsThinking(false);
            streamedContent += event.content;
            setStreamingMessage((prev) =>
              !prev || prev === STREAMING_PLACEHOLDER
                ? event.content
                : `${prev}${event.content}`
            );
          }
          if (event.type === "tool_summary") {
            const summaries = Array.isArray(event.data)
              ? event.data
              : [event.data].filter(Boolean);
            if (summaries.length > 0) {
              const summaryText = summaries.join("\n");
              streamedContent += `\n${summaryText}`;
              setStreamingMessage((prev) =>
                !prev || prev === STREAMING_PLACEHOLDER
                  ? summaryText
                  : `${prev}\n${summaryText}`
              );
            }
          }
          if (event.type === "tool_result") {
            const resultText =
              typeof event.data === "string"
                ? event.data
                : JSON.stringify(event.data, null, 2);
            streamedContent += `\n${resultText}`;
            setStreamingMessage((prev) =>
              !prev || prev === STREAMING_PLACEHOLDER
                ? resultText
                : `${prev}\n${resultText}`
            );
          }
        }
      );
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === ensuredConversationId
            ? {
                ...conversation,
                messageCount: messagesRef.current.length,
                updatedAt: new Date().toISOString(),
                lastMessagePreview:
                  streamedContent.trim() || thinkingBuffer.trim() || trimmed,
              }
            : conversation
        )
      );
    },
    [
      api,
      composerValue,
      context,
      ensureConversation,
      runtime,
      selection,
    ]
  );

  const handleShortcutSelect = (action: string) => {
    console.log("Shortcut selected:", action);
  };

  const handleLoadConversation = useCallback(
    async (id: string) => {
      try {
        setChatLoading(true);
        const conversation = await api.getConversation(id);
        const loadedMessages = Array.isArray(conversation.messages)
          ? conversation.messages
          : [];
        setConversationId(conversation.id);
        setMessages(loadedMessages);
        messagesRef.current = loadedMessages;
        setStreamingMessage("");
        setThinkingMessage("");
        setConversations((prev) => {
          const next = prev.filter((item) => item.id !== conversation.id);
          return [conversation, ...next];
        });
      } catch (error) {
        console.error("ChatWidget failed to load conversation:", error);
        showErrorToast("Não foi possível carregar a conversa selecionada.");
      } finally {
        setChatLoading(false);
      }
    },
    [api]
  );

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        await api.deleteConversation(id);
        setConversations((prev) => prev.filter((conv) => conv.id !== id));
        if (conversationId === id) {
          setConversationId(null);
          setMessages([]);
          messagesRef.current = [];
          setStreamingMessage("");
          setThinkingMessage("");
        }
      } catch (error) {
        console.error("ChatWidget failed to delete conversation:", error);
        showErrorToast("Não foi possível remover a conversa.");
      }
    },
    [api, conversationId]
  );

  const historyData: ChatHistoryItem[] = useMemo(
    () =>
      conversations.map((conversation) => ({
        id: conversation.id,
        title: conversation.title || "Conversa sem título",
        summary: conversation.lastMessagePreview ?? "",
        messageCount: conversation.messageCount ?? 0,
        updatedAt: conversation.updatedAt,
        tags: conversation.detectedTags ?? [],
      })),
    [conversations]
  );

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

  const messageCount =
    messages.length +
    (streamingMessage && streamingMessage !== STREAMING_PLACEHOLDER ? 1 : 0) +
    (thinkingMessage ? 1 : 0);

  return (
    <div className={className}>
      <AssistantRuntimeProvider runtime={runtime}>
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
              conversations={historyData}
              providerLabel={providerLabel}
              messageCount={messageCount}
              chatLoading={chatLoading}
              isThinking={isThinking}
              composerValue={composerValue}
              onComposerChange={handleComposerChange}
              onComposerSubmit={handleSendMessage}
            />
          ) : (
            <MinimizedChatBar
              onClick={() => setIsExpanded(true)}
              providerLabel={providerLabel}
              messageCount={messageCount}
            />
          )}
        </ThreadPrimitive.Root>
      </AssistantRuntimeProvider>
    </div>
  );
}
