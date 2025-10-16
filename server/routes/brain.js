/**
 * Brain Cloud Routes
 *
 * Endpoints para integração com Obsidian Brain Cloud
 *
 * ARQUITETURA HÍBRIDA:
 * - Usa serviço híbrido que detecta automaticamente o tipo de chamador
 * - REST API para requisições HTTP tradicionais (dashboard web)
 * - MCP tools para agentes IA (Claude, GPT) quando aplicável
 *
 * O serviço híbrido decide automaticamente qual usar baseado no contexto.
 */

import express from "express";
import brainCloudHybrid from "../services/brainCloudHybrid.js";
import { logger } from "../src/utils/logger.js";

const router = express.Router();

// Usa serviço híbrido que roteia automaticamente entre REST e MCP
const brainService = brainCloudHybrid;

/**
 * GET /api/brain/status
 * Verifica status da conexão com Brain Cloud
 */
router.get("/status", async (req, res) => {
  try {
    // Passa contexto da requisição para roteamento híbrido
    const status = await brainService.checkConnection({ req });
    res.json(status);
  } catch (error) {
    logger.error("Erro ao obter status do Brain Cloud", {
      error: error.message,
    });
    res.status(503).json({
      connected: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/brain/info
 * Retorna informações sobre o serviço híbrido
 */
router.get("/info", async (req, res) => {
  try {
    const info = brainService.getInfo();
    res.json(info);
  } catch (error) {
    logger.error("Erro ao obter informações do Brain Cloud", {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/brain/search
 * Busca semântica no vault
 */
router.post("/search", async (req, res) => {
  try {
    const { query, limit = 5 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Query is required",
      });
    }

    const results = await brainService.semanticSearch(query, limit, { req });

    res.json({
      success: true,
      query,
      results,
    });
  } catch (error) {
    logger.error("Erro na busca semântica", {
      error: error.message,
      query: req.body.query,
    });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/brain/graph
 * Obtém dados do grafo de conhecimento
 */
router.get("/graph", async (req, res) => {
  try {
    const { directory = "", includeOrphans = true } = req.query;

    const graphData = await brainService.getGraphData(
      {
        directory,
        includeOrphans: includeOrphans === "true",
      },
      { req }
    );

    res.json({
      success: true,
      ...graphData,
    });
  } catch (error) {
    logger.error("Erro ao obter grafo", {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/brain/focus
 * Obtém foco atual (notas diárias + semanal)
 */
router.get("/focus", async (req, res) => {
  try {
    const focus = await brainService.getCurrentFocus({}, { req });

    res.json({
      success: true,
      ...focus,
    });
  } catch (error) {
    logger.error("Erro ao obter foco", {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/brain/tasks
 * Obtém tarefas com prazo do Obsidian
 */
router.get("/tasks", async (req, res) => {
  try {
    const { window = "all", includeCompleted = false } = req.query;

    const tasks = await brainService.getDueTasks(
      {
        window,
        includeCompleted: includeCompleted === "true",
      },
      { req }
    );

    res.json({
      success: true,
      ...tasks,
    });
  } catch (error) {
    logger.error("Erro ao obter tarefas", {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/brain/context
 * Obtém contexto histórico para query
 */
router.post("/context", async (req, res) => {
  try {
    const { query, limit = 5 } = req.body;

    const context = await brainService.getHistoricalContext(
      {
        query,
        limit,
      },
      { req }
    );

    res.json({
      success: true,
      ...context,
    });
  } catch (error) {
    logger.error("Erro ao obter contexto histórico", {
      error: error.message,
      query: req.body.query,
    });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/brain/conversation/save
 * Salva histórico de conversa
 */
router.post("/conversation/save", async (req, res) => {
  try {
    const {
      source,
      conversation_id,
      messages,
      metadata = {},
      chunking_strategy = "auto",
      auto_tag = true,
      save_to_vault = null
    } = req.body;

    if (!conversation_id || !messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: "conversation_id and messages are required",
      });
    }

    const result = await brainService.saveConversationHistory({
      source,
      conversation_id,
      messages,
      metadata,
      chunking_strategy,
      auto_tag,
      save_to_vault,
    }, { req });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error("Erro ao salvar conversa", {
      error: error.message,
      conversation_id: req.body.conversation_id,
    });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/brain/conversation/search
 * Busca em conversas históricas
 */
router.post("/conversation/search", async (req, res) => {
  try {
    const {
      query,
      limit = 5,
      return_full_context = false,
      filters = {}
    } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Query is required",
      });
    }

    const results = await brainService.searchConversations({
      query,
      limit,
      return_full_context,
      filters,
    }, { req });

    res.json({
      success: true,
      ...results,
    });
  } catch (error) {
    logger.error("Erro ao buscar conversas", {
      error: error.message,
      query: req.body.query,
    });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/brain/conversations/recent
 * Busca conversas recentes para o histórico
 */
router.get("/conversations/recent", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Para buscar conversas recentes sem query específica, usamos "." como query
    const results = await brainService.searchConversations({
      query: "conversas", // Query genérica para buscar conversas recentes
      limit,
      return_full_context: false,
      filters: {
        recent_days: 30 // Últimos 30 dias
      }
    }, { req });

    res.json({
      success: true,
      conversations: results.results || [],
      total: results.results?.length || 0
    });
  } catch (error) {
    logger.error("Erro ao buscar conversas recentes", {
      error: error.message,
      limit: req.query.limit
    });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/brain/conversation/:id
 * Busca uma conversa específica pelo ID
 */
router.get("/conversation/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const results = await brainService.searchConversations({
      query: "",
      limit: 100,
      return_full_context: true,
      filters: {
        conversation_id: id
      }
    }, { req });

    res.json({
      success: true,
      conversation: results.results || [],
      total: results.results?.length || 0
    });
  } catch (error) {
    logger.error("Erro ao buscar conversa específica", {
      error: error.message,
      conversationId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
