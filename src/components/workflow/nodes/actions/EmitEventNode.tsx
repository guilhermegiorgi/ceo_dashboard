import { RadioTower } from "lucide-react";
import type { NodeDefinition, BrainCloudEventType } from "../../types";

const EMIT_OPTIONS: BrainCloudEventType[] = [
  "workflow:triggered",
  "workflow:completed",
  "workflow:failed",
  "task:created",
  "task:updated",
  "task:completed",
];

const EmitEventNode: NodeDefinition = {
  id: "action:emit-event",
  label: "Emit Event",
  description: "Dispatch a Brain Cloud event for other workflows.",
  kind: "action",
  category: "Utilities",
  color: "bg-slate-500",
  icon: RadioTower,
  inputs: [
    {
      id: "eventType",
      label: "Event type",
      type: "select",
      required: true,
      options: EMIT_OPTIONS.map((value) => ({ value, label: value })),
    },
    {
      id: "payload",
      label: "Payload (JSON)",
      type: "json",
      helpText: "Additional data attached to the event.",
    },
  ],
  createConfig: () => ({ eventType: "workflow:completed", payload: {} }),
  serializeAction: (config, nodeId) => ({
    id: nodeId,
    type: "emit_event",
    name: "Emit Event",
    config: {
      eventType: config.eventType,
      payload: config.payload || {},
    },
  }),
};

export default EmitEventNode;
