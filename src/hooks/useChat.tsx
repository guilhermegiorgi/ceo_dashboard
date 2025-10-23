"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAPI } from "./useAPI";
import { useAIProvider } from "./useAIProvider";

interface Message {
  id: string;
  text: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface Conversation {
  conversation_id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: string;
}

type StoredMessage = {
  id: string;
  text: string;
  role: "user" | "assistant";
  timestamp: string;
};

export const useChat = () => {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("conversation");
  const api = useAPI();
  const { chatModel } = useAIProvider();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState(() => 
    conversationId || `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );
  const [conversationTitle, setConversationTitle] = useState("Nova Conversa");
  const [isLoading, setIsLoading] = useState(false);

  // Load conversation from URL parameter
  useEffect(() => {
    if (conversationId && conversationId !== currentConversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId, currentConversationId, loadConversation]);

  // Cross-tab synchronization via storage events
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === `chat-messages-${currentConversationId}`) {
        try {
          const stored: StoredMessage[] = event.newValue
            ? JSON.parse(event.newValue)
            : [];
          setMessages(
            stored.map((msg) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            }))
          );
        } catch (parseError) {
          console.warn("Failed to parse stored chat messages", parseError);
        }
      }
      if (event.key === `chat-title-${currentConversationId}`) {
        const newTitle = event.newValue || "Nova Conversa";
        setConversationTitle(newTitle);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentConversationId]);

  // Save messages to localStorage for cross-tab sync
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(
        `chat-messages-${currentConversationId}`,
        JSON.stringify(messages)
      );
    }
  }, [messages, currentConversationId]);

  // Save title to localStorage for cross-tab sync
  useEffect(() => {
    localStorage.setItem(`chat-title-${currentConversationId}`, conversationTitle);
  }, [conversationTitle, currentConversationId]);

  const loadConversation = useCallback(async (convId: string) => {
    try {
      setIsLoading(true);
      const response = await api.getBrainConversation(convId);
      
      if (response.success && response.conversation) {
        const loadedMessages = response.conversation.map((msg: Conversation) => ({
          id: `${msg.role}-${msg.timestamp}`,
          text: msg.content,
          role: msg.role,
          timestamp: new Date(msg.timestamp),
        }));
        
        setMessages(loadedMessages);
        setCurrentConversationId(convId);
        
        // Load saved title
        const savedTitle = localStorage.getItem(`chat-title-${convId}`);
        if (savedTitle) {
          setConversationTitle(savedTitle);
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  const generateConversationTitle = useCallback(async () => {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage || conversationTitle !== "Nova Conversa") return;

    try {
      const text = lastUserMessage.text;
      let title = text.slice(0, 50);
      
      // Remove pontuação e normaliza
      title = title.replace(/[.?!,;:]/g, '').trim();
      
      // Se tiver mais de 40 caracteres, truncar com elegância
      if (title.length > 40) {
        const lastSpace = title.lastIndexOf(' ');
        if (lastSpace > 20) {
          title = title.slice(0, lastSpace);
        } else {
          title = title.slice(0, 40);
        }
      }
      
      // Capitaliza primeira letra
      title = title.charAt(0).toUpperCase() + title.slice(1);
      
      setConversationTitle(title);
      localStorage.setItem(`chat-title-${currentConversationId}`, title);
      document.title = `${title} - CEO Dashboard`;
    } catch (error) {
      console.error('Error generating conversation title:', error);
    }
  }, [messages, conversationTitle, currentConversationId]);

  const addMessage = useCallback(
    (message: Omit<Message, "id" | "timestamp">) => {
      const newMessage: Message = {
        ...message,
        id: `${message.role}-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 6)}`,
        timestamp: new Date(),
      };

      setMessages((prev) => {
        const next = [...prev, newMessage];
        if (message.role === "user" && prev.length === 0) {
          setTimeout(generateConversationTitle, 1000);
        }
        return next;
      });
    },
    [generateConversationTitle]
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
    setConversationTitle("Nova Conversa");
    setCurrentConversationId(`chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    document.title = "CEO Dashboard";
  }, []);

  const saveConversationToBrain = useCallback(async () => {
    if (messages.length === 0) return;

    try {
      const brainMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.text,
        timestamp: msg.timestamp.toISOString(),
      }));

      await api.saveConversation(
        currentConversationId,
        brainMessages,
        {
          source: 'claude',
          timestamp: new Date().toISOString(),
          messageCount: messages.length,
          title: conversationTitle
        }
      );
    } catch (error) {
      console.warn("Failed to save conversation to Brain Cloud:", error);
    }
  }, [api, messages, currentConversationId, conversationTitle]);

  const sendMessage = useCallback(
    async (message: string) => {
      const config = await api.getAIConfig();
      const selection = config.modelSelection.chat || chatModel;

      return api.sendChatWithProvider(message, {
        provider: selection.provider,
        model: selection.model,
      });
    },
    [api, chatModel]
  );

  return {
    messages,
    currentConversationId,
    conversationTitle,
    setConversationTitle,
    isLoading,
    setMessages,
    addMessage,
    clearConversation,
    loadConversation,
    generateConversationTitle,
    saveConversationToBrain,
    sendMessage,
  };
};
