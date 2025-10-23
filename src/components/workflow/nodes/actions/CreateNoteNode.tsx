import { FilePlus } from "lucide-react";
import type { NodeDefinition } from "../../types";

const CreateNoteNode: NodeDefinition = {
  id: "action:create-note",
  label: "Create Note",
  description: "Create a new note in the Brain Cloud vault.",
  kind: "action",
  category: "Actions",
  color: "bg-emerald-500",
  icon: FilePlus,
  inputs: [
    {
      id: "path",
      label: "Note path",
      type: "text",
      required: true,
      placeholder: "Projects/{{project}}/daily.md",
    },
    {
      id: "content",
      label: "Content",
      type: "textarea",
      required: true,
      placeholder: "## Daily summary...",
    },
    {
      id: "frontmatter",
      label: "Frontmatter (JSON)",
      type: "json",
      helpText: "Optional metadata to include in the note frontmatter.",
    },
  ],
  createConfig: () => ({ path: "", content: "", frontmatter: {} }),
  serializeAction: (config, nodeId) => ({
    id: nodeId,
    type: "create_note",
    name: "Create Note",
    config: {
      path: config.path,
      content: config.content,
      frontmatter: config.frontmatter || undefined,
    },
  }),
};

export default CreateNoteNode;
