import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type {
  ChatMessage,
  Conversation,
  ConversationModelConfig,
} from "../services/apiClient";

type ConversationModelOption = {
  id: string;
  modelId: string;
  displayName: string;
  providerName: string;
  providerDisplayName: string;
  isDefault: boolean;
  supportsStreaming?: boolean;
};

interface ConversationViewProps {
  conversation: Conversation | null;
  messages: ChatMessage[];
  streamingMessage: string;
  thinkingMessage: string;
  isLoading: boolean;
  isThinking: boolean;
  onSendMessage: (content: string) => void;
  onBackToTimeline: () => void;
  models: ConversationModelOption[];
  selectedModelId: string | null;
  onModelChange: (modelId: string) => void;
  modelsLoading: boolean;
  currentModelConfig: ConversationModelConfig | null;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  conversation,
  messages,
  streamingMessage,
  thinkingMessage,
  isLoading,
  isThinking,
  onSendMessage,
  onBackToTimeline,
  models,
  selectedModelId,
  onModelChange,
  modelsLoading,
  currentModelConfig,
}) => {
  const [input, setInput] = React.useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage, thinkingMessage]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (!input.trim() || isLoading || !selectedModelId) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
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
              {conversation?.title || "Nova Conversa"}
            </h3>
            {conversation?.contextProjectId && conversation.projectName && (
              <p className="text-xs text-zinc-500">
                📁 Projeto: {conversation.projectName}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-zinc-500">
              Modelo
            </span>
            <div className="relative">
              <select
                value={selectedModelId ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  if (!value) return;
                  onModelChange(value);
                }}
                disabled={modelsLoading || models.length === 0}
                className="appearance-none rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 pr-8 text-xs text-zinc-100 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {models.length === 0 ? (
                  <option value="">Configure um provedor</option>
                ) : (
                  models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.providerDisplayName || model.providerName} • {model.displayName}
                    </option>
                  ))
                )}
              </select>
              {modelsLoading ? (
                <Loader2 className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin text-zinc-400" />
              ) : (
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500" />
              )}
            </div>
          </div>
          {currentModelConfig?.providerDisplayName && (
            <span className="text-[11px] text-zinc-500">
              {currentModelConfig.providerDisplayName}
              {currentModelConfig.modelName
                ? ` • ${currentModelConfig.modelName}`
                : ""}
            </span>
          )}
          {!modelsLoading && models.length === 0 && (
            <span className="text-[11px] text-amber-400">
              Configure um provedor para habilitar o chat
            </span>
          )}
          <div>
            {messages.length} mensage{messages.length !== 1 ? "ns" : "m"}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 && !streamingMessage && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-zinc-400">
                Comece uma conversa digitando sua mensagem abaixo
              </p>
              {conversation?.contextType === "project" && (
                <p className="mt-2 text-xs text-zinc-500">
                  💡 Este chat está no contexto do projeto{" "}
                  <span className="text-emerald-400">
                    {conversation.projectName}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isThinking && (
            <ThinkingBubble 
              message={thinkingMessage}
            />
          )}
          {streamingMessage && (
            <MessageBubble
              message={{
                id: "streaming",
                role: "assistant",
                content: streamingMessage,
                createdAt: new Date().toISOString(),
              }}
              streaming
            />
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-neutral-800/60 bg-neutral-950/60 px-6 py-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedModelId
                  ? "Digite sua mensagem... (Shift+Enter para nova linha)"
                  : "Configure um modelo de IA nas configurações para enviar mensagens"
              }
              className="w-full resize-none rounded-lg border border-neutral-800 bg-neutral-950/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              rows={3}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !selectedModelId}
            className="flex h-[52px] w-[52px] items-center justify-center rounded-lg border border-emerald-600 bg-emerald-500 text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
          <span>
            Use{" "}
            <kbd className="rounded border border-neutral-800 bg-neutral-950 px-1">
              Enter
            </kbd>{" "}
            para enviar
          </span>
          <span>{input.length} caracteres</span>
        </div>
      </div>
    </div>
  );
};

interface MessageBubbleProps {
  message: ChatMessage;
  streaming?: boolean;
}

const ThinkingBubble: React.FC<{ message: string }> = ({ message }) => {
  const [dots, setDots] = useState('.');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '.' : prev + '.');
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Check if thinking is complete (has conclusion markers)
    if (message.includes("📝 **RESPOSTA FINAL:") || 
        message.includes("Conclusão:") || 
        message.includes("Resposta:")) {
      setIsComplete(true);
    }
  }, [message]);

  const displayMessage = message.replace(/<thinking[^>]*>|<\/thinking>/g, '').trim();

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-2xl border border-amber-500/40 bg-amber-950/20 text-zinc-100">
        {/* Header */}
        <div 
          className="px-4 py-2 flex items-center justify-between cursor-pointer border-b border-amber-500/30"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 bg-amber-400 rounded-full ${!isComplete ? 'animate-pulse' : ''}`}></div>
              <div className={`w-2 h-2 bg-amber-400 rounded-full ${!isComplete ? 'animate-pulse delay-75' : ''}`}></div>
              <div className={`w-2 h-2 bg-amber-400 rounded-full ${!isComplete ? 'animate-pulse delay-150' : ''}`}></div>
            </div>
            <span className="text-xs text-amber-400 font-medium">
              {isComplete ? 'Raciocínio Completo' : 'Pensando'}
            </span>
            <span className="text-xs text-amber-400">{dots}</span>
          </div>
          <button className="text-amber-400 hover:text-amber-300 transition-colors">
            {isExpanded ? (
              <ChevronRight className="w-4 h-4 rotate-90" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Content */}
        {(isExpanded || !isComplete) && displayMessage && (
          <div className="px-4 pb-3">
            <div className="text-sm text-amber-200/90 whitespace-pre-wrap max-h-96 overflow-y-auto">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {displayMessage}
              </ReactMarkdown>
            </div>
            <div className="mt-2 text-xs text-amber-400/60">
              {isComplete ? '🧠 Raciocínio finalizado' : '🔍 Analisando contexto e elaborando resposta...'}
            </div>
          </div>
        )}

        {/* Collapsed hint */}
        {!isExpanded && isComplete && (
          <div className="px-4 py-2 text-xs text-amber-400/60 italic">
            Clique para ver o raciocínio completo ({displayMessage.length} caracteres)
          </div>
        )}
      </div>
    </div>
  );
};

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  streaming = false,
}) => {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-emerald-600 text-white"
            : "border border-neutral-800 bg-neutral-900 text-zinc-100"
        }`}
      >
        {isUser ? (
          <p className="text-sm">{message.content}</p>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        {streaming && (
          <div className="mt-2 flex items-center gap-1 text-xs text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            Gerando resposta...
          </div>
        )}
        {!streaming && (
          <p className="mt-1 text-[10px] opacity-60">
            {new Date(message.createdAt).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
    </div>
  );
};

export default ConversationView;
