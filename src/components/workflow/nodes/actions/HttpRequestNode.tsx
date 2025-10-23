import { Globe } from "lucide-react";
import type { NodeDefinition } from "../../types";

const HttpRequestNode: NodeDefinition = {
  id: "action:http-request",
  label: "HTTP Request",
  description: "Call an external HTTP endpoint.",
  kind: "action",
  category: "Actions",
  color: "bg-emerald-500",
  icon: Globe,
  inputs: [
    {
      id: "url",
      label: "URL",
      type: "text",
      required: true,
      placeholder: "https://api.example.com/endpoint",
    },
    {
      id: "method",
      label: "Method",
      type: "select",
      options: [
        { value: "GET", label: "GET" },
        { value: "POST", label: "POST" },
        { value: "PUT", label: "PUT" },
        { value: "PATCH", label: "PATCH" },
        { value: "DELETE", label: "DELETE" },
      ],
      defaultValue: "POST",
    },
    {
      id: "headers",
      label: "Headers (JSON)",
      type: "json",
      helpText: "Optional request headers.",
    },
    {
      id: "body",
      label: "Body (JSON)",
      type: "json",
      helpText: "Optional request payload.",
    },
  ],
  createConfig: () => ({ url: "", method: "POST", headers: {}, body: {} }),
  serializeAction: (config, nodeId) => ({
    id: nodeId,
    type: "http_request",
    name: "HTTP Request",
    config: {
      url: config.url,
      method: config.method || "POST",
      headers: config.headers || {},
      body: config.body || {},
    },
  }),
};

export default HttpRequestNode;
