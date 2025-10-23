"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import WorkflowCanvas from "./WorkflowCanvas";
import ComponentPalette from "./ComponentPalette";
import PropertiesPanel from "./PropertiesPanel";
import WorkflowToolbar from "./WorkflowToolbar";
import {
  NODE_DEFINITION_MAP,
  NODE_DEFINITIONS,
  TRIGGER_DEFINITIONS,
  ACTION_DEFINITIONS,
} from "./nodes";
import type {
  BuilderNode,
  BuilderStatus,
  ValidationError,
  WorkflowAction,
  WorkflowDefinition,
  WorkflowTrigger,
} from "./types";

export interface WorkflowBuilderProps {
  workflowId?: string;
  initialWorkflow?: WorkflowDefinition | null;
  onSave?: (workflow: WorkflowDefinition) => void | string | Promise<void | string>;
  onTest?: (workflow: WorkflowDefinition) => Promise<void> | void;
}

function createNodeId(prefix: "trigger" | "action") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function hydrateTrigger(trigger: WorkflowTrigger): BuilderNode | null {
  switch (trigger.type) {
    case "event": {
      const definition = NODE_DEFINITION_MAP["trigger:event"];
      if (!definition) return null;
      const config = {
        eventType: trigger.eventType ?? "task:created",
        source: trigger.eventFilter?.source ?? "",
        userId: trigger.eventFilter?.userId ?? "",
        path: trigger.eventFilter?.path ?? "",
      };
      return {
        id: createNodeId("trigger"),
        definitionId: definition.id,
        kind: "trigger",
        label: definition.label,
        config,
      };
    }
    case "schedule": {
      const definition = NODE_DEFINITION_MAP["trigger:schedule"];
      if (!definition) return null;
      const config = {
        cron: trigger.schedule?.cron ?? "",
        timezone: trigger.schedule?.timezone ?? "",
      };
      return {
        id: createNodeId("trigger"),
        definitionId: definition.id,
        kind: "trigger",
        label: definition.label,
        config,
      };
    }
    case "manual": {
      const definition = NODE_DEFINITION_MAP["trigger:manual"];
      if (!definition) return null;
      return {
        id: createNodeId("trigger"),
        definitionId: definition.id,
        kind: "trigger",
        label: definition.label,
        config: definition.createConfig(),
      };
    }
    case "webhook": {
      const definition = NODE_DEFINITION_MAP["trigger:webhook"];
      if (!definition) return null;
      const config = {
        path: trigger.webhook?.path ?? "/",
        method: trigger.webhook?.method ?? "POST",
        secret: trigger.webhook?.secret ?? "",
      };
      return {
        id: createNodeId("trigger"),
        definitionId: definition.id,
        kind: "trigger",
        label: definition.label,
        config,
      };
    }
    default:
      return null;
  }
}

