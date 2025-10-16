import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../services/apiClient';

interface Message {
  id: string;
  text: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface Conversation {
  conversation_id: string;
  content: string;
  role: string;
  timestamp: string;
}

export const useChat = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const conversationId = searchParams.get('conversation');
  
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
  }, [conversationId, currentConversationId]);

  // Cross-tab synchronization via storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `chat-messages-${currentConversationId}`) {
        const newMessages = e.newValue ? JSON.parse(e.newValue) : [];
        setMessages(newMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      }
      if (e.key === `chat-title-${currentConversationId}`) {
        const newTitle = e.newValue || "Nova Conversa";
        setConversationTitle(newTitle);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentConversationId]);

  // Save messages to localStorage for cross-tab sync
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat-messages-${currentConversationId}`, JSON.stringify(messages));
    }
  }, [messages, currentConversationId]);

  // Save title to localStorage for cross-tab sync
  useEffect(() => {
    localStorage.setItem(`chat-title-${currentConversationId}`, conversationTitle);
  }, [conversationTitle, currentConversationId]);

  const loadConversation = useCallback(async (convId: string) => {
    try {
      setIsLoading(true);
      const response = await apiClient.getBrainConversation(convId);
      
      if (response.success && response.conversation) {
        const loadedMessages = response.conversation.map((msg: Conversation) => ({
          id: `${msg.role}-${msg.timestamp}`,
          text: msg.content,
          role: msg.role as "user" | "assistant",
          timestamp: new Date(msg.timestamp)
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
  }, []);

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

  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: `${message.role}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Generate title after user message
    if (message.role === 'user' && messages.length === 0) {
      setTimeout(generateConversationTitle, 1000);
    }
  }, [messages.length, generateConversationTitle]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setConversationTitle("Nova Conversa");
    setCurrentConversationId(`chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    document.title = "CEO Dashboard";
  }, []);

  const saveConversationToBrain = useCallback(async () => {
    if (messages.length === 0) return;

    try {
      const brainMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.text,
        timestamp: msg.timestamp.toISOString(),
      }));

      await apiClient.saveConversation(
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
  }, [messages, currentConversationId, conversationTitle]);

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
    saveConversationToBrain
  };
};
