import { Bot } from "lucide-react";
import type { NodeDefinition } from "../../types";

const McpToolNode: NodeDefinition = {
  id: "action:mcp-tool",
  label: "MCP Tool",
  description: "Execute an MCP tool or agent workflow.",
  kind: "action",
  category: "Actions",
  color: "bg-emerald-500",
  icon: Bot,
  inputs: [
    {
      id: "toolId",
      label: "Tool identifier",
      type: "text",
      required: true,
      placeholder: "mcp_get_focus",
    },
    {
      id: "parameters",
      label: "Parameters (JSON)",
      type: "json",
      helpText: "Arguments passed to the MCP tool.",
    },
    {
      id: "timeout",
      label: "Timeout (ms)",
      type: "number",
      placeholder: "20000",
    },
  ],
  createConfig: () => ({ toolId: "", parameters: {}, timeout: 20000 }),
  serializeAction: (config, nodeId) => ({
    id: nodeId,
    type: "run_agent",
    name: "Run MCP Tool",
    config: {
      toolId: config.toolId,
      parameters: config.parameters || {},
      timeout: config.timeout ? Number(config.timeout) : undefined,
    },
  }),
};

export default McpToolNode;
