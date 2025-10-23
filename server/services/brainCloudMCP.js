/**
 * Brain Cloud MCP Service
 *
 * Este serviço usa o protocolo MCP (Model Context Protocol) para interagir
 * com o Obsidian Brain Cloud de forma mais inteligente e eficiente,
 * especialmente para agentes de IA.
 *
 * Diferenças MCP vs REST:
 * - MCP: Protocolo mais rico, suporta recursos, prompts e ferramentas
 * - REST: API tradicional HTTP, mais simples mas menos contextual
 * - MCP é preferível para agentes IA que precisam de contexto semântico
 *
 * IMPORTANTE: Este serviço é um PROXY que encapsula chamadas para ferramentas MCP
 * disponíveis no ambiente. Ele NÃO faz chamadas HTTP diretas ao servidor MCP.
 */

import { logger } from "../src/utils/logger.js";

logger.warn(
  "[DEPRECATED] brainCloudMCP.js será consolidado no BrainCloudService.ts. Consulte docs/BRAIN_CLOUD_MIGRATION_GUIDE.md para detalhes."
);

console.warn(
  "\n⚠️  WARNING: brainCloudMCP está obsoleto. Migre para BrainCloudService v2.0 conforme docs/BRAIN_CLOUD_MIGRATION_GUIDE.md.\n"
);

class BrainCloudMCP {
  constructor() {
    this.mcpServerName = "obsidian-brain-cloud";
    this.connected = true; // Ferramentas MCP estão disponíveis no ambiente
    this.baseUrl =
      process.env.VITE_BRAINCLOUD_BASE_URL ||
      "https://obsidian-mcp.ggailabs.com";

    console.warn(
      "\n⚠️  WARNING: brainCloudMCP será removido na Sprint 4. Utilize BrainCloudService v2.0.\n"
    );
  }

