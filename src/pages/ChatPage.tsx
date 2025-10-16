import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  Send,
  Sparkles,
  Settings,
  MessageSquare,
  Search,
  ChevronLeft,
  Copy,
  Check,
  Bot,
  ChevronDown,
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

interface ConversationHistory {
  conversation_id: string;
  source: string;
  content: string;
  role: "user" | "assistant";
  timestamp: string;
  score?: number;
  note_path?: string;
}

const ChatPageFixed: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const conversationId = searchParams.get('conversation');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [contextNotes, setContextNotes] = useState<BrainNote[]>([]);
  const [loadingContext, setLoadingContext] = useState(false);
  
  // AI Model Selection
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [modelLoading, setModelLoading] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  
  const [conversationHistory, setConversationHistory] = useState<ConversationHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
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
    loadAvailableModels();
  }, []);

  const loadAvailableModels = async () => {
    try {
      setModelLoading(true);
      const response = await apiClient.getAvailableModels();
      if (response.models && response.models.length > 0) {
        setAvailableModels(response.models);
        // Set default model if none selected
        if (!selectedModel) {
          const defaultModel = response.models.find((m: any) => m.isDefault) || response.models[0];
          setSelectedModel(defaultModel.id);
        }
      }
    } catch (error) {
      console.error('Error loading models:', error);
    } finally {
      setModelLoading(false);
    }
  };

  const loadConversation = async (convId: string) => {
    try {
      setIsLoading(true);
      const response = await apiClient.getBrainConversation(convId);
      
      if (response.success && response.conversation) {
        const loadedMessages = response.conversation.map((msg: any) => ({
          id: `${msg.role}-${msg.timestamp}`,
          text: msg.content,
          role: msg.role as "user" | "assistant",
          timestamp: new Date(msg.timestamp)
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

  const searchConversationHistory = useCallback(async (query: string) => {
    if (!query.trim()) {
      setConversationHistory([]);
      return;
    }

    setLoadingHistory(true);
    try {
      const results = await apiClient.searchConversations(query, 10);
      setConversationHistory(results.results || []);
    } catch (error) {
      console.error("Error searching conversation history:", error);
      setConversationHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

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
            // Generate title after user message
            if (messages.length === 1) {
              setTimeout(generateConversationTitle, 1000);
            }
          },
          selectedModel // Pass the selected model ID
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
              onClick={() => window.location.href = '/'}
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
                    <div className="prose prose-invert max-w-none">
                      <ReactMarkdown>{message.text}</ReactMarkdown>
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
