import { BellRing } from "lucide-react";
import type { NodeDefinition } from "../../types";

const SendNotificationNode: NodeDefinition = {
  id: "action:send-notification",
  label: "Send Notification",
  description: "Notify stakeholders via email or in-app messaging.",
  kind: "action",
  category: "Actions",
  color: "bg-emerald-500",
  icon: BellRing,
  inputs: [
    {
      id: "channel",
      label: "Channel",
      type: "select",
      options: [
        { value: "email", label: "Email" },
        { value: "slack", label: "Slack" },
        { value: "in-app", label: "In-app" },
      ],
      defaultValue: "in-app",
      required: true,
    },
    {
      id: "recipients",
      label: "Recipients",
      type: "text",
      placeholder: "user@example.com, ops@example.com",
      helpText: "Comma separated list or template variables.",
    },
    {
      id: "message",
      label: "Message",
      type: "textarea",
      required: true,
      placeholder: "Notification body...",
    },
  ],
  createConfig: () => ({ channel: "in-app", recipients: "", message: "" }),
  serializeAction: (config, nodeId) => ({
    id: nodeId,
    type: "send_notification",
    name: "Send Notification",
    config: {
      channel: config.channel || "in-app",
      recipients: config.recipients,
      message: config.message,
    },
  }),
};

export default SendNotificationNode;
