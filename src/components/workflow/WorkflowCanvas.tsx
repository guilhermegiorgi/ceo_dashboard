"use client";

import React from "react";
import { AlertTriangle, PlusCircle, X } from "lucide-react";
import type { BuilderNode } from "./types";
import { NODE_DEFINITION_MAP } from "./nodes";

interface WorkflowCanvasProps {
  trigger: BuilderNode | null;
  actions: BuilderNode[];
  selectedNodeId: string | null;
  validationErrors: Record<string, string[]>;
  onDropNode: (definitionId: string, target: "trigger" | "actions", index?: number) => void;
  onSelectNode: (nodeId: string | null) => void;
  onRemoveNode: (nodeId: string) => void;
  onReorderAction: (sourceId: string, targetIndex: number) => void;
}

function renderNodeBadge(node: BuilderNode) {
  const definition = NODE_DEFINITION_MAP[node.definitionId];
  if (!definition) return null;
  const Icon = definition.icon;
  return (
    <span
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${definition.color} text-white shadow`}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

export default function WorkflowCanvas({
  trigger,
  actions,
  selectedNodeId,
  validationErrors,
  onDropNode,
  onSelectNode,
  onRemoveNode,
  onReorderAction,
}: WorkflowCanvasProps) {
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes("application/x-workflow-node")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
    target: "trigger" | "actions",
    index?: number
  ) => {
    const definitionId = event.dataTransfer.getData(
      "application/x-workflow-node"
    );
    if (definitionId) {
      onDropNode(definitionId, target, index);
    }
  };

  const triggerErrors = trigger
    ? validationErrors[trigger.id]
    : validationErrors["trigger"];

  return (
    <div className="flex-1 overflow-hidden bg-zinc-950/60">
      <div className="flex h-full flex-col gap-4 p-4">
        <section
          onDragOver={handleDragOver}
          onDrop={(event) => handleDrop(event, "trigger")}
          className={`rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/80 p-4 transition ${
            trigger
              ? "border-solid border-emerald-500/60 bg-zinc-900/60"
              : "hover:border-emerald-500/40"
          }`}
        >
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Trigger
              </p>
              <p className="text-sm text-zinc-400">
                Drag a trigger component here to start your workflow.
              </p>
            </div>
            {!trigger && (
              <PlusCircle className="h-5 w-5 text-zinc-600" />
            )}
          </header>

          {trigger ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => onSelectNode(trigger.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSelectNode(trigger.id);
              }}
              className={`mt-4 flex cursor-pointer items-start gap-4 rounded-xl border px-4 py-3 shadow-inner transition ${
                selectedNodeId === trigger.id
                  ? "border-emerald-400 bg-emerald-500/10"
                  : "border-zinc-800 bg-zinc-900/80 hover:border-emerald-500/40"
              }`}
            >
              {renderNodeBadge(trigger)}
              <div className="flex-1">
                <p className="text-sm font-semibold text-zinc-100">
                  {NODE_DEFINITION_MAP[trigger.definitionId]?.label ?? "Trigger"}
                </p>
                {triggerErrors && triggerErrors.length > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{triggerErrors[0]}</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemoveNode(trigger.id);
                }}
                className="rounded-full p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-rose-400"
                aria-label="Remove trigger"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-500">
              Drop a trigger from the palette to begin.
            </div>
          )}
        </section>

        <section
          className="flex-1 rounded-2xl border border-zinc-900/60 bg-zinc-950/70 p-4"
        >
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Actions
              </p>
              <p className="text-sm text-zinc-400">
                Drag actions here or click + on the palette to extend your workflow.
              </p>
            </div>
          </header>

          <div
            onDragOver={handleDragOver}
            onDrop={(event) => handleDrop(event, "actions")}
            className="relative mt-4 flex h-full flex-col gap-3 overflow-y-auto rounded-xl border border-dashed border-transparent bg-zinc-900/40 p-4"
          >
            {actions.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 rounded border border-dashed border-zinc-800/80 bg-zinc-900/40 p-6 text-center text-sm text-zinc-500">
                <span>Drop actions here to create your automation chain.</span>
                {validationErrors["actions"] && (
                  <span className="inline-flex items-center gap-2 text-xs text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    {validationErrors["actions"][0]}
                  </span>
                )}
              </div>
            ) : (
              <ul className="space-y-3">
                {actions.map((node, index) => {
                  const definition = NODE_DEFINITION_MAP[node.definitionId];
                  const errors = validationErrors[node.id];
                  return (
                    <li key={node.id}
                      className={`rounded-xl border transition ${
                        selectedNodeId === node.id
                          ? "border-emerald-400 bg-emerald-500/10"
                          : "border-zinc-800 bg-zinc-900/80 hover:border-emerald-500/40"
                      }`}
                    >
                      <div
                        className="flex cursor-grab items-start gap-3 px-4 py-3"
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData(
                            "application/x-workflow-action-reorder",
                            node.id
                          );
                          event.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(event) => {
                          if (
                            event.dataTransfer.types.includes(
                              "application/x-workflow-action-reorder"
                            )
                          ) {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                          }
                        }}
                        onDrop={(event) => {
                          const sourceId = event.dataTransfer.getData(
                            "application/x-workflow-action-reorder"
                          );
                          if (sourceId && sourceId !== node.id) {
                            onReorderAction(sourceId, index);
                          }
                        }}
                        onClick={() => onSelectNode(node.id)}
                      >
                        {renderNodeBadge(node)}
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-zinc-100">
                            {definition?.label ?? "Action"}
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">
                            {definition?.description}
                          </p>
                          {errors && errors.length > 0 && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-amber-400">
                              <AlertTriangle className="h-4 w-4" />
                              <span>{errors[0]}</span>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onRemoveNode(node.id);
                          }}
                          className="rounded-full p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-rose-400"
                          aria-label="Remove action"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
