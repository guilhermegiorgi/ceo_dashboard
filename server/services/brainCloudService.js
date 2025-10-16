/**
 * Brain Cloud Service
 *
 * Gerencia a integração com Obsidian Brain Cloud via HTTP
 * Usa o endpoint MCP HTTP diretamente
 */

import fetch from "node-fetch";
import { logger } from "../src/utils/logger.js";

class BrainCloudService {
  constructor() {
    this.mcpUrl =
      process.env.VITE_BRAINCLOUD_MCP_HTTP ||
      "https://obsidian-mcp.ggailabs.com/api/v1/mcp/http/";
    this.apiToken = process.env.VITE_BRAINCLOUD_API_TOKEN || "";
    this.initialized = false;
    this.sessionId = null;
  }

  /**
   * Faz uma chamada MCP via HTTP (Server-Sent Events)
   */
  async _mcpRequest(method, params = null) {
    try {
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${this.apiToken}`,
      };

      // Adiciona session ID se disponível (exceto para initialize)
      if (this.sessionId && method !== "initialize") {
        headers["mcp-session-id"] = this.sessionId;
      }

      const payload = {
        jsonrpc: "2.0",
        method,
        id: Date.now(),
      };

      // Só adiciona params se fornecido
      if (params !== null) {
        payload.params = params;
      }

      // Log debug
      logger.debug("MCP Request", {
        method,
        headers: { ...headers, Authorization: "Bearer ***" },
        payload,
      });

      const response = await fetch(this.mcpUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`MCP request failed: ${response.status}`);
      }

      // Parse SSE response
      const text = await response.text();

      // O servidor retorna Server-Sent Events no formato:
      // event: message
      // data: {"jsonrpc":"2.0","id":1,"result":{...}}
      const lines = text.split("\n");
      let dataLine = null;

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          dataLine = line.substring(6);
          break;
        }
      }

      if (!dataLine) {
        throw new Error("No data in SSE response");
      }

      const jsonResponse = JSON.parse(dataLine);

      // Log debug da resposta
      logger.debug("MCP Response", {
        method,
        hasError: !!jsonResponse.error,
        error: jsonResponse.error,
        resultKeys: jsonResponse.result ? Object.keys(jsonResponse.result) : [],
      });

      if (jsonResponse.error) {
        throw new Error(
          jsonResponse.error.message || jsonResponse.error.data || "MCP error"
        );
      }

      return jsonResponse.result;
    } catch (error) {
      logger.error("Erro na requisição MCP", {
        method,
        params,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Inicializa a conexão MCP
   */
  async initialize() {
    try {
      // Faz a requisição e captura o sessionId da resposta
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${this.apiToken}`,
      };

      const response = await fetch(this.mcpUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: {
              name: "ceo-dashboard",
              version: "1.0.0",
            },
          },
          id: Date.now(),
        }),
      });

      // Captura session ID do header da resposta
      const sessionId = response.headers.get("mcp-session-id");
      if (sessionId) {
        this.sessionId = sessionId;
      }

      const text = await response.text();
      const lines = text.split("\n");
      let dataLine = null;

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          dataLine = line.substring(6);
          break;
        }
      }

      if (!dataLine) {
        throw new Error("No data in initialize response");
      }

      const jsonResponse = JSON.parse(dataLine);
      const result = jsonResponse.result;

      this.initialized = true;
      logger.info("Brain Cloud MCP inicializado", {
        serverInfo: result.serverInfo,
        sessionId: this.sessionId,
      });

      return true;
    } catch (error) {
      logger.error("Erro ao inicializar MCP", {
        error: error.message,
      });
      this.initialized = false;
      this.sessionId = null;
      return false;
    }
  }

  /**
   * Verifica status do vault
   */
  async getVaultStatus() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      return {
        connected: this.initialized,
        url: this.mcpUrl,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
      };
    } catch (error) {
      return {
        connected: false,
        url: this.mcpUrl,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Busca semântica no vault
   */
  async semanticSearch(query, limit = 5) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await this._mcpRequest("tools/call", {
        name: "semantic_search",
        arguments: {
          query,
          limit,
        },
      });

      logger.info("Semantic search executada", {
        query,
        resultsCount: result.content?.length || 0,
      });

      return result;
    } catch (error) {
      logger.error("Erro ao executar semantic search", {
        error: error.message,
        query,
      });
      throw error;
    }
  }

  /**
   * Busca arquivos por texto
   */
  async searchFiles(query, caseSensitive = false) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await this._mcpRequest("tools/call", {
        name: "search_files",
        arguments: {
          query,
          case_sensitive: caseSensitive,
          file_extensions: [".md", ".txt"],
        },
      });

      return result;
    } catch (error) {
      logger.error("Erro ao buscar arquivos", {
        error: error.message,
        query,
      });
      throw error;
    }
  }

  /**
   * Obtém dados do grafo de conhecimento
   */
  async getGraphData(directory = "", includeOrphans = true) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await this._mcpRequest("tools/call", {
        name: "get_graph_data",
        arguments: {
          directory,
          include_orphans: includeOrphans,
          include_unresolved: true,
        },
      });

      return result;
    } catch (error) {
      logger.error("Erro ao obter grafo", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Obtém foco atual (notas diárias + semanal)
   */
  async getCurrentFocus() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await this._mcpRequest("tools/call", {
        name: "get_current_focus",
        arguments: {
          daily_limit: 3,
          include_weekly: true,
        },
      });

      return result;
    } catch (error) {
      logger.error("Erro ao obter foco", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Obtém tarefas com prazo
   */
  async getDueTasks(window = "all", includeCompleted = false) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await this._mcpRequest("tools/call", {
        name: "get_due_tasks",
        arguments: {
          window,
          include_completed: includeCompleted,
          include_tasks: true,
          include_frontmatter: true,
        },
      });

      return result;
    } catch (error) {
      logger.error("Erro ao obter tarefas", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Salva histórico de conversa
   */
  async saveConversation(conversationId, messages, metadata = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await this._mcpRequest("tools/call", {
        name: "save_conversation_history",
        arguments: {
          source: "claude",
          conversation_id: conversationId,
          messages,
          metadata,
          auto_tag: true,
        },
      });

      logger.info("Conversa salva no Brain Cloud", {
        conversationId,
        messageCount: messages.length,
      });

      return result;
    } catch (error) {
      logger.error("Erro ao salvar conversa", {
        error: error.message,
        conversationId,
      });
      throw error;
    }
  }

  /**
   * Busca em conversas históricas
   */
  async searchConversations(query, limit = 5) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await this._mcpRequest("tools/call", {
        name: "search_conversation_history",
        arguments: {
          query,
          limit,
          return_full_context: false,
        },
      });

      return result;
    } catch (error) {
      logger.error("Erro ao buscar conversas", {
        error: error.message,
        query,
      });
      throw error;
    }
  }

  /**
   * Obtém contexto histórico
   */
  async getHistoricalContext(query, limit = 5) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await this._mcpRequest("tools/call", {
        name: "get_historical_context",
        arguments: {
          query,
          limit,
        },
      });

      return result;
    } catch (error) {
      logger.error("Erro ao obter contexto histórico", {
        error: error.message,
        query,
      });
      throw error;
    }
  }
}

// Exporta uma instância única do serviço
const brainCloudService = new BrainCloudService();

export default brainCloudService;