  /**
   * Verifica se o serviço MCP está disponível
   */
  async checkConnection() {
    try {
      logger.info("MCP: Verificando conexão...");

      // As ferramentas MCP estão disponíveis através do SDK Claude
      // Este serviço é um wrapper/proxy para uso no backend
      return {
        connected: true,
        server: this.mcpServerName,
        protocol: "MCP",
        baseUrl: this.baseUrl,
        note: "MCP tools disponíveis através do Claude SDK",
      };
    } catch (error) {
      logger.error("Erro ao verificar conexão MCP:", error);
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  /**
   * Obtém a estrutura hierárquica do vault
   * Usa MCP para contexto mais rico que REST
   */
  async getVaultTree(options = {}) {
    const {
      depth = 3,
      maxEntries = 50,
      directory = "",
      includeFiles = true,
      includeDirs = true,
    } = options;

    try {
      logger.info("MCP: Solicitando vault tree", {
        depth,
        maxEntries,
        directory,
      });

      // Nota: Este método deve ser chamado por agentes IA que têm acesso direto às ferramentas MCP
      // Para uso no backend web, use REST API em vez disso

      return {
        success: false,
        message:
          "Este método só está disponível para agentes IA com acesso MCP",
        fallback: "Use brainCloudREST.getGraphData() para aplicações web",
        tool_name: "mcp__obsidian-brain-cloud__get_vault_tree",
        params: {
          depth,
          max_entries: maxEntries,
          directory,
          include_files: includeFiles,
          include_dirs: includeDirs,
        },
      };
    } catch (error) {
      logger.error("Erro ao obter vault tree via MCP:", error);
      throw error;
    }
  }

  /**
   * Obtém dados do grafo de conhecimento
   * MCP retorna metadados mais ricos que REST
   */
  async getGraphData(options = {}) {
    const {
      directory = "",
      includeOrphans = true,
      includeUnresolved = false,
      maxNodes = 100,
      maxEdges = 200,
      resolveTitles = true,
    } = options;

    try {
      logger.info("MCP: Solicitando graph data", options);

      return {
        success: false,
        message:
          "Este método só está disponível para agentes IA com acesso MCP",
        fallback: "Use brainCloudREST.getGraphData() para aplicações web",
        tool_name: "mcp__obsidian-brain-cloud__get_graph_data",
        params: {
          directory,
          include_orphans: includeOrphans,
          include_unresolved: includeUnresolved,
          max_nodes: maxNodes,
          max_edges: maxEdges,
          resolve_titles: resolveTitles,
        },
      };
    } catch (error) {
      logger.error("Erro ao obter graph data via MCP:", error);
      throw error;
    }
  }

  /**
   * Obtém o foco atual (notas diárias + semanal)
   * MCP pode fornecer contexto temporal mais rico
   */
  async getCurrentFocus(options = {}) {
    const {
      dailyDirectory = "5 - INSIGHTS-IA/Daily",
      dailyLimit = 3,
      includeWeekly = true,
      weeklyPath = "5 - INSIGHTS-IA/FOCO-SEMANAL.md",
    } = options;

    try {
      logger.info("MCP: Solicitando current focus", options);

      return {
        success: false,
        message:
          "Este método só está disponível para agentes IA com acesso MCP",
        fallback: "Use brainCloudREST.getCurrentFocus() para aplicações web",
        tool_name: "mcp__obsidian-brain-cloud__get_current_focus",
        params: {
          daily_directory: dailyDirectory,
          daily_limit: dailyLimit,
          include_weekly: includeWeekly,
          weekly_path: weeklyPath,
        },
      };
    } catch (error) {
      logger.error("Erro ao obter current focus via MCP:", error);
      throw error;
    }
  }

  /**
   * Obtém tarefas com prazo
   * MCP pode fornecer análise contextual das tarefas
   */
  async getDueTasks(options = {}) {
    const {
      window = "week",
      includeCompleted = false,
      includeFrontmatter = true,
      includeTasks = true,
      priority = null,
      status = null,
      directories = null,
      limit = null,
      sortBy = "date",
    } = options;

    try {
      logger.info("MCP: Solicitando due tasks", options);

      return {
        success: false,
        message:
          "Este método só está disponível para agentes IA com acesso MCP",
        fallback: "Use brainCloudREST.getDueTasks() para aplicações web",
        tool_name: "mcp__obsidian-brain-cloud__get_due_tasks",
        params: {
          window,
          include_completed: includeCompleted,
          include_frontmatter: includeFrontmatter,
          include_tasks: includeTasks,
          priority,
          status,
          directories,
          limit,
          sort_by: sortBy,
        },
      };
    } catch (error) {
      logger.error("Erro ao obter due tasks via MCP:", error);
      throw error;
    }
  }

  /**
   * Busca semântica (EVITAR se possível - causa regeneração de índice)
   * Use apenas quando absolutamente necessário
   */
  async semanticSearch(query, options = {}) {
    logger.warn(
      "⚠️ Busca semântica via MCP pode causar regeneração de índice vetorial"
    );

    const { limit = 5 } = options;

    try {
      logger.info("MCP: Solicitando semantic search", { query, limit });

      return {
        success: false,
        message:
          "Semantic search via MCP desabilitada - causa regeneração de índice",
        warning: "Esta operação pode travar o servidor Brain Cloud",
        fallback:
          "Use brainCloudREST.semanticSearch() se absolutamente necessário",
        tool_name: "mcp__obsidian-brain-cloud__semantic_search",
        params: { query, limit },
      };
    } catch (error) {
      logger.error("Erro ao realizar busca semântica via MCP:", error);
      throw error;
    }
  }

  /**
   * Lê conteúdo de um arquivo específico
   * MCP pode retornar metadados adicionais
   */
  async getFileContents(filepath) {
    try {
      logger.info("MCP: Solicitando file contents", { filepath });

      return {
        success: false,
        message:
          "Este método só está disponível para agentes IA com acesso MCP",
        fallback: "Não há equivalente REST - use MCP tools diretamente",
        tool_name: "mcp__obsidian-brain-cloud__get_file_contents",
        params: { filepath },
      };
    } catch (error) {
      logger.error("Erro ao obter file contents via MCP:", error);
      throw error;
    }
  }

  /**
   * Obtém resumo do sistema (tags, links mais usados)
   */
  async getMainTags(limit = 10) {
    try {
      logger.info("MCP: Solicitando main tags", { limit });

      return {
        success: false,
        message:
          "Este método só está disponível para agentes IA com acesso MCP",
        tool_name: "mcp__obsidian-brain-cloud__get_main_tags",
        params: { limit },
      };
    } catch (error) {
      logger.error("Erro ao obter main tags via MCP:", error);
      throw error;
    }
  }

  /**
   * Obtém links mais referenciados
   */
  async getMainLinks(limit = 10) {
    try {
      logger.info("MCP: Solicitando main links", { limit });

      return {
        success: false,
        message:
          "Este método só está disponível para agentes IA com acesso MCP",
        tool_name: "mcp__obsidian-brain-cloud__get_main_links",
        params: { limit },
      };
    } catch (error) {
      logger.error("Erro ao obter main links via MCP:", error);
      throw error;
    }
  }

  /**
   * Busca de texto simples (não usa embeddings)
   */
  async searchFiles(query, options = {}) {
    const { caseSensitive = false, fileExtensions = [".md", ".txt"] } = options;

    try {
      logger.info("MCP: Solicitando search files", {
        query,
        caseSensitive,
        fileExtensions,
      });

      return {
        success: false,
        message:
          "Este método só está disponível para agentes IA com acesso MCP",
        tool_name: "mcp__obsidian-brain-cloud__search_files",
        params: {
          query,
          case_sensitive: caseSensitive,
          file_extensions: fileExtensions,
        },
      };
    } catch (error) {
      logger.error("Erro ao buscar arquivos via MCP:", error);
      throw error;
    }
  }

  /**
   * Obtém contexto baseado em tempo (diário/semanal)
   */
  async getTimeBasedContext(options = {}) {
    const {
      recentDays = 3,
      referenceDate = "today",
      upcomingWindow = "week",
    } = options;

    try {
      logger.info("MCP: Solicitando time-based context", options);

      return {
        success: false,
        message:
          "Este método só está disponível para agentes IA com acesso MCP",
        tool_name: "mcp__obsidian-brain-cloud__get_time_based_context",
        params: {
          recent_days: recentDays,
          reference_date: referenceDate,
          upcoming_window: upcomingWindow,
        },
      };
    } catch (error) {
      logger.error("Erro ao obter contexto temporal via MCP:", error);
      throw error;
    }
  }

  /**
   * Lista recursos MCP disponíveis
   */
  async listResources() {
    try {
      logger.info("MCP: Listando recursos disponíveis");

      return {
        success: false,
        message:
          "Este método só está disponível para agentes IA com acesso MCP",
        tool_name: "mcp__obsidian-brain-cloud__list_resources_tool",
        params: {},
      };
    } catch (error) {
      logger.error("Erro ao listar recursos MCP:", error);
      throw error;
    }
  }

  /**
   * Obtém ajuda sobre ferramentas MCP
   */
  async getHelp(category = null) {
    try {
      logger.info("MCP: Solicitando ajuda", { category });

      return {
        success: false,
        message:
          "Este método só está disponível para agentes IA com acesso MCP",
        tool_name: "mcp__obsidian-brain-cloud__get_help_tool",
        params: { category },
      };
    } catch (error) {
      logger.error("Erro ao obter ajuda MCP:", error);
      throw error;
    }
  }
}

export default new BrainCloudMCP();
