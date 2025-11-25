"use client";

import { useEffect, type ChangeEvent, type FormEvent } from "react";
import {
  ChevronRight,
  Sparkles,
  Loader2,
  ChevronLeft,
  Wrench,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  AssistantRuntimeProvider,
} from "@assistant-ui/react";
import type { AssistantRuntime } from "@assistant-ui/react";
import type { ChatMessage, Conversation } from "../../services/apiClient";
import type { ToolEvent } from "../../hooks/useTimelineState";
import TimelineCard, {
  type TimelineCard as TimelineCardType,
} from "../TimelineCard";
import {
  ChatBubble,
  ChatMessageList,
  ThinkingAccordion,
  ChatInput,
} from "@/components/ui/chat";
import { STREAMING_PLACEHOLDER } from "../ChatWidget";
import { cn } from "@/lib/utils";
import React, { useRef, useCallback, useMemo } from "react";
import { Reasoning, ReasoningContent } from "@/components/ui/shadcn/reasoning";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputSubmit,
} from "@/components/ui/ai/prompt-input";
import { Response } from "@/components/ui/ai/response";

const ToolSummary = ({ event }: { event: ToolEvent }) => {
  const output = event.output;
  // Quick heuristics for common structures
  if (output && typeof output === "object") {
    const structured = (output as any).structuredContent || (output as any).result || (output as any).data;
    const files = structured?.files || structured?.result?.files;
    if (Array.isArray(files) && files.length > 0) {
      return (
        <div className="mt-3 space-y-1 text-xs text-zinc-300">
          <p className="font-semibold text-zinc-200">Arquivos encontrados:</p>
          <ul className="max-h-40 space-y-1 overflow-auto rounded-lg border border-neutral-800 bg-neutral-950/60 p-2">
            {files.slice(0, 10).map((file: any, idx: number) => (
              <li key={idx} className="flex items-center justify-between gap-2 rounded bg-neutral-900/60 px-2 py-1">
                <span className="truncate text-[12px] text-zinc-100">{file.path || file.name}</span>
                {file.modified && (
                  <span className="text-[11px] text-zinc-500">
                    {String(file.modified).slice(0, 10)}
                  </span>
                )}
              </li>
            ))}
            {files.length > 10 && (
              <li className="text-[11px] text-zinc-500">
                +{files.length - 10} itens
              </li>
            )}
          </ul>
        </div>
      );
    }
    const summary = structured?.summary || structured?.result?.summary;
    if (summary) {
      const isRenderable =
        typeof summary === "string" || typeof summary === "number";
      const summaryText = isRenderable
        ? String(summary)
        : JSON.stringify(summary, null, 2);
      return (
        <div className="mt-2 text-xs text-zinc-300">
          <p className="font-semibold text-zinc-200">Resumo:</p>
          <Response>{summaryText}</Response>
        </div>
      );
    }
  }

  // Fallback simple text rendering
  if (typeof output === "string") {
    return (
      <div className="mt-2 text-xs text-zinc-300">
        <p className="font-semibold text-zinc-200">Resultado:</p>
        <p className="mt-1 leading-relaxed text-zinc-300 whitespace-pre-wrap">
          {output}
        </p>
      </div>
    );
  }

  if (output && typeof output === "object") {
    return (
      <div className="mt-2 text-xs text-zinc-300">
        <p className="font-semibold text-zinc-200">Resultado:</p>
        <Response>{"```json\n" + JSON.stringify(output, null, 2) + "\n```"}</Response>
      </div>
    );
  }

  return null;
};

interface Snapshot {
  warnings?: Array<{ scope?: string; message: string }>;
  [key: string]: unknown;
}

interface ConversationSectionProps {
  chatMode: "timeline" | "conversation";
  activeConversation: Conversation | null;
  chatLoading: boolean;
  isThinking: boolean;
  composerValue: string;
  timelineCards: TimelineCardType[];
  loading: boolean;
  snapshot: Snapshot;
  onSendMessage: (message: string) => void;
  onBackToTimeline: () => void;
  handleCollapseTimeline: () => void;
  setComposerValue: (value: string) => void;
  runtime: AssistantRuntime;
  messageCount: number;
  providerLabel?: string;
  chatMessages: ChatMessage[];
  streamingMessage: string;
  thinkingMessage: string;
  toolEvents: ToolEvent[];
}

