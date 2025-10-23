/**
 * Brain Cloud Hybrid Service
 *
 * Serviço inteligente que roteia chamadas entre REST API e MCP protocol
 * baseado no tipo de chamador e contexto da requisição.
 *
 * ARQUITETURA HÍBRIDA:
 * ┌────────────────────────────────────────────────────────┐
 * │                  Brain Cloud Hybrid                    │
 * │                                                         │
 * │  ┌────────────┐                      ┌──────────────┐ │
 * │  │  Web App   │ ──REST──>           │  AI Agents   │ │
 * │  │ Dashboard  │                     │   (Claude)   │ │
 * │  └────────────┘                      └──────────────┘ │
 * │        │                                     │         │
 * │        v                                     v         │
 * │  ┌────────────┐                      ┌──────────────┐ │
 * │  │  REST API  │                     │  MCP Tools    │ │
 * │  │  Cliente   │                     │  Nativas      │ │
 * │  └────────────┘                      └──────────────┘ │
 * │        │                                     │         │
 * │        └─────────────────┬───────────────────┘         │
 * │                          v                             │
 * │              Obsidian Brain Cloud                      │
 * │           https://obsidian-mcp.ggailabs.com           │
 * └────────────────────────────────────────────────────────┘
 *
 * QUANDO USAR CADA UM:
 * - REST: Aplicações web, dashboard, requisições HTTP
 * - MCP: Agentes IA (Claude, GPT), contexto semântico, operações complexas
 */

import brainCloudREST from "./brainCloudREST.js";
import brainCloudMCP from "./brainCloudMCP.js";
import { logger } from "../src/utils/logger.js";

logger.warn(
  "[DEPRECATED] brainCloudHybrid.js será descontinuado em breve. Utilize server/services/brainCloud/BrainCloudService.ts conforme documento docs/BRAIN_CLOUD_MIGRATION_GUIDE.md."
);

console.warn(
  "\n⚠️  WARNING: Você está utilizando brainCloudHybrid (deprecated). Migre para BrainCloudService v2.0 – consulte docs/BRAIN_CLOUD_MIGRATION_GUIDE.md.\n"
);

class BrainCloudHybrid {
  constructor() {
    this.restService = brainCloudREST;
    this.mcpService = brainCloudMCP;
    this.preferredMode = "auto"; // auto, rest, mcp

    console.warn(
      "\n⚠️  WARNING: brainCloudHybrid será removido na Sprint 4. Migre para BrainCloudService v2.0 (docs/BRAIN_CLOUD_MIGRATION_GUIDE.md).\n"
    );
  }

  /**
   * Detecta o tipo de chamador baseado no contexto
   * @param {Object} context - Contexto da requisição (req, headers, etc)
   * @returns {string} - 'rest' ou 'mcp'
   */
  detectCallerType(context = {}) {
    // Se for uma requisição HTTP Express, usa REST
    if (context.req && context.req.headers) {
      return "rest";
    }

    // Se tiver um agentId ou indicação de agente IA
    if (context.agentId || context.isAgent) {
      return "mcp";
    }

    // Por padrão, usa REST para aplicações web
    return "rest";
  }

  /**
   * Decide qual serviço usar baseado no contexto e modo preferido
   */
  selectService(context = {}) {
    if (this.preferredMode === "rest") {
      return this.restService;
    }

    if (this.preferredMode === "mcp") {
      return this.mcpService;
    }

    // Modo auto: detecta automaticamente
    const callerType = this.detectCallerType(context);
    logger.info(
      `Brain Cloud Hybrid: Usando ${callerType.toUpperCase()} para esta chamada`
    );

    return callerType === "mcp" ? this.mcpService : this.restService;
  }

  /**
   * Define o modo de operação (auto, rest, mcp)
   */
  setMode(mode) {
    if (!["auto", "rest", "mcp"].includes(mode)) {
      throw new Error("Modo inválido. Use: auto, rest ou mcp");
    }
    this.preferredMode = mode;
    logger.info(`Brain Cloud Hybrid: Modo alterado para ${mode.toUpperCase()}`);
  }

