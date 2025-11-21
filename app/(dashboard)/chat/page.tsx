"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ChatBubble,
  ChatMessageList,
  ChatInput,
  ThinkingAccordion,
} from "@/components/ui/chat";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [mcpStatus, setMcpStatus] = useState<{
    connection: string | null;
    toolCount: number;
    error: string | null;
  }>({ connection: null, toolCount: 0, error: null });

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check MCP status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const token = window.localStorage.getItem("token");
        const response = await fetch("/api/mcp/status", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await response.json();
        setMcpStatus({
          connection: data.connection,
          toolCount: data.tools?.length || 0,
          error: data.error,
        });
      } catch {
        setMcpStatus({
          connection: "error",
          toolCount: 0,
          error: "Failed to check MCP status",
        });
      }
    };
    checkStatus();
  }, []);

  // Extract thinking content from messages
  const thinkingContent = messages
    .filter((msg) => msg.role === "assistant")
    .map((msg) => {
      const content = msg.content;
      if (
        content.includes("🧠") ||
        content.includes("PROCESSO DE RACIOCÍNIO") ||
        content.includes("Pensando:")
      ) {
        return content;
      }
      return null;
    })
    .filter(Boolean)
    .join("\n\n");

  const handleSend = async (message: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const token = window.localStorage.getItem("token");
      const response = await fetch("/api/mcp/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context: "chat",
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let assistantMessage = "";
      const assistantId = (Date.now() + 1).toString();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || parsed.textDelta || "";

              if (delta) {
                assistantMessage += delta;
                setMessages((prev) => {
                  const existing = prev.find((m) => m.id === assistantId);
                  if (existing) {
                    return prev.map((m) =>
                      m.id === assistantId ? { ...m, content: assistantMessage } : m
                    );
                  }
                  return [
                    ...prev,
                    {
                      id: assistantId,
                      role: "assistant" as const,
                      content: assistantMessage,
                    },
                  ];
                });
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, there was an error processing your message.",
        },
      ]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI Chat</h1>
            <p className="text-sm text-muted-foreground">
              Powered by Obsidian Brain Cloud MCP
            </p>
          </div>
          <div className="flex items-center gap-2">
            {mcpStatus.connection === "success" ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Connected ({mcpStatus.toolCount} tools)
              </Badge>
            ) : mcpStatus.connection === "failed" ? (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                Disconnected
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Checking...
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <Card className="flex-1 m-4 flex flex-col overflow-hidden">
        {/* Messages */}
        <ChatMessageList>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">Start a conversation</p>
                <p className="text-sm">
                  Ask me anything about your notes, tasks, or projects
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatBubble
                  key={message.id}
                  role={message.role}
                  content={message.content}
                />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">AI is thinking...</span>
                </div>
              )}
            </>
          )}
        </ChatMessageList>

        {/* Thinking Accordion */}
        {thinkingContent && (
          <div className="px-4 pb-4">
            <ThinkingAccordion content={thinkingContent} />
          </div>
        )}

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          disabled={isLoading}
          placeholder="Ask about your notes, tasks, or projects..."
        />
      </Card>
    </div>
  );
}
