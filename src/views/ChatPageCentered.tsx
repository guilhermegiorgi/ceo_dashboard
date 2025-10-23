'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Send, Bot, ChevronDown, Sparkles, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import apiClient from "../services/apiClient";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  text: string;
  role: "user" | "assistant";
  timestamp: Date;
}

type ModelOption = {
  id: string;
  displayName: string;
  providerName?: string;
  isDefault?: boolean;
};

const ChatPageCentered: React.FC = () => {
  const router = useRouter();

  // Check authentication immediately
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const currentConversationId = useMemo(
    () => `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    []
  );

  // AI Model Selection
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [modelLoading, setModelLoading] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);

  // Load available AI models
  useEffect(() => {
    let isMounted = true;

    const fetchModels = async () => {
      try {
        setModelLoading(true);
        const response = await apiClient.getAvailableModels();
        const models = (response.models ?? []) as ModelOption[];
        if (!isMounted) return;

        if (models.length > 0) {
          setAvailableModels(models);
          setSelectedModel((current) => {
            if (current) return current;
            const defaultModel = models.find((model) => model.isDefault) ?? models[0];
            return defaultModel?.id ?? "";
          });
        } else {
          console.warn("No AI providers configured");
        }
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

  const handleSendMessage = useCallback(async () => {
    if (input.trim() === "" || isLoading) return;
    
    // Check if we have any models configured
    if (!selectedModel) {
      // Redirect to settings to configure models first
      router.push('/?settings=models');
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: input,
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const assistantMessageId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantMessageId, text: "", role: "assistant", timestamp: new Date() },
    ]);

    const mcpMessages = [
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.text,
        timestamp: msg.timestamp.toISOString()
      })),
      {
        role: 'user',
        content: input,
        timestamp: new Date().toISOString()
      }
    ];

    // Check authentication before sending
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }

    try {
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
                ? { ...msg, text: "Desculpe, ocorreu um erro na resposta." }
                : msg
            )
          );
          setIsLoading(false);
        },
        () => {
          setIsLoading(false);
        },
        selectedModel // Pass the selected model ID
      );
    } catch (error) {
      console.error("Error sending message:", error);
      setIsLoading(false);
    }
  }, [currentConversationId, input, isLoading, messages, router, selectedModel]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestions = [
    "Qual meu foco desta semana?",
    "O que tenho prioritário hoje?", 
    "Buscar insights recentes",
    "Mostrar projetos ativos",
    "Resumir decisões importantes"
  ];

  return (
    <div className="flex h-full bg-neutral-950">
      {/* Main Conversation Panel - CENTERED */}
      <div className="flex flex-1 flex-col max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/95 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10">
              <Sparkles className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zinc-100">Segundo Cérebro</h1>
              <p className="text-xs text-zinc-500">Conversação Centralizada • MCP + Brain Cloud</p>
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

        {/* Model Selector Toolbar */}
        <div className="flex items-center justify-between border-b border-zinc-800/50 px-6 py-2">
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                availableModels.length === 0
                  ? router.push('/?settings=models')
                  : setShowModelMenu(!showModelMenu)
              }
              disabled={modelLoading}
              className={`flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs transition ${
                availableModels.length === 0 
                  ? 'border-yellow-600 bg-yellow-600/10 text-yellow-300' 
                  : 'text-zinc-300 hover:border-neutral-600 disabled:opacity-50'
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              {modelLoading ? (
                <div className="h-3 w-8 animate-pulse rounded bg-zinc-600" />
              ) : availableModels.length > 0 ? (
                <span>
                  {availableModels.find(m => m.id === selectedModel)?.displayName || 'Selecionar modelo'}
                </span>
              ) : (
                <span className="text-zinc-500">Configurar modelo</span>
              )}
              <ChevronDown className="h-3 w-3" />
            </button>

            {showModelMenu && (
              <div className="absolute top-full mt-1 left-0 z-50 w-64 rounded-lg border border-neutral-700 bg-neutral-900 shadow-lg">
                <div className="p-2">
                  {availableModels.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-zinc-400 mb-3">Nenhum modelo configurado</p>
                      <button
                        type="button"
                        onClick={() => router.push('/?settings=models')}
                        className="rounded-lg border border-yellow-600 bg-yellow-600/10 px-3 py-2 text-xs text-yellow-300 transition hover:bg-yellow-600/20"
                      >
                        Configurar provedores
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="mb-2 text-xs font-medium text-zinc-400">Modelo IA</p>
                      {availableModels.map((model) => (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => {
                            setSelectedModel(model.id);
                            setShowModelMenu(false);
                          }}
                          className={`w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                            selectedModel === model.id
                              ? 'bg-emerald-600/20 border border-emerald-500/50 text-emerald-300'
                              : 'text-zinc-300 hover:bg-neutral-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            <div>
                              <div className="font-medium text-xs">{model.displayName}</div>
                              <div className="text-[10px] text-zinc-500">{model.providerName}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>MCP Ativo</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              <span>Brain Cloud</span>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-12">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10">
                <Sparkles className="h-6 w-6 text-emerald-400" />
              </div>
              <h2 className="mb-3 text-xl font-bold text-zinc-100">Seu Segundo Cérebro</h2>
              <p className="mb-6 text-zinc-400">Converse com seus projetos, tarefas, insights</p>
              
              {/* Quick suggestions */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-w-lg">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(suggestion)}
                    className="rounded-lg border border-dashed border-neutral-700 bg-neutral-900/30 px-3 py-2 text-xs text-zinc-400 transition hover:border-neutral-500 hover:bg-neutral-800"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
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
                    <div className="prose prose prose-invert max-w-none">
                      <ReactMarkdown>{message.text}</ReactMarkdown>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs opacity-60">
                        {message.timestamp.toLocaleTimeString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Area - BOTTOM */}
        <div className="border-t border-neutral-800 bg-neutral-950/95 p-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Converse com seu Segundo Cérebro..."
                className="w-full h-12 resize-none rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-500 outline-none transition focus:border-emerald-500/50 focus:bg-emerald-500/5"
                rows={1}
              />
            </div>

            <button
              type="button"
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:bg-emerald-800 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {isLoading ? "..." : "Enviar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPageCentered;
