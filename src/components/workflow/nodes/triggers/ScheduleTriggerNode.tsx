import { Clock } from "lucide-react";
import type { NodeDefinition } from "../../types";

const ScheduleTriggerNode: NodeDefinition = {
  id: "trigger:schedule",
  label: "Schedule",
  description: "Execute workflow based on a cron expression.",
  kind: "trigger",
  category: "Triggers",
  color: "bg-sky-500",
  icon: Clock,
  badge: "Cron",
  inputs: [
    {
      id: "cron",
      label: "Cron expression",
      type: "text",
      required: true,
      placeholder: "0 8 * * 1-5",
      helpText: "Use standard cron syntax (UTC).",
    },
    {
      id: "timezone",
      label: "Timezone",
      type: "text",
      placeholder: "America/Sao_Paulo",
      helpText: "Optional IANA timezone. Defaults to UTC.",
    },
  ],
  createConfig: () => ({ cron: "0 9 * * 1-5", timezone: "" }),
  serializeTrigger: (config) => ({
    type: "schedule",
    schedule: {
      cron: String(config.cron || "0 9 * * *"),
      ...(config.timezone ? { timezone: String(config.timezone) } : {}),
    },
  }),
};

export default ScheduleTriggerNode;
