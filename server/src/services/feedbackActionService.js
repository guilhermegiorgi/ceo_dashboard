import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

// Simulação de um banco de dados em memória
let feedbackActions = [
  { id: '1', type: 'decision', title: 'Analisar expansão para o mercado LATAM', description: 'Decisão baseada no aumento de leads da região.', timestamp: new Date().toISOString(), status: 'pending', obsidianNote: 'Estratégia Q3 2025', relatedProject: 'Expansão Global', impact: 'Potencial de aumento de 20% no faturamento.' },
  { id: '2', type: 'insight_validation', title: 'Validar insight sobre churn de clientes', description: 'O insight sugere que a falta de um recurso X é a principal causa.', timestamp: new Date().toISOString(), status: 'processing', obsidianNote: 'Análise de Churn', relatedProject: 'Retenção de Clientes', impact: 'Redução de 5% no churn mensal.' },
];

/**
 * Retorna todas as ações de feedback.
 * @returns {Promise<Array>} A lista de ações de feedback.
 */
async function getFeedbackActions() {
  logger.info('Recuperando todas as ações de feedback');
  return feedbackActions;
}

/**
 * Cria uma nova ação de feedback.
 * @param {Object} actionData - Os dados da nova ação.
 * @returns {Promise<Object>} A nova ação criada.
 */
async function createFeedbackAction(actionData) {
  const newAction = {
    id: uuidv4(),
    ...actionData,
    timestamp: new Date().toISOString(),
    status: 'pending',
  };
  feedbackActions.push(newAction);
  logger.info('Nova ação de feedback criada', { actionId: newAction.id });
  return newAction;
}

/**
 * Atualiza o status de uma ação de feedback.
 * @param {string} actionId - O ID da ação a ser atualizada.
 * @param {string} status - O novo status.
 * @returns {Promise<Object>} A ação atualizada.
 */
async function updateFeedbackAction(actionId, status) {
  const action = feedbackActions.find(a => a.id === actionId);
  if (action) {
    action.status = status;
    logger.info('Ação de feedback atualizada', { actionId, newStatus: status });
    return action;
  }
  throw new Error('Ação de feedback não encontrada');
}

export {
  getFeedbackActions,
  createFeedbackAction,
  updateFeedbackAction,
};
