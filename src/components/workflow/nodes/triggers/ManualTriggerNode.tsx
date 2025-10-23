import { Play } from "lucide-react";
import type { NodeDefinition } from "../../types";

const ManualTriggerNode: NodeDefinition = {
  id: "trigger:manual",
  label: "Manual Trigger",
  description: "Start workflow manually from dashboard or API.",
  kind: "trigger",
  category: "Triggers",
  color: "bg-sky-500",
  icon: Play,
  badge: "Manual",
  inputs: [
    {
      id: "notes",
      label: "Notes",
      type: "textarea",
      placeholder: "Describe when to run this manually...",
    },
  ],
  createConfig: () => ({ notes: "" }),
  serializeTrigger: () => ({ type: "manual" }),
};

export default ManualTriggerNode;
