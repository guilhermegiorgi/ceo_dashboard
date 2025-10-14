/**
 * MCP Client for Obsidian Brain Cloud
 *
 * Implements the Model Context Protocol client for communicating
 * with Obsidian Brain Cloud via HTTP and WebSocket.
 */

import fetch from "node-fetch";
import { WebSocket } from "ws";

class MCPClient {
  constructor(config = {}) {
    this.baseUrl =
      config.baseUrl ||
      process.env.VITE_BRAINCLOUD_BASE_URL ||
      "https://obsidian-mcp.ggailabs.com";
    this.apiToken =
      config.apiToken ||
      process.env.VITE_BRAINCLOUD_API_TOKEN ||
      "ggai_90e2c6b20c8315906f843798bbc1598df596978a2ec79457e6d00563c76d03dc";
    this.wsUrl =
      config.wsUrl ||
      process.env.VITE_BRAINCLOUD_MCP_WS ||
      "wss://obsidian-mcp.ggailabs.com/mcp";
    this.ws = null;
    this.messageHandlers = new Map();
    this.requestId = 0;
  }

  /**
   * Initialize HTTP client with authentication
   */
  _getHeaders() {
    const headers = {
      "Content-Type": "application/json",
    };

    if (this.apiToken) {
      headers["Authorization"] = `Bearer ${this.apiToken}`;
    }

    return headers;
  }

