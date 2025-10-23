/**
 * MCP Session Manager
 * Handles lifecycle of MCP HTTP sessions (initialize, list tools, call tools)
 * so the chat pipeline can operate exactly like other MCP-aware clients.
 */

import { logger } from "../src/utils/logger.js";

const MCP_PROTOCOL_VERSION = "2024-11-05";
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

function normalizeBaseUrl(rawBaseUrl) {
  if (!rawBaseUrl) return null;
  const trimmed = rawBaseUrl.replace(/\/+$/, "");
  return `${trimmed}/api/v1/mcp/http/`;
}

function buildHeaders(token, sessionId = null) {
  if (!token) {
    throw new Error("MCP token is not configured");
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "Mcp-Protocol-Version": MCP_PROTOCOL_VERSION,
  };

  if (sessionId) {
    headers["Mcp-Session-Id"] = sessionId;
  }

  return headers;
}

async function parseMcpResponse(response) {
  const raw = await response.text();
  if (!raw) {
    return { data: null, raw, events: [] };
  }

  const sseLines = raw
    .split("\n")
    .filter((line) => line.startsWith("data:"));

  const events = [];
  for (const line of sseLines) {
    const payload = line.replace(/^data:\s*/, "");
    if (!payload) continue;
    try {
      events.push(JSON.parse(payload));
    } catch (err) {
      // ignore parse errors on individual events
    }
  }

  if (events.length > 0) {
    return { data: events[events.length - 1], raw, events };
  }

  try {
    return { data: JSON.parse(raw), raw, events: [] };
  } catch (err) {
    return { data: null, raw, events: [] };
  }
}

function extractSessionId(response, parsedData) {
  const headerKeys = [
    "mcp-session-id",
    "Mcp-Session-Id",
    "x-mcp-session-id",
  ];
  for (const key of headerKeys) {
    const value = response.headers?.get?.(key);
    if (value) return value.trim();
  }
  return (
    parsedData?.result?.serverInfo?.mcpSessionId ||
    parsedData?.result?.sessionId ||
    parsedData?.result?.mcpSessionId ||
    parsedData?.result?.session?.id ||
    parsedData?.result?.session?.sessionId ||
    parsedData?.session_id ||
    parsedData?.mcpSessionId ||
    parsedData?.result?.mcp_session_id ||
    null
  );
}

class McpSession {
  constructor({ sessionId, llmTools, toolNameMap, expiresAt, callTool, rawTools = [] }) {
    this.sessionId = sessionId;
    this.llmTools = llmTools;
    this.toolNameMap = toolNameMap;
    this.expiresAt = expiresAt;
    this.callTool = callTool;
    this.rawTools = rawTools;
  }

  isExpired() {
    return Date.now() > this.expiresAt;
  }
}

class McpSessionManager {
  constructor() {
    this.baseUrl = normalizeBaseUrl(process.env.BRAINCLOUD_BASE_URL);
    this.token = process.env.BRAINCLOUD_API_TOKEN || null;
    this.sessions = new Map();
  }

  hasCredentials() {
    return Boolean(this.baseUrl && this.token);
  }

  _getSessionKey(keyParts = []) {
    if (!Array.isArray(keyParts)) {
      return String(keyParts || "default");
    }
    if (keyParts.length === 0) {
      return "default";
    }
    return keyParts.map((part) => String(part ?? "null")).join("::");
  }

  _pruneExpired() {
    for (const [key, session] of this.sessions.entries()) {
      if (session.isExpired()) {
        this.sessions.delete(key);
      }
    }
  }

