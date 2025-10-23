import { Zap } from "lucide-react";
import type {
  NodeDefinition,
  BrainCloudEventType,
  WorkflowTrigger,
} from "../../types";

const EVENT_OPTIONS: { value: BrainCloudEventType; label: string }[] = [
  { value: "task:created", label: "Task Created" },
  { value: "task:updated", label: "Task Updated" },
  { value: "task:completed", label: "Task Completed" },
  { value: "file:created", label: "File Created" },
  { value: "file:updated", label: "File Updated" },
  { value: "file:deleted", label: "File Deleted" },
  { value: "file:moved", label: "File Moved" },
  { value: "note:created", label: "Note Created" },
  { value: "note:updated", label: "Note Updated" },
  { value: "conversation:saved", label: "Conversation Saved" },
  { value: "graph:updated", label: "Graph Updated" },
  { value: "focus:changed", label: "Focus Changed" },
  { value: "sync:started", label: "Sync Started" },
  { value: "sync:completed", label: "Sync Completed" },
  { value: "sync:failed", label: "Sync Failed" },
  { value: "workflow:triggered", label: "Workflow Triggered" },
  { value: "workflow:completed", label: "Workflow Completed" },
  { value: "workflow:failed", label: "Workflow Failed" },
];

const EventTriggerNode: NodeDefinition = {
  id: "trigger:event",
  label: "Brain Cloud Event",
  description: "Start workflow when a Brain Cloud event occurs.",
  kind: "trigger",
  category: "Triggers",
  color: "bg-sky-500",
  icon: Zap,
  badge: "Event",
  inputs: [
    {
      id: "eventType",
      label: "Event type",
      type: "select",
      required: true,
      options: EVENT_OPTIONS,
      helpText: "Event emitted by Brain Cloud that should trigger this workflow.",
    },
    {
      id: "source",
      label: "Source filter",
      type: "select",
      options: [
        { value: "", label: "Any source" },
        { value: "ui", label: "UI" },
        { value: "sync", label: "Sync" },
        { value: "workflow", label: "Workflow" },
        { value: "agent", label: "Agent" },
      ],
      helpText: "Limit trigger to events emitted by a specific source.",
    },
    {
      id: "userId",
      label: "User ID filter",
      type: "text",
      placeholder: "user-123",
      helpText: "Trigger only when emitted by this user.",
    },
    {
      id: "path",
      label: "Path pattern",
      type: "text",
      placeholder: "vault/notes/*.md",
      helpText: "Use * as wildcard to match file paths.",
    },
  ],
  createConfig: () => ({
    eventType: "task:created",
    source: "",
    userId: "",
    path: "",
  }),
  serializeTrigger: (config) => {
    const trigger: WorkflowTrigger = {
      type: "event",
      eventType: (config.eventType || "task:created") as BrainCloudEventType,
    };

    const source = (config.source as string | undefined)?.trim();
    const userId = (config.userId as string | undefined)?.trim();
    const path = (config.path as string | undefined)?.trim();

    if (source || userId || path) {
      trigger.eventFilter = {};
      if (source) trigger.eventFilter.source = source as "ui" | "sync" | "workflow" | "agent";
      if (userId) trigger.eventFilter.userId = userId;
      if (path) trigger.eventFilter.path = path;
    }

    return trigger;
  },
};

export default EventTriggerNode;
