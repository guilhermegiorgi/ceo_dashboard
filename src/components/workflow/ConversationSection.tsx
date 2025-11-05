"use client";

import { useEffect, type ChangeEvent, type FormEvent } from "react";
import {
  ChevronRight,
  Sparkles,
  Mic,
  FilePlus2,
  Play,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
} from "@assistant-ui/react";
import type { AssistantRuntime } from "@assistant-ui/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Conversation } from "../../services/apiClient";
import TimelineCard, {
  type TimelineCard as TimelineCardType,
} from "../TimelineCard";
import { GenericToolFallback } from "../chat-tools";

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
}: ConversationSectionProps) {
  useEffect(() => {
    if (chatMode !== "conversation") return;
    try {
      runtime.thread.composer.setText(composerValue);
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
    const handleComposerSubmit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const composerState = runtime.thread.composer.getState();
      const draft = composerState.text ?? "";
      const trimmed = draft.trim();
      if (!trimmed) return;

      onSendMessage(trimmed);
      runtime.thread.composer.setText("");
      setComposerValue("");
    };

    const handleComposerChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
      setComposerValue(event.target.value);
      runtime.thread.composer.setText(event.target.value);
    };

    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <div className="flex h-full flex-col">
          <ThreadPrimitive.Root className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-neutral-800/60 px-6 py-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={onBackToTimeline}
                  className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-neutral-600 hover:bg-neutral-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Timeline
                </button>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {activeConversation?.title || "Nova conversa"}
                  </h3>
                  {activeConversation?.contextType === "project" &&
                    activeConversation.projectName && (
                      <p className="text-xs text-zinc-500">
                        📁 Projeto: {activeConversation.projectName}
                      </p>
                    )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 text-xs text-zinc-500">
                <span className="rounded-full border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[11px] uppercase tracking-wide text-zinc-400">
                  {providerLabel || "Assistente IA"}
                </span>
                <span>
                  {messageCount} mensagem{messageCount === 1 ? "" : "s"}
                </span>
                {(chatLoading || isThinking) && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Processando...
                  </span>
                )}
              </div>
            </div>

            <ThreadPrimitive.Viewport className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
              <ThreadPrimitive.Empty>
                <div className="flex h-full items-center justify-center text-center">
                  <div className="space-y-2">
                    <div className="mx-auto w-fit rounded-full bg-emerald-500/10 p-3">
                      <Sparkles className="h-6 w-6 text-emerald-400" />
                    </div>
                    <p className="text-sm text-zinc-400">
                      Comece a conversa digitando sua mensagem abaixo
                    </p>
                  </div>
                </div>
              </ThreadPrimitive.Empty>

              <ThreadPrimitive.Messages
                components={{
                  AssistantMessage: () => (
                    <MessagePrimitive.Root className="max-w-full">
                      <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-neutral-900/60 p-4 text-sm">
                        <MessagePrimitive.Parts
                          components={{
                            Text: ({ text }) => (
                              <div className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {text}
                                </ReactMarkdown>
                              </div>
                            ),
                            Reasoning: ({ text }) => (
                              <div className="space-y-1 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-100">
                                <p className="text-[10px] uppercase tracking-wide text-amber-200/80">
                                  Processo de raciocínio
                                </p>
                                <div className="prose prose-invert prose-sm max-w-none text-[12px] leading-relaxed text-amber-100/90">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {text}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            ),
                            tools: { Fallback: GenericToolFallback },
                          }}
                        />
                      </div>
                    </MessagePrimitive.Root>
                  ),
                  UserMessage: () => (
                    <div className="flex justify-end">
                      <MessagePrimitive.Root className="max-w-[80%] rounded-lg bg-emerald-600/90 px-4 py-2 text-sm font-medium text-white">
                        <MessagePrimitive.Content />
                      </MessagePrimitive.Root>
                    </div>
                  ),
                }}
              />
            </ThreadPrimitive.Viewport>

            <div className="border-t border-neutral-800/60 bg-neutral-950/60 px-6 py-4">
              <ComposerPrimitive.Root
                className="flex flex-col gap-3 rounded-lg border border-neutral-700 bg-neutral-950/70 px-4 py-3"
                onSubmit={handleComposerSubmit}
              >
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
                    <ComposerPrimitive.Input
                      placeholder="Pergunte, capture uma nota ou gere um insight..."
                      className="max-h-40 flex-1 resize-none bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                      onChange={handleComposerChange}
                    />
                  </div>
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-zinc-200 transition hover:border-neutral-600 hover:bg-neutral-800"
                  >
                    <Mic className="h-5 w-5 text-zinc-200" />
                  </button>
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-zinc-200 transition hover:border-neutral-600 hover:bg-neutral-800"
                  >
                    <FilePlus2 className="h-5 w-5 text-zinc-200" />
                  </button>
                  <ThreadPrimitive.If running={false}>
                    <button
                      type="submit"
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-200 text-zinc-950 transition hover:border-neutral-500 hover:bg-neutral-100"
                    >
                      <Play className="h-5 w-5" />
                    </button>
                  </ThreadPrimitive.If>
                  <ThreadPrimitive.If running>
                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-emerald-300"
                      disabled
                    >
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </button>
                  </ThreadPrimitive.If>
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
              </ComposerPrimitive.Root>
            </div>
          </ThreadPrimitive.Root>
        </div>
      </AssistantRuntimeProvider>
    );
  }

  return (
    <div className="flex h-full flex-col">
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
                    onSendMessage(composerValue.trim());
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
                  onSendMessage(composerValue.trim());
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
    </div>
  );
}
