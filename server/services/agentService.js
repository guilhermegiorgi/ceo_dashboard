import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll, ensureDbHelpers } from './database.js';
import { executeAgent } from './agentExecutor.js';

/**
 * Cria um agente padrão se nenhum existir.
 */
export const seedInitialAgent = async () => {
  ensureDbHelpers();
  const agents = await dbAll('SELECT id FROM agents LIMIT 1');
  if (agents.length === 0) {
    console.log('Nenhum agente encontrado. Criando agente "Minerador de Conhecimento" padrão...');
    
    const newAgent = {
      id: uuidv4(),
      name: 'Minerador de Conhecimento',
      type: 'minerador_de_conhecimento',
      schedule: 'Manual',
      provider: 'google',
      model: 'gemini-1.5-flash',
      api_key: null,
      status: 'inactive',
      config_json: JSON.stringify({
        prompt_template: 'Analise o contexto e gere 1 insight estratégico acionável (oportunidade, risco ou recomendação). Use evidências do conteúdo.',
        tools: ['web_search','http_get'],
        note_query: '',
        note_limit: 20,
        temperature: 0.3,
        iterations: 3
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await dbRun(
      `INSERT INTO agents (id, name, type, provider, model, schedule, api_key, status, config_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newAgent.id, newAgent.name, newAgent.type, newAgent.provider, newAgent.model,
        newAgent.schedule, newAgent.api_key, newAgent.status, newAgent.config_json,
        newAgent.created_at, newAgent.updated_at
      ]
    );
  }
};

/**
 * Lista todos os agentes do banco de dados.
 * @returns {Promise<Array>} Uma lista de agentes.
 */
export const getAllAgents = async () => {
  ensureDbHelpers();
  return await dbAll('SELECT * FROM agents ORDER BY created_at DESC');
};

/**
 * Busca um agente específico pelo ID.
 * @param {string} id - O ID do agente.
 * @returns {Promise<Object>} O objeto do agente.
 */
export const getAgentById = async (id) => {
  ensureDbHelpers();
  return await dbGet('SELECT * FROM agents WHERE id = ?', [id]);
};

/**
 * Cria um novo agente.
 * @param {Object} agentData - Os dados do novo agente.
 * @returns {Promise<Object>} O agente recém-criado.
 */
export const createAgent = async (agentData) => {
  ensureDbHelpers();
  const { name, type, provider, model, schedule, api_key, config_json } = agentData;
  const newAgent = {
    id: uuidv4(),
    name,
    type,
    provider: provider || null,
    model: model || null,
    schedule: schedule || null,
    api_key: api_key || null,
    status: 'inactive',
    config_json: config_json ? JSON.stringify(config_json) : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await dbRun(
    `INSERT INTO agents (id, name, type, provider, model, schedule, api_key, status, config_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newAgent.id,
      newAgent.name,
      newAgent.type,
      newAgent.provider,
      newAgent.model,
      newAgent.schedule,
      newAgent.api_key,
      newAgent.status,
      newAgent.config_json,
      newAgent.created_at,
      newAgent.updated_at,
    ]
  );

  return newAgent;
};

/**
 * Atualiza um agente existente.
 * @param {string} id - O ID do agente a ser atualizado.
 * @param {Object} agentData - Os novos dados do agente.
 * @returns {Promise<Object>} O agente atualizado.
 */
export const updateAgent = async (id, agentData) => {
  ensureDbHelpers();
  const { name, type, provider, model, schedule, api_key, status, config_json } = agentData;
  const updatedAt = new Date().toISOString();

  // Garante que o status seja um valor válido, caso contrário, mantém o status atual (ou define um padrão)
  const currentAgent = await getAgentById(id);
  const newStatus = status || currentAgent.status || 'inactive';

  // Garante que config_json seja uma string JSON
  const configString = typeof config_json === 'string' ? config_json : JSON.stringify(config_json);

  await dbRun(
    `UPDATE agents
     SET name = ?, type = ?, provider = ?, model = ?, schedule = ?, api_key = ?, status = ?, config_json = ?, updated_at = ?
     WHERE id = ?`,
    [name, type, provider, model, schedule, api_key, newStatus, configString, updatedAt, id]
  );

  return await getAgentById(id);
};

/**
 * Deleta um agente.
 * @param {string} id - O ID do agente a ser deletado.
 */
export const deleteAgent = async (id) => {
  ensureDbHelpers();
  await dbRun('DELETE FROM agents WHERE id = ?', [id]);
};

/**
 * Executa um agente e registra o resultado.
 * @param {string} agentId - O ID do agente a ser executado.
 * @returns {Promise<Object>} O registro da execução.
 */
export const runAgent = async (agentId) => {
  ensureDbHelpers();
  const agent = await getAgentById(agentId);
  if (!agent) {
    throw new Error('Agente não encontrado');
  }

  const runId = uuidv4();
  const startTime = new Date();

  // 1. Registrar o início da execução
  await dbRun(
    'INSERT INTO agent_runs (id, agent_id, start_time, status) VALUES (?, ?, ?, ?)',
    [runId, agentId, startTime.toISOString(), 'running']
  );
  await dbRun('UPDATE agents SET status = ?, last_run_at = ? WHERE id = ?', ['running', startTime.toISOString(), agentId]);

  try {
    // 2. Executar a lógica do agente
    const logMessage = await executeAgent(agent);

    // 3. Registrar o sucesso
    await dbRun(
      'UPDATE agent_runs SET end_time = ?, status = ?, log = ? WHERE id = ?',
      [new Date().toISOString(), 'success', logMessage, runId]
    );
    await dbRun('UPDATE agents SET status = ? WHERE id = ?', ['active', agentId]);
    
    return await dbGet('SELECT * FROM agent_runs WHERE id = ?', [runId]);

  } catch (error) {
    // 4. Registrar a falha
    console.error(`Falha ao executar o agente ${agentId}:`, error);
    await dbRun(
      'UPDATE agent_runs SET end_time = ?, status = ?, log = ? WHERE id = ?',
      [new Date().toISOString(), 'failed', error.message, runId]
    );
    await dbRun('UPDATE agents SET status = ? WHERE id = ?', ['error', agentId]);

    throw error; // Propaga o erro para a rota
  }
};

export const listRuns = async (limit = 50) => {
  ensureDbHelpers();
  return await dbAll('SELECT * FROM agent_runs ORDER BY start_time DESC LIMIT ?',[limit]);
};

export const listRunsByAgent = async (agentId, limit = 50) => {
  ensureDbHelpers();
  return await dbAll('SELECT * FROM agent_runs WHERE agent_id = ? ORDER BY start_time DESC LIMIT ?',[agentId, limit]);
};
