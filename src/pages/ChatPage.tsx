import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  Send,
  Sparkles,
  Database,
  BookOpen,
  AlertCircle,
  Copy,
  Check,
  ChevronLeft,
  FileText,
  Settings,
} from "lucide-react";
import apiClient from "../services/apiClient";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  text: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface BrainNote {
  path: string;
  title: string;
  excerpt: string;
  relevance?: number;
}

const ChatPage: React.FC = () => {
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [useBrainContext, setUseBrainContext] = useState(true);
  const [contextNotes, setContextNotes] = useState<BrainNote[]>([]);
  const [loadingContext, setLoadingContext] = useState(false);
  const processedRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const savedContext = localStorage.getItem("chat.useBrainContext");
    const savedRightPanel = localStorage.getItem("chat.rightPanelOpen");

    if (savedContext !== null) setUseBrainContext(savedContext === "true");
    if (savedRightPanel !== null) setRightPanelOpen(savedRightPanel === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("chat.useBrainContext", String(useBrainContext));
    localStorage.setItem("chat.rightPanelOpen", String(rightPanelOpen));
  }, [useBrainContext, rightPanelOpen]);

  useEffect(() => {
    if (useBrainContext && messages.length > 0) {
      loadContextNotes();
    }
  }, [useBrainContext, messages]);

  const loadContextNotes = async () => {
    setLoadingContext(true);
    try {
      const notesResp = await apiClient.searchVaultNotes(
        "",
        undefined,
        5,
        true
      );
      const items = notesResp?.data || notesResp || [];
      setContextNotes(
        items.map(
          (note: { path?: string; basename?: string; content?: string }) => ({
            path: note.path || note.basename || "Nota",
            title: note.basename || "Sem título",
            excerpt: String(note.content || "").substring(0, 200),
            relevance: Math.random() * 100,
          })
        )
      );
    } catch (error) {
      console.warn("Failed to load context notes:", error);
    } finally {
      setLoadingContext(false);
    }
  };

  const handleSendWithMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || isLoading) return;

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        text: messageText.trim(),
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
        },
      ]);

      try {
        let prompt = userMessage.text;

        if (useBrainContext) {
          try {
            const notesResp = await apiClient.searchVaultNotes(
              "",
              undefined,
              5,
              true
            );
            const items = notesResp?.data || notesResp || [];
            const contextParts: string[] = [];

            for (const note of items) {
              if (!note?.content) continue;
              const header = `# ${note.path || note.basename || "Nota"}\n`;
              const snippet = String(note.content).substring(0, 1200);
              contextParts.push(header + snippet);
            }

            if (contextParts.length > 0) {
              const context = contextParts.join("\n\n---\n\n");
              prompt = `Você é Cognito, um assistente estratégico treinado no Segundo Cérebro do usuário.\n\nContexto das notas relevantes:\n${context}\n\nPergunta do usuário:\n${userMessage.text}\n\nResponda de forma objetiva, acionável e baseada no contexto fornecido.`;
            }
          } catch (error) {
            console.warn("Failed to fetch Brain Cloud context:", error);
          }
        }

        await apiClient.queryCognitoStream(
          prompt,
          "chat-session",
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
          }
        );
      } catch (error) {
        console.error("Error sending message:", error);
        setIsLoading(false);
      }
    },
    [isLoading, useBrainContext]
  );

  const handleSend = () => {
    if (input.trim()) {
      handleSendWithMessage(input.trim());
    }
  };

  // Process initial message from navigation state
  useEffect(() => {
    const state = location.state as { initialMessage?: string } | null;
    if (state?.initialMessage && !processedRef.current) {
      processedRef.current = true;
      setInput(state.initialMessage);
      // Auto-send the message after a brief delay
      setTimeout(() => {
        if (state.initialMessage) {
          handleSendWithMessage(state.initialMessage);
        }
      }, 100);
    }
  }, [location.state, handleSendWithMessage]);

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
    "Mostre minhas notas recentes sobre IA",
    "Quais insights tenho sobre agronegócio?",
    "Resuma as decisões estratégicas do último mês",
    "O que eu tenho sobre fusões e aquisições?",
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-full bg-neutral-950">
      {/* Main Chat Panel */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/95 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10">
              <Sparkles className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-100">Cognito</h1>
              <p className="text-xs text-zinc-500">
                Assistente do Segundo Cérebro
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setUseBrainContext(!useBrainContext)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition ${
                useBrainContext
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-neutral-800 bg-neutral-900 text-zinc-500"
              }`}
              title={useBrainContext ? "Contexto ativo" : "Contexto desativado"}
            >
              <Database className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {useBrainContext ? "Brain Cloud" : "Sem contexto"}
              </span>
            </button>

            <button
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 text-zinc-400 transition hover:border-neutral-600 hover:text-zinc-100"
              title={rightPanelOpen ? "Ocultar contexto" : "Mostrar contexto"}
            >
              <ChevronLeft
                className={`h-4 w-4 transition-transform ${
                  rightPanelOpen ? "" : "rotate-180"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-12">
              <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20">
                <Sparkles className="h-10 w-10 text-emerald-400" />
              </div>

              <h1 className="mb-2 text-3xl font-bold text-zinc-100">
                Bem-vindo ao Cognito
              </h1>
              <p className="mb-8 max-w-md text-center text-sm text-zinc-400">
                Seu assistente estratégico treinado no seu Segundo Cérebro
              </p>

              <div className="w-full max-w-2xl">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-600">
                  Experimente perguntar:
                </p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="group flex items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-left transition hover:border-neutral-700 hover:bg-neutral-900/50"
                    >
                      <BookOpen className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-500 transition group-hover:text-emerald-400" />
                      <span className="text-sm text-zinc-400 transition group-hover:text-zinc-100">
                        {suggestion}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${
                    message.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border ${
                      message.role === "user"
                        ? "border-blue-500/30 bg-blue-500/10"
                        : "border-emerald-500/30 bg-emerald-500/10"
                    }`}
                  >
                    {message.role === "user" ? (
                      <span className="text-sm font-semibold text-blue-300">
                        GG
                      </span>
                    ) : (
                      <Sparkles className="h-4 w-4 text-emerald-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div
                      className={`rounded-xl border px-4 py-3 ${
                        message.role === "user"
                          ? "border-blue-500/30 bg-blue-500/10"
                          : "border-neutral-800 bg-neutral-900"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => (
                                <p className="mb-2 text-zinc-300 last:mb-0">
                                  {children}
                                </p>
                              ),
                              ul: ({ children }) => (
                                <ul className="mb-2 list-disc space-y-1 pl-4 text-zinc-300">
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="mb-2 list-decimal space-y-1 pl-4 text-zinc-300">
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => (
                                <li className="text-zinc-300">{children}</li>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-semibold text-zinc-100">
                                  {children}
                                </strong>
                              ),
                              code: ({ children }) => (
                                <code className="rounded bg-neutral-800 px-1 py-0.5 text-xs text-emerald-300">
                                  {children}
                                </code>
                              ),
                              pre: ({ children }) => (
                                <pre className="my-2 overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-xs">
                                  {children}
                                </pre>
                              ),
                            }}
                          >
                            {message.text || "_Pensando..._"}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm text-blue-100">{message.text}</p>
                      )}
                    </div>

                    {message.role === "assistant" && message.text && (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(message.text, message.id)}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-500 transition hover:bg-neutral-900 hover:text-zinc-300"
                        >
                          {copiedId === message.id ? (
                            <>
                              <Check className="h-3 w-3" />
                              <span>Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-neutral-800 bg-neutral-950/95 px-6 py-4">
          <div className="mx-auto max-w-3xl">
            {!useBrainContext && messages.length > 0 && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>Contexto do Brain Cloud desativado</span>
              </div>
            )}

            <div className="flex gap-3">
              <div className="relative flex-1">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Faça uma pergunta sobre seu Segundo Cérebro..."
                  rows={1}
                  disabled={isLoading}
                  className="w-full resize-none rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-neutral-600 focus:outline-none disabled:opacity-50"
                  style={{ minHeight: "48px", maxHeight: "200px" }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = `${Math.min(
                      target.scrollHeight,
                      200
                    )}px`;
                  }}
                />
              </div>

              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 transition hover:border-emerald-500/50 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                title="Enviar (Enter)"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-2 text-center text-xs text-zinc-600">
              <kbd className="rounded border border-neutral-800 bg-neutral-900 px-1">
                Enter
              </kbd>{" "}
              para enviar •{" "}
              <kbd className="rounded border border-neutral-800 bg-neutral-900 px-1">
                Shift + Enter
              </kbd>{" "}
              para nova linha
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Context */}
      <div
        className={`flex flex-col border-l border-neutral-800 bg-neutral-950 transition-all duration-300 ${
          rightPanelOpen ? "w-80" : "w-0"
        } overflow-hidden`}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-zinc-500" />
            <span className="text-sm font-medium text-zinc-100">Contexto</span>
          </div>
          <button
            onClick={() => loadContextNotes()}
            disabled={loadingContext}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-800 text-zinc-400 transition hover:border-neutral-600 hover:text-zinc-100 disabled:opacity-50"
            title="Atualizar"
          >
            <Settings
              className={`h-4 w-4 ${loadingContext ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!useBrainContext ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <AlertCircle className="mb-2 h-8 w-8 text-yellow-500" />
              <p className="text-xs text-zinc-500">Contexto desativado</p>
            </div>
          ) : contextNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <FileText className="mb-2 h-8 w-8 text-zinc-700" />
              <p className="text-xs text-zinc-500">Nenhuma nota no contexto</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">
                Notas relevantes ({contextNotes.length})
              </p>
              {contextNotes.map((note, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 transition hover:border-neutral-700"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium text-zinc-100">
                      {note.title}
                    </h4>
                    {note.relevance !== undefined && (
                      <span className="flex-shrink-0 text-xs text-emerald-400">
                        {Math.round(note.relevance)}%
                      </span>
                    )}
                  </div>
                  <p className="mb-2 text-xs text-zinc-500">{note.path}</p>
                  <p className="line-clamp-3 text-xs text-zinc-400">
                    {note.excerpt}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
