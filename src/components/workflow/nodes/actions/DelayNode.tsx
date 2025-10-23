import { Hourglass } from "lucide-react";
import type { NodeDefinition } from "../../types";

const DelayNode: NodeDefinition = {
  id: "action:delay",
  label: "Delay",
  description: "Pause workflow execution for a period.",
  kind: "action",
  category: "Utilities",
  color: "bg-slate-500",
  icon: Hourglass,
  inputs: [
    {
      id: "durationMs",
      label: "Delay (ms)",
      type: "number",
      required: true,
      placeholder: "60000",
    },
    {
      id: "jitterMs",
      label: "Jitter (ms)",
      type: "number",
      placeholder: "0",
      helpText: "Optional random jitter to avoid thundering herd.",
    },
  ],
  createConfig: () => ({ durationMs: 1000, jitterMs: 0 }),
  serializeAction: (config, nodeId) => ({
    id: nodeId,
    type: "delay",
    name: "Delay",
    config: {
      durationMs: Number(config.durationMs ?? 0),
      jitterMs: config.jitterMs ? Number(config.jitterMs) : undefined,
    },
  }),
};

export default DelayNode;
