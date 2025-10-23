import EventTriggerNode from "./triggers/EventTriggerNode";
import ScheduleTriggerNode from "./triggers/ScheduleTriggerNode";
import ManualTriggerNode from "./triggers/ManualTriggerNode";
import WebhookTriggerNode from "./triggers/WebhookTriggerNode";

import CreateNoteNode from "./actions/CreateNoteNode";
import UpdateNoteNode from "./actions/UpdateNoteNode";
import MoveFileNode from "./actions/MoveFileNode";
import SendNotificationNode from "./actions/SendNotificationNode";
import HttpRequestNode from "./actions/HttpRequestNode";
import McpToolNode from "./actions/McpToolNode";
import EmitEventNode from "./actions/EmitEventNode";
import ConditionalNode from "./actions/ConditionalNode";
import LoopNode from "./actions/LoopNode";
import DelayNode from "./actions/DelayNode";

import type { NodeDefinition } from "../types";

export const TRIGGER_DEFINITIONS: NodeDefinition[] = [
  EventTriggerNode,
  ScheduleTriggerNode,
  ManualTriggerNode,
  WebhookTriggerNode,
];

export const ACTION_DEFINITIONS: NodeDefinition[] = [
  CreateNoteNode,
  UpdateNoteNode,
  MoveFileNode,
  SendNotificationNode,
  HttpRequestNode,
  McpToolNode,
  EmitEventNode,
  ConditionalNode,
  LoopNode,
  DelayNode,
];

export const NODE_DEFINITIONS: NodeDefinition[] = [
  ...TRIGGER_DEFINITIONS,
  ...ACTION_DEFINITIONS,
];

export const NODE_DEFINITION_MAP = NODE_DEFINITIONS.reduce<Record<string, NodeDefinition>>(
  (acc, definition) => {
    acc[definition.id] = definition;
    return acc;
  },
  {}
);
