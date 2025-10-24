"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type BrainCloudEventType =
  | "file:created"
  | "file:updated"
  | "file:deleted"
  | "file:moved"
  | "task:created"
  | "task:updated"
  | "task:completed"
  | "note:created"
  | "note:updated"
  | "conversation:saved"
  | "graph:updated"
  | "focus:changed"
  | "sync:started"
  | "sync:completed"
  | "sync:failed"
  | "workflow:triggered"
  | "workflow:completed"
  | "workflow:failed";

export interface BrainCloudEvent {
  type: BrainCloudEventType | string;
  timestamp: string;
  userId?: string;
  source?: string;
  [key: string]: unknown;
}

export interface UseBrainCloudEventsOptions {
  eventTypes?: BrainCloudEventType[];
  userId?: string;
  source?: "ui" | "sync" | "workflow" | "agent";
  enabled?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;
  onEvent?: (event: BrainCloudEvent) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export interface UseBrainCloudEventsReturn {
  events: BrainCloudEvent[];
  lastEvent: BrainCloudEvent | null;
  connected: boolean;
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
  clear: () => void;
  getEventsByType: (type: BrainCloudEventType) => BrainCloudEvent[];
  getFileEvents: () => BrainCloudEvent[];
  getTaskEvents: () => BrainCloudEvent[];
  getConversationEvents: () => BrainCloudEvent[];
}

const ALL_EVENT_TYPES: BrainCloudEventType[] = [
  "file:created",
  "file:updated",
  "file:deleted",
  "file:moved",
  "task:created",
  "task:updated",
  "task:completed",
  "note:created",
  "note:updated",
  "conversation:saved",
  "graph:updated",
  "focus:changed",
  "sync:started",
  "sync:completed",
  "sync:failed",
  "workflow:triggered",
  "workflow:completed",
  "workflow:failed",
];

const MAX_BUFFERED_EVENTS = 200;

export function useBrainCloudEvents(
  options: UseBrainCloudEventsOptions = {}
): UseBrainCloudEventsReturn {
  const {
    eventTypes,
    userId,
    source,
    enabled = true,
    reconnect = true,
    reconnectInterval = 5000,
    onEvent,
    onError,
    onConnect,
    onDisconnect,
  } = options;

  const [events, setEvents] = useState<BrainCloudEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<BrainCloudEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const isManuallyDisconnectedRef = useRef(false);
  const mountedRef = useRef(false);
  const connectRef = useRef<() => void>();

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (eventTypes && eventTypes.length > 0) {
      params.set("filter", [...new Set(eventTypes)].join(","));
    }
    if (userId) params.set("userId", userId);
    if (source) params.set("source", source);
    return params.toString();
  }, [eventTypes, source, userId]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const cleanupEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnected(false);
  }, []);

  const handleEventMessage = useCallback(
    (event: MessageEvent<string>, explicitType?: string) => {
      if (!mountedRef.current) {
        return;
      }

      try {
        const data = JSON.parse(event.data) as BrainCloudEvent;
        const eventPayload: BrainCloudEvent = {
          ...data,
          type: data.type ?? explicitType ?? "message",
        };

        setEvents((prev) => {
          const next = [...prev, eventPayload];
          return next.length > MAX_BUFFERED_EVENTS
            ? next.slice(-MAX_BUFFERED_EVENTS)
            : next;
        });
        setLastEvent(eventPayload);
        onEvent?.(eventPayload);
      } catch (parseError) {
        const err =
          parseError instanceof Error
            ? parseError
            : new Error(String(parseError));
        setError(err);
        onError?.(err);
      }
    },
    [onEvent, onError]
  );

  const connect = useCallback(() => {
    if (!mountedRef.current || !enabled) {
      return;
    }

    cleanupEventSource();
    clearReconnectTimer();
    isManuallyDisconnectedRef.current = false;

    const baseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3002";

    // Get token from localStorage for authentication
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    
    // Don't try to connect if no authentication is available
    if (!token) {
      console.warn("[useBrainCloudEvents] No authentication token available, skipping connection");
      setError(new Error("Authentication required"));
      return;
    }
    
    const separator = queryString ? "&" : "?";
    const authParam = token
      ? `${separator}token=${encodeURIComponent(token)}`
      : "";

    const url = `${baseUrl}/api/brain/events${
      queryString ? `?${queryString}` : ""
    }${authParam}`;
    const eventSource = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("open", () => {
      if (!mountedRef.current) {
        return;
      }
      setConnected(true);
      setError(null);
      onConnect?.();
    });

    eventSource.addEventListener("connected", (event) => {
      handleEventMessage(event as MessageEvent<string>, "connected");
    });

    const listenTypes =
      eventTypes && eventTypes.length > 0
        ? [...new Set(eventTypes)]
        : ALL_EVENT_TYPES;

    listenTypes.forEach((type) => {
      eventSource.addEventListener(type, (event) => {
        handleEventMessage(event as MessageEvent<string>, type);
      });
    });

    eventSource.onmessage = (event) => {
      handleEventMessage(event as MessageEvent<string>);
    };

    eventSource.onerror = (errorEvent) => {
      if (!mountedRef.current) {
        return;
      }

      const err = new Error("Brain Cloud SSE connection failed.");
      setConnected(false);
      setError(err);
      onError?.(err);
      cleanupEventSource();
      onDisconnect?.();

      // Check if we have a token before attempting to reconnect
      const hasToken = typeof window !== "undefined" && localStorage.getItem("token");
      
      if (reconnect && !isManuallyDisconnectedRef.current && hasToken) {
        clearReconnectTimer();
        reconnectTimerRef.current = window.setTimeout(() => {
          if (mountedRef.current) {
            connectRef.current?.();
          }
        }, reconnectInterval);
      } else if (!hasToken) {
        console.warn("[useBrainCloudEvents] No token available, will not attempt to reconnect");
      }
    };
  }, [
    clearReconnectTimer,
    cleanupEventSource,
    enabled,
    eventTypes,
    handleEventMessage,
    onConnect,
    onDisconnect,
    onError,
    queryString,
    reconnect,
    reconnectInterval,
  ]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    isManuallyDisconnectedRef.current = true;
    clearReconnectTimer();
    cleanupEventSource();
    setError(null);
    if (mountedRef.current) {
      setConnected(false);
      onDisconnect?.();
    }
  }, [clearReconnectTimer, cleanupEventSource, onDisconnect]);

  const clear = useCallback(() => {
    if (!mountedRef.current) {
      return;
    }
    setEvents([]);
    setLastEvent(null);
  }, []);

  const getEventsByType = useCallback(
    (type: BrainCloudEventType) =>
      events.filter((event) => event.type === type),
    [events]
  );

  const getFileEvents = useCallback(
    () => events.filter((event) => event.type.startsWith("file:")),
    [events]
  );

  const getTaskEvents = useCallback(
    () => events.filter((event) => event.type.startsWith("task:")),
    [events]
  );

  const getConversationEvents = useCallback(
    () => events.filter((event) => event.type === "conversation:saved"),
    [events]
  );

  useEffect(() => {
    mountedRef.current = true;
    connectRef.current = connect;

    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      mountedRef.current = false;
      clearReconnectTimer();
      cleanupEventSource();
    };
  }, [clearReconnectTimer, cleanupEventSource, connect, disconnect, enabled]);

  return {
    events,
    lastEvent,
    connected,
    error,
    connect,
    disconnect,
    clear,
    getEventsByType,
    getFileEvents,
    getTaskEvents,
    getConversationEvents,
  };
}