  async _initializeSession() {
    if (!this.baseUrl) {
      throw new Error("BRAINCLOUD_BASE_URL is not configured");
    }
    if (!this.token) {
      throw new Error("BRAINCLOUD_API_TOKEN is not configured");
    }

    const initPayload = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "initialize",
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        clientInfo: { name: "CEO Dashboard", version: "1.0.0" },
        capabilities: {},
      },
    };

    logger.info("[McpSession] Initializing MCP session", {
      baseUrl: this.baseUrl,
      protocol: MCP_PROTOCOL_VERSION,
    });

    const initResponse = await fetch(this.baseUrl, {
      method: "POST",
      headers: buildHeaders(this.token),
      body: JSON.stringify(initPayload),
    });

    if (!initResponse.ok) {
      const errorPayload = await initResponse.text();
      throw new Error(
        `MCP initialize failed: ${initResponse.status} ${initResponse.statusText} | ${errorPayload}`
      );
    }

    const { data: initData, raw: initRaw } = await parseMcpResponse(initResponse);
    const sessionId = extractSessionId(initResponse, initData);

    if (!sessionId) {
      throw new Error(
        `Failed to initialize MCP session: No session ID returned. Response: ${initRaw}`
      );
    }

    logger.info("[McpSession] MCP session established", { sessionId });
    return sessionId;
  }

  async _notifyCapabilities(sessionId) {
    const payload = {
      jsonrpc: "2.0",
      method: "notifications/clientCapabilitiesDidChange",
      params: {
        capabilities: {
          tools: {
            listChanged: true,
          },
          prompts: {
            listChanged: true,
          },
          resources: {
            listChanged: true,
          },
        },
      },
    };

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: buildHeaders(this.token, sessionId),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorPayload = await response.text();
      throw new Error(
        `MCP clientCapabilities notification failed: ${response.status} ${response.statusText} | ${errorPayload}`
      );
    }
  }

  async _listTools(sessionId) {
    const toolsPayload = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/list",
      params: {},
    };

    const toolsResponse = await fetch(this.baseUrl, {
      method: "POST",
      headers: buildHeaders(this.token, sessionId),
      body: JSON.stringify(toolsPayload),
    });

    if (!toolsResponse.ok) {
      const errorPayload = await toolsResponse.text();
      throw new Error(
        `MCP tools/list failed: ${toolsResponse.status} ${toolsResponse.statusText} | ${errorPayload}`
      );
    }

    const { data: toolsData, raw: toolsRaw, events } = await parseMcpResponse(toolsResponse);
    logger.info("[McpSession] tools/list response received", {
      sessionId,
      rawLength: toolsRaw?.length || 0,
      events: events?.length || 0,
    });
    const rawPreview =
      typeof toolsRaw === "string" && toolsRaw.length > 0
        ? toolsRaw.slice(0, 2000)
        : toolsRaw;
    if (typeof logger.debug === "function") {
      logger.debug("[McpSession] tools/list raw payload", { raw: rawPreview });
    } else {
      logger.info("[McpSession] tools/list raw payload", { raw: rawPreview });
    }
    if (events?.length) {
      logger.info("[McpSession] tools/list events parsed", {
        events: events.map((event) =>
          typeof event === "string"
            ? event
            : JSON.stringify(event).slice(0, 2000)
        ),
      });
    }

    const candidatePayloads = [];
    if (toolsData) candidatePayloads.push(toolsData);
    if (Array.isArray(events)) {
      for (let idx = events.length - 1; idx >= 0; idx -= 1) {
        const payload = events[idx];
        if (payload && !candidatePayloads.includes(payload)) {
          candidatePayloads.push(payload);
        }
      }
    }

    const extractTools = (payload) => {
      if (!payload) return [];

      const candidateArrays = [
        payload?.result?.tools,
        payload?.tools,
        payload?.result?.items,
        payload?.items,
        payload?.result?.partial?.items,
        payload?.result?.partial?.delta?.items,
        payload?.result?.partial?.result?.items,
        payload?.result?.partial?.result?.tools,
        payload?.result?.delta?.items,
        payload?.result?.delta?.tools,
        payload?.partial?.items,
        payload?.partial?.delta?.items,
        payload?.partial?.result?.items,
        payload?.partial?.result?.tools,
        payload?.delta?.items,
        payload?.delta?.tools,
      ];

      for (const maybeArray of candidateArrays) {
        if (Array.isArray(maybeArray) && maybeArray.length > 0) {
          return maybeArray
            .map((item) => item?.tool || item)
            .filter((tool) => tool && typeof tool.name === "string");
        }
      }

      const candidateObjects = [
        payload?.result?.tool,
        payload?.tool,
        payload?.result?.partial?.tool,
        payload?.result?.partial?.delta?.tool,
        payload?.partial?.tool,
        payload?.partial?.delta?.tool,
      ];

      for (const maybeTool of candidateObjects) {
        if (maybeTool && typeof maybeTool.name === "string") {
          return [maybeTool];
        }
      }

      return [];
    };

    let toolsList = [];
    for (const payload of candidatePayloads) {
      const extracted = extractTools(payload);
      if (extracted.length > 0) {
        toolsList = extracted;
        break;
      }
    }

    if (!Array.isArray(toolsList) || toolsList.length === 0) {
      throw new Error("MCP tools/list returned no tools");
    }

    const toolNameMap = {};
    const llmTools = toolsList.map((tool) => {
      const functionName = tool.name;
      const normalized = functionName?.replace?.(/^obsidian-brain-cloud__/, "") || functionName;

      if (functionName) {
        toolNameMap[functionName] = functionName;
      }
      if (normalized && normalized !== functionName) {
        toolNameMap[normalized] = functionName;
      }

      return {
        type: tool.type || "function",
        function: {
          name: normalized || functionName,
          description: tool.description,
          parameters:
            tool.parameters ||
            tool.inputSchema || {
              type: "object",
              properties: {},
              required: [],
            },
        },
      };
    });

    return { llmTools, toolNameMap, rawTools: toolsList };
  }

  async _callTool(sessionId, toolName, args) {
    const payload = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args || {},
      },
    };

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: buildHeaders(this.token, sessionId),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorPayload = await response.text();
      throw new Error(
        `MCP tools/call failed: ${response.status} ${response.statusText} | ${errorPayload}`
      );
    }

    const { data: resultData, raw: resultRaw } = await parseMcpResponse(response);
    return {
      sessionId,
      toolName,
      data: resultData || null,
      raw: resultRaw,
    };
  }

  async createSession(keyParts = []) {
    this._pruneExpired();

    const cacheKey = this._getSessionKey(keyParts);
    const existing = this.sessions.get(cacheKey);
    if (existing && !existing.isExpired()) {
      logger.info("[McpSession] Reusing cached MCP session", {
        cacheKey,
        sessionId: existing.sessionId,
      });
      return existing;
    }

    const sessionId = await this._initializeSession();
    await this._notifyCapabilities(sessionId);
    const { llmTools, toolNameMap, rawTools } = await this._listTools(sessionId);

    const callTool = async (requestedName, args) => {
      const mappedName =
        toolNameMap[requestedName] || toolNameMap[`obsidian-brain-cloud__${requestedName}`];
      const effectiveName = mappedName || requestedName;
      logger.info("[McpSession] Executing MCP tool", {
        sessionId,
        requestedName,
        effectiveName,
      });
      return this._callTool(sessionId, effectiveName, args);
    };

    const session = new McpSession({
      sessionId,
      llmTools,
      toolNameMap,
      rawTools,
      callTool,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });

    this.sessions.set(cacheKey, session);
    return session;
  }
}

const mcpSessionManager = new McpSessionManager();

export { MCP_PROTOCOL_VERSION };
export default mcpSessionManager;
