import * as cognitoService from './cognitoService.js';
import vaultService from './vaultService.js';
import { cacheGet, cacheSet } from './cache.js';

const CACHE_TTL = 60 * 60 * 1000; // 1 hora em milissegundos
const MAX_RECENT_NOTES = 5;
const MAX_ACTIVE_PROJECT_NOTES = 5;

export const generateWeeklyInsights = async (useCache = false, options = {}) => {
  const cfg = {
    note_query: '',
    note_limit: 20,
    prompt_template: 'Analise o contexto e gere 1 insight estratégico acionável (oportunidade, risco ou recomendação). Use evidências do conteúdo.',
    temperature: 0.5,
    provider: 'google',
    model: 'gemini-1.5-pro',
    apiKey: null,
    iterations: 1,
    auto_save: true,
    ...options,
  };

  const cacheKey = `weekly_insights:${cfg.note_query}:${cfg.note_limit}`;

  if (useCache) {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      console.log('Retornando insights do cache');
      return JSON.parse(cached);
    }
  }

  try {
    console.log('Iniciando geração de insights com estratégia "Batedor + Sniper"...');

    await vaultService.syncFromGit();

    // Seleção de notas com conteúdo conforme configuração
    const notes = await vaultService.searchNotesWithContent(cfg.note_query || '', cfg.note_limit || 20);
    if (!notes || notes.length === 0) {
      console.log('Nenhuma nota encontrada no vault.');
      return [];
    }

    const sortedNotes = notes
      .sort((a, b) => (b.mtime || 0) - (a.mtime || 0))
      .slice(0, cfg.note_limit || 20);

    console.log(`Notas-alvo: ${sortedNotes.map(n => n.basename).join(', ')}`);

    // Prompts padronizados com instruções explícitas
    const targetedPrompts = sortedNotes.map(note => {
      const wordCount = (note.content || '').split(/\s+/).length;
      const instruction = `Você é um advisor estratégico. Responda APENAS com um array JSON de insights. Cada item deve conter: title, description, type (unexpected_connection|knowledge_gap|success_pattern|strategic_question|risk_alert|opportunity), urgency (high|medium|low), confidence (0.0-1.0), relatedNotes, potentialImpact, suggestedAction.`;
      return {
        notePath: note.path,
        prompt: `\n${instruction}\n\nTarefa: ${cfg.prompt_template}\n\nContexto (parcial):\n${note.content.substring(0, 2000)}${note.content.length > 2000 ? '\n\n[Conteúdo truncado]' : ''}`
      };
    });

    console.log(`Executando ${targetedPrompts.length} consultas no Cognito...`);
    const settledResults = await Promise.allSettled(
      targetedPrompts.map(p => cognitoService.queryCognito(p.prompt, {
        sessionId: `insight-gen-${p.notePath}`,
        useCache: useCache,
        provider: cfg.provider,
        model: cfg.model,
        apiKey: cfg.apiKey,
        temperature: cfg.temperature
      }))
    );

    const insights = [];
    settledResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        try {
          let parsedValue = result.value;
          if (typeof parsedValue === 'string') {
            const jsonMatch = parsedValue.match(/\[[\s\S]*\]/);
            if (jsonMatch && jsonMatch[0]) parsedValue = JSON.parse(jsonMatch[0]);
            else parsedValue = JSON.parse(parsedValue);
          }
          if (Array.isArray(parsedValue) && parsedValue.length > 0) {
            insights.push(...parsedValue);
          }
        } catch (e) {
          console.warn(`Parse falhou para a nota ${targetedPrompts[index].notePath}:`, e);
        }
      } else if (result.status === 'rejected') {
        console.error(`Consulta falhou: ${targetedPrompts[index].notePath}`, result.reason);
      }
    });

    console.log(`Gerados ${insights.length} insights.`);

    const finalInsights = insights.map(insight => ({
      ...insight,
      id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      source: 'cognito-sniper',
      vaultPath: insight.relatedNotes?.[0] || 'unknown'
    }));

    if (cfg.auto_save) {
      const highConfidenceInsights = finalInsights.filter(i => (i.confidence || 0) > 0.8);
      for (const insight of highConfidenceInsights.slice(0, 3)) {
        try {
          await vaultService.saveInsightNote(insight);
          console.log(`Insight salvo no vault: ${insight.title}`);
        } catch (error) {
          console.error(`Erro ao salvar insight no vault: ${error.message}`);
        }
      }
    }

    await cacheSet(cacheKey, JSON.stringify(finalInsights), CACHE_TTL);
    return finalInsights;

  } catch (error) {
    console.error('Erro ao gerar insights:', error);
    return [{
      id: 'error_insight',
      title: 'Erro ao gerar insights',
      description: `Ocorreu um erro ao processar seus insights: ${error.message}`,
      type: 'error',
      confidence: 0,
      relatedNotes: []
    }];
  }
};

export const getInsights = async (useCache = true) => {
  // Por enquanto, vamos apenas chamar a função que gera insights semanais.
  // No futuro, isso pode ser expandido para buscar de outras fontes.
  return generateWeeklyInsights(useCache);
};

export const refreshInsights = async () => {
  // Força a atualização ignorando o cache
  return generateWeeklyInsights(false);
};
