'use client';

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Send, Sparkles, ChevronLeft, Copy, Check, Bot, ChevronDown } from "lucide-react";
import apiClient from "../services/apiClient";
import ReactMarkdown from "react-markdown";

interface ToolCallResult {
  name: string;
  resolvedName?: string;
  arguments?: Record<string, unknown>;
  output?: unknown;
  raw?: string | null;
  error?: string | null;
}

interface Message {
  id: string;
  text: string;
  role: "user" | "assistant";
  timestamp: Date;
  thinking?: string;
  toolResults?: ToolCallResult[];
  toolSummary?: string[];
  isStreaming?: boolean;
}

interface ModelOption {
  id: string;
  displayName: string;
  providerName?: string;
  isDefault?: boolean;
}

interface ConversationMessageDTO {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

type ToolContentBlock = {
  type?: string;
  text?: string;
};

type TagLike = {
  tag?: string;
  name?: string;
  count?: number;
  occurrences?: number;
};

type StructuredPayload = {
  data?: {
    tags?: TagLike[];
    summary?: string;
  };
  result?: {
    data?: {
      tags?: TagLike[];
    };
    tags?: TagLike[];
    summary?: string;
  };
  summary?: string;
};

const ChatPageFixed: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('conversation');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // AI Model Selection
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [modelLoading, setModelLoading] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  
  const [currentConversationId, setCurrentConversationId] = useState(() => 
    conversationId || `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );
  const [conversationTitle, setConversationTitle] = useState("Nova Conversa");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversation from URL parameter
  useEffect(() => {
    if (conversationId && conversationId !== currentConversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId, currentConversationId]);

  // Load available AI models
  useEffect(() => {
    let isMounted = true;

    const fetchModels = async () => {
      try {
        setModelLoading(true);
        const response = await apiClient.getAvailableModels();
        const models = (response.models ?? []) as ModelOption[];
        if (!isMounted || models.length === 0) {
          return;
        }
        setAvailableModels(models);
        setSelectedModel((current) => {
          if (current) return current;
          const defaultModel = models.find((item) => item.isDefault) ?? models[0];
          return defaultModel?.id ?? "";
        });
      } catch (error) {
        console.error("Error loading models:", error);
      } finally {
        if (isMounted) {
          setModelLoading(false);
        }
      }
    };

    fetchModels();
    return () => {
      isMounted = false;
    };
  }, []);

  const loadConversation = async (convId: string) => {
    try {
      setIsLoading(true);
      const response = await apiClient.getBrainConversation(convId);
      const conversation = (response?.conversation ?? []) as ConversationMessageDTO[];

      if (conversation.length > 0) {
        const loadedMessages = conversation.map((msg) => ({
          id: `${msg.role}-${msg.timestamp}`,
          text: msg.content,
          role: msg.role,
          timestamp: new Date(msg.timestamp),
        }));

        setMessages(loadedMessages);
        setCurrentConversationId(convId);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateConversationTitle = useCallback(async () => {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage || conversationTitle !== "Nova Conversa") return;

    try {
      const text = lastUserMessage.text;
      let title = text.slice(0, 50);
      title = title.replace(/[.?!,;:]/g, '').trim();
      
      if (title.length > 40) {
        const lastSpace = title.lastIndexOf(' ');
        if (lastSpace > 20) {
          title = title.slice(0, lastSpace);
        } else {
          title = title.slice(0, 40);
        }
      }
      
      title = title.charAt(0).toUpperCase() + title.slice(1);
      setConversationTitle(title);
      document.title = `${title} - CEO Dashboard`;
    } catch (error) {
      console.error('Error generating conversation title:', error);
    }
  }, [messages, conversationTitle]);

  const handleSend = useCallback(
    async (messageText?: string) => {
      const textToSend = messageText || input.trim();
      if (!textToSend || isLoading) return;

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        text: textToSend,
        role: "user",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      const assistantMessageId = `assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          text: "",
          role: "assistant",
          timestamp: new Date(),
          thinking: "",
          toolResults: [],
          toolSummary: [],
          isStreaming: true,
        },
      ]);

      try {
        // 🚀 MCP Integration: Prepara mensagens no formato correto
        // O backend fornecerá system prompt com acesso às 30+ ferramentas MCP
        const mcpMessages = [
          ...messages.map(msg => ({
            role: msg.role,
            content: msg.text,
            timestamp: msg.timestamp.toISOString()
          })),
          {
            role: 'user',
            content: textToSend,
            timestamp: new Date().toISOString()
          }
        ];

        await apiClient.chatStream(
          mcpMessages,
          currentConversationId,
          (chunk: string) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, text: msg.text + chunk }
                  : msg
              )
            );
          },
          (error: Error) => {
            console.error("Stream error:", error);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      text: "Desculpe, ocorreu um erro ao processar sua pergunta.",
                    }
                  : msg
              )
            );
            setIsLoading(false);
          },
          () => {
            setIsLoading(false);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, isStreaming: false }
                  : msg
              )
            );
            // Generate title after user message
            if (messages.length === 1) {
              setTimeout(generateConversationTitle, 1000);
            }
          },
          selectedModel, // Pass the selected model ID
          (event) => {
            if (!event) return;
            if (event.type === "thinking") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        thinking: (msg.thinking || "") + event.content,
                        isStreaming: true,
                      }
                    : msg
                )
              );
            }
            if (event.type === "tool_result") {
              const payload = event.data;
              const resultsArray = Array.isArray(payload) ? payload : [payload];
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        toolResults: [
                          ...(msg.toolResults || []),
                          ...resultsArray.map((result) => ({
                            name: result?.name,
                            resolvedName: result?.resolvedName || result?.name,
                            arguments: result?.arguments,
                            output: result?.output,
                            raw: result?.raw ?? null,
                            error: result?.error ?? null,
                          })),
                        ],
                        isStreaming: true,
                        text: msg.text,
                      }
                    : msg
                )
              );
            }
            if (event.type === "tool_summary") {
              const payload = event.data || {};
              const summaries = Array.isArray(payload.summaries)
                ? payload.summaries
                : Array.isArray(payload)
                  ? payload
                  : [];
              const detailedResults = Array.isArray(payload.results)
                ? payload.results
                : [];

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        toolSummary: summaries,
                        toolResults: detailedResults.map((result: ToolCallResult) => ({
                          name: result?.name,
                          resolvedName: result?.resolvedName || result?.name,
                          arguments: result?.arguments,
                          output: result?.output,
                          raw: result?.raw ?? null,
                          error: result?.error ?? null,
                        })),
                        text: summaries.length > 0 ? "" : msg.text,
                        isStreaming: false,
                      }
                    : msg
                )
              );
            }
          }
        );
      } catch (error) {
        console.error("Error sending message:", error);
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, currentConversationId, generateConversationTitle, selectedModel]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (text: string, messageId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const suggestions = [
    "Qual meu foco desta semana?",
    "O que tenho prioritário hoje?",
    "Buscar insights recentes",
    "Mostrar projetos ativos",
    "Resumir decisões importantes"
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const isToolContentBlock = (value: unknown): value is ToolContentBlock =>
    typeof value === "object" && value !== null && "type" in value;

  const formatJson = (value: unknown): string => {
    if (value === null || value === undefined) {
      return "null";
    }
    if (typeof value === "string") {
      return value;
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  const extractTextOutput = (result?: ToolCallResult): string | null => {
    if (!result) return null;
    const { output } = result;

    if (typeof output === "string") {
      return output;
    }

    if (output && typeof output === "object") {
      const blocks = (output as { content?: unknown }).content;
      if (Array.isArray(blocks)) {
        const textParts = blocks
          .filter(isToolContentBlock)
          .map((item) => (typeof item.text === "string" ? item.text.trim() : ""))
          .filter(Boolean);
        if (textParts.length > 0) {
          return textParts.join("\n\n");
        }
      }
    }

    return null;
  };

  const parseStructuredPayload = (result: ToolCallResult): StructuredPayload | null => {
    const { output } = result;

    if (!output) {
      return null;
    }

    if (typeof output === "string") {
      try {
        return JSON.parse(output) as StructuredPayload;
      } catch {
        return null;
      }
    }

    if (typeof output === "object") {
      const maybeContent = (output as { content?: unknown }).content;
      if (Array.isArray(maybeContent)) {
        for (const block of maybeContent) {
          if (isToolContentBlock(block) && typeof block.text === "string") {
            try {
              return JSON.parse(block.text) as StructuredPayload;
            } catch {
              // ignore malformed JSON blocks
            }
          }
        }
      }

      return output as StructuredPayload;
    }

    const text = extractTextOutput(result);
    if (text) {
      try {
        return JSON.parse(text) as StructuredPayload;
      } catch {
        return null;
      }
    }

    return null;
  };

  const toTagLabel = (tag: TagLike): string => {
    const label = tag.tag ?? tag.name ?? "";
    const count = tag.count ?? tag.occurrences;
    if (!label) {
      return count ? `Total ${count}` : "";
    }
    return count ? `${label} (${count})` : label;
  };

  const collectTags = (payload: StructuredPayload | null): TagLike[] => {
    if (!payload) return [];
    const candidates: TagLike[][] = [];
    if (Array.isArray(payload.data?.tags)) {
      candidates.push(payload.data.tags);
    }
    if (Array.isArray(payload.result?.tags)) {
      candidates.push(payload.result.tags);
    }
    if (Array.isArray(payload.result?.data?.tags)) {
      candidates.push(payload.result.data.tags);
    }
    return candidates.flat().filter((tag): tag is TagLike => Boolean(tag));
  };

  const buildToolSummary = (result: ToolCallResult): string => {
    const name = result.resolvedName || result.name || "Ferramenta";

    if (result.error) {
      return `${name}: erro (${result.error}).`;
    }

    const structured = parseStructuredPayload(result);
    const tags = collectTags(structured);
    if (tags.length > 0) {
      const list = tags
        .slice(0, 5)
        .map(toTagLabel)
        .filter(Boolean)
        .join(", ");

      if (list) {
        return `${name}: principais itens — ${list}.`;
      }
    }

    const summary =
      structured?.result?.summary ??
      structured?.data?.summary ??
      structured?.summary;
    if (summary) {
      return `${name}: ${summary}`;
    }

    const textOutput = extractTextOutput(result);
    if (textOutput) {
      const snippet = textOutput.length > 200 ? `${textOutput.slice(0, 200)}…` : textOutput;
      return `${name}: ${snippet}`;
    }

    return `${name}: execução concluída.`;
  };

  const buildToolDetail = (result: ToolCallResult): string | null => {
    const structured = parseStructuredPayload(result);
    if (structured) {
      return JSON.stringify(structured, null, 2);
    }

    const textOutput = extractTextOutput(result);
    if (textOutput) {
      return textOutput;
    }

    if (result.output) {
      return formatJson(result.output);
    }

    if (result.raw) {
      return String(result.raw);
    }

    return null;
  };

  const renderToolResult = (result: ToolCallResult, index: number) => {
    const displayName = result.resolvedName || result.name || `Ferramenta ${index + 1}`;
    const hasArguments = result.arguments && Object.keys(result.arguments).length > 0;
    const summaryText = buildToolSummary(result);
    const detailContent = buildToolDetail(result);

    return (
      <div
        key={`${displayName}-${index}`}
        className="mb-3 rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 text-left"
      >
        <div className="flex items-center justify-between gap-3 text-sm font-medium text-zinc-200">
          <span>{displayName}</span>
          <span className={`text-xs ${result.error ? "text-rose-400" : "text-zinc-400"}`}>
            {result.error ? "Erro" : "Concluído"}
        </span>
      </div>

      <div className="mt-2 text-sm text-zinc-200 whitespace-pre-wrap">
        {summaryText}
      </div>

      {(hasArguments || detailContent) && (
        <details className="mt-3 text-sm text-zinc-200">
          <summary className="cursor-pointer select-none text-xs font-medium text-zinc-400">
            Ver detalhes
          </summary>
          <div className="mt-2 space-y-3 border-t border-neutral-800 pt-2 text-xs text-zinc-300">
            {hasArguments && (
              <div>
                <p className="mb-1 font-semibold uppercase tracking-wide text-zinc-400">
                  Parâmetros
                </p>
                <pre className="overflow-x-auto rounded-md border border-neutral-800 bg-neutral-950/80 p-3 text-[11px] leading-relaxed text-zinc-200">
                  {formatJson(result.arguments)}
                </pre>
              </div>
            )}

            {detailContent && (
              <div>
                <p className="mb-1 font-semibold uppercase tracking-wide text-zinc-400">
                  Resultado bruto
                </p>
                <pre className="overflow-x-auto rounded-md border border-neutral-800 bg-neutral-950/70 p-3 text-[11px] leading-relaxed text-zinc-200">
                  {detailContent}
                </pre>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
};

  return (
    <div className="flex h-full bg-neutral-950">
      {/* Main Conversation Panel - CENTERED */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/95 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10">
              <Sparkles className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zinc-100">
                {conversationTitle !== "Nova Conversa" ? conversationTitle : "Segundo Cérebro"}
              </h1>
              <p className="text-xs text-zinc-500">
                Central Conversacional • Todos os dados em um só lugar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
                onClick={() => router.push('/')}
              className="flex items-center gap-2 rounded-lg border border-neutral-800 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-neutral-700 hover:bg-neutral-900"
            >
              <ChevronLeft className="h-3 w-3" />
              Dashboard
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10">
                <Sparkles className="h-8 w-8 text-emerald-400" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-zinc-100">
                Segundo Cérebro
              </h2>
              <p className="mb-6 max-w-md text-zinc-400">
                Conversação centralizada com acesso completo aos seus dados e ferramentas MCP
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-xs text-zinc-300 transition hover:border-emerald-500/40 hover:bg-emerald-500/10"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10">
                      <Sparkles className="h-4 w-4 text-emerald-400" />
                    </div>
                  )}
                  <div
                    className={`max-w-2xl rounded-lg p-4 ${
                      message.role === "user"
                        ? "bg-emerald-600 text-white"
                        : "bg-neutral-900 text-zinc-100 border border-neutral-800"
                    }`}
                  >
                    {message.role === "assistant" && message.isStreaming && (
                      <div className="mb-2 text-xs text-zinc-400">
                        Processando…
                      </div>
                    )}
                    {message.role === "assistant" && (
                      <>
                        {message.toolResults && message.toolResults.length > 0 && (
                          <div className="mb-3">
                            {message.toolResults.map((result, index) => renderToolResult(result, index))}
                          </div>
                        )}
                        {message.toolSummary && message.toolSummary.length > 0 && (
                          <div className="mb-3 rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-3 text-sm text-zinc-200">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                              Resumo das ferramentas MCP
                            </p>
                            <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-200">
                              {message.toolSummary.map((summary, index) => (
                                <li key={`summary-${index}`} className="leading-snug">
                                  {summary}
                                </li>
                              ))}
                            </ul>
                            {message.toolResults && message.toolResults.length > 0 && (
                              <details className="mt-3 text-xs text-zinc-300">
                                <summary className="cursor-pointer select-none font-medium text-zinc-400">
                                  Ver dados brutos
                                </summary>
                                <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-neutral-800 bg-neutral-950/80 p-3 text-[11px] leading-relaxed text-zinc-200">
                                  {formatJson(message.toolResults)}
                                </pre>
                              </details>
                            )}
                          </div>
                        )}
                        {message.thinking && message.thinking.trim() !== "" && !message.isStreaming && (
                          <details className="mb-3 text-left text-sm text-zinc-200">
                            <summary className="cursor-pointer select-none text-xs font-medium text-zinc-400">
                              Ver processo de raciocínio
                            </summary>
                            <div className="prose prose-invert border-t border-neutral-800 px-4 py-3 text-sm text-zinc-200">
                              <ReactMarkdown>{message.thinking}</ReactMarkdown>
                            </div>
                          </details>
                        )}
                      </>
                    )}

                    <div className="prose prose-invert max-w-none">
                      {message.text ? (
                        <ReactMarkdown>{message.text}</ReactMarkdown>
                      ) : message.role === "assistant" ? (
                        <span className="text-xs text-zinc-400">Gerando resposta…</span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs opacity-50">
                        {message.timestamp.toLocaleTimeString("pt-BR")}
                      </span>
                      {message.role === "assistant" && (
                        <button
                          onClick={() => handleCopy(message.text, message.id)}
                          className="flex items-center gap-1 text-xs opacity-50 transition hover:opacity-100"
                        >
                          {copiedId === message.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copiedId === message.id ? "Copiado" : "Copiar"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-neutral-800 bg-neutral-950/95 p-4">
          <div className="flex gap-3">
            {/* Model Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowModelMenu(!showModelMenu)}
                disabled={modelLoading}
                className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-zinc-300 transition hover:border-neutral-600 disabled:opacity-50"
              >
                <Bot className="h-4 w-4" />
                {modelLoading ? (
                  <div className="h-4 w-4 animate-pulse rounded bg-zinc-600" />
                ) : (
                  <span className="truncate max-w-[120px]">
                    {availableModels.find(m => m.id === selectedModel)?.displayName || 'Default'}
                  </span>
                )}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {showModelMenu && (
                <div className="absolute bottom-full mb-2 left-0 z-50 w-64 rounded-lg border border-neutral-700 bg-neutral-900 shadow-lg">
                  <div className="p-2">
                    <p className="mb-2 text-xs font-medium text-zinc-400">AI Model</p>
                    {availableModels.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          setSelectedModel(model.id);
                          setShowModelMenu(false);
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                          selectedModel === model.id
                            ? 'bg-emerald-600/20 border border-emerald-500/50 text-emerald-300'
                            : 'text-zinc-300 hover:bg-neutral-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-emerald-400" />
                          <div>
                            <div className="font-medium">{model.displayName}</div>
                            <div className="text-xs text-zinc-500">{model.providerName}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte sobre seus projetos, tarefas, notas ou use qualquer ferramenta do Brain Cloud..."
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                rows={3}
                disabled={isLoading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="flex h-12 w-12 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 transition hover:border-emerald-500 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPageFixed;