function hydrateAction(action: WorkflowAction): BuilderNode | null {
  switch (action.type) {
    case "create_note": {
      const definition = NODE_DEFINITION_MAP["action:create-note"];
      if (!definition) return null;
      const config = {
        path: action.config.path ?? "",
        content: action.config.content ?? "",
        frontmatter: action.config.frontmatter ?? {},
      };
      return {
        id: action.id || createNodeId("action"),
        definitionId: definition.id,
        kind: "action",
        label: definition.label,
        config,
      };
    }
    case "update_note": {
      const definition = NODE_DEFINITION_MAP["action:update-note"];
      if (!definition) return null;
      const config = {
        path: action.config.path ?? "",
        mode: action.config.mode ?? "append",
        content: action.config.content ?? "",
      };
      return {
        id: action.id || createNodeId("action"),
        definitionId: definition.id,
        kind: "action",
        label: definition.label,
        config,
      };
    }
    case "move_file": {
      const definition = NODE_DEFINITION_MAP["action:move-file"];
      if (!definition) return null;
      const config = {
        fromPath: action.config.fromPath ?? "",
        toPath: action.config.toPath ?? "",
      };
      return {
        id: action.id || createNodeId("action"),
        definitionId: definition.id,
        kind: "action",
        label: definition.label,
        config,
      };
    }
    case "send_notification": {
      const definition = NODE_DEFINITION_MAP["action:send-notification"];
      if (!definition) return null;
      const config = {
        channel: action.config.channel ?? "in-app",
        recipients: action.config.recipients ?? "",
        message: action.config.message ?? "",
      };
      return {
        id: action.id || createNodeId("action"),
        definitionId: definition.id,
        kind: "action",
        label: definition.label,
        config,
      };
    }
    case "http_request": {
      const definition = NODE_DEFINITION_MAP["action:http-request"];
      if (!definition) return null;
      const config = {
        url: action.config.url ?? "",
        method: action.config.method ?? "POST",
        headers: action.config.headers ?? {},
        body: action.config.body ?? {},
      };
      return {
        id: action.id || createNodeId("action"),
        definitionId: definition.id,
        kind: "action",
        label: definition.label,
        config,
      };
    }
    case "run_agent": {
      const definition = NODE_DEFINITION_MAP["action:mcp-tool"];
      if (!definition) return null;
      const config = {
        toolId: action.config.toolId ?? "",
        parameters: action.config.parameters ?? {},
        timeout: action.config.timeout ?? 20000,
      };
      return {
        id: action.id || createNodeId("action"),
        definitionId: definition.id,
        kind: "action",
        label: definition.label,
        config,
      };
    }
    case "emit_event": {
      const definition = NODE_DEFINITION_MAP["action:emit-event"];
      if (!definition) return null;
      const config = {
        eventType: action.config.eventType ?? "workflow:completed",
        payload: action.config.payload ?? {},
      };
      return {
        id: action.id || createNodeId("action"),
        definitionId: definition.id,
        kind: "action",
        label: definition.label,
        config,
      };
    }
    case "conditional": {
      const definition = NODE_DEFINITION_MAP["action:conditional"];
      if (!definition) return null;
      const config = {
        expression: action.config.expression ?? "",
        trueActions: (action.config.trueActions as string[])?.join(", ") ?? "",
        falseActions: (action.config.falseActions as string[])?.join(", ") ?? "",
      };
      return {
        id: action.id || createNodeId("action"),
        definitionId: definition.id,
        kind: "action",
        label: definition.label,
        config,
      };
    }
    case "loop": {
      const definition = NODE_DEFINITION_MAP["action:loop"];
      if (!definition) return null;
      const config = {
        source: action.config.source ?? "",
        itemName: action.config.itemName ?? "item",
        maxItems: action.config.maxItems ?? 20,
      };
      return {
        id: action.id || createNodeId("action"),
        definitionId: definition.id,
        kind: "action",
        label: definition.label,
        config,
      };
    }
    case "delay": {
      const definition = NODE_DEFINITION_MAP["action:delay"];
      if (!definition) return null;
      const config = {
        durationMs: action.config.durationMs ?? 0,
        jitterMs: action.config.jitterMs ?? 0,
      };
      return {
        id: action.id || createNodeId("action"),
        definitionId: definition.id,
        kind: "action",
        label: definition.label,
        config,
      };
    }
    default:
      return null;
  }
}

function validateNodes(
  trigger: BuilderNode | null,
  actions: BuilderNode[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!trigger) {
    errors.push({
      nodeId: "trigger",
      fieldId: "trigger",
      message: "Workflow requires a trigger",
    });
  } else {
    const definition = NODE_DEFINITION_MAP[trigger.definitionId];
    definition?.inputs.forEach((input) => {
      if (input.required) {
        const value = trigger.config[input.id];
        if (value === undefined || value === null || value === "") {
          errors.push({
            nodeId: trigger.id,
            fieldId: input.id,
            message: `${input.label} is required`,
          });
        }
      }
    });
  }

  if (actions.length === 0) {
    errors.push({
      nodeId: "actions",
      fieldId: "actions",
      message: "Add at least one action",
    });
  }

  actions.forEach((action) => {
    const definition = NODE_DEFINITION_MAP[action.definitionId];
    definition?.inputs.forEach((input) => {
      if (input.required) {
        const value = action.config[input.id];
        const isEmpty =
          value === undefined ||
          value === null ||
          value === "" ||
          (Array.isArray(value) && value.length === 0);
        if (isEmpty) {
          errors.push({
            nodeId: action.id,
            fieldId: input.id,
            message: `${input.label} is required`,
          });
        }
      }
    });
  });

  return errors;
}