  /**
   * Verifica status de conexão de ambos os serviços
   */
  async checkConnection(context = {}) {
    try {
      const service = this.selectService(context);
      const status = await service.checkConnection();

      return {
        ...status,
        hybrid: true,
        mode: this.preferredMode,
        selectedService: service === this.restService ? "REST" : "MCP",
      };
    } catch (error) {
      logger.error("Erro ao verificar conexão híbrida:", error);
      return {
        connected: false,
        error: error.message,
        hybrid: true,
        mode: this.preferredMode,
      };
    }
  }

  /**
   * Busca semântica (evitar - causa regeneração de índice)
   */
  async semanticSearch(query, limit = 5, context = {}) {
    try {
      const service = this.selectService(context);
      return await service.semanticSearch(query, { limit });
    } catch (error) {
      logger.error("Erro na busca semântica híbrida:", error);
      throw error;
    }
  }

  /**
   * Obtém dados do grafo de conhecimento
   */
  async getGraphData(options = {}, context = {}) {
    try {
      const service = this.selectService(context);
      return await service.getGraphData(options);
    } catch (error) {
      logger.error("Erro ao obter graph data híbrido:", error);
      throw error;
    }
  }

  /**
   * Obtém o foco atual (notas diárias + semanal)
   */
  async getCurrentFocus(options = {}, context = {}) {
    try {
      const service = this.selectService(context);
      return await service.getCurrentFocus(options);
    } catch (error) {
      logger.error("Erro ao obter current focus híbrido:", error);
      throw error;
    }
  }

  /**
   * Obtém tarefas com prazo
   */
  async getDueTasks(options = {}, context = {}) {
    try {
      const service = this.selectService(context);
      return await service.getDueTasks(options);
    } catch (error) {
      logger.error("Erro ao obter due tasks híbrido:", error);
      throw error;
    }
  }

  /**
   * Obtém estrutura do vault (somente MCP - não tem equivalente REST direto)
   */
  async getVaultTree(options = {}, context = {}) {
    try {
      logger.info(
        "getVaultTree: Forçando MCP (não tem equivalente REST direto)"
      );

      // Sempre usa MCP para esta operação
      return await this.mcpService.getVaultTree(options);
    } catch (error) {
      logger.error("Erro ao obter vault tree híbrido:", error);
      throw error;
    }
  }

  /**
   * Lê conteúdo de arquivo (somente MCP)
   */
  async getFileContents(filepath, context = {}) {
    try {
      logger.info("getFileContents: Forçando MCP (não tem equivalente REST)");

      // Sempre usa MCP para esta operação
      return await this.mcpService.getFileContents(filepath);
    } catch (error) {
      logger.error("Erro ao obter file contents híbrido:", error);
      throw error;
    }
  }

  /**
   * Obtém tags principais do vault (somente MCP)
   */
  async getMainTags(limit = 10, context = {}) {
    try {
      logger.info("getMainTags: Forçando MCP (não tem equivalente REST)");

      // Sempre usa MCP para esta operação
      return await this.mcpService.getMainTags(limit);
    } catch (error) {
      logger.error("Erro ao obter main tags híbrido:", error);
      throw error;
    }
  }

  /**
   * Obtém links principais do vault (somente MCP)
   */
  async getMainLinks(limit = 10, context = {}) {
    try {
      logger.info("getMainLinks: Forçando MCP (não tem equivalente REST)");

      // Sempre usa MCP para esta operação
      return await this.mcpService.getMainLinks(limit);
    } catch (error) {
      logger.error("Erro ao obter main links híbrido:", error);
      throw error;
    }
  }