export default function ConversationSection({
  chatMode,
  activeConversation,
  chatLoading,
  isThinking,
  composerValue,
  timelineCards,
  loading,
  snapshot,
  onSendMessage,
  onBackToTimeline,
  handleCollapseTimeline,
  setComposerValue,
  runtime,
  messageCount,
  providerLabel,
  chatMessages,
  streamingMessage,
  thinkingMessage,
  toolEvents,
}: ConversationSectionProps) {
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const value = composerValue.trim();
        if (value) {
          onSendMessage(value);
          runtime.thread.composer.setText("");
          setComposerValue("");
          requestAnimationFrame(() => composerRef.current?.focus());
        }
      }
    },
    [composerValue, onSendMessage, runtime.thread.composer, setComposerValue]
  );

  const timelineItems = useMemo(() => {
    // Monta em ordem: mensagens -> reasoning -> tools -> stream
    const items: Array<
      | { type: "message"; createdAt: number; data: ChatMessage }
      | { type: "thinking"; createdAt: number; data: string }
      | { type: "tool"; createdAt: number; data: ToolEvent }
      | { type: "stream"; createdAt: number; data: string }
    > = [];
    const seen = new Set<string>();

    chatMessages.forEach((msg) => {
      const ts = msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now();
      const key = `msg-${msg.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({ type: "message", createdAt: ts, data: msg });
    });

    const baseTs =
      items.length > 0 ? items[items.length - 1].createdAt : Date.now();
    let cursor = baseTs + 1;

    if (thinkingMessage) {
      items.push({
        type: "thinking",
        createdAt: cursor++,
        data: thinkingMessage,
      });
    }

    toolEvents.forEach((tool) => {
      const key = `tool-${tool.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({
        type: "tool",
        createdAt: cursor++,
        data: tool,
      });
    });

    if (streamingMessage && streamingMessage !== "") {
      items.push({
        type: "stream",
        createdAt: cursor++,
        data:
          streamingMessage === STREAMING_PLACEHOLDER
            ? "_Processando..._"
            : streamingMessage,
      });
    }

    return items;
  }, [chatMessages, toolEvents, thinkingMessage, streamingMessage]);
  useEffect(() => {
    if (chatMode !== "conversation") return;
    try {
      runtime.thread.composer.setText(composerValue);
      composerRef.current?.focus();
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("empty thread")
      ) {
        return;
      }
      console.error(
        "ConversationSection failed to sync composer state",
        error
      );
    }
  }, [chatMode, composerValue, runtime]);

  if (chatMode === "conversation") {
    const handleComposerChange = (value: string) => {
      setComposerValue(value);
      runtime.thread.composer.setText(value);
    };

    const handleSend = (message: string) => {
      onSendMessage(message);
      runtime.thread.composer.setText("");
      setComposerValue("");
      composerRef.current?.focus();
    };

    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <div className="flex h-full flex-col bg-background">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-neutral-800/60 px-6 py-4 bg-card/50">
              <div className="flex items-center gap-3">
                <button
                  onClick={onBackToTimeline}
                  className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-neutral-600 hover:bg-neutral-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Timeline
                </button>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {activeConversation?.title || "Nova conversa"}
                  </h3>
                  {activeConversation?.contextType === "project" &&
                    activeConversation.projectName && (
                      <p className="text-xs text-muted-foreground">
                        📁 Projeto: {activeConversation.projectName}
                      </p>
                    )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                <span className="rounded-full border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[11px] uppercase tracking-wide text-zinc-400">
                  {providerLabel || "Assistente IA"}
                </span>
                <span>
                  {messageCount} mensagem{messageCount === 1 ? "" : "s"}
                </span>
                {(chatLoading || isThinking || streamingMessage) && (
                  <span className="flex items-center gap-1 text-primary">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Processando...
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <ChatMessageList className="mx-auto w-full max-w-4xl space-y-3">
                {timelineItems.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center">
                    <div className="space-y-2">
                      <div className="mx-auto w-fit rounded-full bg-primary/10 p-3">
                        <Sparkles className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Comece a conversa digitando sua mensagem abaixo
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {timelineItems.map((item, idx) => {
                      if (item.type === "message") {
                        const message = item.data as ChatMessage;
                        return (
                          <ChatBubble key={`msg-${message.id}-${idx}`} role={message.role}>
                            {message.role === "assistant" ? (
                              <Response>
                                {typeof message.content === "string"
                                  ? message.content
                                  : "```json\n" +
                                    JSON.stringify(message.content, null, 2) +
                                    "\n```"}
                              </Response>
                            ) : (
                              (typeof message.content === "string"
                                ? message.content
                                : JSON.stringify(message.content))
                            )}
                          </ChatBubble>
                        );
                      }
                      if (item.type === "tool") {
                        const event = item.data as ToolEvent;
                        return (
                          <div
                            key={`tool-${event.id}-${idx}`}
                            className="w-full max-w-3xl rounded-xl border border-neutral-800 bg-neutral-900/80 p-3 text-sm shadow-md shadow-black/30"
                          >
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-400">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                                <Wrench className="h-4 w-4" />
                              </div>
                              <span className="font-semibold text-zinc-200">
                                {event.resolvedName || event.name}
                              </span>
                              <span className="rounded-full border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[10px] text-zinc-500">
                                Tool
                              </span>
                              {event.error ? (
                                <span className="ml-auto flex items-center gap-1 text-rose-400">
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  Erro
                                </span>
                              ) : (
                                <span className="ml-auto flex items-center gap-1 text-emerald-400">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  OK
                                </span>
                              )}
                            </div>

                            <ToolSummary event={event} />

                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-200">
                                Ver detalhes brutos
                              </summary>
                              <div className="mt-2 space-y-2 rounded-lg border border-neutral-800 bg-neutral-950/70 p-2 text-[12px] leading-relaxed text-zinc-200">
                                {event.arguments && Object.keys(event.arguments).length > 0 && (
                                  <div>
                                    <p className="mb-1 font-semibold text-zinc-300">Entrada</p>
                                    <Response>
                                      {"```json\n" +
                                        JSON.stringify(event.arguments, null, 2) +
                                        "\n```"}
                                    </Response>
                                  </div>
                                )}
                                <div>
                                  <p className="mb-1 font-semibold text-zinc-300">Saída</p>
                                  <Response>
                                    {event.error
                                      ? String(event.error)
                                      : "```json\n" +
                                        JSON.stringify(event.output ?? {}, null, 2) +
                                        "\n```"}
                                  </Response>
                                </div>
                              </div>
                            </details>
                          </div>
                        );
                      }
                      if (item.type === "thinking") {
                        const text = item.data as string;
                        return (
                          <Reasoning
                            key={`think-${idx}`}
                            isStreaming={isThinking}
                            defaultOpen={false}
                            className="w-full"
                          >
                            <ReasoningContent>{text}</ReasoningContent>
                          </Reasoning>
                        );
                      }
                      if (item.type === "stream") {
                        const text = item.data as string;
                        return (
                          <ChatBubble key={`stream-${idx}`} role="assistant">
                            <Response>{text}</Response>
                          </ChatBubble>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
              </ChatMessageList>
            </div>

            <div className="border-t border-neutral-800/60 bg-card/50 px-2 py-2">
              <PromptInput
                onSubmit={(e) => {
                  e.preventDefault();
                  if (composerValue.trim()) {
                    handleSend(composerValue.trim());
                  }
                }}
              >
                <PromptInputTextarea
                  ref={composerRef}
                  value={composerValue}
                  onChange={(e) => handleComposerChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte, capture uma nota ou gere um insight..."
                  disabled={chatLoading || isThinking}
                />
                  <PromptInputToolbar>
                    <PromptInputSubmit disabled={chatLoading || isThinking || !composerValue.trim()} />
                    <div className="text-[11px] text-zinc-500">
                      Enter para enviar • Shift+Enter nova linha
                    </div>
                  </PromptInputToolbar>
              </PromptInput>
            </div>
          </div>
        </div>
      </AssistantRuntimeProvider>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-neutral-800/60 px-6 py-3 bg-card/50">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
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
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Carregando inteligência em tempo real...
          </div>
        ) : (
          timelineCards.map((card) => (
            <TimelineCard key={card.id} event={card} />
          ))
        )}
      </div>
      <div className="border-t border-neutral-800/60 bg-card/50">
        <ChatInput
          value={composerValue}
          onChange={(value) => setComposerValue(value)}
          onSend={(message) => {
            onSendMessage(message);
            setComposerValue("");
          }}
          placeholder="Pergunte, capture uma nota ou gere um insight..."
          className="border-none bg-transparent"
        />
      </div>
    </div>
  );
}
