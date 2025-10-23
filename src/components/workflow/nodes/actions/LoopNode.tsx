import { Repeat } from "lucide-react";
import type { NodeDefinition } from "../../types";

const LoopNode: NodeDefinition = {
  id: "action:loop",
  label: "Loop",
  description: "Iterate over items from context or previous actions.",
  kind: "action",
  category: "Loops",
  color: "bg-violet-500",
  icon: Repeat,
  inputs: [
    {
      id: "source",
      label: "Items expression",
      type: "code",
      required: true,
      placeholder: "context.tasks",
    },
    {
      id: "itemName",
      label: "Item variable name",
      type: "text",
      placeholder: "task",
      defaultValue: "item",
    },
    {
      id: "maxItems",
      label: "Max items",
      type: "number",
      placeholder: "50",
    },
  ],
  createConfig: () => ({ source: "", itemName: "item", maxItems: 20 }),
  serializeAction: (config, nodeId) => ({
    id: nodeId,
    type: "loop",
    name: "Loop",
    config: {
      source: config.source,
      itemName: config.itemName || "item",
      maxItems: config.maxItems ? Number(config.maxItems) : undefined,
    },
  }),
};

export default LoopNode;