  /**
   * Busca de texto simples (somente MCP)
   */
  async searchFiles(query, options = {}, context = {}) {
    try {
      logger.info("searchFiles: Forçando MCP (não tem equivalente REST)");

      // Sempre usa MCP para esta operação
      return await this.mcpService.searchFiles(query, options);
    } catch (error) {
      logger.error("Erro ao buscar arquivos híbrido:", error);
      throw error;
    }
  }

  /**
   * Obtém contexto temporal (somente MCP)
   */
  async getTimeBasedContext(options = {}, context = {}) {
    try {
      logger.info(
        "getTimeBasedContext: Forçando MCP (não tem equivalente REST)"
      );

      // Sempre usa MCP para esta operação
      return await this.mcpService.getTimeBasedContext(options);
    } catch (error) {
      logger.error("Erro ao obter contexto temporal híbrido:", error);
      throw error;
    }
  }

  /**
   * Lista recursos MCP disponíveis (somente MCP)
   */
  async listResources(context = {}) {
    try {
      logger.info("listResources: Forçando MCP (específico do protocolo)");

      // Sempre usa MCP para esta operação
      return await this.mcpService.listResources();
    } catch (error) {
      logger.error("Erro ao listar recursos híbrido:", error);
      throw error;
    }
  }

  /**
   * Obtém ajuda sobre ferramentas MCP (somente MCP)
   */
  async getHelp(category = null, context = {}) {
    try {
      logger.info("getHelp: Forçando MCP (específico do protocolo)");

      // Sempre usa MCP para esta operação
      return await this.mcpService.getHelp(category);
    } catch (error) {
      logger.error("Erro ao obter ajuda híbrida:", error);
      throw error;
    }
  }

  /**
   * Retorna informações sobre o serviço híbrido
   */
  getInfo() {
    return {
      service: "Brain Cloud Hybrid",
      version: "1.0.0",
      mode: this.preferredMode,
      availableServices: {
        rest: {
          name: "REST API",
          description: "API HTTP tradicional para aplicações web",
          bestFor: ["Dashboard", "Requisições HTTP", "Integrações web"],
        },
        mcp: {
          name: "Model Context Protocol",
          description: "Protocolo rico para agentes IA",
          bestFor: ["Claude AI", "Agentes autônomos", "Contexto semântico"],
          note: "Ferramentas MCP só funcionam em ambientes com suporte MCP",
        },
      },
      routing: {
        auto: "Detecta automaticamente o tipo de chamador",
        rest: "Força uso da REST API",
        mcp: "Força uso do protocolo MCP (pode não funcionar fora de agentes IA)",
      },
    };
  }

  /**
   * Salva histórico de conversação no Brain Cloud
   * @param {Object} conversationData - Dados da conversação
   * @returns {Promise<Object>}
   */
  async saveConversationHistory(conversationData) {
    try {
      logger.info("Salvando conversação no Brain Cloud...");
      
      // Para agora, vamos implementar via REST API
      // Futuramente podemos usar MCP se já estiver em contexto MCP
      const { conversation_id, messages, metadata } = conversationData;
      const result = await this.restService.saveConversation(conversation_id, messages, metadata);
      
      logger.info("Conversação salva com sucesso:", result);
      return result;
    } catch (error) {
      logger.error("Erro ao salvar conversação:", error);
      throw error;
    }
  }

  /**
   * Busca em conversas históricas
   * @param {Object} params - Parâmetros da busca
   * @returns {Promise<Object>}
   */
  async searchConversations(params) {
    try {
      logger.info("Buscando conversas históricas...");
      
      const { query, limit = 5, return_full_context = false, filters = {} } = params;
      
      // Para busca de conversas, usamos REST API
      const result = await this.restService.searchConversations(query, limit, return_full_context);
      
      logger.info("Conversas encontradas:", {
        query,
        limit,
        resultsCount: result.results?.length || 0
      });
      
      return result;
    } catch (error) {
      logger.error("Erro ao buscar conversas:", {
        error: error.message,
        query: params.query
      });
      throw error;
    }
  }
}

export default new BrainCloudHybrid();
