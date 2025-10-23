/**
 * Enhanced Chat Service
 * Chat com suporte a sandbox execution, MCP integration e context management
 */

import remoteWorkbench from './remoteWorkbench.js';
import mcpClient from './mcpClientImproved.js';
import brainCloudService from './brainCloudService.js';
import { generateChatCompletion } from './aiChatClient.js';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/pg-pool.js';

const MAX_HISTORY_MESSAGES = 10;

function toSnippet(value, limit = 240) {
  if (!value) return '';
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function normalizeHistoricalContext(result) {
  const contextItems = Array.isArray(result?.context)
    ? result.context
    : Array.isArray(result?.results)
      ? result.results
      : Array.isArray(result?.content)
        ? result.content
        : [];

  return contextItems
    .filter(Boolean)
    .map((item, index) => {
      const path = item?.path || item?.file_path || `context-${index}`;
      return {
        path: String(path),
        title:
          item?.title ||
          item?.name ||
          item?.basename ||
          (typeof path === 'string' ? path.split('/').pop() : `Contexto ${index + 1}`),
        excerpt: toSnippet(item?.excerpt || item?.text || item?.content),
        score: typeof item?.score === 'number' ? item.score : undefined,
        metadata: item?.metadata || undefined,
      };
    });
}

function mapMessagesForPersistence(messages = []) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
    timestamp:
      message.timestamp instanceof Date
        ? message.timestamp.toISOString()
        : message.timestamp
        ? new Date(message.timestamp).toISOString()
        : new Date().toISOString(),
  }));
}

function buildSystemPromptFromContext(context = {}) {
  const sections = [
    'Você é um assistente executivo dentro do GG.AI CEO Dashboard. Responda em português de forma direta e acionável.',
  ];

  const brainContext = context.brainCloud || {};

  if (Array.isArray(brainContext.historical) && brainContext.historical.length) {
    const highlights = brainContext.historical
      .map((item, index) => `(${index + 1}) ${item.title}: ${item.excerpt}`)
      .join('\n');
    sections.push(`Contexto relevante do Obsidian:\n${highlights}`);
  }

  if (brainContext.focus && Array.isArray(brainContext.focus.daily_notes)) {
    const focusHighlights = brainContext.focus.daily_notes
      .slice(0, 3)
      .map((note) => `• ${note.title}: ${note.excerpt}`)
      .join('\n');
    if (focusHighlights) {
      sections.push(`Notas diárias importantes:\n${focusHighlights}`);
    }
  }

  if (Array.isArray(brainContext.tasks) && brainContext.tasks.length) {
    const tasksHighlights = brainContext.tasks
      .slice(0, 5)
      .map((task) => `• ${task.title || task.content || 'Tarefa'} (${task.status || 'pendente'}) - ${task.due || task.due_date || 'sem prazo'}`)
      .join('\n');
    sections.push(`Tarefas prioritárias:\n${tasksHighlights}`);
  }

  return sections.join('\n\n');
}

function normalizeFocusForContext(raw) {
  if (!raw) return null;

  const dailySource = Array.isArray(raw.daily_notes)
    ? raw.daily_notes
    : Array.isArray(raw.dailyNotes)
      ? raw.dailyNotes
      : Array.isArray(raw.daily)
        ? raw.daily
        : [];

  const dailyNotes = dailySource.map((note, index) => ({
    title:
      note?.title ||
      note?.name ||
      note?.basename ||
      (note?.path ? String(note.path).split('/').pop() : `Nota ${index + 1}`),
    path: note?.path || note?.file_path || undefined,
    excerpt: toSnippet(note?.excerpt || note?.summary || note?.content || note?.text),
    tags: Array.isArray(note?.tags) ? note.tags.map(String) : undefined,
  }));

  const weekly = raw.weekly_focus || raw.weeklyFocus || raw.weekly || null;

  return {
    daily_notes: dailyNotes,
    weekly_focus:
      typeof weekly === 'string'
        ? { title: 'Weekly Focus', excerpt: toSnippet(weekly) }
        : weekly
        ? {
            title:
              weekly.title ||
              weekly.name ||
              weekly.basename ||
              'Weekly Focus',
            excerpt: toSnippet(weekly.excerpt || weekly.summary || weekly.content || weekly.text),
          }
        : undefined,
  };
}

