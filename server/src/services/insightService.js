import { cache } from './cache.js';
import { CACHE_KEYS as OBSIDIAN_CACHE_KEYS } from './obsidianService.js';
import { logger } from '../utils/logger.js';

/**
 * Consolida e retorna insights estratégicos de todas as notas do Obsidian.
 * @param {string} userId - O ID do usuário.
 * @returns {Promise<Object>} Um objeto contendo os principais achados e recomendações.
 */
async function getStrategicInsights(userId) {
  try {
    const cacheKey = OBSIDIAN_CACHE_KEYS.VAULT_INDEX(userId);
    const vaultIndex = await cache.get(cacheKey);

    if (!vaultIndex || !vaultIndex.notes || vaultIndex.notes.length === 0) {
      logger.warn(`Nenhum índice de vault encontrado para o usuário ${userId}. Retornando insights vazios.`);
      return {
        keyFindings: [],
        recommendations: [],
        summary: "Nenhuma nota foi processada ainda. Sincronize seu vault do Obsidian para começar."
      };
    }

    const allKeyFindings = [];
    const allRecommendations = [];

    for (const note of vaultIndex.notes) {
      if (note.insights) {
        if (note.insights.keyFindings && note.insights.keyFindings.length > 0) {
          allKeyFindings.push(...note.insights.keyFindings.map(finding => ({ ...finding, sourceNote: note.title })));
        }
        if (note.insights.recommendations && note.insights.recommendations.length > 0) {
          allRecommendations.push(...note.insights.recommendations.map(rec => ({ ...rec, sourceNote: note.title })));
        }
      }
    }

    logger.info(`Insights estratégicos consolidados para o usuário ${userId}`, {
      findingsCount: allKeyFindings.length,
      recommendationsCount: allRecommendations.length
    });

    // Futuramente, podemos adicionar uma chamada ao cognitoService aqui para gerar um resumo executivo
    // a partir dos achados e recomendações consolidados.

    return {
      keyFindings: allKeyFindings,
      recommendations: allRecommendations,
      summary: `Análise consolidada de ${vaultIndex.notes.length} notas.`,
      lastUpdated: vaultIndex.lastUpdated
    };
  } catch (error) {
    logger.error('Erro ao consolidar insights estratégicos:', error, { userId });
    throw new Error('Falha ao processar insights estratégicos.');
  }
}

export {
  getStrategicInsights
};
