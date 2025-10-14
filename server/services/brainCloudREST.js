/**
 * Brain Cloud REST Service
 *
 * Usa a API REST do Obsidian Brain Cloud (nuvem)
 * https://obsidian-mcp.ggailabs.com
 */

import fetch from "node-fetch";
import { logger } from "../src/utils/logger.js";

class BrainCloudREST {
  constructor() {
    this.baseUrl =
      process.env.VITE_BRAINCLOUD_BASE_URL ||
      "https://obsidian-mcp.ggailabs.com";
    this.apiToken = process.env.VITE_BRAINCLOUD_API_TOKEN || "";
    this.connected = false;
  }

  /**
   * Verifica se o serviço REST está disponível
   */
  async checkConnection() {
    try {
      const status = await this.getVaultStatus();
      this.connected = true;
      return {
        connected: true,
        protocol: "REST",
        baseUrl: this.baseUrl,
        ...status,
      };
    } catch (error) {
      logger.error("Erro ao verificar conexão REST:", error);
      this.connected = false;
      return {
        connected: false,
        protocol: "REST",
        error: error.message,
      };
    }
  }

  /**
   * Faz uma requisição REST à API
   */
  async _request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiToken}`,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API request failed: ${response.status} - ${error}`);
      }

      return response.json();
    } catch (error) {
      logger.error("Erro na requisição REST", {
        endpoint,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Verifica status da API
   */
  async getVaultStatus() {
    try {
      const health = await this._request("/api/v1/health");
      this.connected = health.status === "healthy";

      return {
        connected: this.connected,
        url: this.baseUrl,
        timestamp: new Date().toISOString(),
        vault: health.vault_path,
        version: health.version,
      };
    } catch (error) {
      return {
        connected: false,
        url: this.baseUrl,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Busca semântica no vault
   * POST /api/v1/search/complex (ou /api/v1/search/ para texto simples)
   */
  async semanticSearch(query, limit = 5) {
    try {
      // Usa busca simples por enquanto
      const result = await this._request("/api/v1/search/", {
        method: "POST",
        body: JSON.stringify({
          query,
        }),
      });

      logger.info("Search executada", {
        query,
        resultsCount: result.results?.length || 0,
      });

      return result;
    } catch (error) {
      logger.error("Erro ao executar search", {
        error: error.message,
        query,
      });
      throw error;
    }
  }

  /**
   * Busca arquivos por texto
   * POST /api/v1/search/
   */
  async searchFiles(query, caseSensitive = false) {
    try {
      const result = await this._request("/api/v1/search/", {
        method: "POST",
        body: JSON.stringify({
          query,
          case_sensitive: caseSensitive,
        }),
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
   * GET /api/v1/vault/graph
   */
  async getGraphData(options = {}) {
    try {
      // Aceita tanto objeto quanto parâmetros antigos
      const directory =
        typeof options === "object" ? options.directory || "" : options;
      const includeOrphans =
        typeof options === "object"
          ? options.includeOrphans !== undefined
            ? options.includeOrphans
            : true
          : arguments[1] !== undefined
          ? arguments[1]
          : true;

      const params = new URLSearchParams({
        directory,
        include_orphans: includeOrphans.toString(),
      });

      const result = await this._request(`/api/v1/vault/graph?${params}`);

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
   * GET /api/v1/focus/current
   */
  async getCurrentFocus() {
    try {
      const result = await this._request("/api/v1/focus/current");

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
   * GET /api/v1/tasks/due
   */
  async getDueTasks(options = {}) {
    try {
      // Aceita tanto objeto quanto parâmetros antigos
      const window =
        typeof options === "object"
          ? options.window || "all"
          : options || "all";
      const includeCompleted =
        typeof options === "object"
          ? options.includeCompleted !== undefined
            ? options.includeCompleted
            : false
          : arguments[1] !== undefined
          ? arguments[1]
          : false;

      const params = new URLSearchParams({
        window,
        include_completed: includeCompleted.toString(),
      });

      const result = await this._request(`/api/v1/tasks/due?${params}`);

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
   * POST /api/v1/memory/conversation/save
   */
  async saveConversation(conversationId, messages, metadata = {}) {
    try {
      const result = await this._request("/api/v1/memory/conversation/save", {
        method: "POST",
        body: JSON.stringify({
          source: "ceo-dashboard",
          conversation_id: conversationId,
          messages,
          metadata,
          auto_tag: true,
        }),
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
   * POST /api/v1/memory/conversation/search
   */
  async searchConversations(query, limit = 5) {
    try {
      const result = await this._request("/api/v1/memory/conversation/search", {
        method: "POST",
        body: JSON.stringify({
          query,
          limit,
          return_full_context: false,
        }),
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
   * POST /api/v1/memory/historical
   */
  async getHistoricalContext(query, limit = 5) {
    try {
      const result = await this._request("/api/v1/memory/historical", {
        method: "POST",
        body: JSON.stringify({
          query,
          limit,
        }),
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

  /**
   * Obtém contexto temporal
   * GET /api/v1/context/time
   */
  async getTimeContext() {
    try {
      const result = await this._request("/api/v1/context/time");
      return result;
    } catch (error) {
      logger.error("Erro ao obter contexto temporal", {
        error: error.message,
      });
      throw error;
    }
  }
}

// Exporta uma instância única do serviço
const brainCloudREST = new BrainCloudREST();

export default brainCloudREST;
