import { GitBranch } from "lucide-react";
import type { NodeDefinition } from "../../types";

const ConditionalNode: NodeDefinition = {
  id: "action:conditional",
  label: "Conditional",
  description: "Evaluate an expression and branch logic.",
  kind: "action",
  category: "Conditionals",
  color: "bg-amber-500",
  icon: GitBranch,
  inputs: [
    {
      id: "expression",
      label: "Expression",
      type: "code",
      required: true,
      placeholder: "context.score > 80",
      helpText: "JavaScript expression evaluated against workflow context.",
    },
    {
      id: "trueActions",
      label: "True branch action IDs",
      type: "text",
      placeholder: "action-1, action-2",
      helpText: "Optional action IDs to run when expression is true.",
    },
    {
      id: "falseActions",
      label: "False branch action IDs",
      type: "text",
      placeholder: "action-3",
    },
  ],
  createConfig: () => ({ expression: "", trueActions: "", falseActions: "" }),
  serializeAction: (config, nodeId) => ({
    id: nodeId,
    type: "conditional",
    name: "Conditional",
    config: {
      expression: config.expression,
      trueActions: (config.trueActions as string)
        ?.split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      falseActions: (config.falseActions as string)
        ?.split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    },
  }),
};

export default ConditionalNode;
