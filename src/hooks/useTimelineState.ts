/**
 * useTimelineState Hook
 * Gerencia estado da timeline de eventos e chat de conversas
 * Extraído de BusinessIntelligenceHub para decomposição Phase 4
 */

import { useCallback, useState } from "react";
import type { ChatMessage, Conversation } from "../services/apiClient";

export interface TimelineCard {
  id: string;
  type: "message" | "insight" | "note" | "agent";
  author?: "user" | "assistant";
  title: string;
  body?: string;
  snippet?: string;
  tags?: string[];
  impact?: string;
  confidence?: number;
  status?: "running" | "completed" | "scheduled";
  description?: string;
  nextRun?: string;
  related?: string[];
  timestamp: string;
  actions?: Array<{ label: string; icon: React.ReactNode }>;
}

export function useTimelineState() {
  // ─ Timeline state ─
  const [liveTimelineCards, setLiveTimelineCards] = useState<TimelineCard[]>(
    []
  );
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);
  const [eventsConnected, setEventsConnected] = useState(false);
  const [eventsError, setEventsError] = useState<Error | null>(null);

  // ─ Chat mode and conversations ─
  const [chatMode, setChatMode] = useState<"timeline" | "conversation">(
    "timeline"
  );
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [thinkingMessage, setThinkingMessage] = useState("");
  const [composerValue, setComposerValue] = useState("");

  // ─ Chat composer and utilities ─
  const [selectedChatUtility, setSelectedChatUtility] = useState<
    "shortcuts" | "mcp-tools" | "history" | null
  >(null);

  /**
   * Add a card to live timeline
   */
  const pushLiveTimelineCard = useCallback((card: TimelineCard) => {
    setLiveTimelineCards((prev) => {
      if (prev.some((item) => item.id === card.id)) {
        return prev;
      }
      const next = [card, ...prev];
      return next.slice(0, 12);
    });
  }, []);

  /**
   * Remove a card from timeline
   */
  const removeLiveTimelineCard = useCallback((cardId: string) => {
    setLiveTimelineCards((prev) => prev.filter((card) => card.id !== cardId));
  }, []);

  /**
   * Clear all timeline cards
   */
  const clearTimeline = useCallback(() => {
    setLiveTimelineCards([]);
  }, []);

  /**
   * Switch chat mode
   */
  const switchChatMode = useCallback((mode: "timeline" | "conversation") => {
    setChatMode(mode);
    if (mode === "timeline") {
      setActiveConversation(null);
    }
  }, []);

  /**
   * Set active conversation and load its messages
   */
  const switchConversation = useCallback((conversation: Conversation) => {
    setActiveConversation(conversation);
    setChatMessages(conversation.messages || []);
    setChatMode("conversation");
  }, []);

  /**
   * Add a message to chat
   */
  const addChatMessage = useCallback((message: ChatMessage) => {
    setChatMessages((prev) => [...prev, message]);
  }, []);

  /**
   * Update streaming message
   */
  const updateStreamingMessage = useCallback((content: string) => {
    setStreamingMessage(content);
  }, []);

  /**
   * Update thinking message
   */
  const updateThinkingMessage = useCallback((content: string) => {
    setThinkingMessage(content);
  }, []);

  /**
   * Clear chat
   */
  const clearChat = useCallback(() => {
    setChatMessages([]);
    setStreamingMessage("");
    setThinkingMessage("");
    setComposerValue("");
  }, []);

  /**
   * Toggle timeline collapse
   */
  const handleCollapseTimeline = useCallback(() => {
    setIsTimelineCollapsed(true);
  }, []);

  const handleExpandTimeline = useCallback(() => {
    setIsTimelineCollapsed(false);
  }, []);

  return {
    // Timeline state
    liveTimelineCards,
    setLiveTimelineCards,
    pushLiveTimelineCard,
    removeLiveTimelineCard,
    clearTimeline,
    isTimelineCollapsed,
    setIsTimelineCollapsed,
    handleCollapseTimeline,
    handleExpandTimeline,
    eventsConnected,
    setEventsConnected,
    eventsError,
    setEventsError,

    // Chat mode
    chatMode,
    setChatMode,
    switchChatMode,

    // Conversations
    activeConversation,
    setActiveConversation,
    switchConversation,

    // Messages
    chatMessages,
    setChatMessages,
    addChatMessage,
    streamingMessage,
    setStreamingMessage,
    updateStreamingMessage,
    thinkingMessage,
    setThinkingMessage,
    updateThinkingMessage,

    // Composer
    composerValue,
    setComposerValue,
    selectedChatUtility,
    setSelectedChatUtility,

    // Utilities
    clearChat,
  };
}