function normalizeTasksForContext(raw) {
  const list = Array.isArray(raw?.tasks)
    ? raw.tasks
    : Array.isArray(raw?.items)
      ? raw.items
      : [];

  return list.map((task, index) => ({
    title: task?.title || task?.content || `Tarefa ${index + 1}`,
    status: task?.status || 'pending',
    due: task?.due || task?.due_date || task?.dueDate || null,
    project: task?.project || task?.project_name || undefined,
    path: task?.path || task?.file_path || undefined,
  }));
}

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

    // Preparar contexto com dados recentes do Brain Cloud
    const context = await this.buildContext(conversation, intention, userMessage);

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
        context,
        conversation
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

      try {
        await brainCloudService.saveConversation(
          conversationId,
          mapMessagesForPersistence(conversation.messages),
          {
            intention,
            toolCount: toolResults.length,
          }
        );
      } catch (error) {
        console.warn('Erro ao salvar conversa no Brain Cloud:', error.message);
      }

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

  async buildContext(conversation, intention, latestMessage) {
    const context = {};

    if (conversation.messages.length) {
      context.recentMessages = conversation.messages.slice(-MAX_HISTORY_MESSAGES);
    }

    const brainContext = {};

    const contextPromises = [];

    if (latestMessage) {
      contextPromises.push(
        brainCloudService
          .getHistoricalContext(latestMessage, 3)
          .then((result) => {
            const entries = normalizeHistoricalContext(result);
            if (entries.length) {
              brainContext.historical = entries;
            }
          })
          .catch((error) => {
            console.warn('Erro ao obter contexto histórico do Brain Cloud:', error.message);
          })
      );
    }

    contextPromises.push(
      brainCloudService
        .getCurrentFocus()
        .then((result) => {
          const focus = normalizeFocusForContext(result);
          if (focus) {
            brainContext.focus = focus;
          }
        })
        .catch((error) => {
          console.warn('Erro ao obter foco atual do Brain Cloud:', error.message);
        })
    );

    contextPromises.push(
      brainCloudService
        .getDueTasks('today', false)
        .then((result) => {
          const tasks = normalizeTasksForContext(result);
          if (tasks.length) {
            brainContext.tasks = tasks;
          }
        })
        .catch((error) => {
          console.warn('Erro ao obter tarefas do Brain Cloud:', error.message);
        })
    );

    // Reutiliza MCP existente como fallback quando necessário
    if (intention === 'analyze_tasks' || intention === 'generate_insight') {
      contextPromises.push(
        mcpClient
          .call('mcp_get_tasks', {}, { useCache: true, cacheTime: 300000 })
          .then((tasks) => {
            if (!brainContext.tasks && Array.isArray(tasks)) {
              brainContext.tasks = tasks.slice(0, 10);
            }
          })
          .catch(() => {
            // ignore fallback error
          })
      );
    }

    await Promise.allSettled(contextPromises);

    if (Object.keys(brainContext).length > 0) {
      context.brainCloud = brainContext;
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

  async generateResponse(message, intention, toolResults, context, conversation) {
    const brainContext = context?.brainCloud || {};
    const systemPrompt = buildSystemPromptFromContext(context);

    const conversationHistory = (conversation?.messages || [])
      .filter((entry) => entry.role === 'user' || entry.role === 'assistant')
      .slice(-MAX_HISTORY_MESSAGES)
      .map((entry) => ({
        role: entry.role === 'assistant' ? 'assistant' : 'user',
        content: entry.content,
      }));

    const providerName = (process.env.CHAT_PROVIDER || 'openai').toLowerCase();
    const temperature = Number(process.env.CHAT_TEMPERATURE ?? 0.5);
    const maxTokens = Number(process.env.CHAT_MAX_TOKENS ?? 800);

    let apiKey;
    let baseUrl;
    let model;

    if (providerName === 'anthropic') {
      apiKey = process.env.ANTHROPIC_API_KEY;
      baseUrl = process.env.ANTHROPIC_BASE_URL;
      model = process.env.CHAT_MODEL || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
    } else if (providerName === 'openrouter') {
      apiKey = process.env.OPENROUTER_API_KEY;
      baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
      model = process.env.CHAT_MODEL || 'anthropic/claude-3.5-sonnet';
    } else {
      // Default to OpenAI-compatible providers
      apiKey = process.env.CHAT_API_KEY || process.env.OPENAI_API_KEY;
      baseUrl = process.env.CHAT_BASE_URL || process.env.OPENAI_BASE_URL;
      model = process.env.CHAT_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    }

    let aiResponse = null;

    if (apiKey) {
      try {
        const completion = await generateChatCompletion({
          providerName,
          baseUrl,
          apiKey,
          model,
          messages: conversationHistory,
          temperature,
          maxTokens,
          systemPrompt,
          stream: false,
        });

        if (completion?.choices?.[0]?.message?.content) {
          aiResponse = completion.choices[0].message.content.trim();
        } else if (Array.isArray(completion?.content)) {
          const textBlock = completion.content.find((block) => block?.type === 'text' && block?.text);
          if (textBlock?.text) {
            aiResponse = String(textBlock.text).trim();
          }
        } else if (typeof completion === 'string') {
          aiResponse = completion.trim();
        }
      } catch (error) {
        console.error('Erro ao gerar resposta com o provedor configurado:', error.message);
      }
    }

    if (aiResponse) {
      return aiResponse;
    }

    const sections = [`Processada intenção: ${intention}`];

    if (Array.isArray(brainContext.historical) && brainContext.historical.length) {
      const items = brainContext.historical
        .map((entry, index) => `(${index + 1}) ${entry.title}: ${entry.excerpt}`)
        .join('\n');
      sections.push(`Contexto relevante identificado:\n${items}`);
    }

    if (Array.isArray(brainContext.tasks) && brainContext.tasks.length) {
      const tasks = brainContext.tasks
        .slice(0, 5)
        .map((task) => `• ${task.title || task.content || 'Tarefa'} (${task.status || 'pendente'})`)
        .join('\n');
      sections.push(`Tarefas em destaque:\n${tasks}`);
    }

    if (brainContext.focus?.daily_notes?.length) {
      const notes = brainContext.focus.daily_notes
        .slice(0, 3)
        .map((note) => `• ${note.title}: ${note.excerpt}`)
        .join('\n');
      sections.push(`Notas diárias recentes:\n${notes}`);
    }

    if (toolResults.length > 0) {
      const toolsSummary = toolResults
        .map((tool) => `- ${tool.tool}: ${tool.status}`)
        .join('\n');
      sections.push(`Ferramentas executadas:\n${toolsSummary}`);
    }

    sections.push(`Mensagem do usuário:\n${message}`);

    return sections.join('\n\n');
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
