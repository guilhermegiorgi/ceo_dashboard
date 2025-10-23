import { FolderSymlink } from "lucide-react";
import type { NodeDefinition } from "../../types";

const MoveFileNode: NodeDefinition = {
  id: "action:move-file",
  label: "Move File",
  description: "Move or rename a file in the vault.",
  kind: "action",
  category: "Actions",
  color: "bg-emerald-500",
  icon: FolderSymlink,
  inputs: [
    {
      id: "fromPath",
      label: "Current path",
      type: "text",
      required: true,
      placeholder: "Inbox/note.md",
    },
    {
      id: "toPath",
      label: "Destination path",
      type: "text",
      required: true,
      placeholder: "Projects/note.md",
    },
  ],
  createConfig: () => ({ fromPath: "", toPath: "" }),
  serializeAction: (config, nodeId) => ({
    id: nodeId,
    type: "move_file",
    name: "Move File",
    config: {
      fromPath: config.fromPath,
      toPath: config.toPath,
    },
  }),
};

export default MoveFileNode;
