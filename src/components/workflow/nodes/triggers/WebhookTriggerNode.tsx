import { Webhook } from "lucide-react";
import type { NodeDefinition } from "../../types";

const WebhookTriggerNode: NodeDefinition = {
  id: "trigger:webhook",
  label: "Webhook",
  description: "Expose an endpoint to trigger this workflow from external systems.",
  kind: "trigger",
  category: "Triggers",
  color: "bg-sky-500",
  icon: Webhook,
  badge: "Webhook",
  inputs: [
    {
      id: "path",
      label: "Endpoint path",
      type: "text",
      required: true,
      placeholder: "/integrations/workflows/daily-summary",
    },
    {
      id: "method",
      label: "HTTP method",
      type: "select",
      options: [
        { value: "POST", label: "POST" },
        { value: "PUT", label: "PUT" },
        { value: "GET", label: "GET" },
        { value: "DELETE", label: "DELETE" },
      ],
      defaultValue: "POST",
    },
    {
      id: "secret",
      label: "Shared secret",
      type: "text",
      placeholder: "Optional secret for validation",
    },
  ],
  createConfig: () => ({ path: "/", method: "POST", secret: "" }),
  serializeTrigger: (config) => ({
    type: "webhook",
    webhook: {
      path: String(config.path || "/"),
      method: (config.method as string | undefined) || "POST",
      secret: config.secret ? String(config.secret) : undefined,
    },
  }),
};

export default WebhookTriggerNode;
