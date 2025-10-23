import { FilePenLine } from "lucide-react";
import type { NodeDefinition } from "../../types";

const UpdateNoteNode: NodeDefinition = {
  id: "action:update-note",
  label: "Update Note",
  description: "Append or replace content in an existing note.",
  kind: "action",
  category: "Actions",
  color: "bg-emerald-500",
  icon: FilePenLine,
  inputs: [
    {
      id: "path",
      label: "Note path",
      type: "text",
      required: true,
      placeholder: "Projects/weekly.md",
    },
    {
      id: "mode",
      label: "Update mode",
      type: "select",
      options: [
        { value: "append", label: "Append" },
        { value: "replace", label: "Replace" },
      ],
      defaultValue: "append",
    },
    {
      id: "content",
      label: "Content",
      type: "textarea",
      required: true,
      placeholder: "New content to append or replace",
    },
  ],
  createConfig: () => ({ path: "", mode: "append", content: "" }),
  serializeAction: (config, nodeId) => ({
    id: nodeId,
    type: "update_note",
    name: "Update Note",
    config: {
      path: config.path,
      mode: config.mode || "append",
      content: config.content,
    },
  }),
};

export default UpdateNoteNode;
