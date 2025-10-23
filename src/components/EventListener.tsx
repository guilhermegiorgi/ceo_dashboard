"use client";

import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  useBrainCloudEvents,
  type BrainCloudEvent,
  type BrainCloudEventType,
} from "../hooks/useBrainCloudEvents";

interface EventListenerProps {
  eventTypes?: BrainCloudEventType[];
  onFileEvent?: (event: BrainCloudEvent) => void;
  onTaskEvent?: (event: BrainCloudEvent) => void;
  onNoteEvent?: (event: BrainCloudEvent) => void;
  onConversationEvent?: (event: BrainCloudEvent) => void;
  onGraphEvent?: (event: BrainCloudEvent) => void;
  onSyncEvent?: (event: BrainCloudEvent) => void;
  onWorkflowEvent?: (event: BrainCloudEvent) => void;
  showToasts?: boolean;
  toastDuration?: number;
  debug?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

const defaultToastDuration = 3000;

const EventListener: React.FC<EventListenerProps> = ({
  eventTypes,
  onFileEvent,
  onTaskEvent,
  onNoteEvent,
  onConversationEvent,
  onGraphEvent,
  onSyncEvent,
  onWorkflowEvent,
  showToasts = false,
  toastDuration = defaultToastDuration,
  debug = false,
  onConnect,
  onDisconnect,
  onError,
}) => {
  const { lastEvent, connected, error } = useBrainCloudEvents({
    eventTypes,
    enabled: true,
    reconnect: true,
    onConnect,
    onDisconnect,
    onError,
  });

  const hasAnnouncedConnectionRef = useRef(false);

  useEffect(() => {
    if (!lastEvent) {
      return;
    }

    if (debug) {
       
      console.log("[EventListener] Received event:", lastEvent);
    }

    const eventType = String(lastEvent.type);

    if (eventType.startsWith("file:")) {
      onFileEvent?.(lastEvent);

      if (showToasts) {
        const action = eventType.split(":")[1] ?? "atualizado";
        const path = typeof lastEvent.path === "string" ? lastEvent.path : "Arquivo";
        toast.success(`${path} ${action}`, {
          duration: toastDuration,
          id: `${eventType}-${path}`,
        });
      }
    }

    if (eventType.startsWith("task:")) {
      onTaskEvent?.(lastEvent);

      if (showToasts) {
        const action = eventType.split(":")[1] ?? "atualizada";
        const title = typeof lastEvent.title === "string" ? lastEvent.title : "Tarefa";
        toast.success(`Tarefa ${action}: ${title}`, {
          duration: toastDuration,
          id: `${eventType}-${title}`,
        });
      }
    }

    if (eventType.startsWith("note:")) {
      onNoteEvent?.(lastEvent);

      if (showToasts) {
        const title = typeof lastEvent.title === "string" ? lastEvent.title : "Nota";
        toast.success(`Nota atualizada: ${title}`, {
          duration: toastDuration,
          id: `${eventType}-${title}`,
        });
      }
    }

    if (eventType === "conversation:saved") {
      onConversationEvent?.(lastEvent);

      if (showToasts) {
        toast.success("Conversa salva no Vault", {
          duration: toastDuration,
          id: `${eventType}-${lastEvent.conversationId ?? "conversation"}`,
        });
      }
    }

    if (eventType === "graph:updated") {
      onGraphEvent?.(lastEvent);

      if (showToasts) {
        toast.success("Grafo de conhecimento atualizado", {
          duration: toastDuration,
          id: `${eventType}-${Date.now()}`,
        });
      }
    }

    if (eventType.startsWith("sync:")) {
      onSyncEvent?.(lastEvent);

      if (showToasts) {
        const message =
          eventType === "sync:failed"
            ? lastEvent.error
              ? `Sincronização falhou: ${lastEvent.error}`
              : "Sincronização falhou"
            : eventType === "sync:completed"
            ? "Sincronização concluída"
            : "Sincronização iniciada";

        const toastMethod = eventType === "sync:failed" ? toast.error : toast.success;
        toastMethod(message, {
          duration: toastDuration,
          id: `${eventType}-${Date.now()}`,
        });
      }
    }

    if (eventType.startsWith("workflow:")) {
      onWorkflowEvent?.(lastEvent);

      if (showToasts) {
        const workflowName =
          typeof lastEvent.workflowName === "string"
            ? lastEvent.workflowName
            : "Workflow";
        const message =
          eventType === "workflow:completed"
            ? `Workflow concluído: ${workflowName}`
            : eventType === "workflow:failed"
            ? `Workflow falhou: ${workflowName}`
            : `Workflow acionado: ${workflowName}`;
        const toastMethod = eventType === "workflow:failed" ? toast.error : toast.success;
        toastMethod(message, {
          duration: toastDuration,
          id: `${eventType}-${workflowName}`,
        });
      }
    }
  }, [
    lastEvent,
    debug,
    showToasts,
    toastDuration,
    onFileEvent,
    onTaskEvent,
    onNoteEvent,
    onConversationEvent,
    onGraphEvent,
    onSyncEvent,
    onWorkflowEvent,
  ]);

  useEffect(() => {
    if (!showToasts) {
      return;
    }

    if (connected) {
      if (!hasAnnouncedConnectionRef.current) {
        toast.success("Conectado ao Brain Cloud", {
          duration: 2000,
          id: "brain-cloud-connected",
        });
      }
      hasAnnouncedConnectionRef.current = true;
    } else {
      hasAnnouncedConnectionRef.current = false;
    }
  }, [connected, showToasts]);

  useEffect(() => {
    if (!showToasts || !error) {
      return;
    }

    toast.error("Erro na conexão com Brain Cloud", {
      duration: 3000,
      id: "brain-cloud-error",
    });
  }, [error, showToasts]);

  return null;
};

export default EventListener;