  /**
   * Make HTTP request to Brain Cloud
   */
  async _request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this._getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`MCP Request failed: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.on("open", () => {
        console.log("✅ MCP WebSocket connected");
        resolve();
      });

      this.ws.on("message", (data) => {
        try {
          const message = JSON.parse(data);
          this._handleMessage(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      });

      this.ws.on("error", (error) => {
        console.error("MCP WebSocket error:", error);
        reject(error);
      });

      this.ws.on("close", () => {
        console.log("MCP WebSocket closed");
        this.ws = null;
      });
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  _handleMessage(message) {
    const { id, method, result, error } = message;

    if (id && this.messageHandlers.has(id)) {
      const { resolve, reject } = this.messageHandlers.get(id);
      this.messageHandlers.delete(id);

      if (error) {
        reject(new Error(error.message || "MCP request failed"));
      } else {
        resolve(result);
      }
    }
  }

  /**
   * Send WebSocket request
   */
  async _sendWebSocketRequest(method, params = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }

    const id = ++this.requestId;
    const message = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.messageHandlers.set(id, { resolve, reject });

      // Timeout after 30 seconds
      const timeout = setTimeout(() => {
        if (this.messageHandlers.has(id)) {
          this.messageHandlers.delete(id);
          reject(new Error("Request timeout"));
        }
      }, 30000);

      this.ws.send(JSON.stringify(message), (error) => {
        if (error) {
          clearTimeout(timeout);
          this.messageHandlers.delete(id);
          reject(error);
        }
      });
    });
  }

  // ==========================================
  // File Operations
  // ==========================================

  async getFileContents(filepath) {
    return this._request(`/api/v1/files/${encodeURIComponent(filepath)}`);
  }

  async writeFile(filepath, content, createParents = false) {
    return this._request(`/api/v1/files/${encodeURIComponent(filepath)}`, {
      method: "POST",
      body: JSON.stringify({ content, create_parents: createParents }),
    });
  }

  async appendContent(filepath, content, separator = "\n") {
    return this._request(
      `/api/v1/files/${encodeURIComponent(filepath)}/append`,
      {
        method: "POST",
        body: JSON.stringify({ content, separator }),
      }
    );
  }

  async patchContent(
    filepath,
    content,
    heading = null,
    position = "after_heading"
  ) {
    return this._request(
      `/api/v1/files/${encodeURIComponent(filepath)}/patch`,
      {
        method: "POST",
        body: JSON.stringify({ content, heading, position }),
      }
    );
  }

  async deleteFile(filepath) {
    return this._request(`/api/v1/files/${encodeURIComponent(filepath)}`, {
      method: "DELETE",
    });
  }

  async moveFile(sourcePath, destinationPath, overwrite = false) {
    return this._request("/api/v1/files/move", {
      method: "POST",
      body: JSON.stringify({
        source_path: sourcePath,
        destination_path: destinationPath,
        overwrite,
      }),
    });
  }

  // ==========================================
  // Search Operations
  // ==========================================

  async searchFiles(
    query,
    caseSensitive = false,
    fileExtensions = [".md", ".txt"]
  ) {
    const params = new URLSearchParams({
      query,
      case_sensitive: caseSensitive,
      file_extensions: fileExtensions.join(","),
    });
    return this._request(`/api/v1/search?${params}`);
  }

  async semanticSearch(query, limit = 5) {
    return this._request("/api/v1/semantic/search", {
      method: "POST",
      body: JSON.stringify({ query, limit }),
    });
  }

  // ==========================================
  // Graph Operations
  // ==========================================

  async getGraphData(directory = "", includeOrphans = true) {
    const params = new URLSearchParams({
      directory,
      include_orphans: includeOrphans,
    });
    return this._request(`/api/v1/graph?${params}`);
  }

  async getMainTags(limit = 10) {
    const params = new URLSearchParams({ limit });
    return this._request(`/api/v1/tags?${params}`);
  }

  async getMainLinks(limit = 10) {
    const params = new URLSearchParams({ limit });
    return this._request(`/api/v1/links?${params}`);
  }

  // ==========================================
  // Periodic Notes
  // ==========================================

  async getPeriodicNote(period = "daily") {
    return this._request(`/api/v1/periodic/${period}`);
  }

  async getRecentPeriodicNotes(period = "daily", limit = 5) {
    const params = new URLSearchParams({ limit });
    return this._request(`/api/v1/periodic/${period}/recent?${params}`);
  }

  // ==========================================
  // Tasks & Focus
  // ==========================================

  async getCurrentFocus() {
    return this._request("/api/v1/focus/current");
  }

  async getDueTasks(window = "all", includeCompleted = false) {
    const params = new URLSearchParams({
      window,
      include_completed: includeCompleted,
    });
    return this._request(`/api/v1/tasks/due?${params}`);
  }

  async getTasksSummary(range = "this_week") {
    const params = new URLSearchParams({ range });
    return this._request(`/api/v1/tasks/summary?${params}`);
  }

  // ==========================================
  // Memory & Context
  // ==========================================

  async saveConversationHistory(
    source,
    conversationId,
    messages,
    metadata = {}
  ) {
    return this._request("/api/v1/memory/conversations", {
      method: "POST",
      body: JSON.stringify({
        source,
        conversation_id: conversationId,
        messages,
        metadata,
      }),
    });
  }

  async searchConversationHistory(query, limit = 5, filters = {}) {
    return this._request("/api/v1/memory/conversations/search", {
      method: "POST",
      body: JSON.stringify({ query, limit, filters }),
    });
  }

  async getHistoricalContext(query, limit = 5) {
    return this._request("/api/v1/memory/context", {
      method: "POST",
      body: JSON.stringify({ query, limit }),
    });
  }

  // ==========================================
  // Vault Operations
  // ==========================================

  async listFiles(directory = "") {
    const params = new URLSearchParams({ directory });
    return this._request(`/api/v1/vault/files?${params}`);
  }

  async getVaultTree(directory = "", depth = 2) {
    const params = new URLSearchParams({ directory, depth });
    return this._request(`/api/v1/vault/tree?${params}`);
  }

  async syncVault() {
    return this._request("/api/v1/vault/sync", { method: "POST" });
  }

  async rebuildEmbeddings(directory = "") {
    return this._request("/api/v1/embeddings/rebuild", {
      method: "POST",
      body: JSON.stringify({ directory }),
    });
  }

  // ==========================================
  // Utility Methods
  // ==========================================

  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export default MCPClient;