export default function WorkflowBuilder({
  workflowId,
  initialWorkflow,
  onSave,
  onTest,
}: WorkflowBuilderProps) {
  const [workflowName, setWorkflowName] = useState("Untitled workflow");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [trigger, setTrigger] = useState<BuilderNode | null>(null);
  const [actions, setActions] = useState<BuilderNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [status, setStatus] = useState<BuilderStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [validationMap, setValidationMap] = useState<Record<string, string[]>>({});

  const workflowIdRef = useRef<string | undefined>(workflowId);

  useEffect(() => {
    workflowIdRef.current = workflowId;
  }, [workflowId]);

  useEffect(() => {
    if (!initialWorkflow) return;
    workflowIdRef.current = initialWorkflow.id;
    setWorkflowName(initialWorkflow.name || "Untitled workflow");
    setWorkflowDescription(initialWorkflow.description ?? "");
    const hydratedTrigger = hydrateTrigger(initialWorkflow.trigger);
    if (hydratedTrigger) {
      setTrigger(hydratedTrigger);
      setSelectedNodeId(hydratedTrigger.id);
    }
    const hydratedActions = initialWorkflow.actions
      .map(hydrateAction)
      .filter((node): node is BuilderNode => Boolean(node));
    setActions(hydratedActions);
  }, [initialWorkflow]);

  const validationErrors = useMemo(() => validationMap, [validationMap]);

  const handleAddDefinition = (definitionId: string) => {
    const definition = NODE_DEFINITION_MAP[definitionId];
    if (!definition) return;
    if (definition.kind === "trigger") {
      const node: BuilderNode = {
        id: createNodeId("trigger"),
        definitionId: definition.id,
        kind: "trigger",
        label: definition.label,
        config: definition.createConfig(),
      };
      setTrigger(node);
      setSelectedNodeId(node.id);
    } else {
      const node: BuilderNode = {
        id: createNodeId("action"),
        definitionId: definition.id,
        kind: "action",
        label: definition.label,
        config: definition.createConfig(),
      };
      setActions((prev) => [...prev, node]);
      setSelectedNodeId(node.id);
    }
  };

  const handleDropNode = (
    definitionId: string,
    target: "trigger" | "actions",
    index?: number
  ) => {
    const definition = NODE_DEFINITION_MAP[definitionId];
    if (!definition) return;
    if (target === "trigger") {
      if (definition.kind !== "trigger") {
        toast.error("Only trigger components can be dropped here");
        return;
      }
      const node: BuilderNode = {
        id: createNodeId("trigger"),
        definitionId: definition.id,
        kind: "trigger",
        label: definition.label,
        config: definition.createConfig(),
      };
      setTrigger(node);
      setSelectedNodeId(node.id);
    } else {
      if (definition.kind !== "action") {
        toast.error("Drag an action component to the actions lane");
        return;
      }
      const node: BuilderNode = {
        id: createNodeId("action"),
        definitionId: definition.id,
        kind: "action",
        label: definition.label,
        config: definition.createConfig(),
      };
      setActions((prev) => {
        const next = [...prev];
        if (index === undefined || index < 0 || index > prev.length) {
          next.push(node);
        } else {
          next.splice(index, 0, node);
        }
        return next;
      });
      setSelectedNodeId(node.id);
    }
  };

  const handleConfigChange = (nodeId: string, config: Record<string, unknown>) => {
    if (trigger && trigger.id === nodeId) {
      setTrigger({ ...trigger, config });
      return;
    }
    setActions((prev) =>
      prev.map((node) => (node.id === nodeId ? { ...node, config } : node))
    );
  };

  const handleRemoveNode = (nodeId: string) => {
    if (trigger && trigger.id === nodeId) {
      setTrigger(null);
      setSelectedNodeId(null);
      return;
    }
    setActions((prev) => prev.filter((node) => node.id !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  const handleDuplicateNode = (node: BuilderNode) => {
    const definition = NODE_DEFINITION_MAP[node.definitionId];
    if (!definition || node.kind !== "action") return;
    const duplicate: BuilderNode = {
      ...node,
      id: createNodeId("action"),
      config: { ...node.config },
    };
    setActions((prev) => [...prev, duplicate]);
    setSelectedNodeId(duplicate.id);
  };

  const handleReorderAction = (sourceId: string, targetIndex: number) => {
    setActions((prev) => {
      const sourceIndex = prev.findIndex((item) => item.id === sourceId);
      if (sourceIndex === -1 || sourceIndex === targetIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const clearAll = () => {
    setTrigger(null);
    setActions([]);
    setSelectedNodeId(null);
    setValidationMap({});
    setStatus("idle");
    setStatusMessage("");
  };

  const buildWorkflowDefinition = (): WorkflowDefinition | null => {
    const errors = validateNodes(trigger, actions);
    const groupedErrors: Record<string, string[]> = {};
    errors.forEach((error) => {
      groupedErrors[error.nodeId] = groupedErrors[error.nodeId] || [];
      groupedErrors[error.nodeId].push(error.message);
    });
    setValidationMap(groupedErrors);
    if (errors.length > 0) {
      toast.error(errors[0].message);
      return null;
    }
    if (!trigger) return null;

    const triggerDefinition = NODE_DEFINITION_MAP[trigger.definitionId];
    const serializedTrigger = triggerDefinition?.serializeTrigger?.(
      trigger.config
    );
    if (!serializedTrigger) {
      toast.error("Trigger component cannot be serialized");
      return null;
    }

    const serializedActions: WorkflowAction[] = [];
    for (const node of actions) {
      const definition = NODE_DEFINITION_MAP[node.definitionId];
      if (!definition?.serializeAction) {
        toast.error(`Action ${node.label} cannot be serialized yet`);
        return null;
      }
      const action = definition.serializeAction(node.config, node.id);
      serializedActions.push(action);
    }

    const now = new Date().toISOString();
    const resolvedId = workflowIdRef.current ?? `wf_${Date.now()}`;

    return {
      id: resolvedId,
      name: workflowName || "Untitled workflow",
      description: workflowDescription || undefined,
      enabled: true,
      createdAt: now,
      updatedAt: now,
      source: "ui",
      trigger: serializedTrigger,
      actions: serializedActions,
    };
  };

  const handleSave = async () => {
    const definition = buildWorkflowDefinition();
    if (!definition) return;
    try {
      setStatus("saving");
      setStatusMessage("Persisting workflow...");
      const result = await onSave?.(definition);
      if (typeof result === "string" && result.trim().length > 0) {
        workflowIdRef.current = result;
      }
      setStatus("success");
      setStatusMessage("Workflow saved successfully");
      toast.success("Workflow saved");
    } catch (error) {
      console.error(error);
      setStatus("error");
      setStatusMessage((error as Error).message ?? "Failed to save workflow");
      toast.error("Failed to save workflow");
    } finally {
      if (!onSave) {
        setStatus("idle");
      }
    }
  };

  const handleTest = async () => {
    const definition = buildWorkflowDefinition();
    if (!definition) return;
    if (!workflowIdRef.current) {
      toast.error("Save the workflow before executing a test");
      return;
    }
    try {
      setStatus("testing");
      setStatusMessage("Triggering workflow execution...");
      await onTest?.(definition);
      setStatus("success");
      setStatusMessage("Workflow executed successfully");
      toast.success("Workflow executed");
    } catch (error) {
      console.error(error);
      setStatus("error");
      setStatusMessage((error as Error).message ?? "Failed to execute workflow");
      toast.error("Failed to execute workflow");
    } finally {
      if (!onTest) {
        setStatus("idle");
      }
    }
  };

  const handleExport = () => {
    const definition = buildWorkflowDefinition();
    if (!definition) return;
    const blob = new Blob([JSON.stringify(definition, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${definition.name.replace(/\s+/g, "-").toLowerCase()}-workflow.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Workflow exported as JSON");
  };

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    if (trigger && trigger.id === selectedNodeId) return trigger;
    return actions.find((node) => node.id === selectedNodeId) ?? null;
  }, [selectedNodeId, trigger, actions]);

  return (
    <div className="flex h-full flex-col border border-zinc-900/60 bg-zinc-950/80">
      <WorkflowToolbar
        name={workflowName}
        description={workflowDescription}
        status={status}
        statusMessage={statusMessage}
        disableActions={actions.length === 0 || !trigger}
        onNameChange={setWorkflowName}
        onDescriptionChange={setWorkflowDescription}
        onSave={handleSave}
        onTest={handleTest}
        onClear={clearAll}
        onExport={handleExport}
      />
      <div className="flex flex-1 overflow-hidden">
        <ComponentPalette definitions={NODE_DEFINITIONS} onAdd={handleAddDefinition} />
        <WorkflowCanvas
          trigger={trigger}
          actions={actions}
          selectedNodeId={selectedNodeId}
          validationErrors={validationErrors}
          onDropNode={handleDropNode}
          onSelectNode={setSelectedNodeId}
          onRemoveNode={handleRemoveNode}
          onReorderAction={handleReorderAction}
        />
        <PropertiesPanel
          node={selectedNode}
          onChange={(config) => selectedNode && handleConfigChange(selectedNode.id, config)}
          onRemove={handleRemoveNode}
          onDuplicate={handleDuplicateNode}
          errors={selectedNode ? validationErrors[selectedNode.id] : []}
        />
      </div>
    </div>
  );
}
