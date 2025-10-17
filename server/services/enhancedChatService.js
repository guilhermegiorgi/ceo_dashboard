/**
 * Enhanced Chat Service
 * Chat com suporte a sandbox execution, MCP integration e context management
 */

import remoteWorkbench from './remoteWorkbench.js';
import mcpClient from './mcpClientImproved.js';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/pg-pool.js';

class EnhancedChatService {
  constructor() {
    this.conversationContexts = new Map();
    this.tools = [
      'search_brain',
      'analyze_tasks',
      'execute_code',
      'generate_insight',
      'search_web'
    ];
  }

  async startConversation(userId, agentId = null) {
    const conversationId = uuidv4();
    const workbenchSession = await remoteWorkbench.createSession(userId, agentId);

    const conversation = {
      id: conversationId,
      userId,
      agentId,
      workbenchSession: workbenchSession.id,
      messages: [],
      context: {
        recentNotes: [],
        focusAreas: [],
        tasks: []
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.conversationContexts.set(conversationId, conversation);

    // Persistir
    await query(
      `INSERT INTO chat_conversations (id, user_id, agent_id, workbench_session_id, context)
       VALUES ($1, $2, $3, $4, $5)`,
      [conversationId, userId, agentId, workbenchSession.id, JSON.stringify(conversation.context)]
    );

    return conversation;
  }

  async sendMessage(conversationId, userMessage, options = {}) {
    const conversation = this.conversationContexts.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversa ${conversationId} não encontrada`);
    }

    // Adicionar mensagem do usuário
    conversation.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });

    try {
      // Analisar intenção
      const intention = this.analyzeIntention(userMessage);

      // Preparar contexto
      const context = await this.buildContext(conversation, intention);

      // Executar ferramentas apropriadas
      const toolResults = await this.executeTools(
        intention, 
        context,
        conversation.workbenchSession,
        options
      );

      // Gerar resposta
      const response = await this.generateResponse(
        userMessage,
        intention,
        toolResults,
        context
      );

      // Adicionar resposta ao histórico
      conversation.messages.push({
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        toolsUsed: toolResults.map(r => r.tool)
      });

      conversation.updatedAt = new Date();

      // Persistir
      await query(
        `INSERT INTO chat_messages 
         (conversation_id, role, content, tools_used)
         VALUES ($1, $2, $3, $4)`,
        [conversationId, 'user', userMessage, null]
      );

      await query(
        `INSERT INTO chat_messages 
         (conversation_id, role, content, tools_used)
         VALUES ($1, $2, $3, $4)`,
        [conversationId, 'assistant', response, JSON.stringify(toolResults.map(r => r.tool))]
      );

      return {
        conversationId,
        message: response,
        toolsUsed: toolResults.map(r => ({ tool: r.tool, status: r.status })),
        context: {
          intention,
          contextUsed: Object.keys(context)
        }
      };
    } catch (error) {
      // Adicionar erro ao histórico
      conversation.messages.push({
        role: 'system',
        content: `Erro: ${error.message}`,
        timestamp: new Date()
      });
      throw error;
    }
  }

  analyzeIntention(message) {
    // Análise básica de intenção
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('execut') || lowerMessage.includes('run')) {
      return 'execute_code';
    }
    if (lowerMessage.includes('busca') || lowerMessage.includes('search')) {
      return 'search_brain';
    }
    if (lowerMessage.includes('tarefa') || lowerMessage.includes('task')) {
      return 'analyze_tasks';
    }
    if (lowerMessage.includes('insight') || lowerMessage.includes('análise')) {
      return 'generate_insight';
    }
    return 'general_query';
  }

  async buildContext(conversation, intention) {
    const context = {};

    // Carregar contexto recente
    if (conversation.messages.length > 5) {
      context.recentMessages = conversation.messages.slice(-5);
    }

    // Carregar dados do Brain Cloud
    try {
      if (intention === 'analyze_tasks' || intention === 'generate_insight') {
        const tasks = await mcpClient.call('mcp_get_tasks', {}, { 
          useCache: true, 
          cacheTime: 300000 // 5 min
        });
        context.tasks = tasks.slice(0, 10);
      }

      if (intention === 'generate_insight') {
        const focus = await mcpClient.call('mcp_get_focus', {}, { 
          useCache: true 
        });
        context.focus = focus;
      }
    } catch (error) {
      console.warn('Erro ao carregar contexto do Brain Cloud:', error.message);
    }

    return context;
  }

  async executeTools(intention, context, workbenchSessionId, options) {
    const results = [];

    switch (intention) {
      case 'execute_code':
        if (options.code) {
          const execution = await remoteWorkbench.executeCode(
            workbenchSessionId,
            options.code,
            options.language || 'javascript'
          );
          results.push({
            tool: 'execute_code',
            status: execution.status,
            result: execution.result
          });
        }
        break;

      case 'search_brain':
        const searchResult = await mcpClient.call('obsidian-brain-cloud__semantic_search', {
          query: options.query || 'análise recente',
          limit: 5
        }, { useCache: true, fallbackLocal: true });
        results.push({
          tool: 'search_brain',
          status: 'completed',
          result: searchResult
        });
        break;

      case 'analyze_tasks':
        const taskSummary = await mcpClient.call('obsidian-brain-cloud__get_tasks_summary', {
          range: 'this_week'
        }, { useCache: true, fallbackLocal: true });
        results.push({
          tool: 'analyze_tasks',
          status: 'completed',
          result: taskSummary
        });
        break;

      case 'generate_insight':
        const graph = await mcpClient.call('obsidian-brain-cloud__get_graph_data', {}, { 
          useCache: true, 
          fallbackLocal: true 
        });
        results.push({
          tool: 'get_graph',
          status: 'completed',
          result: graph
        });
        break;
    }

    return results;
  }

  async generateResponse(message, intention, toolResults, context) {
    // Aqui você integraria com Claude/GPT para gerar resposta melhorada
    let response = `Processada intenção: ${intention}\n\n`;

    if (toolResults.length > 0) {
      response += 'Ferramentas executadas:\n';
      toolResults.forEach(r => {
        response += `- ${r.tool}: ${r.status}\n`;
      });
    }

    return response;
  }

  async getConversationHistory(conversationId, limit = 50) {
    const conversation = this.conversationContexts.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversa ${conversationId} não encontrada`);
    }
    return conversation.messages.slice(-limit);
  }

  async executeCodeForConversation(conversationId, code, language = 'javascript', timeout = 30000) {
    const conversation = this.conversationContexts.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversa ${conversationId} não encontrada`);
    }

    const execution = await remoteWorkbench.executeCode(
      conversation.workbenchSession,
      code,
      language,
      timeout
    );

    return execution;
  }

  async deleteConversation(conversationId) {
    this.conversationContexts.delete(conversationId);
    await query(
      `DELETE FROM chat_conversations WHERE id = $1`,
      [conversationId]
    );
  }
}

export default new EnhancedChatService();
