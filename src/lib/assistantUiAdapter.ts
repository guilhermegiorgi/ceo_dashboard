"use client";

import {
  type ChatModelAdapter,
  type ChatModelRunResult,
} from "@assistant-ui/react";
import type {
  ThreadAssistantMessagePart,
  ThreadMessage,
} from "@assistant-ui/react";
import apiClient from "@/services/apiClient";

const isTextLikePart = (
  part: ThreadAssistantMessagePart | { type: string; text?: string },
): part is { type: "text" | "reasoning"; text: string } => {
  return (
    (part.type === "text" || part.type === "reasoning") &&
    typeof (part as { text?: string }).text === "string"
  );
};

const stringifyContent = (message: ThreadMessage): string => {
  if (!message.content.some(isTextLikePart)) {
    return "";
  }

  const text = message.content
    .filter(isTextLikePart)
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join("\n\n");

  return text;
};

const toBackendMessages = (messages: readonly ThreadMessage[]) => {
  return messages
    .filter((message) =>
      message.role === "system" ||
      message.role === "user" ||
      message.role === "assistant",
    )
    .map((message) => ({
      role: message.role,
      content: stringifyContent(message),
    }))
    .filter((message, index) => {
      if (message.role === "system" && index === 0) {
        return true;
      }
      return Boolean(message.content.trim());
    });
};

const createQueue = () => {
  let resolver: ((value: ChatModelRunResult | null) => void) | null = null;
  const items: (ChatModelRunResult | null)[] = [];

  const push = (item: ChatModelRunResult | null) => {
    if (resolver) {
      resolver(item);
      resolver = null;
    } else {
      items.push(item);
    }
  };

  const shift = async () => {
    if (items.length > 0) {
      const next = items.shift();
      return next ?? null;
    }

    return await new Promise<ChatModelRunResult | null>((resolve) => {
      resolver = resolve;
    });
  };

  return { push, shift };
};

const clamp = (value: string, limit = 160) =>
  value.length > limit ? `${value.slice(0, limit)}…` : value;

const formatToolSummaryPayload = (data: unknown): string | null => {
  if (!data) return null;

  if (typeof data === "string") {
    return clamp(data.trim());
  }

  if (Array.isArray(data)) {
    const summaries = data
      .map((item) => formatToolSummaryPayload(item))
      .filter(Boolean) as string[];
    return summaries.length ? summaries.join(" | ") : null;
  }

  if (typeof data === "object") {
    const record = data as Record<string, unknown>;

    if (Array.isArray(record.summaries) && record.summaries.length > 0) {
      const summaries = record.summaries
        .map((item) => formatToolSummaryPayload(item))
        .filter(Boolean) as string[];
      if (summaries.length) {
        return summaries.join(" | ");
      }
    }

    if (record.summary) {
      return formatToolSummaryPayload(record.summary);
    }

    if (record.description) {
      return formatToolSummaryPayload(record.description);
    }

    if (record.data) {
      return formatToolSummaryPayload(record.data);
    }
  }

  return null;
};

export const createAssistantUiChatModelAdapter = (): ChatModelAdapter => {
  return {
    run({ messages, runConfig, abortSignal, unstable_getMessage }) {
      const backendMessages = toBackendMessages(messages);
      const sessionId =
        (runConfig?.custom?.sessionId as string | undefined) ??
        unstable_getMessage()?.id ??
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

      return (async function* () {
        const { push, shift } = createQueue();
        let finished = false;

        const streamState = {
          text: "",
          reasoning: "",
          toolCalls: [] as ThreadAssistantMessagePart[],
        };

        const emitUpdate = (
          status: ChatModelRunResult["status"],
          { includeReasoning = true }: { includeReasoning?: boolean } = {},
        ) => {
          const content: ThreadAssistantMessagePart[] = [];

          if (includeReasoning && streamState.reasoning.trim()) {
            content.push({ type: "reasoning", text: streamState.reasoning });
          }

          if (streamState.toolCalls.length > 0) {
            content.push(...streamState.toolCalls);
          }

          if (streamState.text.trim()) {
            content.push({ type: "text", text: streamState.text.trim() });
          }

          if (content.length > 0) {
            push({ content, status });
          } else if (status) {
            push({ status });
          }
        };

        const finish = () => {
          if (finished) return;
          finished = true;
          push(null);
        };

        const handleChunk = (chunk: string) => {
          if (!chunk) return;
          if (streamState.reasoning) {
            streamState.reasoning = "";
          }
          streamState.text += chunk;
          emitUpdate({ type: "running" });
        };

        const ensureToolCallPart = (payload: Record<string, unknown>) => {
          const toolName =
            (typeof payload?.resolvedName === "string" && payload.resolvedName) ||
            (typeof payload?.name === "string" && payload.name) ||
            "Ferramenta";

          const toolCallId = `${toolName}-${streamState.toolCalls.length + 1}-${Date.now()}`;

          const part: ThreadAssistantMessagePart = {
            type: "tool-call",
            toolCallId,
            toolName,
            args: (payload?.arguments as Record<string, unknown>) ?? {},
            argsText: JSON.stringify(payload?.arguments ?? {}, null, 2),
            result: payload ?? null,
            isError: Boolean(payload?.error),
          };

          streamState.toolCalls.push(part);
          if (streamState.toolCalls.length > 8) {
            streamState.toolCalls.splice(0, streamState.toolCalls.length - 8);
          }
        };

        const handleEvent = (
          event:
            | { type: "thinking"; content: string }
            | { type: "tool_result"; data: unknown }
            | { type: "tool_summary"; data: unknown },
        ) => {
          if (event.type === "thinking") {
            streamState.reasoning = event.content;
            emitUpdate({ type: "running" });
            return;
          }

          if (event.type === "tool_result") {
            ensureToolCallPart((event.data as Record<string, unknown>) ?? {});
            emitUpdate({ type: "running" }, { includeReasoning: false });
            return;
          }

          if (event.type === "tool_summary") {
            const summaryText = formatToolSummaryPayload(event.data);
            if (summaryText && streamState.toolCalls.length > 0) {
              const last = streamState.toolCalls[streamState.toolCalls.length - 1];
              if (last.type === "tool-call") {
                last.result = {
                  ...(last.result as Record<string, unknown>),
                  summary: summaryText,
                };
              }
            }
            emitUpdate({ type: "running" }, { includeReasoning: false });
          }
        };

        const handleError = (error: Error) => {
          const message = error.message || "Unexpected error";
          emitUpdate(
            {
              type: "incomplete",
              reason: "error",
              error: { message },
            },
            { includeReasoning: false },
          );
          finish();
        };

        const handleComplete = () => {
          streamState.reasoning = "";
          emitUpdate(
            {
              type: "complete",
              reason: "stop",
            },
            { includeReasoning: false },
          );
          finish();
        };

        void apiClient
          .chatStream(
            backendMessages,
            sessionId,
            handleChunk,
            handleError,
            handleComplete,
            runConfig?.custom?.modelId as string | undefined,
            handleEvent,
          )
          .catch((error) => {
            handleError(error as Error);
          });

        if (abortSignal.aborted) {
          emitUpdate(
            { type: "incomplete", reason: "cancelled" },
            { includeReasoning: false },
          );
          finish();
        } else {
          abortSignal.addEventListener(
            "abort",
            () => {
              emitUpdate(
                { type: "incomplete", reason: "cancelled" },
                { includeReasoning: false },
              );
              finish();
            },
            { once: true },
          );
        }

        while (true) {
          const next = await shift();
          if (next === null) break;
          yield next;
        }
      })();
    },
  };
};
